'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MonitorPlay, ArrowRight, X, Sparkles } from 'lucide-react';

interface ExamAlertBannerProps {
  examCount?: number;
}

export default function ExamAlertBanner({ examCount = 1 }: ExamAlertBannerProps) {
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('dismiss_exam_banner');
    if (!isDismissed) {
      setClosed(false);
    }
  }, []);

  const handleDismiss = () => {
    setClosed(true);
    sessionStorage.setItem('dismiss_exam_banner', 'true');
  };

  if (closed) return null;

  return (
    <aside 
      aria-label="Pemberitahuan Pekan Ujian Online CBT"
      className="relative z-40 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 text-white border-b border-purple-500/30 text-xs sm:text-sm py-2 px-4 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
            <Sparkles size={11} className="text-yellow-300" /> CBT Online
          </span>
          <span className="font-semibold text-white/95">
            Pekan Ujian & Asesmen Sedang Berlangsung.
          </span>
          <span className="hidden md:inline text-purple-200">
            Siswa dapat langsung menuju ruang ujian CBT mandiri.
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Link
            href="/ujian"
            className="inline-flex items-center gap-1.5 bg-white text-purple-900 hover:bg-yellow-300 hover:text-purple-950 font-bold px-3.5 py-1 rounded-full text-xs shadow-sm transition-all transform active:scale-95"
          >
            <MonitorPlay size={14} className="text-purple-700" />
            <span>Masuk Ruang Ujian</span>
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Tutup Pengumuman Ujian"
            className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

