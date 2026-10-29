import prisma from './prisma';

export interface JurusanItem {
  id: string;
  name: string;
  code: string;
  kuota: number;
  description: string;
  icon?: string | null;
}

const DEFAULT_JURUSANS = [
  {
    name: 'Pengembangan Perangkat Lunak & Gim',
    code: 'RPL',
    kuota: 36,
    description: 'Program keahlian unggulan dalam rekayasa perangkat lunak, pemrograman web & mobile, kecerdasan buatan, dan pengembangan gim.',
  },
  {
    name: 'Teknik Jaringan Komputer & Telekomunikasi',
    code: 'TJKT',
    kuota: 36,
    description: 'Program keahlian yang berfokus pada instalasi jaringan komputer, administrasi server, keamanan siber, dan infrastruktur cloud.',
  },
  {
    name: 'Desain Komunikasi Visual',
    code: 'DKV',
    kuota: 36,
    description: 'Program keahlian kreatif yang mencakup desain grafis, animasi 2D/3D, videografi, fotografi, serta produksi media interaktif.',
  },
  {
    name: 'Manajemen Perkantoran & Layanan Bisnis',
    code: 'MPLB',
    kuota: 36,
    description: 'Program keahlian manajemen administrasi perkantoran modern, korespondensi digital, kearsipan elektronik, dan layanan prima.',
  },
];

/**
 * Memastikan jurusan-jurusan standar terdaftar di database jika belum ada
 */
export async function ensureDefaultJurusans(): Promise<JurusanItem[]> {
  try {
    for (const def of DEFAULT_JURUSANS) {
      const existing = await prisma.jurusan.findFirst({
        where: {
          OR: [
            { code: { equals: def.code, mode: 'insensitive' } },
            { name: { contains: def.code, mode: 'insensitive' } },
          ],
        },
      });

      if (!existing) {
        await prisma.jurusan.create({
          data: {
            name: def.name,
            code: def.code,
            kuota: def.kuota,
            description: def.description,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring default jurusans:', err);
  }

  return await prisma.jurusan.findMany({
    orderBy: { code: 'asc' },
  });
}

/**
 * Menghasilkan daftar target kelas dinamis berdasarkan Jurusan yang ada di database.
 * Contoh hasil: ['Semua Kelas', 'X RPL 1', 'XI RPL 1', 'XII RPL 1', 'X TJKT 1', ...]
 */
export async function getDynamicClassTargets(): Promise<string[]> {
  const jurusans = await ensureDefaultJurusans();

  const classList: string[] = ['Semua Kelas'];

  // Tambahkan kelas per jenjang X, XI, XII untuk setiap jurusan
  const levels = ['X', 'XI', 'XII'];

  for (const j of jurusans) {
    const code = j.code.toUpperCase();
    for (const lvl of levels) {
      classList.push(`${lvl} ${code} 1`);
      classList.push(`${lvl} ${code} 2`);
    }
  }

  return Array.from(new Set(classList));
}

