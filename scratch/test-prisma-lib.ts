import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Testing src/lib/prisma.ts integration...');
  const users = await prisma.user.count();
  const exams = await prisma.exam.count();
  const questions = await prisma.examQuestion.count();
  const attempts = await prisma.examAttempt.count();
  const grades = await prisma.studentGrade.count();

  console.log('Database Query via src/lib/prisma.ts Result:');
  console.log({
    users,
    exams,
    questions,
    attempts,
    grades
  });

  const latestExam = await prisma.exam.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      subject: true,
      classTarget: true,
      _count: {
        select: {
          questions: true,
          attempts: true
        }
      }
    }
  });

  console.log('Latest Exam Verified:', latestExam);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error running test-prisma-lib:', e);
  process.exit(1);
});
