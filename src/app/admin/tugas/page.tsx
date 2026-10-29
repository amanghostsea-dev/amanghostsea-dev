import prisma from '@/lib/prisma';
import TugasDashboard from './TugasDashboard';
import { getDynamicClassTargets } from '@/lib/jurusan-service';

export const dynamic = 'force-dynamic';

export default async function AdminTugasPage() {
  const [assignments, classTargets] = await Promise.all([
    prisma.assignment.findMany({
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
    }),
    getDynamicClassTargets(),
  ]);

  return <TugasDashboard assignments={assignments} dynamicClassPresets={classTargets} />;
}
