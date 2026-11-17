/**
 * CBT Exam Scheduling & Conflict Utilities
 * SMK Garuda Mahadhika - Enterprise CBT Engine
 */

export type CbtTimezone = 'WIB' | 'WITA' | 'WIT';

export const TIMEZONE_IANA_MAP: Record<CbtTimezone, string> = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
};

export const TIMEZONE_LABEL_MAP: Record<CbtTimezone, string> = {
  WIB: 'WIB (UTC+7)',
  WITA: 'WITA (UTC+8)',
  WIT: 'WIT (UTC+9)',
};

export const TIMEZONE_OFFSET_MAP: Record<CbtTimezone, string> = {
  WIB: '+07:00',
  WITA: '+08:00',
  WIT: '+09:00',
};

export const DEFAULT_CBT_TIMEZONE: CbtTimezone = 'WITA';

export interface ScheduleState {
  state: 'ONGOING' | 'UPCOMING' | 'ENDED' | 'FLEXIBLE';
  label: string;
  badgeClass: string;
  countdown: string;
  isAccessible: boolean;
  isOngoingToday: boolean;
  isLive?: boolean;
  isOutsideSchedule?: boolean;
  isTokenActive?: boolean;
  isSusulan?: boolean;
  scheduleDiscrepancyType?: 'PRE_SCHEDULE' | 'POST_SCHEDULE' | null;
  scheduleDiscrepancyNotice?: string;
}

export interface ExamTokenStatus {
  isActive: boolean;
  isExpired: boolean;
  isSusulan: boolean;
  displayToken: string;
  rawToken: string;
  statusLabel: string;
  badgeText: string;
  badgeClass: string;
  canReactivate: boolean;
  reason?: string;
  remainingSusulanMinutes?: number;
}

/**
 * Extract time parts (year, month, day, hour, minute, second) in specific Indonesian timezone
 */
export function getTimePartsInTimezone(
  date: Date | string,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const iana = TIMEZONE_IANA_MAP[tz] || 'Asia/Makassar';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

/**
 * Format date to Indonesian localized date string (e.g. "Kamis, 30 Okt 2026")
 */
export function formatScheduleDate(
  date: Date | string,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('id-ID', {
    timeZone: TIMEZONE_IANA_MAP[tz] || 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time to Indonesian localized 24-hour format with selected timezone (e.g. "08:00 WITA")
 */
export function formatScheduleTime(
  date: Date | string,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '-';

  const { hour, minute } = getTimePartsInTimezone(d, tz);
  return `${hour}:${minute} ${tz}`;
}

/**
 * Format complete schedule range (e.g. "Kamis, 30 Okt 2026 • 08:00 - 09:30 WITA")
 */
export function formatExamScheduleRange(
  startTime?: Date | string | null,
  endTime?: Date | string | null,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  if (!startTime && !endTime) {
    return 'Jadwal Fleksibel (Kapan saja)';
  }

  const start = startTime ? (typeof startTime === 'string' ? new Date(startTime) : startTime) : null;
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : null;

  if (start && (!end || isNaN(end.getTime()))) {
    return `Mulai: ${formatScheduleDate(start, tz)} • ${formatScheduleTime(start, tz)}`;
  }

  if (!start || isNaN(start.getTime())) {
    if (end && !isNaN(end.getTime())) {
      return `Batas Akhir: ${formatScheduleDate(end, tz)} • ${formatScheduleTime(end, tz)}`;
    }
    return 'Jadwal Fleksibel (Kapan saja)';
  }

  // Both start and end exist: compare day in target timezone
  const startParts = getTimePartsInTimezone(start, tz);
  const endParts = getTimePartsInTimezone(end!, tz);
  const isSameDay =
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day;

  if (isSameDay) {
    return `${formatScheduleDate(start, tz)} • ${startParts.hour}:${startParts.minute} - ${endParts.hour}:${endParts.minute} ${tz}`;
  }

  const iana = TIMEZONE_IANA_MAP[tz] || 'Asia/Makassar';
  const startDay = start.toLocaleDateString('id-ID', { timeZone: iana, day: 'numeric', month: 'short' });
  const endDay = end!.toLocaleDateString('id-ID', { timeZone: iana, day: 'numeric', month: 'short' });

  return `${startDay}, ${startParts.hour}:${startParts.minute} ${tz} s/d ${endDay}, ${endParts.hour}:${endParts.minute} ${tz}`;
}

export interface FormattedExamSchedule {
  hasSchedule: boolean;
  dateText: string;             // e.g. "Senin, 23 Nov 2026"
  timeRangeText: string;        // e.g. "08:00 - 09:30 WITA"
  startTimeFormatted: string;   // e.g. "08:00 WITA"
  endTimeFormatted: string;     // e.g. "09:30 WITA"
  startTimeOnly: string;        // e.g. "08:00"
  endTimeOnly: string;          // e.g. "09:30"
  isSameDay: boolean;
  isMultiDay: boolean;
  timezone: CbtTimezone;
  fullScheduleText: string;     // e.g. "Senin, 23 Nov 2026 • 08:00 - 09:30 WITA"
}

/**
 * Extract clean, structured date and time parts for cards, modals, and tables
 * Ensures start & end hours are always visible and never cut off by ellipsis
 */
export function getExamScheduleDetails(
  startTime?: Date | string | null,
  endTime?: Date | string | null,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): FormattedExamSchedule {
  if (!startTime && !endTime) {
    return {
      hasSchedule: false,
      dateText: 'Jadwal Fleksibel',
      timeRangeText: 'Kapan Saja (Bebas)',
      startTimeFormatted: '-',
      endTimeFormatted: '-',
      startTimeOnly: '-',
      endTimeOnly: '-',
      isSameDay: true,
      isMultiDay: false,
      timezone: tz,
      fullScheduleText: 'Jadwal Fleksibel (Kapan saja)',
    };
  }

  const start = startTime ? (typeof startTime === 'string' ? new Date(startTime) : startTime) : null;
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : null;

  const validStart = start && !isNaN(start.getTime());
  const validEnd = end && !isNaN(end.getTime());

  if (validStart && !validEnd) {
    const startParts = getTimePartsInTimezone(start!, tz);
    const dateText = formatScheduleDate(start!, tz);
    const timeRangeText = `Mulai ${startParts.hour}:${startParts.minute} ${tz}`;
    return {
      hasSchedule: true,
      dateText,
      timeRangeText,
      startTimeFormatted: `${startParts.hour}:${startParts.minute} ${tz}`,
      endTimeFormatted: 'Selesai Bebas',
      startTimeOnly: `${startParts.hour}:${startParts.minute}`,
      endTimeOnly: 'Bebas',
      isSameDay: true,
      isMultiDay: false,
      timezone: tz,
      fullScheduleText: `Mulai: ${dateText} • ${startParts.hour}:${startParts.minute} ${tz}`,
    };
  }

  if (!validStart && validEnd) {
    const endParts = getTimePartsInTimezone(end!, tz);
    const dateText = formatScheduleDate(end!, tz);
    const timeRangeText = `Batas Akhir ${endParts.hour}:${endParts.minute} ${tz}`;
    return {
      hasSchedule: true,
      dateText,
      timeRangeText,
      startTimeFormatted: 'Bebas Mulai',
      endTimeFormatted: `${endParts.hour}:${endParts.minute} ${tz}`,
      startTimeOnly: 'Bebas',
      endTimeOnly: `${endParts.hour}:${endParts.minute}`,
      isSameDay: true,
      isMultiDay: false,
      timezone: tz,
      fullScheduleText: `Batas Akhir: ${dateText} • ${endParts.hour}:${endParts.minute} ${tz}`,
    };
  }

  const startParts = getTimePartsInTimezone(start!, tz);
  const endParts = getTimePartsInTimezone(end!, tz);
  const isSameDay =
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day;

  if (isSameDay) {
    const dateText = formatScheduleDate(start!, tz);
    const timeRangeText = `${startParts.hour}:${startParts.minute} - ${endParts.hour}:${endParts.minute} ${tz}`;
    return {
      hasSchedule: true,
      dateText,
      timeRangeText,
      startTimeFormatted: `${startParts.hour}:${startParts.minute} ${tz}`,
      endTimeFormatted: `${endParts.hour}:${endParts.minute} ${tz}`,
      startTimeOnly: `${startParts.hour}:${startParts.minute}`,
      endTimeOnly: `${endParts.hour}:${endParts.minute}`,
      isSameDay: true,
      isMultiDay: false,
      timezone: tz,
      fullScheduleText: `${dateText} • ${timeRangeText}`,
    };
  }

  const iana = TIMEZONE_IANA_MAP[tz] || 'Asia/Makassar';
  const startDay = start!.toLocaleDateString('id-ID', { timeZone: iana, weekday: 'short', day: 'numeric', month: 'short' });
  const endDay = end!.toLocaleDateString('id-ID', { timeZone: iana, weekday: 'short', day: 'numeric', month: 'short' });
  const dateText = `${startDay} s/d ${endDay}`;
  const timeRangeText = `${startParts.hour}:${startParts.minute} (${startDay}) - ${endParts.hour}:${endParts.minute} (${endDay}) ${tz}`;

  return {
    hasSchedule: true,
    dateText,
    timeRangeText,
    startTimeFormatted: `${startDay} ${startParts.hour}:${startParts.minute} ${tz}`,
    endTimeFormatted: `${endDay} ${endParts.hour}:${endParts.minute} ${tz}`,
    startTimeOnly: `${startParts.hour}:${startParts.minute}`,
    endTimeOnly: `${endParts.hour}:${endParts.minute}`,
    isSameDay: false,
    isMultiDay: true,
    timezone: tz,
    fullScheduleText: `${dateText} • ${timeRangeText}`,
  };
}

/**
 * 🔑 Evaluator Status Token CBT Cerdas & Otomatis:
 * 1. Jika ujian memiliki jadwal endTime dan waktu sekarang > endTime:
 *    - Token OTOMATIS NONAKTIF (KADALUARSA / WAKTU SELESAI).
 *    - Kecuali jika pengawas secara eksplisit mengaktifkan sesi Ujian Susulan (re-activated setelah endTime).
 *    - Sesi susulan aktif selama durasi ujian (+ grace period 15 menit).
 * 2. Jika pengawas ingin membuka lagi di luar jam, pengawas dapat merilis ulang (Rilis Susulan).
 * 3. Siswa tidak dapat mengakses/memasukkan token ujian yang sudah kedaluwarsa kecuali susulan aktif.
 */
export function isExamTokenActive(
  exam: {
    status?: string | null;
    token?: string | null;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    updatedAt?: Date | string | null;
    duration?: number | null;
  },
  now: Date = new Date()
): ExamTokenStatus {
  const rawToken = exam.token ? exam.token.split('|')[0].trim().toUpperCase() : '';
  const status = exam.status || 'PUBLISHED';
  const duration = exam.duration && exam.duration > 0 ? exam.duration : 60;

  // 1. Status Draft, Archived, atau Closed selalu nonaktif
  if (['DRAFT', 'ARCHIVED', 'CLOSED'].includes(status)) {
    return {
      isActive: false,
      isExpired: false,
      isSusulan: false,
      displayToken: 'NONAKTIF',
      rawToken,
      statusLabel: 'STATUS TOKEN:',
      badgeText: status === 'DRAFT' ? 'DRAFT' : 'DITUTUP',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      canReactivate: false,
      reason: 'Sesi ujian ini sedang berstatus Draft atau telah resmi ditutup.',
    };
  }

  const start = exam.startTime ? (typeof exam.startTime === 'string' ? new Date(exam.startTime) : exam.startTime) : null;
  const end = exam.endTime ? (typeof exam.endTime === 'string' ? new Date(exam.endTime) : exam.endTime) : null;
  const updatedAt = exam.updatedAt ? (typeof exam.updatedAt === 'string' ? new Date(exam.updatedAt) : exam.updatedAt) : null;
  const nowMs = now.getTime();

  // 2. Jika paket ujian memiliki jadwal Selesai (endTime) dan waktu sekarang telah lewat endTime
  if (end && !isNaN(end.getTime()) && nowMs > end.getTime()) {
    // Cek apakah pengawas secara eksplisit membuka kembali sesi Susulan setelah endTime
    const isProctorReactivatedAfterEnd =
      status === 'ACTIVE' &&
      updatedAt &&
      !isNaN(updatedAt.getTime()) &&
      updatedAt.getTime() >= end.getTime();

    // Sesi susulan aktif selama durasi ujian (+ 15 menit toleransi login)
    const susulanWindowMs = (duration + 15) * 60 * 1000;
    const isWithinSusulanWindow =
      isProctorReactivatedAfterEnd &&
      nowMs <= updatedAt.getTime() + susulanWindowMs;

    if (isWithinSusulanWindow) {
      const remainingMs = updatedAt.getTime() + susulanWindowMs - nowMs;
      const remainingMins = Math.max(1, Math.round(remainingMs / 60000));
      return {
        isActive: true,
        isExpired: false,
        isSusulan: true,
        displayToken: rawToken || 'SMK2026',
        rawToken,
        statusLabel: 'TOKEN (SUSULAN AKTIF):',
        badgeText: 'SUSULAN AKTIF',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse',
        canReactivate: true,
        remainingSusulanMinutes: remainingMins,
      };
    }

    // Default: OTOMATIS NONAKTIF saat waktu pengerjaan berakhir
    return {
      isActive: false,
      isExpired: true,
      isSusulan: false,
      displayToken: 'NONAKTIF (WAKTU SELESAI)',
      rawToken,
      statusLabel: 'STATUS TOKEN:',
      badgeText: 'KADALUARSA',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      canReactivate: true,
      reason: 'Waktu pelaksanaan ujian sesuai jadwal resmi telah berakhir. Token telah otomatis dinonaktifkan.',
    };
  }

  // 3. Sebelum jam mulai resmi (Pra-Jadwal)
  if (start && !isNaN(start.getTime()) && nowMs < start.getTime()) {
    if (status === 'ACTIVE') {
      return {
        isActive: true,
        isExpired: false,
        isSusulan: false,
        displayToken: rawToken || 'SMK2026',
        rawToken,
        statusLabel: 'TOKEN LIVE (PRA-JADWAL):',
        badgeText: 'DIBUKA AWAL',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 animate-pulse',
        canReactivate: false,
      };
    }

    return {
      isActive: false,
      isExpired: false,
      isSusulan: false,
      displayToken: 'BELUM AKTIF',
      rawToken,
      statusLabel: 'STATUS TOKEN:',
      badgeText: 'BELUM DIMULAI',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      canReactivate: true,
      reason: 'Ujian ini belum dimulai sesuai jadwal resmi.',
    };
  }

  // 4. Dalam rentang jadwal resmi (Ongoing) ATAU Fleksibel
  if (status === 'ACTIVE') {
    return {
      isActive: true,
      isExpired: false,
      isSusulan: false,
      displayToken: rawToken || 'SMK2026',
      rawToken,
      statusLabel: 'TOKEN LIVE:',
      badgeText: 'AKTIF (LIVE)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 animate-pulse',
      canReactivate: false,
    };
  }

  return {
    isActive: false,
    isExpired: false,
    isSusulan: false,
    displayToken: 'BELUM AKTIF',
    rawToken,
    statusLabel: 'STATUS TOKEN:',
    badgeText: 'SIAP DIRILIS',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    canReactivate: true,
    reason: 'Sesi ujian belum diaktifkan oleh pengawas.',
  };
}

/**
 * Calculate dynamic state, countdown, and accessibility of an exam schedule
 */
export function getExamScheduleState(
  startTime?: Date | string | null,
  endTime?: Date | string | null,
  currentExamStatus?: string,
  now: Date = new Date(),
  updatedAt?: Date | string | null,
  durationMinutes: number = 60
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
      isLive,
      isTokenActive: isLive,
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

    if (teacherOpened) {
      return {
        state: 'ONGOING',
        label: 'Sesi Live (Pra-Jadwal)',
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800 animate-pulse',
        countdown: `Sesi Terbuka (${countdown})`,
        isAccessible: true,
        isOngoingToday: diffDays === 0,
        isLive: true,
        isTokenActive: true,
        isOutsideSchedule: true,
        scheduleDiscrepancyType: 'PRE_SCHEDULE',
        scheduleDiscrepancyNotice: 'Sesi ujian dibuka manual oleh pengawas sebelum jadwal resmi.',
      };
    }

    return {
      state: 'UPCOMING',
      label: 'Belum Dimulai',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      countdown,
      isAccessible: false,
      isOngoingToday: diffDays === 0,
      isLive: false,
      isTokenActive: false,
      isOutsideSchedule: false,
    };
  }

  // Check if ENDED (after end time)
  if (end && !isNaN(end.getTime()) && nowMs > end.getTime()) {
    const updatedDate = updatedAt ? (typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt) : null;
    const susulanWindowMs = (Math.max(15, durationMinutes) + 15) * 60 * 1000;
    const isSusulanActive =
      teacherOpened &&
      updatedDate &&
      !isNaN(updatedDate.getTime()) &&
      updatedDate.getTime() >= end.getTime() &&
      nowMs <= updatedDate.getTime() + susulanWindowMs;

    if (isSusulanActive) {
      const remainingSusulanMs = updatedDate.getTime() + susulanWindowMs - nowMs;
      const remainingSusulanMins = Math.max(1, Math.round(remainingSusulanMs / 60000));

      return {
        state: 'ONGOING',
        label: 'Sesi Live (Susulan)',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse',
        countdown: `Sesi Susulan Aktif (${remainingSusulanMins} mnt lagi)`,
        isAccessible: true,
        isOngoingToday: false,
        isLive: true,
        isTokenActive: true,
        isSusulan: true,
        isOutsideSchedule: true,
        scheduleDiscrepancyType: 'POST_SCHEDULE',
        scheduleDiscrepancyNotice: 'Sesi dibuka manual oleh pengawas di luar rentang jadwal resmi (Mode Ujian Susulan). Siswa tetap dapat mengerjakan.',
      };
    }

    return {
      state: 'ENDED',
      label: 'Waktu Berakhir',
      badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      countdown: 'Telah Berakhir',
      isAccessible: false,
      isOngoingToday: false,
      isLive: false,
      isTokenActive: false,
      isOutsideSchedule: false,
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
    isLive: teacherOpened,
    isTokenActive: teacherOpened,
    isOutsideSchedule: false,
  };
}

export interface ScheduleDiscrepancyResult {
  isOutside: boolean;
  type: 'PRE_SCHEDULE' | 'POST_SCHEDULE' | null;
  headline: string;
  message: string;
  diffHumanText: string;
  scheduledRangeText?: string;
  formattedCurrentTime?: string;
}

/**
 * ⏰ Schedule Discrepancy Checker
 * Evaluates whether releasing an exam token or activating a session right now
 * happens outside the officially configured schedule window.
 */
export function checkScheduleDiscrepancy(
  startTime?: Date | string | null,
  endTime?: Date | string | null,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE,
  now: Date = new Date()
): ScheduleDiscrepancyResult {
  const iana = TIMEZONE_IANA_MAP[tz] || 'Asia/Makassar';
  const currentFormatted = now.toLocaleDateString('id-ID', {
    timeZone: iana,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' pukul ' + now.toLocaleTimeString('id-ID', {
    timeZone: iana,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ` ${tz}`;

  if (!startTime && !endTime) {
    return {
      isOutside: false,
      type: null,
      headline: 'Jadwal Fleksibel',
      message: 'Ujian ini tidak memiliki batasan tanggal atau jam khusus.',
      diffHumanText: '',
      formattedCurrentTime: currentFormatted,
    };
  }

  const start = startTime ? (typeof startTime === 'string' ? new Date(startTime) : startTime) : null;
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : null;
  const nowMs = now.getTime();
  const rangeDetails = getExamScheduleDetails(startTime, endTime, tz);

  // Check if current time is before start time
  if (start && !isNaN(start.getTime()) && nowMs < start.getTime()) {
    const diffMs = start.getTime() - nowMs;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    let diffHumanText = '';
    if (diffDays > 0) {
      diffHumanText = `${diffDays} hari ${diffHour % 24} jam lagi`;
    } else if (diffHour > 0) {
      diffHumanText = `${diffHour} jam ${diffMin % 60} menit lagi`;
    } else if (diffMin > 0) {
      diffHumanText = `${diffMin} menit lagi`;
    } else {
      diffHumanText = 'kurang dari 1 menit lagi';
    }

    return {
      isOutside: true,
      type: 'PRE_SCHEDULE',
      headline: 'Waktu Ujian Belum Dimulai',
      message: `Jadwal resmi paket ujian ini baru akan dimulai dalam ${diffHumanText} (${rangeDetails.timeRangeText}).`,
      diffHumanText,
      scheduledRangeText: `${rangeDetails.dateText}, ${rangeDetails.timeRangeText}`,
      formattedCurrentTime: currentFormatted,
    };
  }

  // Check if current time is after end time
  if (end && !isNaN(end.getTime()) && nowMs > end.getTime()) {
    const diffMs = nowMs - end.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    let diffHumanText = '';
    if (diffDays > 0) {
      diffHumanText = `${diffDays} hari ${diffHour % 24} jam yang lalu`;
    } else if (diffHour > 0) {
      diffHumanText = `${diffHour} jam ${diffMin % 60} menit yang lalu`;
    } else if (diffMin > 0) {
      diffHumanText = `${diffMin} menit yang lalu`;
    } else {
      diffHumanText = 'baru saja berakhir';
    }

    return {
      isOutside: true,
      type: 'POST_SCHEDULE',
      headline: 'Jadwal Resmi Telah Berakhir',
      message: `Waktu pengerjaan sesuai paket ujian ini telah berakhir ${diffHumanText} (${rangeDetails.timeRangeText}).`,
      diffHumanText,
      scheduledRangeText: `${rangeDetails.dateText}, ${rangeDetails.timeRangeText}`,
      formattedCurrentTime: currentFormatted,
    };
  }

  // Within scheduled window
  return {
    isOutside: false,
    type: null,
    headline: 'Sesuai Jadwal Resmi',
    message: 'Waktu saat ini berada dalam rentang jadwal pelaksanaan ujian.',
    diffHumanText: 'Sedang Berlangsung',
    scheduledRangeText: `${rangeDetails.dateText}, ${rangeDetails.timeRangeText}`,
    formattedCurrentTime: currentFormatted,
  };
}

/**
 * Format a Date to string value for HTML5 datetime-local input (YYYY-MM-DDTHH:mm)
 * according to the specified Indonesian timezone (WIB, WITA, WIT)
 */
export function toDateTimeLocalInput(
  date?: Date | string | null,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';

  const { year, month, day, hour, minute } = getTimePartsInTimezone(d, tz);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Convert HTML5 datetime-local string (YYYY-MM-DDTHH:mm) into a fully qualified ISO string
 * preserving the target Indonesian timezone offset (+07:00 for WIB, +08:00 for WITA, +09:00 for WIT)
 */
export function parseDateTimeInputToIso(
  val?: string | null,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  if (!val || !val.trim()) return '';
  const clean = val.trim();
  // If already has timezone offset (+HH:mm or -HH:mm) or ends with Z, return as is
  if (/([+-]\d{2}:\d{2}|Z)$/i.test(clean)) {
    return clean;
  }
  const offset = TIMEZONE_OFFSET_MAP[tz] || '+08:00';
  if (clean.length === 16) {
    return `${clean}:00${offset}`;
  }
  if (clean.length === 19) {
    return `${clean}${offset}`;
  }
  return `${clean}${offset}`;
}

/**
 * ⚡ Add duration (in minutes) to a datetime-local input string (YYYY-MM-DDTHH:mm)
 * strictly evaluated in the target Indonesian timezone (WIB, WITA, WIT),
 * completely immune to client device system timezone differences.
 */
export function addDurationToDateTimeInput(
  val?: string | null,
  durationMinutes: number = 60,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  if (!val || !val.trim()) return '';
  const iso = parseDateTimeInputToIso(val, tz);
  const start = new Date(iso);
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return toDateTimeLocalInput(end, tz);
}

/**
 * ⚡ Generate a rock-solid preset datetime-local string (YYYY-MM-DDTHH:mm) in target timezone
 * completely immune to client device system timezone differences or .setHours() leakage.
 */
export function getPresetDateTimeInTimezone(
  dayOffset: number = 0,
  hour: number = 8,
  minute: number = 0,
  tz: CbtTimezone = DEFAULT_CBT_TIMEZONE
): string {
  const now = new Date();
  const parts = getTimePartsInTimezone(now, tz);
  const baseDate = new Date(parseDateTimeInputToIso(`${parts.year}-${parts.month}-${parts.day}T12:00`, tz));
  baseDate.setDate(baseDate.getDate() + dayOffset);
  const targetParts = getTimePartsInTimezone(baseDate, tz);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${targetParts.year}-${targetParts.month}-${targetParts.day}T${pad(hour)}:${pad(minute)}`;
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
    clean === 'SELURUH KELAS' ||
    clean.includes('SEMUA KELAS (SEMUA SISWA)')
  ) {
    return 'ALL';
  }

  if (
    clean === 'XII' ||
    clean === 'KELAS XII' ||
    clean === 'TINGKAT XII' ||
    clean === 'SEMUA XII' ||
    clean.includes('SEMUA KELAS XII') ||
    clean.includes('SEMUA JURUSAN TINGKAT XII') ||
    clean.includes('SELURUH JURUSAN TINGKAT XII') ||
    clean.includes('TINGKAT XII')
  ) {
    return 'XII';
  }

  if (
    clean === 'XI' ||
    clean === 'KELAS XI' ||
    clean === 'TINGKAT XI' ||
    clean === 'SEMUA XI' ||
    clean.includes('SEMUA KELAS XI') ||
    clean.includes('SEMUA JURUSAN TINGKAT XI') ||
    clean.includes('SELURUH JURUSAN TINGKAT XI') ||
    clean.includes('TINGKAT XI')
  ) {
    return 'XI';
  }

  if (
    clean === 'X' ||
    clean === 'KELAS X' ||
    clean === 'TINGKAT X' ||
    clean === 'SEMUA X' ||
    clean.includes('SEMUA KELAS X') ||
    clean.includes('SEMUA JURUSAN TINGKAT X') ||
    clean.includes('SELURUH JURUSAN TINGKAT X') ||
    clean.includes('TINGKAT X')
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
 * STRICT MATCHING: Prevents students from other classes/levels from entering wrong exam rooms (bocor soal)
 */
export function isClassTargetMatch(
  examClassTarget?: string | null,
  studentClass?: string | null
): boolean {
  if (!examClassTarget || !examClassTarget.trim()) {
    return true; // No target restriction = open to all
  }
  const cleanTarget = examClassTarget.trim();
  const lowerTarget = cleanTarget.toLowerCase();

  // If exam is open to everyone
  if (
    lowerTarget === 'semua kelas' ||
    lowerTarget === 'semua siswa' ||
    lowerTarget === 'all' ||
    lowerTarget === 'seluruh kelas' ||
    lowerTarget.includes('semua kelas (semua siswa)')
  ) {
    return true;
  }

  // If exam has specific targets, student class MUST be defined
  if (!studentClass || !studentClass.trim()) {
    return false;
  }

  const cleanStudent = studentClass.trim();
  const normalizedStudent = cleanStudent.toLowerCase().replace(/\s+/g, ' ');
  const compactStudent = cleanStudent.toLowerCase().replace(/\s+/g, '');
  const studentLevel = extractClassLevel(cleanStudent);

  // 1. Check if target is a level-wide target (X, XI, XII, or ALL)
  const levelTarget = isAllLevelTarget(cleanTarget);
  if (levelTarget === 'ALL') {
    return true;
  }
  if (levelTarget) {
    // Student MUST have the exact same academic level
    return studentLevel === levelTarget;
  }

  // 2. Check if target is single class or comma-separated list of classes
  const targetList = parseClassTargets(cleanTarget);

  for (const t of targetList) {
    const tClean = t.trim();
    const tLower = tClean.toLowerCase().replace(/\s+/g, ' ');
    const tCompact = tClean.toLowerCase().replace(/\s+/g, '');

    if (tLower === 'semua kelas' || tLower === 'semua siswa' || tLower === 'all') return true;
    if (tLower === normalizedStudent) return true;
    if (tCompact === compactStudent) return true;

    // Check if item in targetList is a level preset, e.g. "Semua Kelas X"
    const itemLevel = isAllLevelTarget(tClean);
    if (itemLevel === 'ALL') return true;
    if (itemLevel && studentLevel === itemLevel) {
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
export function formatClassTargetDisplay(target?: string | null, isCompact: boolean = false): string {
  if (!target || !target.trim() || target.trim() === 'Semua Kelas') {
    return isCompact ? 'Semua Kelas' : '🌐 Semua Kelas (Semua Siswa)';
  }

  const clean = target.trim();
  const lvl = isAllLevelTarget(clean);
  if (lvl === 'X') return isCompact ? 'Kelas X' : '🎯 Semua Kelas X (Semua Jurusan)';
  if (lvl === 'XI') return isCompact ? 'Kelas XI' : '🎯 Semua Kelas XI (Semua Jurusan)';
  if (lvl === 'XII') return isCompact ? 'Kelas XII' : '🎯 Semua Kelas XII (Semua Jurusan)';
  if (lvl === 'ALL') return isCompact ? 'Semua Kelas' : '🌐 Semua Kelas (Semua Siswa)';

  const parsed = parseClassTargets(clean);
  if (parsed.length > 1) {
    return isCompact
      ? `${parsed.length} Rombel`
      : `👥 ${parsed.length} Kelas: ${parsed.slice(0, 2).join(', ')}${parsed.length > 2 ? '...' : ''}`;
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

