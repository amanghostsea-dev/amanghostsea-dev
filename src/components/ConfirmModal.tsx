'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Loader2, CheckCircle2, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      accentLine: 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500',
      iconBg: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30 ring-red-50 dark:ring-red-950/40',
      icon: <Trash2 size={28} />,
      confirmBtn: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 shadow-red-500/35 hover:shadow-red-500/50',
    },
    warning: {
      accentLine: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30 ring-amber-50 dark:ring-amber-950/40',
      icon: <AlertTriangle size={28} />,
      confirmBtn: 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 shadow-amber-500/35 hover:shadow-amber-500/50',
    },
    info: {
      accentLine: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30 ring-blue-50 dark:ring-blue-950/40',
      icon: <Info size={28} />,
      confirmBtn: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/35 hover:shadow-blue-500/50',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fade-in">
      {/* 3D Floating Modal Card */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2rem] shadow-[0_25px_70px_-12px_rgba(0,0,0,0.35),0_10px_25px_-5px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/10 w-full max-w-md overflow-hidden animate-zoom-in transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top 3D Accent Line */}
        <div className={`h-2 w-full ${variantStyles.accentLine} shadow-sm`} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8 text-center">
          {/* 3D Tactile Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-8 ${variantStyles.iconBg}`}>
            {variantStyles.icon}
          </div>

          {/* Title & Message */}
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {title}
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-xs mx-auto">
            {message}
          </div>

          {/* 3D Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="w-full sm:w-1/2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`w-full sm:w-1/2 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${variantStyles.confirmBtn}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
