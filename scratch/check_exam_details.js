const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { subject: { contains: 'PJOK', mode: 'insensitive' } },
        { title: { contains: 'PJOK', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      title: true,
      subject: true,
      status: true,
      token: true,
      classTarget: true,
      startTime: true,
      endTime: true,
      duration: true,
      authorName: true,
      createdAt: true,
      updatedAt: true
    }
  });

  console.log(JSON.stringify(exams, null, 2));
  await prisma.$disconnect();
}

main();
