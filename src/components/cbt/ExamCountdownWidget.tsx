'use client';

import { useState, useEffect } from 'react';
import { Clock, Hourglass, Play, CheckCircle2, AlertTriangle, Zap, Sparkles } from 'lucide-react';

interface ExamCountdownWidgetProps {
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  duration?: number;
  className?: string;
  roomName?: string | null;
}

type CountdownState =
  | {
      status: 'UPCOMING';
      totalSeconds: number;
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
      isImminent: boolean;
      isVerySoon: boolean;
    }
  | {
      status: 'ONGOING';
      totalSeconds: number;
      hours: number;
      minutes: number;
      seconds: number;
      progress: number;
    }
  | {
      status: 'ENDED';
    }
  | {
      status: 'FLEXIBLE';
    };

function calculateCountdown(
  startTime?: Date | string | null,
  endTime?: Date | string | null
): CountdownState {
  if (!startTime) {
    return { status: 'FLEXIBLE' };
  }

  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : null;

  if (isNaN(start)) {
    return { status: 'FLEXIBLE' };
  }

  // 1. UPCOMING: Counting down until start time
  if (now < start) {
    const diff = Math.max(0, start - now);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      status: 'UPCOMING',
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      isImminent: totalSeconds <= 15 * 60, // Under 15 minutes
      isVerySoon: totalSeconds <= 60 * 60, // Under 1 hour
    };
  }

  // 2. ENDED: Current time passed end time
  if (end && now > end) {
    return { status: 'ENDED' };
  }

  // 3. ONGOING: Exam is live right now!
  const diff = end ? Math.max(0, end - now) : 0;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let progress = 0;
  if (end && end > start) {
    const elapsed = now - start;
    const total = end - start;
    progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  return {
    status: 'ONGOING',
    totalSeconds,
    hours,
    minutes,
    seconds,
    progress,
  };
}

export default function ExamCountdownWidget({
  startTime,
  endTime,
  duration,
  className = '',
  roomName,
}: ExamCountdownWidgetProps) {
  const [countdown, setCountdown] = useState<CountdownState>(() =>
    calculateCountdown(startTime, endTime)
  );
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Initial evaluation
    setCountdown(calculateCountdown(startTime, endTime));

    const timer = setInterval(() => {
      setCountdown(calculateCountdown(startTime, endTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, endTime]);

  // Graceful placeholder during SSR / hydration to prevent layout shift
  if (!hasMounted) {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-900 text-white border border-indigo-900/40 animate-pulse ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Hourglass size={14} className="text-cyan-400" />
            <span>Memuat Waktu Mundur Ujian...</span>
          </span>
          <span className="font-mono">--:--:--</span>
        </div>
      </div>
    );
  }

  // 1. UPCOMING: Futuristic Countdown Clock
  if (countdown.status === 'UPCOMING') {
    const isImminent = countdown.isImminent;

    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-3.5 sm:p-4 text-white transition-all duration-300 shadow-lg ${
          isImminent
            ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-2 border-amber-500/90 shadow-xl shadow-rose-950/50 ring-4 ring-amber-500/30 animate-pulse'
            : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-indigo-950/20'
        } ${className}`}
      >
        {/* Decorative background glow */}
        <div
          className={`absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
            isImminent ? 'bg-amber-500/20' : 'bg-cyan-500/10'
          }`}
        />

        <div className="relative z-10 space-y-2.5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isImminent ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isImminent ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                />
              </span>
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isImminent ? 'text-amber-300' : 'text-cyan-300'
                }`}
              >
                <Hourglass size={12} className={isImminent ? 'text-amber-400 animate-spin' : 'text-cyan-400'} />
                Waktu Mundur Mulai Ujian
              </span>
            </div>

            {/* Urgency Badge */}
            {isImminent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-600 text-white border border-amber-300/60 shadow-md shadow-rose-950/50 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <AlertTriangle size={11} className="text-white" />
                Segera Dimulai (&lt; 15 Menit)
              </span>
            ) : countdown.isVerySoon ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                <Zap size={11} className="text-amber-300" />
                Hari Ini (&lt; 1 Jam)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Menuju Pelaksanaan
              </span>
            )}
          </div>

          {/* Digits Display (Canggih Cyber Clock) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 pb-1">
            {countdown.days > 0 && (
              <>
                <div
                  className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] py-1.5 px-2 rounded-xl backdrop-blur-md border shadow-inner ${
                    isImminent
                      ? 'bg-amber-950/40 border-amber-500/30'
                      : 'bg-white/10 dark:bg-slate-800/80 border-white/15 dark:border-slate-700/60'
                  }`}
                >
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                      isImminent ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-cyan-300'
                    }`}
                  >
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      isImminent ? 'text-amber-200/80' : 'text-indigo-200/80'
                    }`}
                  >
                    Hari
                  </span>
                </div>
                <span
                  className={`text-xl font-black pb-3 select-none ${
                    isImminent ? 'text-amber-400/80' : 'text-cyan-400/60'
                  }`}
                >
                  :
                </span>
              </>
            )}

            <div
              className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] py-1.5 px-2 rounded-xl backdrop-blur-md border shadow-inner ${
                isImminent
                  ? 'bg-amber-950/40 border-amber-500/30'
                  : 'bg-white/10 dark:bg-slate-800/80 border-white/15 dark:border-slate-700/60'
              }`}
            >
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  isImminent ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-cyan-300'
                }`}
              >
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isImminent ? 'text-amber-200/80' : 'text-indigo-200/80'
                }`}
              >
                Jam
              </span>
            </div>

            <span
              className={`text-xl font-black pb-3 select-none ${
                isImminent ? 'text-amber-400 animate-ping' : 'text-cyan-400/60 animate-pulse'
              }`}
            >
              :
            </span>

            <div
              className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] py-1.5 px-2 rounded-xl backdrop-blur-md border shadow-inner ${
                isImminent
                  ? 'bg-amber-950/40 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-white/10 dark:bg-slate-800/80 border-white/15 dark:border-slate-700/60'
              }`}
            >
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  isImminent ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-cyan-300'
                }`}
              >
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isImminent ? 'text-amber-200 font-black' : 'text-indigo-200/80'
                }`}
              >
                Menit
              </span>
            </div>

            <span
              className={`text-xl font-black pb-3 select-none ${
                isImminent ? 'text-amber-400 animate-ping' : 'text-cyan-400/60 animate-pulse'
              }`}
            >
              :
            </span>

            <div
              className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] py-1.5 px-2 rounded-xl backdrop-blur-md border shadow-inner ${
                isImminent
                  ? 'bg-amber-950/40 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-white/10 dark:bg-slate-800/80 border-white/15 dark:border-slate-700/60'
              }`}
            >
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  isImminent ? 'text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'text-cyan-300'
                }`}
              >
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isImminent ? 'text-rose-200 font-black' : 'text-indigo-200/80'
                }`}
              >
                Detik
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[11px] text-slate-300/90 flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="truncate">
              {isImminent ? (
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <span className="animate-bounce">🔥</span> Waktu pengerjaan &lt; 15 menit. Masuki ruang untuk persiapan rilis token.
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1">
                  <span>🕒</span> Mulai tepat sesuai jadwal tanggal & waktu yang diinput guru.
                </span>
              )}
            </span>
            {roomName && (
              <span className="text-[10px] text-indigo-300 font-mono flex-shrink-0">
                {roomName}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. ONGOING: Exam is Live Right Now!
  if (countdown.status === 'ONGOING') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-3.5 sm:p-4 text-white bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-2 ring-emerald-500/20 ${className}`}
      >
        <div className="relative z-10 space-y-2.5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <Play size={12} className="fill-emerald-400 text-emerald-400" />
                Ujian Sedang Berlangsung (Live)
              </span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/50">
              Sisa Waktu Pengerjaan
            </span>
          </div>

          {/* Sisa Waktu Digits */}
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl bg-emerald-900/40 backdrop-blur-md border border-emerald-500/40 shadow-inner">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-200">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/80">
                Jam
              </span>
            </div>

            <span className="text-xl font-black text-emerald-400/80 pb-3 select-none animate-pulse">:</span>

            <div className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl bg-emerald-900/40 backdrop-blur-md border border-emerald-500/40 shadow-inner">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-200">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/80">
                Menit
              </span>
            </div>

            <span className="text-xl font-black text-emerald-400/80 pb-3 select-none animate-pulse">:</span>

            <div className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl bg-emerald-900/40 backdrop-blur-md border border-emerald-500/40 shadow-inner">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-200">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/80">
                Detik
              </span>
            </div>
          </div>

          {/* Progress Bar Sesi */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-500/40">
              <div
                className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${countdown.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-emerald-300/90 font-medium">
              <span>Progres Sesi Berjalan</span>
              <span>{countdown.progress}% Waktu Terlewati</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. ENDED: Exam session completed
  if (countdown.status === 'ENDED') {
    return (
      <div
        className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${className}`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <span>Waktu Pelaksanaan Ujian Telah Selesai</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
          Sesi ujian telah berakhir. Berita Acara dan rekap kehadiran dapat diunduh di ruang pengawas.
        </p>
      </div>
    );
  }

  // 4. FLEXIBLE: No specific start time
  return (
    <div
      className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Clock size={15} className="text-blue-500 flex-shrink-0" />
        <span>Jadwal Fleksibel (Siap Diawasi)</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
        Ujian tidak memiliki batasan waktu kaku, dapat dimulai kapan saja sesuai koordinasi sekolah.
      </p>
    </div>
  );
}
