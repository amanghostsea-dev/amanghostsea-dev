const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

function getUrl(path) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      let val = line.trim().substring('DATABASE_URL='.length).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!val.includes('connection_limit')) {
        val += (val.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=15';
      }
      return val;
    }
  }
  return null;
}

async function check() {
  const id = 'cmwlitsjs000010ggsqhcwyma';
  const newUrl = getUrl('.env');
  const oldUrl = getUrl('.env.production');

  const newPrisma = new PrismaClient({ datasources: { db: { url: newUrl } } });
  const oldPrisma = new PrismaClient({ datasources: { db: { url: oldUrl } } });

  console.log('Checking exam in NEW DB...');
  const newExam = await newPrisma.exam.findUnique({
    where: { id },
    include: { questions: true, attempts: true }
  });
  console.log('NEW DB exam exists:', !!newExam);
  if (newExam) {
    console.log('Exam title:', newExam.title, 'author:', newExam.authorName, 'questions:', newExam.questions.length);
  }

  console.log('Checking exam in OLD DB...');
  const oldExam = await oldPrisma.exam.findUnique({
    where: { id },
    include: { questions: true, attempts: true }
  });
  console.log('OLD DB exam exists:', !!oldExam);
  if (oldExam) {
    console.log('Exam title:', oldExam.title, 'author:', oldExam.authorName, 'questions:', oldExam.questions.length);
  }

  // Also check all exams in new DB vs old DB
  const newCount = await newPrisma.exam.count();
  const oldCount = await oldPrisma.exam.count();
  console.log(`Exams count: New DB = ${newCount}, Old DB = ${oldCount}`);

  await newPrisma.$disconnect();
  await oldPrisma.$disconnect();
}

check();
