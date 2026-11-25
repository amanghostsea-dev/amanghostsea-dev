const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  console.log('=== INVESTIGATING ALL PJOK EXAMS & ATTEMPTS ===');
  
  // 1. All exams
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { subject: { contains: 'PJOK', mode: 'insensitive' } },
        { title: { contains: 'PJOK', mode: 'insensitive' } },
        { authorName: { contains: 'Fadly', mode: 'insensitive' } },
        { id: 'cmwlitsjs000010ggsqhcwyma' }
      ]
    },
    include: {
      _count: {
        select: { questions: true, attempts: true }
      }
    }
  });

  console.log(`Found ${exams.length} PJOK / Fadly / Target exams:`);
  exams.forEach(e => {
    console.log(`- ID: ${e.id}`);
    console.log(`  Title: ${e.title}`);
    console.log(`  Subject: ${e.subject}`);
    console.log(`  Author: ${e.authorName}`);
    console.log(`  ClassTarget: ${e.classTarget}`);
    console.log(`  Token: ${e.token}`);
    console.log(`  isActive: ${e.isActive}`);
    console.log(`  Questions count: ${e._count.questions}`);
    console.log(`  Attempts count: ${e._count.attempts}`);
    console.log(`  CreatedAt: ${e.createdAt}`);
    console.log('--------------------------------------------------');
  });

  // 2. Check if there are ANY attempts in the entire database whose examId or studentClass matches
  const targetClasses = ['X TJKT', 'X MPLB', 'X DKV', 'XI MPLB', 'XI TJKT'];
  console.log('\n=== CHECKING ALL ATTEMPTS FOR TARGET CLASSES IN ENTIRE DB ===');
  for (const tc of targetClasses) {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        studentClass: { contains: tc, mode: 'insensitive' }
      },
      include: {
        exam: { select: { id: true, title: true, subject: true, authorName: true } }
      },
      orderBy: { startedAt: 'desc' }
    });
    console.log(`Class ${tc}: total ${attempts.length} attempts recorded`);
    // group by exam title
    const grouped = {};
    attempts.forEach(a => {
      const key = `${a.exam?.title} (${a.exam?.subject} - ${a.exam?.authorName})`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    console.log('  Breakdown:', grouped);
  }

  // 3. Specifically inspect all attempts created between 07:00 and 13:00 today
  console.log('\n=== ALL ATTEMPTS TODAY (TIMELINE) ===');
  const today = new Date('2026-11-25T00:00:00.000Z');
  const attemptsToday = await prisma.examAttempt.findMany({
    where: { startedAt: { gte: today } },
    select: {
      id: true,
      studentName: true,
      studentClass: true,
      score: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      examId: true,
      exam: { select: { title: true, subject: true } }
    },
    orderBy: { startedAt: 'asc' }
  });

  console.log(`Total attempts today: ${attemptsToday.length}`);
  const examCounts = {};
  attemptsToday.forEach(a => {
    const key = `${a.exam?.title} [${a.examId}]`;
    if (!examCounts[key]) {
      examCounts[key] = { count: 0, classes: new Set(), sampleTime: a.startedAt };
    }
    examCounts[key].count++;
    examCounts[key].classes.add(a.studentClass);
  });
  for (const [k, v] of Object.entries(examCounts)) {
    console.log(`- ${k}: ${v.count} attempts | Classes: ${Array.from(v.classes).join(', ')} | Earliest: ${v.sampleTime}`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
