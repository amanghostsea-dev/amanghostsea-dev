import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ExamDetailClient from './ExamDetailClient';
import { getKopSuratConfig } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [exam, kopSuratConfig] = await Promise.all([
    prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        attempts: {
          orderBy: { score: 'desc' },
        },
      },
    }),
    getKopSuratConfig(),
  ]);

  if (!exam) {
    notFound();
  }

  return <ExamDetailClient exam={exam} kopSuratConfig={kopSuratConfig} />;
}
