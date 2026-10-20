'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Loader2
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  details?: Array<{ label: string; value: string }>;
  icon?: 'shield' | 'alert' | 'check' | 'sparkles';
}

interface NotificationContextType {
  notify: (item: Omit<NotificationItem, 'id'>) => string;
  dismiss: (id: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  celebrate: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Audio synthesis for futuristic feedback (Zero external audio assets required)
function playFuturisticChime(type: NotificationType | 'celebrate') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'success' || type === 'celebrate') {
      // Modern harmonic chime (E5 -> B5 -> E6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.1);
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
    } else if (type === 'error') {
      // Tech error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.setValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Clean subtle UI pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Audio context may be restricted before first gesture, silently catch
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trigger celebration particle canvas
  const celebrate = useCallback(() => {
    setConfettiActive(true);
    playFuturisticChime('celebrate');
    setTimeout(() => {
      setConfettiActive(false);
    }, 4000);
  }, []);

  // Confetti Canvas Particle Loop
  useEffect(() => {
    if (!confettiActive || !confettiCanvasRef.current) return;
    const canvas = confettiCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
    const particles: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      vx: number;
      vy: number;
      color: string;
      rotation: number;
      vRot: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.vRot;
        if (p.y > canvas.height * 0.6) {
          p.opacity -= 0.015;
        }

        if (p.opacity > 0) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [confettiActive]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((item: Omit<NotificationItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = item.duration ?? 4500;

    playFuturisticChime(item.type);

    setNotifications((prev) => [
      ...prev,
      {
        ...item,
        id,
        duration,
      },
    ]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, [dismiss]);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    notify({ type: 'success', title, message, duration });
  }, [notify]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    notify({ type: 'error', title, message, duration });
  }, [notify]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    notify({ type: 'warning', title, message, duration });
  }, [notify]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    notify({ type: 'info', title, message, duration });
  }, [notify]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    playFuturisticChime('info');
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notify,
        dismiss,
        confirm,
        success,
        error,
        warning,
        info,
        celebrate,
      }}
    >
      {children}

      {/* Confetti Celebration Overlay */}
      {confettiActive && (
        <canvas
          ref={confettiCanvasRef}
          className="fixed inset-0 pointer-events-none z-[9999999]"
        />
      )}

      {/* Futuristic Floating HUD Toast Notifications */}
      <div className="fixed top-5 right-4 sm:right-6 z-[999999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-4 transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
          >
            {/* Ambient Corner Glow */}
            <div
              className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                item.type === 'success'
                  ? 'bg-emerald-500/30'
                  : item.type === 'error'
                  ? 'bg-rose-500/35'
                  : item.type === 'warning'
                  ? 'bg-amber-500/30'
                  : 'bg-cyan-500/30'
              }`}
            />

            <div className="flex items-start gap-3.5 relative z-10">
              {/* High-Tech Glowing Icon Orb */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  item.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                    : item.type === 'error'
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/25 ring-2 ring-rose-400/30'
                    : item.type === 'warning'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/30'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                }`}
              >
                {item.type === 'success' && <CheckCircle2 size={20} className="animate-pulse" />}
                {item.type === 'error' && <XCircle size={20} />}
                {item.type === 'warning' && <AlertTriangle size={20} />}
                {item.type === 'info' && <Sparkles size={20} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : item.type === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        : item.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    }`}
                  >
                    {item.type === 'success'
                      ? 'Berhasil'
                      : item.type === 'error'
                      ? 'Perhatian'
                      : item.type === 'warning'
                      ? 'Peringatan'
                      : 'Informasi'}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">
                  {item.title}
                </h4>

                {item.message && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-3">
                    {item.message}
                  </p>
                )}

                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    <span>{item.action.label}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white transition"
                aria-label="Tutup Notifikasi"
              >
                <X size={16} />
              </button>
            </div>

            {/* Futuristic Progress Timeline Bar */}
            {item.duration && item.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div
                  className={`h-full animate-shrink-width ${
                    item.type === 'success'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : item.type === 'error'
                      ? 'bg-gradient-to-r from-rose-400 to-red-400'
                      : item.type === 'warning'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-400'
                  }`}
                  style={{
                    animationDuration: `${item.duration}ms`,
                    animationTimingFunction: 'linear',
                    animationFillMode: 'forwards',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* FUTURISTIC ACTION CONFIRMATION MODAL                      */}
      {/* ========================================================= */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999998] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden p-6 sm:p-7 text-white animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Glow Halo */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

            {/* Glowing Icon Seal */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-4 relative">
                <div className="absolute inset-0 rounded-2xl border border-emerald-400/20 animate-ping opacity-25" />
                {confirmDialog.options.icon === 'shield' ? (
                  <ShieldCheck size={32} />
                ) : confirmDialog.options.icon === 'alert' ? (
                  <AlertTriangle size={32} className="text-amber-400" />
                ) : (
                  <Sparkles size={32} />
                )}
              </div>

              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                Sistem Konfirmasi Keamanan
              </span>

              <h3 className="text-xl font-black text-white tracking-tight">
                {confirmDialog.options.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-sm">
                {confirmDialog.options.message}
              </p>
            </div>

            {/* Detail Chips Grid */}
            {confirmDialog.options.details && confirmDialog.options.details.length > 0 && (
              <div className="my-5 bg-slate-800/60 rounded-2xl border border-white/10 p-3.5 space-y-2">
                {confirmDialog.options.details.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-b-0">
                    <span className="text-slate-400 font-medium">{item.label}</span>
                    <span className="font-mono font-bold text-white text-right ml-2">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs border border-white/10 transition shadow-sm"
              >
                {confirmDialog.options.cancelText || 'Batal / Periksa Lagi'}
              </button>

              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-1.5"
              >
                <span>{confirmDialog.options.confirmText || 'Ya, Konfirmasi'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
