import prisma from '@/lib/prisma';
import TugasDashboard from './TugasDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminTugasPage() {
  const assignments = await prisma.assignment.findMany({
    include: {
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: {
        select: {
          id: true,
          status: true,
          grade: true,
        },
      },
    },
    orderBy: { deadline: 'desc' },
  });

  return <TugasDashboard assignments={assignments} />;
}
