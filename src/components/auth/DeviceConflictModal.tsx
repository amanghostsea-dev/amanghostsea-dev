'use client';

import { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Wifi, 
  Clock, 
  Lock, 
  AlertTriangle, 
  X, 
  HelpCircle,
  Activity,
  ArrowRight,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { DeviceSessionData } from '@/lib/device-session';

interface DeviceConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: DeviceSessionData | null;
  onForceTakeover?: () => Promise<void> | void;
  canOverride?: boolean;
}

export default function DeviceConflictModal({
  isOpen,
  onClose,
  conflictData,
  onForceTakeover,
  canOverride = false,
}: DeviceConflictModalProps) {
  const [showSop, setShowSop] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  // 🔊 Audio synth cyber chime
  useEffect(() => {
    if (!isOpen) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Dual oscillator synth warning tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(784, now); // G5
      osc1.frequency.exponentialRampToValueAtTime(392, now + 0.35); // G4

      osc2.frequency.setValueAtTime(1046.5, now); // C6
      osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.35); // C5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {}
  }, [isOpen]);

  if (!isOpen || !conflictData) return null;

  const getDeviceIcon = () => {
    if (conflictData.deviceType === 'mobile') {
      return <Smartphone size={28} className="text-rose-400 animate-pulse" />;
    }
    if (conflictData.deviceType === 'tablet') {
      return <Tablet size={28} className="text-rose-400 animate-pulse" />;
    }
    return <Laptop size={28} className="text-rose-400 animate-pulse" />;
  };

  const handleTakeoverClick = async () => {
    if (!onForceTakeover) return;
    setIsOverriding(true);
    try {
      await onForceTakeover();
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Background Holographic Red Nebula */}
      <div className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-rose-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/15 blur-[90px] pointer-events-none" />

      {/* Cybernetic Modal Card */}
      <div className="relative max-w-lg w-full bg-slate-950/95 border-2 border-rose-500/60 rounded-3xl p-5 sm:p-8 text-center space-y-4 sm:space-y-5 shadow-[0_0_80px_-10px_rgba(244,63,94,0.45)] backdrop-blur-2xl max-h-[94vh] overflow-y-auto text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Top Scanning Laser Beam */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <X size={18} />
        </button>

        {/* Radar Scanner Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center pt-2">
          {/* Sonar sweep rings */}
          <div className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-ping opacity-35" />
          <div className="absolute inset-1 rounded-full border border-rose-500/40 bg-rose-500/15 shadow-[0_0_35px_rgba(244,63,94,0.35)]" />
          
          {/* Inner holographic core */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600/40 via-rose-900/40 to-slate-900 border border-rose-400/60 flex items-center justify-center text-rose-300 shadow-inner">
            {getDeviceIcon()}
          </div>
        </div>

        {/* Header Telemetry Pill */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10.5px] sm:text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>SINGLE-DEVICE POLICY &bull; DUAL LOGIN BLOCKED</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Akun Sedang Aktif di Perangkat Lain!
          </h2>

          <p className="text-xs text-rose-200/90 max-w-md mx-auto leading-relaxed">
            Sistem mendeteksi bahwa akun <strong>{conflictData.userName}</strong> saat ini sedang terhubung dan aktif pada perangkat lain.
          </p>
        </div>

        {/* Live Device Telemetry HUD Box */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-left space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
            <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
              <Activity size={13} className="text-rose-400 animate-pulse" /> TELEMETRI PERANGKAT AKTIF:
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE SAAT INI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block">Perangkat Terdeteksi:</span>
              <strong className="text-white text-xs block truncate" title={conflictData.deviceName}>
                {conflictData.deviceName}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block">Waktu Mulai Sesi:</span>
              <strong className="text-amber-300 text-xs block">
                {conflictData.loggedInAt || 'Baru saja'}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block">Alamat Jaringan / Node:</span>
              <strong className="text-slate-200 text-xs block font-mono">
                {conflictData.ip || '127.0.0.1'}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block">ID Enkripsi Sesi:</span>
              <strong className="text-cyan-300 text-xs block font-mono">
                #{conflictData.sessionId ? conflictData.sessionId.slice(-8).toUpperCase() : 'SEC-NODE'}
              </strong>
            </div>
          </div>
        </div>

        {/* SOP Notice Info */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs text-left space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
            <Lock size={14} className="shrink-0" /> Mengapa Login Ganda Dilarang?
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Untuk menjaga <strong>integritas ujian CBT</strong> dan <strong>keamanan data akun sekolah</strong>, satu akun hanya diizinkan aktif pada <strong>satu perangkat fisik dalam satu waktu</strong>.
          </p>

          <div className="pt-2 border-t border-amber-500/20 text-[11px] text-slate-300 space-y-1">
            <strong className="text-white block">Solusi Jika PC Anda Sebelumnya Rusak / Mati Lampu:</strong>
            <p>
              Silakan segera lapor ke <strong>Guru Pengawas di ruang kelas</strong> atau <strong>Admin CBT di ruang server</strong> untuk melakukan <strong>&quot;Reset Sesi Login Perangkat&quot;</strong> akun Anda.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {canOverride && onForceTakeover && (
            <button
              type="button"
              onClick={handleTakeoverClick}
              disabled={isOverriding}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 cursor-pointer border border-amber-300/40 disabled:opacity-50"
            >
              {isOverriding ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memutuskan Sesi Lama...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Putuskan Sesi di Perangkat Lama & Masuk di Sini</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Saya Mengerti &bull; Tutup Layar Peringatan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
