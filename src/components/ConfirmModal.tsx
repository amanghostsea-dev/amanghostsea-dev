'use client';

import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  Info, 
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  isAlert?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
  isAlert = false,
}: ConfirmModalProps) {
  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isAlertMode = isAlert || !onConfirm;

  const variantStyles = {
    danger: {
      accentLine: 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-rose-500/10',
      halo: 'ring-rose-500/15 dark:ring-rose-500/20',
      icon: <Trash2 size={24} className="stroke-[2.2]" />,
      confirmBtn: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/25',
    },
    warning: {
      accentLine: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-amber-500/10',
      halo: 'ring-amber-500/15 dark:ring-amber-500/20',
      icon: <AlertTriangle size={24} className="stroke-[2.2]" />,
      confirmBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-600/25',
    },
    info: {
      accentLine: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-indigo-500/10',
      halo: 'ring-indigo-500/15 dark:ring-indigo-500/20',
      icon: <Info size={24} className="stroke-[2.2]" />,
      confirmBtn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25',
    },
    success: {
      accentLine: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10',
      halo: 'ring-emerald-500/15 dark:ring-emerald-500/20',
      icon: <CheckCircle2 size={24} className="stroke-[2.2]" />,
      confirmBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25',
    },
  }[variant];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      {/* 3D Floating Modal Card: Compact, Centered, Rapi & Elegan */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-[1.75rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)] border border-slate-200/90 dark:border-slate-800/90 w-full max-w-[390px] overflow-hidden animate-in zoom-in-95 duration-200 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Slim Accent Gradient Bar */}
        <div className={`h-1.5 w-full ${variantStyles.accentLine}`} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Tutup"
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
        >
          <X size={15} />
        </button>

        <div className="p-6 text-center">
          {/* Glowing Centered Icon Badge */}
          <div className={`w-13 h-13 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-sm ring-4 ${variantStyles.iconBg} ${variantStyles.halo}`}>
            {variantStyles.icon}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            {title}
          </h3>

          {/* Message Content */}
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-[310px] mx-auto break-words">
            {message}
          </div>

          {/* Action Buttons: Rapi & Ergonomis */}
          {isAlertMode ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 ${variantStyles.confirmBtn}`}
            >
              {confirmText || 'Mengerti'}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-40 active:scale-95"
              >
                {cancelText}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  if (onConfirm) {
                    await onConfirm();
                  }
                }}
                className={`w-1/2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 ${variantStyles.confirmBtn}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
