'use client';

import React from 'react';
import CbtRichText from './CbtRichText';
import CbtQuestionImageViewer from './CbtQuestionImageViewer';

export interface ParsedQuestionContent {
  textBefore: string;
  hasImageTag: boolean;
  textAfter: string;
  hasImage: boolean;
}

/**
 * 🧩 Parser Konten Soal Fleksibel:
 * Membedah teks soal menjadi bagian sebelum gambar (pengantar/stimulus) dan
 * bagian setelah gambar (pertanyaan/perintah soal) dengan tag pemisah `[GAMBAR]` atau `[IMAGE]`.
 */
export function parseQuestionContent(
  questionText: string = '',
  imageUrl?: string | null
): ParsedQuestionContent {
  const hasImage = Boolean(imageUrl && imageUrl.trim());
  const rawText = questionText || '';

  // Pola regex penanda letak gambar
  const tagRegex = /\[(?:GAMBAR|IMAGE)\]/i;
  const match = rawText.match(tagRegex);

  if (match) {
    const splitIndex = match.index!;
    const textBefore = rawText.slice(0, splitIndex).trim();
    const textAfter = rawText.slice(splitIndex + match[0].length).trim();
    return {
      textBefore,
      hasImageTag: true,
      textAfter,
      hasImage,
    };
  }

  // Format Standar / Kompatibilitas Soal Lama (Legacy)
  // Jika ada gambar namun tanpa tag khusus, maka teks dianggap berada di atas gambar (default CBT)
  return {
    textBefore: rawText.trim(),
    hasImageTag: false,
    textAfter: '',
    hasImage,
  };
}

interface CbtQuestionContentProps {
  questionText: string;
  imageUrl?: string | null;
  className?: string;
  compactImage?: boolean;
  imageAlt?: string;
}

/**
 * 🖼️ Komponen CbtQuestionContent
 * Menampilkan teks soal secara terpadu & presisi:
 * 1. Teks Pengantar / Stimulus (Di Atas Gambar) - jika ada
 * 2. Visualisasi Gambar Soal (dengan Lightbox Zoom interaktif) - jika ada
 * 3. Teks Pertanyaan Inti / Perintah (Di Bawah Gambar) - jika ada
 */
export default function CbtQuestionContent({
  questionText,
  imageUrl,
  className = '',
  compactImage = false,
  imageAlt = 'Visualisasi Gambar Soal',
}: CbtQuestionContentProps) {
  const { textBefore, textAfter, hasImage } = parseQuestionContent(questionText, imageUrl);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* 📌 Stimulus Soal Gambar Murni (seperti rumus matematika/grafik/diagram tanpa teks pendamping) */}
      {hasImage && !textBefore && !textAfter && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-2xs">
          <span>📐</span>
          <span>Perhatikan lembar soal gambar di bawah ini untuk menentukan pilihan jawaban:</span>
        </div>
      )}

      {/* 📝 Bagian 1: Teks Pengantar / Stimulus Sebelum Gambar */}
      {textBefore && (
        <div className="text-slate-900 dark:text-white leading-relaxed">
          <CbtRichText text={textBefore} />
        </div>
      )}

      {/* 🖼️ Bagian 2: Gambar / Visualisasi Soal (Tengah) */}
      {hasImage && imageUrl && (
        <div className={compactImage ? 'my-2' : 'my-4'}>
          <CbtQuestionImageViewer
            imageUrl={imageUrl}
            alt={imageAlt}
            compact={compactImage}
          />
        </div>
      )}

      {/* ❓ Bagian 3: Teks Pertanyaan Inti / Perintah Setelah Gambar */}
      {textAfter && (
        <div className="text-slate-900 dark:text-white leading-relaxed">
          <CbtRichText text={textAfter} />
        </div>
      )}
    </div>
  );
}
