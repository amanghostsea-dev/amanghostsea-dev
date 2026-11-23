const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const asAuthor = await prisma.exam.count({ where: { authorName: 'Abdul Rahman' } });
  const asProctor = await prisma.exam.count({ where: { proctorName: 'Abdul Rahman' } });
  const totalSchoolExams = await prisma.exam.count();
  const totalSchoolAttempts = await prisma.examAttempt.count();
  const totalSchoolQuestions = await prisma.examQuestion.count();

  console.log({
    asAuthor,
    asProctor,
    totalSchoolExams,
    totalSchoolAttempts,
    totalSchoolQuestions
  });

  await prisma.$disconnect();
}
check();
