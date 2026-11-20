const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam.findMany({
    select: { id: true, title: true, subject: true, authorName: true, proctorName: true },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent exams:', JSON.stringify(exams, null, 2));

  const users = await prisma.user.findMany({
    where: { role: 'Guru' },
    select: { id: true, username: true, name: true, role: true },
    take: 10
  });
  console.log('Sample Guru users:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
