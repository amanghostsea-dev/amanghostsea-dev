const { PrismaClient } = require('@prisma/client');

const OLD_DB_URL = 'postgres://febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d:sk_TFZftJ4olPYiF-zvWYFBt@db.prisma.io:5432/postgres?sslmode=require';
const NEW_DB_URL = 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require';

const prismaOld = new PrismaClient({
  datasources: { db: { url: OLD_DB_URL } }
});

const prismaNew = new PrismaClient({
  datasources: { db: { url: NEW_DB_URL } }
});

async function migrate() {
  console.log('🔄 Memulai migrasi data dari database lama ke database baru...');

  try {
    // 1. Cek koneksi ke database lama
    const userCount = await prismaOld.user.count();
    console.log(`✅ Terhubung ke database lama! Total user ditemukan: ${userCount}`);
  } catch (err) {
    console.error('❌ Database lama belum bisa diakses:', err.message);
    if (err.message.includes('planLimitReached')) {
      console.error('⚠️  Penyebab: Akun Prisma database lama terkena limit kuota gratis (planLimitReached).');
      console.error('👉 Solusi: Buka dashboard Prisma Console akun pemilik database lama, lalu upgrade atau kontak Prisma Support untuk unblock.');
    }
    await prismaOld.$disconnect();
    await prismaNew.$disconnect();
    return;
  }

  try {
    // 1. Users
    console.log('📦 Memindahkan data Users...');
    const users = await prismaOld.user.findMany();
    for (const u of users) {
      await prismaNew.user.upsert({
        where: { username: u.username },
        update: {},
        create: u
      });
    }
    console.log(`✅ ${users.length} user berhasil disinkronkan.`);

    // 2. Jurusan
    console.log('📦 Memindahkan data Jurusan...');
    const jurusans = await prismaOld.jurusan.findMany();
    for (const j of jurusans) {
      await prismaNew.jurusan.upsert({
        where: { id: j.id },
        update: {},
        create: j
      });
    }
    console.log(`✅ ${jurusans.length} jurusan disinkronkan.`);

    // 3. Berita & Portofolio & Setting
    console.log('📦 Memindahkan Berita, Portofolio & Setting...');
    const beritas = await prismaOld.berita.findMany();
    for (const b of beritas) {
      await prismaNew.berita.upsert({ where: { id: b.id }, update: {}, create: b });
    }
    const portofolios = await prismaOld.portofolio.findMany();
    for (const p of portofolios) {
      await prismaNew.portofolio.upsert({ where: { id: p.id }, update: {}, create: p });
    }
    const settings = await prismaOld.setting.findMany();
    for (const s of settings) {
      await prismaNew.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    // 4. PPDB Applicants
    console.log('📦 Memindahkan PPDB Applicants...');
    const applicants = await prismaOld.ppdbApplicant.findMany();
    for (const a of applicants) {
      await prismaNew.ppdbApplicant.upsert({ where: { nisn: a.nisn }, update: {}, create: a });
    }

    // 5. Alumni & Tracer Study
    console.log('📦 Memindahkan Alumni & Tracer Study...');
    const alumniList = await prismaOld.alumni.findMany({ include: { tracerStudy: true } });
    for (const al of alumniList) {
      const { tracerStudy, ...alData } = al;
      const createdAl = await prismaNew.alumni.upsert({
        where: { nisn: al.nisn },
        update: {},
        create: alData
      });
      if (tracerStudy) {
        await prismaNew.tracerStudy.upsert({
          where: { alumniId: createdAl.id },
          update: {},
          create: { ...tracerStudy, alumniId: createdAl.id }
        });
      }
    }

    // 6. Job Listings & Applications
    console.log('📦 Memindahkan Lowongan BKK...');
    const jobs = await prismaOld.jobListing.findMany({ include: { applications: true } });
    for (const job of jobs) {
      const { applications, ...jobData } = job;
      const createdJob = await prismaNew.jobListing.upsert({
        where: { id: job.id },
        update: {},
        create: jobData
      });
      for (const app of applications) {
        await prismaNew.jobApplication.upsert({
          where: { id: app.id },
          update: {},
          create: { ...app, jobId: createdJob.id }
        });
      }
    }

    // 7. Exams, Questions & Attempts
    console.log('📦 Memindahkan Paket Ujian CBT (Exams, Soal, & Riwayat Siswa)...');
    const exams = await prismaOld.exam.findMany({
      include: { questions: true, attempts: true }
    });
    console.log(`Ditemukan ${exams.length} paket ujian pada database lama.`);
    for (const exam of exams) {
      const { questions, attempts, ...examData } = exam;
      await prismaNew.exam.upsert({
        where: { id: exam.id },
        update: {},
        create: examData
      });
      // Questions
      for (const q of questions) {
        await prismaNew.examQuestion.upsert({
          where: { id: q.id },
          update: {},
          create: q
        });
      }
      // Attempts
      for (const att of attempts) {
        await prismaNew.examAttempt.upsert({
          where: { id: att.id },
          update: {},
          create: att
        });
      }
    }
    console.log(`✅ Seluruh ${exams.length} ujian beserta butir soal dan riwayat siswa berhasil dipindahkan!`);

    // 8. Assignments & Submissions
    console.log('📦 Memindahkan Tugas Guru & Siswa...');
    const assignments = await prismaOld.assignment.findMany({ include: { submissions: true } });
    for (const asg of assignments) {
      const { submissions, ...asgData } = asg;
      await prismaNew.assignment.upsert({
        where: { id: asg.id },
        update: {},
        create: asgData
      });
      for (const sub of submissions) {
        await prismaNew.assignmentSubmission.upsert({
          where: { id: sub.id },
          update: {},
          create: sub
        });
      }
    }

    // 9. Subject & StudentGrade
    console.log('📦 Memindahkan Mata Pelajaran & Nilai Siswa...');
    const subjects = await prismaOld.subject.findMany({ include: { grades: true } });
    for (const sub of subjects) {
      const { grades, ...subData } = sub;
      await prismaNew.subject.upsert({
        where: { id: sub.id },
        update: {},
        create: subData
      });
      for (const g of grades) {
        await prismaNew.studentGrade.upsert({
          where: { id: g.id },
          update: {},
          create: g
        });
      }
    }

    console.log('🎉 SEMUA DATA LAMA BERHASIL DIRESTORASI 100% KE DATABASE BARU!');
  } catch (err) {
    console.error('❌ Error saat proses transfer:', err);
  } finally {
    await prismaOld.$disconnect();
    await prismaNew.$disconnect();
  }
}

migrate();
