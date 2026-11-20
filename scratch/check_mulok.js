const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { classTarget: { contains: 'X TJKT 1' } },
        { title: { contains: 'MULOK' } },
        { title: { contains: 'MULIK' } },
        { subject: { contains: 'MULOK' } },
        { subject: { contains: 'MULIK' } }
      ]
    },
    select: {
      id: true,
      title: true,
      subject: true,
      classTarget: true,
      targetReligion: true,
      startTime: true,
      endTime: true,
      roomName: true,
      proctorName: true
    }
  });
  console.log('Mulok / X TJKT 1 exams:', JSON.stringify(exams, null, 2));
}
main().finally(() => prisma.$disconnect());
