import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import TugasSiswaClient from './TugasSiswaClient';
import { cleanupLegacyDummyAssignments, DUMMY_TEACHER_KEYWORDS } from '@/lib/subject-seed';
import { isClassTargetMatch } from '@/lib/cbt-schedule';

export const dynamic = 'force-dynamic';

export default async function SiswaTugasPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName || '';
  let studentNis = authUser || '';
  let studentClass = '';

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
      if (user.studentClass) {
        studentClass = user.studentClass;
      }
    }
  } catch (e) {
    console.error(e);
  }

  if (!studentName) studentName = 'Siswa SMK';

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
    } catch { }
  }

  if (!studentClass) {
    try {
      const gradeRecord = await prisma.studentGrade.findFirst({
        where: {
          OR: [
            { studentName },
            ...(studentNis ? [{ studentNis }] : []),
          ],
        },
        select: { studentClass: true },
      });
      if (gradeRecord?.studentClass) {
        studentClass = gradeRecord.studentClass;
      }
    } catch { }
  }

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

  // 1. Bersihkan tugas dummy atau anonim lawas jika ada
  await cleanupLegacyDummyAssignments();

  // 2. Ambil tugas resmi yang bukan dummy
  const rawAssignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { status: 'ACTIVE' },
        { submissions: { some: { studentName } } },
      ],
      authorName: {
        notIn: DUMMY_TEACHER_KEYWORDS,
      },
    },
    include: {
      submissions: {
        where: {
          studentName,
        },
      },
    },
    orderBy: { deadline: 'asc' },
  });

  // 3. Filter HANYA tugas yang diperuntukkan bagi kelas & jurusan siswa ini
  const assignments = rawAssignments.filter((a) =>
    isClassTargetMatch(a.classTarget, studentClass)
  );

  return (
    <TugasSiswaClient
      assignments={assignments}
      studentName={studentName}
      studentNis={studentNis}
      studentClass={studentClass}
    />
  );
}
