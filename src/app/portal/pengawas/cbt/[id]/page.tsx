import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ProctorLiveConsole from './ProctorLiveConsole';
import { getKopSuratConfig } from '@/lib/settings';
import { isAllLevelTarget, parseClassTargets, isClassTargetMatch } from '@/lib/cbt-schedule';
import { normalizeReligion } from '@/lib/cbt-religion';

export const dynamic = 'force-dynamic';

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

  // Fetch initial attempts
  const initialAttempts = await prisma.examAttempt.findMany({
    where: { examId: id },
    select: {
      id: true,
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
  let scheduledStudents: Array<{ studentName: string; studentNis: string; studentClass: string }> = [];
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

    // Deteksi target agama ujian:
    // Prioritas 1: targetReligion resmi yang diset pada paket ujian
    // Prioritas 2: Deteksi otomatis dari nama mapel / judul ujian (misal PAI / Agama Islam / Kristen / Katolik / dsb.)
    let effectiveTargetReligion = normalizeReligion(exam.targetReligion);
    if (effectiveTargetReligion === 'ALL') {
      const sub = `${exam.subject || ''} ${exam.title || ''}`.toUpperCase();
      if (sub.includes('ISLAM') || sub.includes('PAI')) {
        effectiveTargetReligion = 'ISLAM';
      } else if (sub.includes('KRISTEN') || sub.includes('PAK') || sub.includes('PROTESTAN')) {
        effectiveTargetReligion = 'KRISTEN';
      } else if (sub.includes('KATOLIK')) {
        effectiveTargetReligion = 'KATOLIK';
      } else if (sub.includes('HINDU')) {
        effectiveTargetReligion = 'HINDU';
      } else if (sub.includes('BUDDHA') || sub.includes('BUDHA')) {
        effectiveTargetReligion = 'BUDDHA';
      } else if (sub.includes('KHONGHUCU') || sub.includes('KONGHUCU')) {
        effectiveTargetReligion = 'KHONGHUCU';
      }
    }

    const filteredStudents = rawStudents.filter((student) => {
      const studentClass =
        student.studentClass ||
        (student.nisn ? studentClassMap[student.nisn.trim().toLowerCase()] : null) ||
        studentClassMap[student.name.trim().toLowerCase()] ||
        studentClassMap[student.username.trim().toLowerCase()] ||
        '';

      // 1. Validasi Kecocokan Rombel / Jurusan (Class Target)
      const isClassMatch = isClassTargetMatch(exam.classTarget, studentClass);
      if (!isClassMatch) return false;

      // 2. Validasi Kecocokan Mata Pelajaran Agama (jika mapel agama)
      if (effectiveTargetReligion !== 'ALL') {
        const studentRel = normalizeReligion(student.religion);
        if (effectiveTargetReligion === 'ISLAM') {
          // Untuk ujian Agama Islam: Siswa beragama ISLAM atau yang belum terdata agamanya (default siswa di sekolah)
          if (studentRel !== 'ISLAM' && studentRel !== 'ALL') {
            return false;
          }
        } else {
          // Untuk ujian Agama Kristen/Katolik/dll.: HANYA siswa yang beragama sesuai
          if (studentRel !== effectiveTargetReligion) {
            return false;
          }
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
      };
    });
  } catch (err) {
    console.error('Error fetching roster students:', err);
  }

  return (
    <ProctorLiveConsole
      exam={{
        ...exam,
        questionsCount: exam._count.questions,
      }}
      scheduledStudents={scheduledStudents}
      initialAttempts={initialAttempts as any}
      kopSuratConfig={kopSuratConfig}
      currentUser={currentUser}
    />
  );
}

