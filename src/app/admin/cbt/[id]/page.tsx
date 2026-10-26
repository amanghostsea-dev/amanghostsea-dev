import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ExamDetailClient from './ExamDetailClient';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      attempts: {
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  return <ExamDetailClient exam={exam} />;
}
