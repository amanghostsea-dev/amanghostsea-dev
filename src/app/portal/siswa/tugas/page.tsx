import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import TugasSiswaClient from './TugasSiswaClient';

export const dynamic = 'force-dynamic';

export default async function SiswaTugasPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  let studentNis = '';
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
        if (!studentName) studentName = user.name;
        if (user.nisn) studentNis = user.nisn;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }
  if (!studentNis) {
    studentNis = '10293847';
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
