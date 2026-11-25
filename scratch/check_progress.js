const { PrismaClient } = require('@prisma/client');
const targetDbUrl = 'postgresql://postgres.hozzlhyocyhnylgxkneq:%40%40Rahman253%40%40@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const prisma = new PrismaClient({ datasources: { db: { url: targetDbUrl } } });

async function check() {
  const qCount = await prisma.examQuestion.count();
  const aCount = await prisma.examAttempt.count();
  const gCount = await prisma.studentGrade.count();
  console.log(`Current Supabase Progress: ${qCount}/2042 Questions | ${aCount}/424 Attempts | ${gCount}/347 Grades`);
  await prisma.$disconnect();
}

check();
