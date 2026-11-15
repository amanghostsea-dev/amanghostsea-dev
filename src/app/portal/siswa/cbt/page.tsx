import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import SiswaCbtClient from './SiswaCbtClient';
import { getKopSuratConfig, getCbtTimezone } from '@/lib/settings';
import { isClassTargetMatch } from '@/lib/cbt-schedule';

export const dynamic = 'force-dynamic';

export default async function SiswaCbtListPage() {
  const [cookieStore, kopSuratConfig, cbtTimezone] = await Promise.all([
    cookies(),
    getKopSuratConfig(),
    getCbtTimezone(),
  ]);
  const authName = cookieStore.get('auth_name')?.value?.trim();
  const authUser = cookieStore.get('auth_user')?.value?.trim();

  let studentName = authName || '';
  let studentNis = authUser || '';
  let studentClass = '';

  // 1. Temukan data user akun lengkap di database (baik lewat authUser maupun authName jika berisi NISN/username/nama)
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(authUser ? [{ username: authUser }, { nisn: authUser }] : []),
          ...(authName ? [{ username: authName }, { nisn: authName }, { name: authName }] : []),
        ],
      },
    });
    if (user) {
      studentName = user.name;
      studentNis = user.nisn || user.username;
    }
  } catch (err) {
    console.error('Error finding user in SiswaCbtListPage:', err);
  }

  if (!studentName) studentName = 'Siswa SMK';

  // 2. Sinkronkan kelas aktual siswa dari database rapor StudentGrade
  try {
    const gradeRecord = await prisma.studentGrade.findFirst({
      where: {
        OR: [
          { studentName },
          ...(studentNis ? [{ studentNis }] : []),
          ...(authUser ? [{ studentNis: authUser }] : []),
          ...(authName ? [{ studentNis: authName }, { studentName: authName }] : []),
        ],
      },
      select: { studentClass: true, studentNis: true },
    });

    if (gradeRecord?.studentClass) {
      studentClass = gradeRecord.studentClass;
      if (!studentNis && gradeRecord.studentNis) {
        studentNis = gradeRecord.studentNis;
      }
    }
  } catch (err) {
    console.error('Error querying student class:', err);
  }

  // 3. Jika belum ditemukan di rapor, cek riwayat pengerjaan ujian (ExamAttempt)
  if (!studentClass) {
    try {
      const attemptRecord = await prisma.examAttempt.findFirst({
        where: {
          OR: [
            { studentName },
            ...(studentNis ? [{ studentNis }] : []),
          ],
          studentClass: { not: null },
        },
        select: { studentClass: true },
        orderBy: { startedAt: 'desc' },
      });
      if (attemptRecord?.studentClass) {
        studentClass = attemptRecord.studentClass;
      }
    } catch {}
  }

  // 4. Jika masih belum ada, gunakan kelas aktif dari master Jurusan sekolah
  if (!studentClass) {
    try {
      const activeJurusans = await prisma.jurusan.findMany({
        orderBy: { code: 'asc' },
        select: { code: true },
      });
      const firstCode = activeJurusans[0]?.code || 'TJKT';
      studentClass = `XI ${firstCode} 1`;
    } catch {
      studentClass = 'XI TJKT 1';
    }
  }

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'SW';

  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { status: { in: ['PUBLISHED', 'ACTIVE'] } },
        {
          attempts: {
            some: {
              OR: [
                { studentName },
                ...(studentNis ? [{ studentNis }] : []),
              ],
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
      attempts: {
        where: {
          OR: [
            { studentName },
            ...(studentNis ? [{ studentNis }] : []),
          ],
        },
        orderBy: {
          startedAt: 'desc',
        },
      },
    },
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Filter ujian yang relevan:
  // 1. Siswa telah memiliki attempt (agar riwayat nilai dan transkrip tetap dapat diakses di portal)
  // 2. ATAU Target kelas ujian cocok dengan kelas aktual siswa (Semua Kelas, Tingkat Lintas Jurusan, atau Rombel spesifik)
  const relevantExams = exams.filter((exam) => {
    if (exam.attempts && exam.attempts.length > 0) return true;
    return isClassTargetMatch(exam.classTarget, studentClass);
  });

  return (
    <SiswaCbtClient
      exams={relevantExams as any}
      studentName={studentName}
      studentNis={studentNis}
      studentClass={studentClass}
      initials={initials}
      kopSuratConfig={kopSuratConfig}
      timezone={cbtTimezone}
    />
  );
}
