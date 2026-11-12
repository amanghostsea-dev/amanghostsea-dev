/**
 * CBT Exam Scheduling & Conflict Utilities
 * SMK Garuda Mahadhika - Enterprise CBT Engine
 */

export interface ScheduleState {
  state: 'ONGOING' | 'UPCOMING' | 'ENDED' | 'FLEXIBLE';
  label: string;
  badgeClass: string;
  countdown: string;
  isAccessible: boolean;
  isOngoingToday: boolean;
}

/**
 * Format date to Indonesian localized date string (e.g. "Kamis, 30 Okt 2026")
 */
export function formatScheduleDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time to Indonesian localized 24-hour WIB format (e.g. "08:00 WIB")
 */
export function formatScheduleTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '-';

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} WIB`;
}

/**
 * Format complete schedule range (e.g. "Kamis, 30 Okt 2026 • 08:00 - 09:30 WIB")
 */
export function formatExamScheduleRange(
  startTime?: Date | string | null,
  endTime?: Date | string | null
): string {
  if (!startTime && !endTime) {
    return 'Jadwal Fleksibel (Kapan saja)';
  }

  const start = startTime ? (typeof startTime === 'string' ? new Date(startTime) : startTime) : null;
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : null;

  if (start && (!end || isNaN(end.getTime()))) {
    return `Mulai: ${formatScheduleDate(start)} • ${formatScheduleTime(start)}`;
  }

  if (!start || isNaN(start.getTime())) {
    if (end && !isNaN(end.getTime())) {
      return `Batas Akhir: ${formatScheduleDate(end)} • ${formatScheduleTime(end)}`;
    }
    return 'Jadwal Fleksibel (Kapan saja)';
  }

  // Both start and end exist
  const isSameDay =
    start.getFullYear() === end!.getFullYear() &&
    start.getMonth() === end!.getMonth() &&
    start.getDate() === end!.getDate();

  const startHours = start.getHours().toString().padStart(2, '0');
  const startMinutes = start.getMinutes().toString().padStart(2, '0');
  const endHours = end!.getHours().toString().padStart(2, '0');
  const endMinutes = end!.getMinutes().toString().padStart(2, '0');

  if (isSameDay) {
    return `${formatScheduleDate(start)} • ${startHours}:${startMinutes} - ${endHours}:${endMinutes} WIB`;
  }

  return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${startHours}:${startMinutes} WIB s/d ${end!.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${endHours}:${endMinutes} WIB`;
}

/**
 * Calculate dynamic state, countdown, and accessibility of an exam schedule
 */
export function getExamScheduleState(
  startTime?: Date | string | null,
  endTime?: Date | string | null,
  currentExamStatus?: string,
  now: Date = new Date()
): ScheduleState {
  // If exam has no scheduled start/end, it's flexible
  if (!startTime && !endTime) {
    const isLive = currentExamStatus === 'ACTIVE';
    return {
      state: 'FLEXIBLE',
      label: isLive ? 'Sesi Aktif' : 'Fleksibel',
      badgeClass: isLive 
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      countdown: isLive ? 'Sesi Terbuka' : 'Kapan saja',
      isAccessible: isLive || currentExamStatus === 'PUBLISHED',
      isOngoingToday: false,
    };
  }

  const start = startTime ? (typeof startTime === 'string' ? new Date(startTime) : startTime) : null;
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : null;
  const nowMs = now.getTime();

  // If teacher explicitly opened session manually, it is accessible
  const teacherOpened = currentExamStatus === 'ACTIVE';

  // Check if UPCOMING (before start time)
  if (start && !isNaN(start.getTime()) && nowMs < start.getTime()) {
    const diffMs = start.getTime() - nowMs;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    let countdown = '';
    if (diffDays > 0) {
      countdown = `Dimulai dlm ${diffDays} hari ${diffHour % 24} jam`;
    } else if (diffHour > 0) {
      countdown = `Dimulai dlm ${diffHour} jam ${diffMin % 60} mnt`;
    } else if (diffMin > 0) {
      countdown = `Dimulai dlm ${diffMin} menit`;
    } else {
      countdown = 'Segera dimulai...';
    }

    return {
      state: 'UPCOMING',
      label: 'Belum Dimulai',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      countdown,
      isAccessible: teacherOpened, // only accessible early if teacher opened manually
      isOngoingToday: diffDays === 0,
    };
  }

  // Check if ENDED (after end time)
  if (end && !isNaN(end.getTime()) && nowMs > end.getTime()) {
    return {
      state: 'ENDED',
      label: 'Waktu Berakhir',
      badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      countdown: 'Telah Berakhir',
      isAccessible: teacherOpened, // only if teacher explicitly extended/opened
      isOngoingToday: false,
    };
  }

  // Currently ONGOING (within scheduled window)
  let remainingCountdown = 'Sedang Berlangsung';
  if (end && !isNaN(end.getTime())) {
    const diffMs = end.getTime() - nowMs;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffHour > 0) {
      remainingCountdown = `Sisa ${diffHour} jam ${diffMin % 60} mnt`;
    } else if (diffMin > 0) {
      remainingCountdown = `Sisa ${diffMin} menit lagi`;
    } else {
      remainingCountdown = 'Detik-detik penutupan';
    }
  }

  return {
    state: 'ONGOING',
    label: 'Sedang Berlangsung',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 animate-pulse',
    countdown: remainingCountdown,
    isAccessible: true,
    isOngoingToday: true,
  };
}

/**
 * Format a Date to string value for HTML5 datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocalInput(date?: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Extract academic level from a class name or target string ('X' | 'XI' | 'XII')
 */
export function extractClassLevel(className?: string | null): 'X' | 'XI' | 'XII' | null {
  if (!className) return null;
  const clean = className.trim().toUpperCase();

  // Explicit check for XII first
  if (
    /\bXII\b/.test(clean) ||
    /\b12\b/.test(clean) ||
    clean.startsWith('XII ') ||
    clean.startsWith('XII-') ||
    clean.includes('TINGKAT XII') ||
    clean.includes('KELAS XII')
  ) {
    return 'XII';
  }

  // Explicit check for XI second
  if (
    /\bXI\b/.test(clean) ||
    /\b11\b/.test(clean) ||
    clean.startsWith('XI ') ||
    clean.startsWith('XI-') ||
    clean.includes('TINGKAT XI') ||
    clean.includes('KELAS XI')
  ) {
    return 'XI';
  }

  // Explicit check for X third
  if (
    /\bX\b/.test(clean) ||
    /\b10\b/.test(clean) ||
    clean.startsWith('X ') ||
    clean.startsWith('X-') ||
    clean.includes('TINGKAT X') ||
    clean.includes('KELAS X')
  ) {
    return 'X';
  }

  return null;
}

/**
 * Check if a target string represents a level-wide or school-wide preset
 */
export function isAllLevelTarget(target?: string | null): 'X' | 'XI' | 'XII' | 'ALL' | null {
  if (!target) return null;
  const clean = target.trim().toUpperCase();

  if (
    clean === 'SEMUA KELAS' ||
    clean === 'SEMUA SISWA' ||
    clean === 'ALL' ||
    clean === 'SELURUH KELAS'
  ) {
    return 'ALL';
  }

  if (
    clean.includes('SEMUA KELAS XII') ||
    clean.includes('SEMUA JURUSAN TINGKAT XII') ||
    clean.includes('SELURUH JURUSAN TINGKAT XII') ||
    clean === 'TINGKAT XII'
  ) {
    return 'XII';
  }

  if (
    clean.includes('SEMUA KELAS XI') ||
    clean.includes('SEMUA JURUSAN TINGKAT XI') ||
    clean.includes('SELURUH JURUSAN TINGKAT XI') ||
    clean === 'TINGKAT XI'
  ) {
    return 'XI';
  }

  if (
    clean.includes('SEMUA KELAS X') ||
    clean.includes('SEMUA JURUSAN TINGKAT X') ||
    clean.includes('SELURUH JURUSAN TINGKAT X') ||
    clean === 'TINGKAT X'
  ) {
    return 'X';
  }

  return null;
}

/**
 * Parse a potentially comma-separated or multi-class target string into an array of class strings
 */
export function parseClassTargets(target?: string | null): string[] {
  if (!target || !target.trim()) return ['Semua Kelas'];
  return target
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Check if an exam target matches a student's class
 */
export function isClassTargetMatch(
  examClassTarget?: string | null,
  studentClass?: string | null
): boolean {
  if (!examClassTarget || examClassTarget.trim() === 'Semua Kelas') {
    return true;
  }
  if (!studentClass || !studentClass.trim()) {
    return true; // fallback if student class is undetermined
  }

  const levelTarget = isAllLevelTarget(examClassTarget);
  if (levelTarget === 'ALL') {
    return true;
  }

  const studentLevel = extractClassLevel(studentClass);

  if (levelTarget) {
    return studentLevel === levelTarget;
  }

  const targetList = parseClassTargets(examClassTarget);
  const normalizedStudent = studentClass.trim().toLowerCase();

  for (const t of targetList) {
    const tClean = t.trim().toLowerCase();
    if (tClean === 'semua kelas') return true;
    if (tClean === normalizedStudent) return true;
    if (tClean.replace(/\s+/g, '') === normalizedStudent.replace(/\s+/g, '')) return true;

    // In case target list contains a level-wide element e.g. "Semua Kelas X"
    const tLevel = isAllLevelTarget(t);
    if (tLevel && studentLevel === tLevel) {
      return true;
    }
  }

  return false;
}

/**
 * Anti-Bentrok Conflict Overlap Matcher:
 * Checks whether two class target strings have any overlapping students/classes
 */
export function isClassOverlap(
  targetA?: string | null,
  targetB?: string | null
): boolean {
  if (!targetA || !targetB) return false;
  const aTrim = targetA.trim();
  const bTrim = targetB.trim();

  // If either targets all classes across the school
  if (aTrim === 'Semua Kelas' || bTrim === 'Semua Kelas') {
    return true;
  }

  const lvlA = isAllLevelTarget(aTrim);
  const lvlB = isAllLevelTarget(bTrim);

  // Both are level-wide
  if (lvlA && lvlB) {
    if (lvlA === 'ALL' || lvlB === 'ALL') return true;
    return lvlA === lvlB;
  }

  // targetA is level-wide, targetB is specific class(es)
  if (lvlA) {
    if (lvlA === 'ALL') return true;
    const classesB = parseClassTargets(bTrim);
    return classesB.some((c) => extractClassLevel(c) === lvlA);
  }

  // targetB is level-wide, targetA is specific class(es)
  if (lvlB) {
    if (lvlB === 'ALL') return true;
    const classesA = parseClassTargets(aTrim);
    return classesA.some((c) => extractClassLevel(c) === lvlB);
  }

  // Neither is level-wide, check individual/multi-class intersection
  const listA = parseClassTargets(aTrim).map((c) => c.toLowerCase().replace(/\s+/g, ''));
  const listB = parseClassTargets(bTrim).map((c) => c.toLowerCase().replace(/\s+/g, ''));

  return listA.some((itemA) => listB.includes(itemA));
}

/**
 * Prettify Class Target for clean display in badges, cards, and tables
 */
export function formatClassTargetDisplay(target?: string | null): string {
  if (!target || !target.trim() || target.trim() === 'Semua Kelas') {
    return '🌐 Semua Kelas (Semua Siswa)';
  }

  const clean = target.trim();
  const lvl = isAllLevelTarget(clean);
  if (lvl === 'X') return '🎯 Semua Kelas X (Semua Jurusan)';
  if (lvl === 'XI') return '🎯 Semua Kelas XI (Semua Jurusan)';
  if (lvl === 'XII') return '🎯 Semua Kelas XII (Semua Jurusan)';
  if (lvl === 'ALL') return '🌐 Semua Kelas (Semua Siswa)';

  const parsed = parseClassTargets(clean);
  if (parsed.length > 1) {
    return `👥 ${parsed.length} Kelas: ${parsed.slice(0, 2).join(', ')}${parsed.length > 2 ? '...' : ''}`;
  }

  return clean;
}

/**
 * Extract Jurusan / Major code from a class name (e.g. "X DKV 1" -> "DKV", "XI RPL 2" -> "RPL")
 */
export function extractJurusanCode(className?: string | null): string | null {
  if (!className) return null;
  const clean = className.trim().toUpperCase();

  // If the string is a general level preset or "Semua Kelas"
  if (clean === 'SEMUA KELAS' || clean === 'SEMUA SISWA' || clean === 'ALL' || clean === 'SELURUH KELAS') {
    return null;
  }

  // 1. Direct match with common vocational school major codes
  const commonMatch = clean.match(
    /\b(DKV|RPL|MPLB|TJKT|TKJ|AKL|OTKP|BDP|TBSM|TKRO|MM|SIJA|PPLG|TO|TP|TB|PH|ULW|KULINER)\b/i
  );
  if (commonMatch && commonMatch[1]) {
    return commonMatch[1].toUpperCase();
  }

  // 2. Generic pattern: (X|XI|XII)[ -]+([A-Za-z]+)(?:[ -]+\d+)?
  const genericMatch = clean.match(
    /(?:X|XI|XII|10|11|12)[\s\-_]+([A-Za-z]{2,10})(?:[\s\-_]+\d+)?/i
  );
  if (genericMatch && genericMatch[1]) {
    const code = genericMatch[1].toUpperCase();
    if (!['KELAS', 'TINGKAT', 'SEMUA', 'JURUSAN', 'SISWA'].includes(code)) {
      return code;
    }
  }

  return null;
}

/**
 * Get human-readable full title of a vocational major
 */
export function getJurusanFullName(code?: string | null): string {
  if (!code) return 'Umum / Semua Jurusan';
  const c = code.trim().toUpperCase();
  const map: Record<string, string> = {
    DKV: 'Desain Komunikasi Visual (DKV)',
    RPL: 'Pengembangan Perangkat Lunak & Gim (RPL)',
    PPLG: 'Pengembangan Perangkat Lunak & Gim (PPLG)',
    MPLB: 'Manajemen Perkantoran & Layanan Bisnis (MPLB)',
    TJKT: 'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
    TKJ: 'Teknik Komputer & Jaringan (TKJ)',
    AKL: 'Akuntansi & Keuangan Lembaga (AKL)',
    OTKP: 'Otomatisasi & Tata Kelola Perkantoran (OTKP)',
    BDP: 'Bisnis Daring & Pemasaran (BDP)',
    TBSM: 'Teknik & Bisnis Sepeda Motor (TBSM)',
    TKRO: 'Teknik Kendaraan Ringan Otomotif (TKRO)',
    MM: 'Multimedia (MM)',
  };

  return map[c] || `Jurusan ${c}`;
}

