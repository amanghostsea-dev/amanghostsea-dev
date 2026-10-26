import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import TugasSiswaClient from './TugasSiswaClient';

export const dynamic = 'force-dynamic';

export default async function SiswaTugasPage() {
  const cookieStore = await cookies();
  const studentName = cookieStore.get('auth_name')?.value || 'Budi Santoso';

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
