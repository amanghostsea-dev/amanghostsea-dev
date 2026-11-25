const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const exams = ['cmwj887650000igybygnrpv67', 'cmwj7zej00000q1y2bf7drmmh', 'cmwjaulau000oq1y2zu44hupl', 'cmwjax729000gg8xiaoteq3vb'];
  for (const id of exams) {
    const e = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { select: { id: true, questionText: true, correctAnswer: true, points: true } },
        _count: { select: { attempts: true } }
      }
    });
    console.log(`\nExam [${id}] "${e?.title}" (${e?.classTarget})`);
    console.log(`- Questions: ${e?.questions.length}`);
    console.log(`- Attempts: ${e?._count.attempts}`);
    console.log(`- Sample Q1: ${e?.questions[0]?.questionText?.substring(0, 50)}... | Correct: ${e?.questions[0]?.correctAnswer}`);
  }
  await prisma.$disconnect();
}

main();
