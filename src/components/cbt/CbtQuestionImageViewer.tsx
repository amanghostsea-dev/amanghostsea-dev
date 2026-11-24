'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, X, RotateCcw, Image as ImageIcon, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface CbtQuestionImageViewerProps {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  compact?: boolean;
}

export default function CbtQuestionImageViewer({
  imageUrl,
  alt = 'Visualisasi Gambar Soal',
  className = '',
  compact = false,
}: CbtQuestionImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryKey, setRetryKey] = useState<number>(0);
  const autoRetryCountRef = useRef(0);

  const cleanUrl = imageUrl?.trim() || '';

  // Reset status saat URL gambar atau nomor soal berganti
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryKey(0);
    autoRetryCountRef.current = 0;
  }, [cleanUrl]);

  if (!cleanUrl) return null;

  const currentSrc = retryKey > 0 
    ? `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}_t=${retryKey}`
    : cleanUrl;

  const handleOpen = () => {
    if (imageError) return;
    setIsOpen(true);
    setZoomScale(1);
  };

  const handleClose = () => {
    setIsOpen(false);
    setZoomScale(1);
  };

  // Otomatis coba ulang 1x jika gagal sebelum menampilkan UI error merah
  const handleImageError = () => {
    if (autoRetryCountRef.current < 2) {
      autoRetryCountRef.current += 1;
      setTimeout(() => {
        setRetryKey(Date.now());
      }, 600);
    } else {
      setImageError(true);
      setImageLoaded(false);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageError(false);
    setImageLoaded(false);
    autoRetryCountRef.current = 0;
    // Cache buster unik berbasis timestamp agar browser mengunduh ulang berkas segar
    setRetryKey(Date.now());
  };

  return (
    <>
      <div className={`my-4 ${className}`}>
        {/* ⚠️ State Error: Gambar Gagal Dimuat Karena Masalah Jaringan */}
        {imageError ? (
          <div className="w-full max-w-xl p-5 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-bold text-sm text-rose-800 dark:text-rose-200">
                Gambar Soal Belum Berhasil Dimuat
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md">
                Koneksi internet di perangkat Anda mungkin sedang lambat atau terputus sejenak saat mengunduh gambar ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className="animate-spin-once" />
              <span>Coba Muat Ulang Gambar</span>
            </button>
          </div>
        ) : (
          <div
            onClick={handleOpen}
            className={`group relative inline-block max-w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-all ${
              imageLoaded ? 'cursor-zoom-in hover:border-purple-500/60' : 'cursor-default'
            } ${compact ? 'max-h-48' : 'max-h-96'}`}
          >
            {/* ⏳ Skeleton Loader: Indikator saat gambar sedang di-download */}
            {!imageLoaded && (
              <div
                className={`w-full min-w-[260px] md:min-w-[380px] ${
                  compact ? 'h-36' : 'h-52'
                } flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse text-slate-500 dark:text-slate-400 p-4`}
              >
                <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold">Mengunduh gambar soal...</span>
              </div>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={alt}
              className={`w-auto object-contain mx-auto transition-all duration-300 ${
                imageLoaded ? 'opacity-100 group-hover:scale-[1.01]' : 'opacity-0 absolute inset-0 pointer-events-none'
              } ${compact ? 'max-h-48' : 'max-h-80'}`}
              loading="eager"
              decoding="async"
              onLoad={() => {
                setImageLoaded(true);
                setImageError(false);
              }}
              onError={handleImageError}
            />

            {/* 🔍 Hover Pill Badge jika gambar telah berhasil dimuat */}
            {imageLoaded && (
              <div className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-full bg-slate-900/80 dark:bg-black/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={13} className="text-purple-400" />
                <span>Klik Perbesar</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔍 Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
          onClick={handleClose}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Control Bar */}
            <div className="w-full flex items-center justify-between pb-3 px-2 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ImageIcon size={16} className="text-purple-400" />
                <span>Visualisasi Gambar Soal (Skala: {Math.round(zoomScale * 100)}%)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 3))}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition cursor-pointer"
                  title="Perbesar"
                >
                  + Zoom In
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.5))}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition cursor-pointer"
                  title="Perkecil"
                >
                  - Zoom Out
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                  title="Reset Ukuran Normal"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image Stage */}
            <div className="overflow-auto max-h-[82vh] max-w-full p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc}
                alt={alt}
                style={{ transform: `scale(${zoomScale})` }}
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
