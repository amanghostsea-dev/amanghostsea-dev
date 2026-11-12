import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CbtExamRoom from './CbtExamRoom';
import { extractClassLevel } from '@/lib/cbt-schedule';

export const dynamic = 'force-dynamic';

export default async function SiswaExamRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

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

  let studentName = authName;
  let studentNis = authUser || '';
  const examLevel = extractClassLevel(exam.classTarget);
  let studentClass = examLevel === 'X' ? 'X RPL 1' : examLevel === 'XII' ? 'XII RPL 1' : 'XI RPL 1';
  if (exam.classTarget && !exam.classTarget.includes(',') && !exam.classTarget.toLowerCase().includes('semua')) {
    studentClass = exam.classTarget;
  }

  if (authUser) {
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
        studentNis = user.nisn || user.username;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }

  // Cari kelas & NISN aktual siswa dari database StudentGrade
  try {
    const gradeRecord = await prisma.studentGrade.findFirst({
      where: {
        OR: [
          { studentName },
          ...(studentNis ? [{ studentNis }] : [])
        ]
      },
      select: { studentClass: true, studentNis: true }
    });

    if (gradeRecord?.studentClass) {
      studentClass = gradeRecord.studentClass;
      if (!studentNis && gradeRecord.studentNis) {
        studentNis = gradeRecord.studentNis;
      }
    }
  } catch (err) {
    console.error('Error fetching student class info:', err);
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
      studentClass={studentClass}
      studentNis={studentNis}
      existingAttempt={existingAttempt}
    />
  );
}
