const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { authorName: { contains: 'Annisa' } },
        { authorName: { contains: 'Abdul Rahman' } }
      ]
    },
    include: { _count: { select: { questions: true, attempts: true } } }
  });
  console.log('EXAMS:', JSON.stringify(exams, null, 2));

  // Check all 142 attempts: which exams do they belong to?
  const attemptExams = await prisma.examAttempt.groupBy({
    by: ['examId'],
    _count: { id: true }
  });
  console.log('ATTEMPT BY EXAM ID:', attemptExams);

  for (const ae of attemptExams) {
    const ex = await prisma.exam.findUnique({
      where: { id: ae.examId },
      select: { id: true, title: true, subject: true, authorName: true, proctorName: true }
    });
    console.log(`Exam: ${ex?.title} (${ex?.subject}) | Author: ${ex?.authorName} | Attempts: ${ae._count.id}`);
  }

  await prisma.$disconnect();
}

check();
