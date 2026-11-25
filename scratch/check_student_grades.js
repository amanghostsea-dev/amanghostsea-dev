const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  console.log('=== CHECKING STUDENT GRADES TABLE ===');
  const subjects = await prisma.subject.findMany({
    where: {
      OR: [
        { name: { contains: 'PJOK', mode: 'insensitive' } },
        { name: { contains: 'Jasmani', mode: 'insensitive' } },
        { code: { contains: 'PJOK', mode: 'insensitive' } }
      ]
    }
  });
  console.log('PJOK Subjects:', subjects);

  const subjectIds = subjects.map(s => s.id);

  const grades = await prisma.studentGrade.findMany({
    where: {
      OR: [
        { subjectId: { in: subjectIds } },
        { subject: { name: { contains: 'PJOK', mode: 'insensitive' } } }
      ]
    },
    include: {
      subject: true
    }
  });

  console.log(`Found ${grades.length} grades in StudentGrade for PJOK:`);
  grades.forEach(g => {
    console.log(`- ${g.studentName} (${g.studentClass}) | Final: ${g.finalScore} | Assignment: ${g.assignment} | Mid: ${g.midExam} | FinalExam: ${g.finalExam}`);
  });

  // Also check all subjects and count grades per subject
  console.log('\nGrades count per subject:');
  const allGrades = await prisma.studentGrade.groupBy({
    by: ['subjectId'],
    _count: { id: true }
  });
  for (const item of allGrades) {
    const subj = await prisma.subject.findUnique({ where: { id: item.subjectId } });
    console.log(`- ${subj?.name} (${subj?.code}): ${item._count.id} grades`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
