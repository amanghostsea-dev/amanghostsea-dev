const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSync() {
  const exams = await prisma.exam.findMany({
    select: {
      subject: true,
      classTarget: true,
      authorName: true,
      roomName: true,
      startTime: true
    }
  });

  const uniqueCombos = new Map();
  for (const e of exams) {
    if (!e.subject || !e.authorName) continue;
    const cleanSub = e.subject.trim();
    const cleanClass = (e.classTarget || 'Semua Kelas').trim();
    const key = `${cleanSub}___${cleanClass}___${e.authorName.trim()}`;
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, {
        name: cleanSub,
        classTarget: cleanClass,
        teacherName: e.authorName.trim(),
        room: e.roomName || 'Lab Komputer 1',
        time: '07:30 - 10:00'
      });
    }
  }

  console.log(`Found ${uniqueCombos.size} unique subject-class-teacher combinations from 51 exams:`);
  let i = 0;
  for (const [key, val] of uniqueCombos) {
    if (i < 10) console.log(val);
    i++;
  }

  await prisma.$disconnect();
}

testSync();
