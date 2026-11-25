const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  console.log('=== CREATING FULL DATABASE BACKUP ===');
  const backup = {};

  const models = [
    'exam',
    'examQuestion',
    'subject',
    'studentGrade',
    'examAttempt',
    'user',
    'jurusan',
    'setting',
    'berita',
    'portofolio'
  ];

  for (const model of models) {
    console.log(`Exporting ${model}...`);
    try {
      backup[model] = await prisma[model].findMany();
      console.log(`✓ ${model}: ${backup[model].length} records saved.`);
    } catch (e) {
      console.error(`✗ Error exporting ${model}:`, e.message);
    }
  }

  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup_smk_web_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(`\n🎉 FULL BACKUP SUCCESSFULLY SAVED!`);
  console.log(`File: ${backupPath}`);
  console.log(`Size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);

  // Print Question bank summary
  const totalQuestions = backup.examQuestion ? backup.examQuestion.length : 0;
  const totalExams = backup.exam ? backup.exam.length : 0;
  console.log(`Summary: ${totalExams} Paket Ujian & ${totalQuestions} Butir Soal Guru 100% AMAN!`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
