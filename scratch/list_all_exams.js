const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const allExams = await prisma.exam.findMany({
    select: {
      id: true,
      title: true,
      subject: true,
      authorName: true,
      classTarget: true,
      status: true,
      token: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      _count: {
        select: { questions: true, attempts: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total exams in DB: ${allExams.length}`);
  allExams.forEach(e => {
    console.log(`[${e.id}] "${e.title}" | Mapel: ${e.subject} | Guru: ${e.authorName} | Kelas: ${e.classTarget} | Soal: ${e._count.questions} | Siswa: ${e._count.attempts} | Status: ${e.status} | Created: ${e.createdAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

main();
