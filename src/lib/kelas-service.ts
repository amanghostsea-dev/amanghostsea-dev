import prisma from './prisma';
import { ensureDefaultJurusans } from './jurusan-service';

export interface SchoolClassItem {
  id: string; // e.g. "cls-x-rpl-1"
  name: string; // e.g. "X RPL 1"
  level: 'X' | 'XI' | 'XII';
  jurusanCode: string; // "RPL", "DKV", etc.
  rombel: number; // 1, 2, 3...
  waliKelas?: string | null;
  waliKelasId?: string | null;
  room?: string | null;
  capacity: number; // default 36
}

export async function getManagedClasses(): Promise<SchoolClassItem[]> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'academic_classes' },
    });

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (parseErr) {
        console.error('Error parsing academic_classes:', parseErr);
      }
    }

    // Auto-seed default classes based on existing jurusans
    const jurusans = await ensureDefaultJurusans();
    const defaultClasses: SchoolClassItem[] = [];
    const levels: ('X' | 'XI' | 'XII')[] = ['X', 'XI', 'XII'];

    for (const j of jurusans) {
      const code = (j.code || '').trim().toUpperCase();
      if (!code) continue;
      for (const lvl of levels) {
        defaultClasses.push({
          id: `cls-${lvl.toLowerCase()}-${code.toLowerCase()}-1`,
          name: `${lvl} ${code} 1`,
          level: lvl,
          jurusanCode: code,
          rombel: 1,
          waliKelas: lvl === 'XI' && code === 'RPL' ? 'Abdul Rahman' : 'Bpk. Guru Pengampu',
          room: `Ruang ${code} ${lvl}`,
          capacity: 36,
        });
      }
    }

    // Save initial seed to Setting
    await prisma.setting.upsert({
      where: { key: 'academic_classes' },
      update: { value: JSON.stringify(defaultClasses) },
      create: {
        key: 'academic_classes',
        value: JSON.stringify(defaultClasses),
        description: 'Managed Academic Classes & Rombels per Jurusan',
      },
    });

    return defaultClasses;
  } catch (error) {
    console.error('Error in getManagedClasses:', error);
    return [];
  }
}

export async function saveManagedClasses(classes: SchoolClassItem[]): Promise<boolean> {
  try {
    await prisma.setting.upsert({
      where: { key: 'academic_classes' },
      update: { value: JSON.stringify(classes) },
      create: {
        key: 'academic_classes',
        value: JSON.stringify(classes),
        description: 'Managed Academic Classes & Rombels per Jurusan',
      },
    });
    return true;
  } catch (error) {
    console.error('Error in saveManagedClasses:', error);
    return false;
  }
}

