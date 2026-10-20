import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultJurusans = [
  {
    name: "Rekayasa Perangkat Lunak",
    code: "RPL",
    kuota: 72,
    description: "Program keahlian yang mempelajari pengembangan software, pembuatan website, aplikasi mobile, dan pengelolaan basis data modern."
  },
  {
    name: "Teknik Komputer & Jaringan",
    code: "TKJ",
    kuota: 72,
    description: "Program keahlian yang berfokus pada instalasi jaringan komputer, administrasi server, keamanan siber, dan infrastruktur cloud."
  },
  {
    name: "Multimedia (Desain Komunikasi Visual)",
    code: "MM",
    kuota: 72,
    description: "Program keahlian kreatif yang mencakup desain grafis, animasi 2D/3D, videografi, fotografi, serta produksi media interaktif."
  },
  {
    name: "Akuntansi & Keuangan Lembaga",
    code: "AK",
    kuota: 72,
    description: "Program keahlian yang mendalami sistem akuntansi digital, perbankan, perpajakan, dan pengelolaan administrasi keuangan instansi."
  },
  {
    name: "Otomatisasi & Tata Kelola Perkantoran",
    code: "OTKP",
    kuota: 72,
    description: "Program keahlian manajemen administrasi perkantoran modern, korespondensi digital, kearsipan elektronik, dan layanan prima."
  }
];

async function seed() {
  for (const j of defaultJurusans) {
    const existing = await prisma.jurusan.findFirst({
      where: {
        OR: [
          { code: j.code },
          { name: j.name }
        ]
      }
    });

    if (!existing) {
      const created = await prisma.jurusan.create({
        data: j
      });
      console.log(`Created: ${created.name} (${created.code})`);
    } else {
      console.log(`Already exists: ${existing.name}`);
    }
  }

  const all = await prisma.jurusan.findMany();
  console.log(`Total jurusan in DB: ${all.length}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
