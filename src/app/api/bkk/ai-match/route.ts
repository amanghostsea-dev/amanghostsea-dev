import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp, checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

interface MatchedJobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  department: string | null;
  tags: string[];
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  aiAdvice: string;
  isHot: boolean;
  contactWa?: string | null;
  contactEmail?: string | null;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`bkk-ai:${clientIp}`, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan AI. Silakan tunggu ${rateCheck.retryAfterSeconds} detik.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const skillsInput = (body.skills || '').trim();
    const departmentInput = (body.department || '').trim();
    const rawText = (body.rawText || '').trim();

    if (!skillsInput && !rawText) {
      return NextResponse.json(
        { error: 'Harap masukkan keahlian, jurusan, atau salin teks ringkasan CV Anda.' },
        { status: 400 }
      );
    }

    const combinedCandidateProfile = `${skillsInput} ${departmentInput} ${rawText}`.toLowerCase();

    // Fetch active jobs from database
    const jobs = await prisma.jobListing.findMany({
      orderBy: [{ isHot: 'desc' }, { createdAt: 'desc' }],
      take: 20
    });

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Belum ada lowongan pekerjaan aktif di database.'
      });
    }

    // List of common technical & soft skill keywords to extract
    const commonKeywords = [
      'react', 'next.js', 'nextjs', 'javascript', 'typescript', 'html', 'css', 'tailwind',
      'php', 'laravel', 'mysql', 'postgresql', 'nodejs', 'python', 'git', 'github',
      'figma', 'ui/ux', 'photoshop', 'illustrator', 'canva', 'premiere', 'after effects',
      'mikrotik', 'cisco', 'lan', 'wan', 'fiber optik', 'linux', 'server', 'networking',
      'autocad', 'solidworks', 'mesin cnc', 'bubut', 'las', 'welding', 'plc', 'iot',
      'mekanik', 'otomotif', 'tbsm', 'tkr', 'kelistrikan', 'engine tune up',
      'akuntansi', 'myob', 'accurate', 'pembukuan', 'pajak', 'excel', 'microsoft office',
      'administrasi', 'arsip', 'surat menyurat', 'public speaking', 'customer service',
      'marketing', 'sales', 'komunikasi', 'teamwork', 'leadership'
    ];

    // Detect candidate skills
    const candidateSkillsFound: string[] = [];
    for (const kw of commonKeywords) {
      if (combinedCandidateProfile.includes(kw)) {
        candidateSkillsFound.push(kw);
      }
    }

    // Try Gemini API if key is present
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const jobsSummary = jobs.map(j => ({
          id: j.id,
          title: j.title,
          company: j.company,
          type: j.type,
          tags: j.tags,
          requirements: j.requirements || j.description
        }));

        const prompt = `Kamu adalah AI Career Counselor & ATS Matcher untuk SMK (Bursa Kerja Khusus).
Profil Calon Pelamar / Siswa:
- Keahlian / CV: ${combinedCandidateProfile.slice(0, 1500)}

Daftar Lowongan Pekerjaan Tersedia:
${JSON.stringify(jobsSummary, null, 2)}

Tugas:
Analisis kecocokan profil calon pelamar dengan lowongan di atas. Kembalikan array JSON murni (tanpa pembungkus markdown) dengan format:
[
  {
    "id": "id_lowongan",
    "matchPercentage": 85,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3"],
    "aiAdvice": "Saran persiapan dan tips agar lolos seleksi di lowongan ini."
  }
]`;

        const resGemini = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            }),
            signal: AbortSignal.timeout(10000)
          }
        );

        if (resGemini.ok) {
          const geminiData = await resGemini.json();
          const rawReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) {
            const aiMatches: Array<{
              id: string;
              matchPercentage: number;
              matchedSkills: string[];
              missingSkills: string[];
              aiAdvice: string;
            }> = JSON.parse(rawReply);

            const resultMap = new Map(aiMatches.map(m => [m.id, m]));
            const enriched: MatchedJobResult[] = jobs.map(j => {
              const match = resultMap.get(j.id);
              return {
                id: j.id,
                title: j.title,
                company: j.company,
                location: j.location,
                salary: j.salary,
                type: j.type,
                department: j.department,
                tags: j.tags.split(',').map(t => t.trim()).filter(Boolean),
                matchPercentage: match?.matchPercentage ?? 60,
                matchedSkills: match?.matchedSkills && match.matchedSkills.length > 0 ? match.matchedSkills : ['Kualifikasi umum vokasi'],
                missingSkills: match?.missingSkills || [],
                aiAdvice: match?.aiAdvice || 'Pelajari profil perusahaan dan siapkan portofolio relevan.',
                isHot: j.isHot,
                contactWa: j.contactWa,
                contactEmail: j.contactEmail
              };
            });

            enriched.sort((a, b) => b.matchPercentage - a.matchPercentage);
            return NextResponse.json({
              success: true,
              engine: 'gemini',
              results: enriched
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini Matcher fallback to smart local algorithm:', geminiErr);
      }
    }

    // High-performance intelligent algorithmic matcher fallback
    const scoredJobs: MatchedJobResult[] = jobs.map(job => {
      const jobTags = job.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const jobFullText = `${job.title} ${job.company} ${job.description} ${job.requirements || ''} ${job.tags} ${job.department || ''}`.toLowerCase();

      const matched: string[] = [];
      const missing: string[] = [];

      // Check job tags against candidate profile
      for (const tag of jobTags) {
        if (combinedCandidateProfile.includes(tag)) {
          matched.push(tag.toUpperCase());
        } else {
          missing.push(tag.toUpperCase());
        }
      }

      // Check candidate identified skills against job full text
      for (const skill of candidateSkillsFound) {
        if (jobFullText.includes(skill) && !matched.includes(skill.toUpperCase())) {
          matched.push(skill.toUpperCase());
        }
      }

      // Base score
      let score = 50;

      // Department alignment
      if (departmentInput && job.department && (
        job.department.toLowerCase().includes(departmentInput.toLowerCase()) ||
        departmentInput.toLowerCase().includes(job.department.toLowerCase()) ||
        job.department.toLowerCase().includes('semua')
      )) {
        score += 20;
      }

      // Tag overlap score
      if (jobTags.length > 0) {
        const overlap = matched.length / Math.max(jobTags.length, 1);
        score += Math.min(30, Math.round(overlap * 30));
      }

      // Title alignment
      const titleWords = job.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      for (const tw of titleWords) {
        if (combinedCandidateProfile.includes(tw)) {
          score += 5;
        }
      }

      // Clamp between 45% and 98%
      const finalPercentage = Math.min(98, Math.max(45, score));

      // AI Advice generation based on missing skills and role
      let advice = `Profilmu sangat kompetitif untuk posisi ${job.title}. `;
      if (missing.length > 0) {
        advice += `Tingkatkan keahlian pada ${missing.slice(0, 2).join(', ')} untuk memperbesar peluang lolos interview.`;
      } else {
        advice += `Keahlianmu sangat selaras dengan kebutuhan perusahaan. Segera kirimkan lamaran beserta portofolio terbaikmu!`;
      }

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        type: job.type,
        department: job.department,
        tags: job.tags.split(',').map(t => t.trim()).filter(Boolean),
        matchPercentage: finalPercentage,
        matchedSkills: matched.length > 0 ? matched : ['Kualifikasi Dasar'],
        missingSkills: missing.length > 0 ? missing.slice(0, 3) : ['Pengalaman spesifik industri'],
        aiAdvice: advice,
        isHot: job.isHot,
        contactWa: job.contactWa,
        contactEmail: job.contactEmail
      };
    });

    // Sort by highest match first
    scoredJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return NextResponse.json({
      success: true,
      engine: 'smart-matcher',
      results: scoredJobs
    });
  } catch (error: any) {
    console.error('Error in AI matcher:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses analisis AI.' },
      { status: 500 }
    );
  }
}
