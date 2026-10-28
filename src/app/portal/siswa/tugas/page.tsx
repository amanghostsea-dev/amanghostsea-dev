import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import TugasSiswaClient from './TugasSiswaClient';

export const dynamic = 'force-dynamic';

export default async function SiswaTugasPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  if (!studentName && authUser) {
    try {
      const user = await prisma.user.findUnique({
        where: { username: authUser },
      });
      if (user) {
        studentName = user.name;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      status: 'ACTIVE',
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
    />
  );
}
