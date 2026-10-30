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
 * Mengambil daftar jurusan resmi dari database admin.
 * HANYA melakukan seeding jika tabel Jurusan di database benar-benar kosong (pertama kali inisialisasi).
 * Tidak akan pernah meregenerasi jurusan yang telah dihapus atau diubah oleh Admin.
 */
export async function ensureDefaultJurusans(): Promise<JurusanItem[]> {
  try {
    const count = await prisma.jurusan.count();
    if (count === 0) {
      for (const def of DEFAULT_JURUSANS) {
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
 * Menghasilkan daftar target kelas yang ringkas & sinkron dengan Jurusan yang diinput Admin.
 * Format standar: X [KODE] 1, XI [KODE] 1, XII [KODE] 1.
 * Hanya memuat 1 rombel standar per jenjang agar opsi tidak menumpuk/terlalu banyak.
 */
export async function getDynamicClassTargets(): Promise<string[]> {
  const jurusans = await ensureDefaultJurusans();

  const classList: string[] = ['Semua Kelas'];
  const levels = ['X', 'XI', 'XII'];

  for (const j of jurusans) {
    const code = (j.code || '').trim().toUpperCase();
    if (!code) continue;
    for (const lvl of levels) {
      classList.push(`${lvl} ${code} 1`);
    }
  }

  // Tambahkan kelas eksisting jika ada kelas kustom yang sudah tercatat di Subject
  try {
    const existing = await prisma.subject.findMany({
      select: { classTarget: true },
      distinct: ['classTarget'],
    });
    for (const item of existing) {
      if (item.classTarget && !classList.includes(item.classTarget)) {
        classList.push(item.classTarget);
      }
    }
  } catch (e) {
    console.error('Error fetching existing subject classes:', e);
  }

  return Array.from(new Set(classList));
}
