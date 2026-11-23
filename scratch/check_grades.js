const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const grades = await prisma.studentGrade.groupBy({
    by: ['subjectId'],
    _count: { id: true }
  });
  console.log('GRADES GROUPED BY SUBJECT ID:', grades);
  for (const g of grades) {
    const s = await prisma.subject.findUnique({ where: { id: g.subjectId } });
    console.log('Subject for grade:', s);
  }
  await prisma.$disconnect();
}
check();
