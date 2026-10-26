import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CbtExamRoom from './CbtExamRoom';

export const dynamic = 'force-dynamic';

export default async function SiswaExamRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const studentName = cookieStore.get('auth_name')?.value || 'Budi Santoso';

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  // Find any existing attempt
  const existingAttempt = await prisma.examAttempt.findFirst({
    where: {
      examId: id,
      studentName,
    },
    orderBy: { startedAt: 'desc' },
  });

  return (
    <CbtExamRoom
      exam={exam}
      studentName={studentName}
      existingAttempt={existingAttempt}
    />
  );
}
