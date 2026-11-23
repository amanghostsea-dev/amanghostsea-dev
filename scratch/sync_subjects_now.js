const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  console.log('🔄 Memulai sinkronisasi mata pelajaran dari paket CBT ke tabel Subject...');

  const users = await prisma.user.findMany({
    where: { role: { in: ['Guru', 'Super Admin'] } },
    select: { id: true, name: true, username: true }
  });

  const exams = await prisma.exam.findMany({
    select: {
      id: true,
      subject: true,
      classTarget: true,
      authorName: true,
      roomName: true,
      startTime: true,
      endTime: true
    }
  });

  let createdCount = 0;
  let codeIndex = 1;

  for (const exam of exams) {
    if (!exam.subject || !exam.authorName) continue;

    const teacher = users.find(u => 
      u.name.toLowerCase() === exam.authorName.toLowerCase() ||
      exam.authorName.toLowerCase().includes(u.name.toLowerCase()) ||
      u.name.toLowerCase().includes(exam.authorName.toLowerCase())
    );

    // Cek apakah mata pelajaran untuk guru dan kelas ini sudah ada
    const existing = await prisma.subject.findFirst({
      where: {
        name: { equals: exam.subject.trim(), mode: 'insensitive' },
        classTarget: { equals: exam.classTarget.trim(), mode: 'insensitive' },
        teacherName: { equals: exam.authorName.trim(), mode: 'insensitive' }
      }
    });

    if (!existing) {
      // Buat kode mapel unik
      let code = `MPL-${String(codeIndex).padStart(3, '0')}`;
      while (await prisma.subject.findUnique({ where: { code } })) {
        codeIndex++;
        code = `MPL-${String(codeIndex).padStart(3, '0')}`;
      }

      await prisma.subject.create({
        data: {
          code,
          name: exam.subject.trim(),
          category: 'Muatan Kejuruan',
          classTarget: exam.classTarget.trim(),
          teacherId: teacher?.id || null,
          teacherName: exam.authorName.trim(),
          day: 'Senin',
          time: '07:30 - 10:00',
          room: exam.roomName || 'Lab Komputer 1',
          kkm: 75,
          credits: 4,
          status: 'ACTIVE'
        }
      });
      createdCount++;
      codeIndex++;
    }
  }

  console.log(`✅ Berhasil menyinkronkan ${createdCount} mata pelajaran dari data paket CBT!`);
  const totalSub = await prisma.subject.count();
  console.log(`Total mata pelajaran di database sekarang: ${totalSub}`);

  await prisma.$disconnect();
}

sync();
