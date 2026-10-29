import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import CbtDashboard from './CbtDashboard';
import { getDynamicClassTargets } from '@/lib/jurusan-service';

export const dynamic = 'force-dynamic';

export default async function AdminCbtPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const initialTab = sp?.tab === 'jadwal' ? 'schedule' : 'exams';

  const cookieStore = await cookies();
  const userName = cookieStore.get('auth_name')?.value || 'Guru Mapel';
  const userRole = cookieStore.get('auth_token')?.value || 'Guru';

  const [exams, classTargets] = await Promise.all([
    prisma.exam.findMany({
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
    }),
    getDynamicClassTargets(),
  ]);

  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Memuat Smart CBT...</div>}>
      <CbtDashboard 
        exams={exams} 
        currentUser={{ name: userName, role: userRole }} 
        initialTab={initialTab}
        dynamicClassPresets={classTargets}
      />
    </Suspense>
  );
}
