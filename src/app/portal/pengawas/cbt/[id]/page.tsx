import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ProctorLiveConsole from './ProctorLiveConsole';
import { getKopSuratConfig } from '@/lib/settings';
import { isAllLevelTarget, parseClassTargets, isClassTargetMatch, isClassOverlap } from '@/lib/cbt-schedule';
import { normalizeReligion, ReligionCode } from '@/lib/cbt-religion';

export const dynamic = 'force-dynamic';

// Helper deteksi target agama efektif ujian
function getExamEffectiveReligion(targetReligion?: string | null, subject?: string | null, title?: string | null): ReligionCode {
  const norm = normalizeReligion(targetReligion);
  if (norm !== 'ALL') return norm;
  const sub = `${subject || ''} ${title || ''}`.toUpperCase();
  if (sub.includes('ISLAM') || sub.includes('PAI')) return 'ISLAM';
  if (sub.includes('KRISTEN') || sub.includes('PAK') || sub.includes('PROTESTAN')) return 'KRISTEN';
  if (sub.includes('KATOLIK')) return 'KATOLIK';
  if (sub.includes('HINDU')) return 'HINDU';
  if (sub.includes('BUDDHA') || sub.includes('BUDHA')) return 'BUDDHA';
  if (sub.includes('KHONGHUCU') || sub.includes('KONGHUCU')) return 'KHONGHUCU';
  return 'ALL';
}

export default async function ProctorLiveConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value || '';
  const authUser = cookieStore.get('auth_user')?.value || '';
  const authToken = cookieStore.get('auth_token')?.value || '';

  const [exam, kopSuratConfig] = await Promise.all([
    prisma.exam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    }),
    getKopSuratConfig(),
  ]);

  if (!exam) {
    notFound();
  }

  let currentUser = {
    name: authName || 'Guru Pengawas',
    username: authUser || 'pengawas',
    role: authToken || 'Guru',
    id: '',
  };

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { name: authName },
          ],
        },
        select: { id: true, name: true, username: true, role: true },
      });
      if (user) {
        currentUser = {
          name: user.name,
          username: user.username,
          role: user.role,
          id: user.id,
        };
      }
    } catch {}
  }

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin Utama';
  const isAssignedProctor =
    Boolean(exam.proctorId && currentUser.id && exam.proctorId === currentUser.id) ||
    Boolean(exam.proctor2Id && currentUser.id && exam.proctor2Id === currentUser.id) ||
    Boolean(exam.proctorName && currentUser.name && exam.proctorName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
    Boolean(exam.proctor2Name && currentUser.name && exam.proctor2Name.toLowerCase().trim() === currentUser.name.toLowerCase().trim());

  // Strict check: Only Admin Utama or the specifically plotted proctor can access this room!
  if (!isSuperAdmin && !isAssignedProctor) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl font-black">
            🔒
          </div>
          <h2 className="text-xl font-black text-rose-300">Akses Pengawas Terbatas</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {exam.proctorName ? (
              <>
                Sesi ujian <strong>"{exam.title}"</strong> ({exam.classTarget}) telah di-plotting oleh Admin Utama kepada <strong>{exam.proctorName}</strong>{exam.proctor2Name ? ` dan ${exam.proctor2Name}` : ''}.<br /><br />
                Akun Anda (<strong>{currentUser.name}</strong>) tidak tercantum sebagai pengawas resmi untuk ruangan ini.
              </>
            ) : (
              <>
                Sesi ujian <strong>"{exam.title}"</strong> ({exam.classTarget}) belum di-plotting oleh Admin Utama. Hanya Admin Utama yang berwenang menetapkan pengawas ruangan.
              </>
            )}
          </p>
          <div className="pt-2">
            <a
              href="/portal/pengawas/cbt"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
            >
              Lihat Jadwal Tugas Saya
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Deteksi target agama ujian:
  const effectiveTargetReligion = getExamEffectiveReligion(exam.targetReligion, exam.subject, exam.title);

  // 🕌 Cek apakah ini bagian dari Sesi Paralel Agama Terpadu (cth: Mulok/BTA Islam + Mulok/BTA Kristen di kelas/ruang/jam yang sama)
  let partnerExams: Array<{
    id: string;
    title: string;
    subject: string;
    classTarget: string;
    targetReligion?: string | null;
    effectiveReligion: ReligionCode;
    questionsCount: number;
  }> = [];

  if (effectiveTargetReligion !== 'ALL' && exam.startTime && exam.endTime) {
    const candidates = await prisma.exam.findMany({
      where: {
        id: { not: id },
        status: { not: 'ARCHIVED' },
        startTime: exam.startTime,
        endTime: exam.endTime,
        roomName: exam.roomName,
      },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    for (const cand of candidates) {
      const isOverlap = isClassOverlap(exam.classTarget, cand.classTarget);
      if (!isOverlap) continue;

      const candRel = getExamEffectiveReligion(cand.targetReligion, cand.subject, cand.title);
      // HANYA jika kandidat adalah varian agama yang berbeda (bukan ALL dan bukan agama yang sama)
      if (candRel !== 'ALL' && candRel !== effectiveTargetReligion) {
        partnerExams.push({
          id: cand.id,
          title: cand.title,
          subject: cand.subject,
          classTarget: cand.classTarget,
          targetReligion: cand.targetReligion,
          effectiveReligion: candRel,
          questionsCount: cand._count.questions,
        });
      }
    }
  }

  const allExamIds = [exam.id, ...partnerExams.map((p) => p.id)];

  // Fetch initial attempts (mendukung gabungan ujian paralel agama)
  const initialAttempts = await prisma.examAttempt.findMany({
    where: { examId: { in: allExamIds } },
    select: {
      id: true,
      examId: true,
      studentName: true,
      studentNis: true,
      studentClass: true,
      answers: true,
      score: true,
      totalQuestions: true,
      totalCorrect: true,
      status: true,
      tabSwitchCount: true,
      extraTimeMinutes: true,
      isBlocked: true,
      proctorNotes: true,
      startedAt: true,
      submittedAt: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  // 🎓 Query siswa yang tepat sesuai Jurusan/Kelas Rombel & Mapel Agama yang di-plotting
  let scheduledStudents: Array<{
    studentName: string;
    studentNis: string;
    studentClass: string;
    religionCode?: string;
    examId?: string;
    examTitle?: string;
  }> = [];

  try {
    const [rawStudents, studentGrades, examAttempts] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'Siswa',
          status: 'Aktif',
        },
        select: {
          id: true,
          name: true,
          username: true,
          nisn: true,
          studentClass: true,
          religion: true,
        },
        orderBy: [{ name: 'asc' }],
      }),
      prisma.studentGrade.findMany({
        select: {
          studentName: true,
          studentNis: true,
          studentClass: true,
        },
      }),
      prisma.examAttempt.findMany({
        where: { studentClass: { not: '' } },
        select: {
          studentName: true,
          studentNis: true,
          studentClass: true,
        },
      }),
    ]);

    // Lookup pemetaan kelas alternatif jika data user.studentClass masih kosong
    const studentClassMap: Record<string, string> = {};
    for (const sg of studentGrades) {
      if (sg.studentName && sg.studentClass) {
        studentClassMap[sg.studentName.trim().toLowerCase()] = sg.studentClass.trim();
      }
      if (sg.studentNis && sg.studentClass) {
        studentClassMap[sg.studentNis.trim().toLowerCase()] = sg.studentClass.trim();
      }
    }
    for (const att of examAttempts) {
      if (att.studentName && att.studentClass) {
        const key = att.studentName.trim().toLowerCase();
        if (!studentClassMap[key]) studentClassMap[key] = att.studentClass.trim();
      }
      if (att.studentNis && att.studentClass) {
        const key = att.studentNis.trim().toLowerCase();
        if (!studentClassMap[key]) studentClassMap[key] = att.studentClass.trim();
      }
    }

    const isParallelSession = partnerExams.length > 0;
    const allVariants = [
      { id: exam.id, title: exam.title, rel: effectiveTargetReligion, questionsCount: exam._count.questions },
      ...partnerExams.map((p) => ({ id: p.id, title: p.title, rel: p.effectiveReligion, questionsCount: p.questionsCount })),
    ];

    if (isParallelSession) {
      // 🕌 Sesi Paralel Terpadu: Gabungkan seluruh siswa kelas rombel (cth: 28 Islam + 2 Kristen = 30 siswa)
      const matchingStudents = rawStudents.filter((student) => {
        const studentClass =
          student.studentClass ||
          (student.nisn ? studentClassMap[student.nisn.trim().toLowerCase()] : null) ||
          studentClassMap[student.name.trim().toLowerCase()] ||
          studentClassMap[student.username.trim().toLowerCase()] ||
          '';

        return isClassTargetMatch(exam.classTarget, studentClass);
      });

      scheduledStudents = matchingStudents.map((s) => {
        const assignedClass =
          s.studentClass ||
          (s.nisn ? studentClassMap[s.nisn.trim().toLowerCase()] : null) ||
          studentClassMap[s.name.trim().toLowerCase()] ||
          studentClassMap[s.username.trim().toLowerCase()] ||
          exam.classTarget;

        const studentRel = normalizeReligion(s.religion);

        // Cari apakah sudah ada attempt pada salah satu ujian paralel
        const existingAttempt = initialAttempts.find(
          (att) =>
            att.studentName.trim().toLowerCase() === s.name.trim().toLowerCase() ||
            (s.nisn && att.studentNis && att.studentNis.trim().toLowerCase() === s.nisn.trim().toLowerCase())
        );

        let assignedVariant = existingAttempt
          ? allVariants.find((v) => v.id === existingAttempt.examId)
          : null;

        if (!assignedVariant) {
          if (studentRel !== 'ALL') {
            assignedVariant = allVariants.find((v) => v.rel === studentRel);
          }
        }

        // Jika siswa belum ada data agama spesifik di profil user, default ke varian ISLAM (jika ada di sesi)
        if (!assignedVariant) {
          assignedVariant = allVariants.find((v) => v.rel === 'ISLAM') || allVariants[0];
        }

        return {
          studentName: s.name,
          studentNis: s.nisn || s.username,
          studentClass: assignedClass,
          religionCode: assignedVariant.rel,
          examId: assignedVariant.id,
          examTitle: assignedVariant.title,
        };
      });
    } else {
      // 📚 Sesi Tunggal Normal (Non-Agama atau Ujian Agama Tunggal): 100% seperti semula
      const filteredStudents = rawStudents.filter((student) => {
        const studentClass =
          student.studentClass ||
          (student.nisn ? studentClassMap[student.nisn.trim().toLowerCase()] : null) ||
          studentClassMap[student.name.trim().toLowerCase()] ||
          studentClassMap[student.username.trim().toLowerCase()] ||
          '';

        const isClassMatch = isClassTargetMatch(exam.classTarget, studentClass);
        if (!isClassMatch) return false;

        if (effectiveTargetReligion !== 'ALL') {
          const studentRel = normalizeReligion(student.religion);
          if (effectiveTargetReligion === 'ISLAM') {
            if (studentRel !== 'ISLAM' && studentRel !== 'ALL') return false;
          } else {
            if (studentRel !== effectiveTargetReligion) return false;
          }
        }

        return true;
      });

      scheduledStudents = filteredStudents.map((s) => {
        const assignedClass =
          s.studentClass ||
          (s.nisn ? studentClassMap[s.nisn.trim().toLowerCase()] : null) ||
          studentClassMap[s.name.trim().toLowerCase()] ||
          studentClassMap[s.username.trim().toLowerCase()] ||
          exam.classTarget;

        return {
          studentName: s.name,
          studentNis: s.nisn || s.username,
          studentClass: assignedClass,
          religionCode: effectiveTargetReligion !== 'ALL' ? effectiveTargetReligion : 'ALL',
          examId: exam.id,
          examTitle: exam.title,
        };
      });
    }
  } catch (err) {
    console.error('Error fetching roster students:', err);
  }

  return (
    <ProctorLiveConsole
      exam={{
        ...exam,
        questionsCount: exam._count.questions,
        targetReligion: exam.targetReligion,
      }}
      scheduledStudents={scheduledStudents}
      initialAttempts={initialAttempts as any}
      kopSuratConfig={kopSuratConfig}
      currentUser={currentUser}
      parallelExams={partnerExams}
      allExamIds={allExamIds}
    />
  );
}

