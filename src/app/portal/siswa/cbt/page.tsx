import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import SiswaCbtClient from './SiswaCbtClient';
import { getKopSuratConfig } from '@/lib/settings';
import { isClassTargetMatch } from '@/lib/cbt-schedule';

export const dynamic = 'force-dynamic';

export default async function SiswaCbtListPage() {
  const [cookieStore, kopSuratConfig] = await Promise.all([
    cookies(),
    getKopSuratConfig(),
  ]);
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  let studentNis = authUser || '';
  let studentClass = 'XI RPL 1';

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        }
      });
      if (user) {
        studentName = user.name;
        studentNis = user.nisn || user.username;
      }
    } catch {}
  }
  if (!studentName) studentName = 'Siswa SMK';

  // Sinkronkan kelas aktual siswa dari database rapor StudentGrade
  try {
    const gradeRecord = await prisma.studentGrade.findFirst({
      where: {
        OR: [
          { studentName },
          ...(studentNis ? [{ studentNis }] : [])
        ]
      },
      select: { studentClass: true, studentNis: true }
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
    />
  );
}
