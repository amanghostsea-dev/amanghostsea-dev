const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  console.log('=== VERIFYING RESTORATION RESULTS ===');

  const exams = await prisma.exam.findMany({
    where: {
      subject: { contains: 'PJOK', mode: 'insensitive' }
    },
    select: {
      id: true,
      title: true,
      classTarget: true,
      authorName: true,
      _count: { select: { attempts: true, questions: true } }
    }
  });

  console.log('\n1. EXAM ATTEMPTS SUMMARY:');
  let totalAttempts = 0;
  for (const e of exams) {
    console.log(`- [${e.id}] "${e.title}" (${e.classTarget}): ${e._count.attempts} SISWA SELESAI (${e._count.questions} Soal)`);
    totalAttempts += e._count.attempts;
  }
  console.log(`Total PJOK Attempts in CBT: ${totalAttempts} siswa`);

  console.log('\n2. STUDENT GRADES (RAPOR/PORTAL GURU) SUMMARY:');
  const subjects = await prisma.subject.findMany({
    where: {
      name: { contains: 'PJOK', mode: 'insensitive' }
    },
    select: {
      id: true,
      code: true,
      name: true,
      classTarget: true,
      teacherName: true,
      _count: { select: { grades: true } }
    }
  });

  let totalGrades = 0;
  for (const s of subjects) {
    console.log(`- [${s.code}] Mapel ${s.name} - ${s.classTarget} (${s.teacherName}): ${s._count.grades} NILAI TERSINKRON`);
    totalGrades += s._count.grades;
  }
  console.log(`Total PJOK Grades in StudentGrade: ${totalGrades} siswa`);

  console.log('\n3. SAMPLE COMPLETED ATTEMPTS:');
  const samples = await prisma.examAttempt.findMany({
    where: {
      exam: { subject: { contains: 'PJOK', mode: 'insensitive' } }
    },
    take: 8,
    orderBy: { submittedAt: 'desc' },
    select: {
      studentName: true,
      studentClass: true,
      score: true,
      totalCorrect: true,
      totalQuestions: true,
      status: true,
      submittedAt: true,
      exam: { select: { title: true } }
    }
  });
  samples.forEach(s => {
    console.log(`- ${s.studentName} (${s.studentClass}) | ${s.exam.title} | Skor: ${s.score} (${s.totalCorrect}/${s.totalQuestions}) | Status: ${s.status}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
