import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import CbtDashboard from './CbtDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminCbtPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get('auth_name')?.value || 'Guru Mapel';
  const userRole = cookieStore.get('auth_token')?.value || 'Guru';

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

  return (
    <CbtDashboard 
      exams={exams} 
      currentUser={{ name: userName, role: userRole }} 
    />
  );
}
