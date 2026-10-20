'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, Sparkles, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

interface SuccessNotificationBannerProps {
  name: string;
  regId: string;
  nisn: string;
  jalur: string;
  paymentStatus: string;
  paymentMethod: string;
}

export default function SuccessNotificationBanner({
  name,
  regId,
  nisn,
  jalur,
  paymentStatus,
  paymentMethod,
}: SuccessNotificationBannerProps) {
  const { celebrate, success, info } = useNotification();

  useEffect(() => {
    // Trigger celebration & audio chime on arrival
    const timer = setTimeout(() => {
      celebrate();
      success(
        'Pendaftaran Resmi Terkonfirmasi!',
        `Data calon siswa atas nama ${name} telah masuk ke sistem database PPDB.`
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [celebrate, success, name]);

  const handleCopyReg = () => {
    navigator.clipboard.writeText(regId);
    info('Nomor Registrasi Disalin', `Kode ${regId} tersimpan di clipboard.`);
  };

  return (
    <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white shadow-2xl border border-white/10 relative overflow-hidden print:hidden">
      {/* Background High-Tech Grid & Glow Effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Animated Hologram Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40">
              <ShieldCheck size={28} className="animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={11} className="text-emerald-400" />
                SISTEM KONFIRMASI TERVERIFIKASI
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ENKRIPSI DATA AMAN
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Selamat, Registrasi Anda Berhasil!
            </h3>

            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Berkas <span className="font-bold text-white">{name}</span> (NISN: <span className="font-mono text-cyan-300 font-bold">{nisn}</span>) telah disahkan dan terdaftar dalam pangkalan data seleksi PPDB SMK Garuda Mahadhika.
            </p>
          </div>
        </div>

        {/* Action Copy Pill */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyReg}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Copy size={14} className="text-cyan-400" />
            <span>Salin No. Registrasi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
