const { PrismaClient } = require('@prisma/client');

const dbUrl = 'postgresql://postgres.hozzlhyocyhnylgxkneq:%40%40Rahman253%40%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function main() {
  console.log('Testing Supabase PostgreSQL connection...');
  const users = await prisma.user.count();
  const exams = await prisma.exam.count();
  const questions = await prisma.examQuestion.count();
  const attempts = await prisma.examAttempt.count();
  const grades = await prisma.studentGrade.count();
  const subjects = await prisma.subject.count();
  const jurusans = await prisma.jurusan.count();
  const settings = await prisma.setting.count();

  console.log('✅ Supabase PostgreSQL Connected Successfully!');
  console.log({
    users,
    exams,
    questions,
    attempts,
    grades,
    subjects,
    jurusans,
    settings
  });

  const sampleQuestion = await prisma.examQuestion.findFirst({
    select: {
      id: true,
      questionText: true,
      exam: {
        select: {
          title: true,
          subject: true,
          classTarget: true
        }
      }
    }
  });

  console.log('Sample question verified:', sampleQuestion);

  // Check some student grades to ensure student history is intact
  const sampleGrade = await prisma.studentGrade.findFirst({
    where: { subject: { contains: 'Inggris', mode: 'insensitive' } },
    select: {
      id: true,
      studentName: true,
      studentClass: true,
      subject: true,
      score: true
    }
  });
  console.log('Sample English Grade verified:', sampleGrade);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
