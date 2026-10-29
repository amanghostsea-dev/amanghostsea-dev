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

