const { PrismaClient } = require('@prisma/client');

const db2Url = 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=2';
const db1Url = 'postgres://febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d:sk_TFZftJ4olPYiF-zvWYFBt@db.prisma.io:5432/postgres?sslmode=require&connection_limit=2';

async function checkAllAttemptsInDb2() {
  console.log('=== CHECKING ALL ATTEMPTS IN DB2 ===');
  const prisma = new PrismaClient({ datasources: { db: { url: db2Url } } });
  try {
    // 1. Find all attempts created today (Nov 25)
    const today = new Date('2026-11-25T00:00:00.000Z');
    const allTodayAttempts = await prisma.examAttempt.findMany({
      where: {
        startedAt: { gte: today }
      },
      include: {
        exam: {
          select: { id: true, title: true, subject: true, authorName: true, classTarget: true }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    console.log(`Total attempts created TODAY (Nov 25) in DB2: ${allTodayAttempts.length}`);
    
    // Group by exam
    const byExam = {};
    allTodayAttempts.forEach(a => {
      const title = a.exam?.title || 'Unknown Exam';
      byExam[title] = (byExam[title] || 0) + 1;
    });
    console.log('Attempts by Exam today:', JSON.stringify(byExam, null, 2));

    // 2. Search for any students in X TJKT, X MPLB, X DKV, XI MPLB who have attempts today
    console.log('\nChecking students with class info:');
    const classes = ['X TJKT', 'X MPLB', 'X DKV', 'XI MPLB'];
    for (const cls of classes) {
      const clsAttempts = allTodayAttempts.filter(a => 
        (a.studentClass && a.studentClass.includes(cls)) || 
        (a.exam && a.exam.title && a.exam.title.includes(cls)) ||
        (a.exam && a.exam.classTarget && a.exam.classTarget.includes(cls))
      );
      console.log(`- Class ${cls} attempts today: ${clsAttempts.length}`);
      clsAttempts.forEach(a => {
        console.log(`   * ${a.studentName} (${a.studentClass}) | Exam: ${a.exam?.title} | Status: ${a.status} | Score: ${a.score} | Started: ${a.startedAt}`);
      });
    }

    // 3. Search for any attempt whose answers or proctorNotes or anything mentions PJOK or Fadly
    const fadlyAttempts = await prisma.examAttempt.findMany({
      where: {
        exam: {
          authorName: { contains: 'Fadly', mode: 'insensitive' }
        }
      },
      include: {
        exam: { select: { id: true, title: true, classTarget: true } }
      }
    });
    console.log(`\nTotal attempts for Guru Fadly in DB2: ${fadlyAttempts.length}`);
    fadlyAttempts.forEach(a => {
      console.log(`- ${a.studentName} (${a.studentClass}) | Exam: ${a.exam?.title} [${a.exam?.id}] | Score: ${a.score} | Status: ${a.status}`);
    });

  } catch (e) {
    console.error('Error DB2:', e);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkDb1Status() {
  console.log('\n=== CHECKING DB1 (OLD DB) ===');
  const prisma = new PrismaClient({ datasources: { db: { url: db1Url } } });
  try {
    const count = await prisma.examAttempt.count();
    console.log(`DB1 Total Attempts: ${count}`);
    const today = new Date('2026-11-25T00:00:00.000Z');
    const todayAttempts = await prisma.examAttempt.findMany({
      where: { startedAt: { gte: today } },
      include: { exam: { select: { title: true, authorName: true } } }
    });
    console.log(`DB1 attempts created today: ${todayAttempts.length}`);
    todayAttempts.forEach(a => {
      console.log(`  * ${a.studentName} | ${a.exam?.title} (${a.exam?.authorName}) | Skor: ${a.score}`);
    });
  } catch (e) {
    console.log('DB1 Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkAllAttemptsInDb2();
  await checkDb1Status();
}

main();
