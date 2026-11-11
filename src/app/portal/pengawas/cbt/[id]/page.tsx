import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ProctorLiveConsole from './ProctorLiveConsole';
import { getKopSuratConfig } from '@/lib/settings';

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

  // Query scheduled students for this class target
  let scheduledStudents: Array<{ studentName: string; studentNis: string; studentClass: string }> = [];
  try {
    const grades = await prisma.studentGrade.findMany({
      where: {
        studentClass: exam.classTarget,
      },
      select: {
        studentName: true,
        studentNis: true,
        studentClass: true,
      },
      distinct: ['studentName'],
      orderBy: { studentName: 'asc' },
    });

    scheduledStudents = grades.map((g) => ({
      studentName: g.studentName,
      studentNis: g.studentNis || '-',
      studentClass: g.studentClass,
    }));
  } catch (err) {
    console.error('Error fetching roster students:', err);
  }

  // If roster empty, fallback to users with role 'Siswa'
  if (scheduledStudents.length === 0) {
    try {
      const users = await prisma.user.findMany({
        where: {
          role: 'Siswa',
          status: 'Aktif',
        },
        select: {
          name: true,
          nisn: true,
          username: true,
        },
        take: 40,
        orderBy: { name: 'asc' },
      });

      scheduledStudents = users.map((u) => ({
        studentName: u.name,
        studentNis: u.nisn || u.username,
        studentClass: exam.classTarget,
      }));
    } catch {}
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

