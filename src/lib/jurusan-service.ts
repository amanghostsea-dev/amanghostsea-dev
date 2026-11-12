import prisma from './prisma';
import { getManagedClasses } from './kelas-service';

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
 * Menghasilkan daftar target kelas yang sinkron dengan Manajemen Kelas & Rombel.
 */
export async function getDynamicClassTargets(): Promise<string[]> {
  const levelPresets = [
    'Semua Kelas',
    'Semua Kelas X (Semua Jurusan)',
    'Semua Kelas XI (Semua Jurusan)',
    'Semua Kelas XII (Semua Jurusan)',
  ];

  try {
    const managedClasses = await getManagedClasses();
    if (managedClasses && managedClasses.length > 0) {
      const names = managedClasses.map((c) => c.name);
      return Array.from(new Set([...levelPresets, ...names]));
    }
  } catch (err) {
    console.error('Error fetching managed classes in getDynamicClassTargets:', err);
  }

  // Fallback ke generator berbasis Jurusan
  const jurusans = await ensureDefaultJurusans();
  const classList: string[] = [...levelPresets];
  const levels = ['X', 'XI', 'XII'];

  for (const j of jurusans) {
    const code = (j.code || '').trim().toUpperCase();
    if (!code) continue;
    for (const lvl of levels) {
      classList.push(`${lvl} ${code} 1`);
    }
  }

  return Array.from(new Set(classList));
}
