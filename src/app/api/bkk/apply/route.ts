import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp, checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting: max 10 applications per IP per 10 minutes to avoid spam
    const rateCheck = checkRateLimit(`bkk-apply:${clientIp}`, 10, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan lamaran. Silakan coba lagi dalam ${rateCheck.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const {
      jobId,
      fullName,
      email,
      phone,
      nisn,
      lastEducation,
      graduationYear,
      resumeUrl,
      portfolioUrl,
      coverLetter
    } = body;

    if (!jobId || !fullName || !phone || !email) {
      return NextResponse.json(
        { error: 'Mohon lengkapi Nama Lengkap, Nomor WhatsApp, dan Email.' },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await prisma.jobListing.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Lowongan pekerjaan tidak ditemukan atau sudah ditutup.' },
        { status: 404 }
      );
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        nisn: nisn ? nisn.trim() : null,
        lastEducation: lastEducation || null,
        graduationYear: graduationYear ? parseInt(String(graduationYear)) : null,
        resumeUrl: resumeUrl || null,
        portfolioUrl: portfolioUrl || null,
        coverLetter: coverLetter || null,
        status: 'PENDING'
      }
    });

    // Generate formatted application code for confirmation
    const applicationCode = `BKK-${new Date().getFullYear()}-${application.id.slice(-6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      message: 'Lamaran berhasil dikirim!',
      applicationId: application.id,
      applicationCode,
      jobTitle: job.title,
      company: job.company,
      contactWa: job.contactWa,
      contactEmail: job.contactEmail
    });
  } catch (error: any) {
    console.error('Error submitting job application:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan pada server saat memproses lamaran.' },
      { status: 500 }
    );
  }
}
