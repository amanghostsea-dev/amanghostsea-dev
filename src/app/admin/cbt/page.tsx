import prisma from '@/lib/prisma';
import CbtDashboard from './CbtDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminCbtPage() {
  const exams = await prisma.exam.findMany({
    include: {
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
      attempts: {
        select: {
          score: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <CbtDashboard exams={exams} />;
}
