import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import TugasSiswaClient from './TugasSiswaClient';

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
    }
  } catch (e) {
    console.error(e);
  }

  if (!studentName) studentName = 'Siswa SMK';

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

  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { status: 'ACTIVE' },
        { submissions: { some: { studentName } } }
      ]
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

  return (
    <TugasSiswaClient
      assignments={assignments}
      studentName={studentName}
      studentNis={studentNis}
      studentClass={studentClass}
    />
  );
}
