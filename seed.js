const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.jobListing.deleteMany();
  await prisma.tracerStudy.deleteMany();
  await prisma.alumni.deleteMany();

  const usersData = [
    { name: 'Budi Santoso', username: 'siswa', role: 'Siswa', password: 'siswa123', status: 'Aktif' },
    { name: 'Ahmad ST', username: 'guru', role: 'Guru', password: 'guru123', status: 'Aktif' },
    { name: 'Panitia Pusat', username: 'panitia', role: 'Panitia PPDB', password: 'ppdb123', status: 'Aktif' },
    { name: 'Administrator', username: 'admin', role: 'Super Admin', password: 'admin123', status: 'Aktif' },
  ];
  for (const user of usersData) {
    await prisma.user.create({ data: user });
  }

  await prisma.alumni.create({
    data: {
      nisn: "1234567890",
      fullName: "Budi Santoso",
      graduationYear: 2024,
      major: "Teknik Komputer dan Jaringan",
      tracerStudy: {
        create: {
          status: "BEKERJA",
          companyName: "PT. Teknologi Nusantara"
        }
      }
    }
  });

  await prisma.alumni.create({
    data: {
      nisn: "0987654321",
      fullName: "Siti Rahmawati",
      graduationYear: 2024,
      major: "Rekayasa Perangkat Lunak",
      tracerStudy: {
        create: {
          status: "KULIAH",
          university: "Universitas Indonesia"
        }
      }
    }
  });
  await prisma.jobListing.create({
    data: {
      title: 'Junior Web Developer',
      company: 'TechNusantara Solutions',
      location: 'Jakarta Selatan',
      salary: 'Rp 5.000.000 - Rp 8.000.000',
      type: 'Full-time',
      description: 'Mencari web developer junior yang bersemangat untuk bergabung dengan tim kami.',
      tags: 'React, Next.js, Tailwind',
      isHot: true
    }
  });

  await prisma.jobListing.create({
    data: {
      title: 'Teknisi Jaringan & Server',
      company: 'PT. Lintas Data Indonesia',
      location: 'Surabaya',
      salary: 'Rp 4.500.000 - Rp 6.000.000',
      type: 'Full-time',
      description: 'Dibutuhkan teknisi jaringan berpengalaman untuk mengelola infrastruktur kami.',
      tags: 'MikroTik, Cisco, Linux',
      isHot: false
    }
  });

  await prisma.jobListing.create({
    data: {
      title: 'Staff Administrasi & Keuangan',
      company: 'Bank Mandiri Syariah',
      location: 'Bandung',
      salary: 'Kompetitif',
      type: 'Kontrak',
      description: 'Dibutuhkan staff administrasi yang teliti dan jujur.',
      tags: 'Excel, Akuntansi, Teliti',
      isHot: true
    }
  });

  console.log("Seeding done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
