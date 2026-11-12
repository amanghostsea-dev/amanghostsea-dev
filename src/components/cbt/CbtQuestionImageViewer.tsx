'use client';

import React, { useState } from 'react';
import { ZoomIn, X, RotateCcw, Image as ImageIcon } from 'lucide-react';

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

  if (!imageUrl || !imageUrl.trim()) return null;

  const handleOpen = () => {
    setIsOpen(true);
    setZoomScale(1);
  };

  const handleClose = () => {
    setIsOpen(false);
    setZoomScale(1);
  };

  return (
    <>
      <div className={`my-4 ${className}`}>
        <div
          onClick={handleOpen}
          className={`group relative inline-block max-w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-all cursor-zoom-in hover:border-purple-500/60 ${
            compact ? 'max-h-48' : 'max-h-96'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={alt}
            className={`w-auto object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01] ${
              compact ? 'max-h-48' : 'max-h-80'
            }`}
            loading="lazy"
          />

          {/* Hover Pill Badge */}
          <div className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-full bg-slate-900/80 dark:bg-black/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={13} className="text-purple-400" />
            <span>Klik Perbesar</span>
          </div>
        </div>
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
                src={imageUrl}
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

