import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import SubmissionReviewClient from './SubmissionReviewClient';

export const dynamic = 'force-dynamic';

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  return <SubmissionReviewClient assignment={assignment} />;
}
