const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exam = await prisma.exam.findUnique({
    where: { id: "cmwo6i7pn0041nv9w4hho1cfb" },
    include: { questions: true }
  });
  console.log('Exam cmwo6i7pn0041nv9w4hho1cfb:', {
    id: exam.id,
    title: exam.title,
    authorName: exam.authorName,
    questionCount: exam.questions.length
  });

  const allRecentQuestions = await prisma.examQuestion.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Most recent questions created in DB:', allRecentQuestions);

  const annisaUser = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'Annisa', mode: 'insensitive' } },
        { username: { contains: 'Annisa', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Annisa user in DB:', annisaUser);
}

main().finally(() => prisma.$disconnect());
