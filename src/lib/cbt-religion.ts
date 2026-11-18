/**
 * 🕌 CBT Religion & Faith Alignment System
 * SMK Garuda Mahadhika - Enterprise CBT Engine
 *
 * Mengelola varian mata pelajaran Pendidikan Agama (Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu),
 * auto-routing pengerjaan soal siswa berdasarkan agama resmi, dan pengecualian bentrok jadwal paralel.
 */

export type ReligionCode = 'ALL' | 'ISLAM' | 'KRISTEN' | 'KATOLIK' | 'HINDU' | 'BUDDHA' | 'KHONGHUCU';

export interface ReligionOption {
  code: ReligionCode;
  label: string;
  shortLabel: string;
  badgeLabel: string;
  icon: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
}

export const RELIGION_OPTIONS: ReligionOption[] = [
  {
    code: 'ALL',
    label: 'Semua Siswa (Mapel Umum / Lintas Agama)',
    shortLabel: 'Semua Siswa',
    badgeLabel: 'Umum',
    icon: '🌐',
    bgBadge: 'bg-slate-100 dark:bg-slate-800',
    borderBadge: 'border-slate-300 dark:border-slate-700',
    textBadge: 'text-slate-700 dark:text-slate-300',
  },
  {
    code: 'ISLAM',
    label: 'Pendidikan Agama Islam & Budi Pekerti',
    shortLabel: 'Agama Islam (PAI)',
    badgeLabel: 'PAI (Islam)',
    icon: '☪️',
    bgBadge: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderBadge: 'border-emerald-300 dark:border-emerald-700',
    textBadge: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    code: 'KRISTEN',
    label: 'Pendidikan Agama Kristen & Budi Pekerti',
    shortLabel: 'Agama Kristen (PAK)',
    badgeLabel: 'PAK (Kristen)',
    icon: '✝️',
    bgBadge: 'bg-sky-50 dark:bg-sky-950/40',
    borderBadge: 'border-sky-300 dark:border-sky-700',
    textBadge: 'text-sky-700 dark:text-sky-300',
  },
  {
    code: 'KATOLIK',
    label: 'Pendidikan Agama Katolik & Budi Pekerti',
    shortLabel: 'Agama Katolik',
    badgeLabel: 'Katolik',
    icon: '✝️',
    bgBadge: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderBadge: 'border-indigo-300 dark:border-indigo-700',
    textBadge: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    code: 'HINDU',
    label: 'Pendidikan Agama Hindu & Budi Pekerti',
    shortLabel: 'Agama Hindu',
    badgeLabel: 'Hindu',
    icon: '🕉️',
    bgBadge: 'bg-amber-50 dark:bg-amber-950/40',
    borderBadge: 'border-amber-300 dark:border-amber-700',
    textBadge: 'text-amber-700 dark:text-amber-300',
  },
  {
    code: 'BUDDHA',
    label: 'Pendidikan Agama Buddha & Budi Pekerti',
    shortLabel: 'Agama Buddha',
    badgeLabel: 'Buddha',
    icon: '☸️',
    bgBadge: 'bg-orange-50 dark:bg-orange-950/40',
    borderBadge: 'border-orange-300 dark:border-orange-700',
    textBadge: 'text-orange-700 dark:text-orange-300',
  },
  {
    code: 'KHONGHUCU',
    label: 'Pendidikan Agama Khonghucu & Budi Pekerti',
    shortLabel: 'Agama Khonghucu',
    badgeLabel: 'Khonghucu',
    icon: '☯️',
    bgBadge: 'bg-rose-50 dark:bg-rose-950/40',
    borderBadge: 'border-rose-300 dark:border-rose-700',
    textBadge: 'text-rose-700 dark:text-rose-300',
  },
];

/**
 * Normalisasi kode agama dari string teks bebas (misal database / input siswa)
 */
export function normalizeReligion(input?: string | null): ReligionCode {
  if (!input) return 'ALL';
  const clean = input.trim().toUpperCase();
  if (clean === 'ISLAM' || clean.includes('ISLAM') || clean === 'PAI') return 'ISLAM';
  if (clean === 'KRISTEN' || clean.includes('KRISTEN') || clean.includes('PROTESTAN') || clean === 'PAK') return 'KRISTEN';
  if (clean === 'KATOLIK' || clean.includes('KATOLIK')) return 'KATOLIK';
  if (clean === 'HINDU' || clean.includes('HINDU')) return 'HINDU';
  if (clean === 'BUDDHA' || clean.includes('BUDDHA') || clean.includes('BUDHA')) return 'BUDDHA';
  if (clean === 'KHONGHUCU' || clean.includes('KHONGHUCU') || clean.includes('KONGHUCU')) return 'KHONGHUCU';
  return 'ALL';
}

/**
 * Dapatkan objek konfigurasi agama untuk visualisasi UI & badge
 */
export function getReligionConfig(code?: string | null): ReligionOption {
  const norm = normalizeReligion(code);
  const found = RELIGION_OPTIONS.find((r) => r.code === norm);
  return found || RELIGION_OPTIONS[0];
}

/**
 * Cek apakah dua ujian adalah varian agama yang berjalan paralel di kelas yang sama
 * (Jika ya, jadwal ini BUKAN BENTROK, melainkan sengaja berjalan serentak untuk siswa yang berbeda agama)
 */
export function isReligiousVariantParallel(
  religionA?: string | null,
  religionB?: string | null
): boolean {
  const normA = normalizeReligion(religionA);
  const normB = normalizeReligion(religionB);

  // Keduanya harus memiliki target agama spesifik yang berbeda (bukan mapel umum ALL)
  return normA !== 'ALL' && normB !== 'ALL' && normA !== normB;
}

/**
 * Cek apakah seorang siswa berhak/cocok mengerjakan paket ujian ini berdasarkan agamanya
 */
export function isStudentReligionMatch(
  examTargetReligion?: string | null,
  studentReligion?: string | null
): boolean {
  const examNorm = normalizeReligion(examTargetReligion);
  // Jika ujian untuk Semua Siswa (Umum), semua siswa berhak mengerjakan
  if (examNorm === 'ALL') return true;

  const studentNorm = normalizeReligion(studentReligion);
  // Jika target ujian spesifik, agama siswa wajib cocok
  return examNorm === studentNorm;
}
