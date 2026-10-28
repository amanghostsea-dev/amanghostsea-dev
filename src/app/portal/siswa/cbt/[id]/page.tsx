import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CbtExamRoom from './CbtExamRoom';

export const dynamic = 'force-dynamic';

export default async function SiswaExamRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  if (!studentName && authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        }
      });
      if (user) {
        studentName = user.name;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }

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
