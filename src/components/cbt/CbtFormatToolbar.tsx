'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Minus,
  Eraser,
  Undo2,
  Redo2,
  Code, 
  Keyboard, 
  Terminal, 
  Palette, 
  Highlighter, 
  Type, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import CbtRichText from './CbtRichText';

export interface CbtFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
  targetLabel?: string;
  showPreviewToggle?: boolean;
}

export default function CbtFormatToolbar({
  textareaRef,
  value,
  onChange,
  targetLabel = 'soal ujian',
  showPreviewToggle = true,
}: CbtFormatToolbarProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 🔄 Riwayat Undo & Redo (Max 50 riwayat perubahan)
  const historyRef = useRef<string[]>([value || '']);
  const historyIndexRef = useRef<number>(0);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Sinkronisasi history saat value berubah dari luar (jika bukan dari aksi undo/redo internal)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const currentHist = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentHist[currentIndex] !== value) {
      const nextHist = currentHist.slice(0, currentIndex + 1);
      nextHist.push(value);
      if (nextHist.length > 50) nextHist.shift();
      historyRef.current = nextHist;
      historyIndexRef.current = nextHist.length - 1;
    }
  }, [value]);

  const commitValue = (newText: string, cursorStart?: number, cursorEnd?: number) => {
    isInternalUpdateRef.current = true;
    const nextHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHist.push(newText);
    if (nextHist.length > 50) nextHist.shift();
    historyRef.current = nextHist;
    historyIndexRef.current = nextHist.length - 1;

    onChange(newText);

    if (cursorStart !== undefined && cursorEnd !== undefined) {
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cursorStart, cursorEnd);
        }
      }, 20);
    }
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      isInternalUpdateRef.current = true;
      const prevText = historyRef.current[historyIndexRef.current];
      onChange(prevText);
      setTimeout(() => textareaRef.current?.focus(), 20);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      isInternalUpdateRef.current = true;
      const nextText = historyRef.current[historyIndexRef.current];
      onChange(nextText);
      setTimeout(() => textareaRef.current?.focus(), 20);
    }
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Helper menerapkan format tag pembuka dan penutup pada teks yang diblok
  const applyFormat = (openTag: string, closeTag: string, defaultPlaceholder: string = 'teks') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      commitValue(value ? `${value} ${openTag}${defaultPlaceholder}${closeTag}` : `${openTag}${defaultPlaceholder}${closeTag}`);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    const replacement = selectedText ? selectedText : defaultPlaceholder;
    const newText = value.substring(0, start) + openTag + replacement + closeTag + value.substring(end);

    const newCursorStart = start + openTag.length;
    const newCursorEnd = newCursorStart + replacement.length;
    commitValue(newText, newCursorStart, newCursorEnd);
  };

  // Helper menerapkan format list & poin AKM per baris
  const applyListFormat = (type: 'akm' | 'number' | 'bullet') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      let snippet = '';
      if (type === 'akm') snippet = '\n(1) Pernyataan pertama\n(2) Pernyataan kedua\n(3) Pernyataan ketiga\n';
      else if (type === 'number') snippet = '\n1. Langkah pertama\n2. Langkah kedua\n3. Langkah ketiga\n';
      else snippet = '\n• Poin pertama\n• Poin kedua\n• Poin ketiga\n';
      commitValue(value ? `${value}${snippet}` : snippet);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    if (selectedText.trim()) {
      const lines = selectedText.split(/\r?\n/);
      let num = 1;
      const formattedLines = lines.map((line) => {
        if (!line.trim()) return line;
        // Bersihkan prefix sebelumnya jika ada
        const cleaned = line.replace(/^\s*(?:\(\d+\)|\d+[\.\)]|•|\-|\*)\s*/, '');
        if (type === 'akm') {
          return `(${num++}) ${cleaned}`;
        } else if (type === 'number') {
          return `${num++}. ${cleaned}`;
        } else {
          return `• ${cleaned}`;
        }
      });
      const replacement = formattedLines.join('\n');
      const newText = value.substring(0, start) + replacement + value.substring(end);
      commitValue(newText, start, start + replacement.length);
    } else {
      let snippet = '';
      if (type === 'akm') snippet = '(1) Pernyataan pertama\n(2) Pernyataan kedua\n(3) Pernyataan ketiga';
      else if (type === 'number') snippet = '1. Langkah pertama\n2. Langkah kedua\n3. Langkah ketiga';
      else snippet = '• Poin pertama\n• Poin kedua\n• Poin ketiga';

      const needsLeadingNewline = start > 0 && value[start - 1] !== '\n';
      const insertStr = (needsLeadingNewline ? '\n' : '') + snippet + '\n';
      const newText = value.substring(0, start) + insertStr + value.substring(end);
      commitValue(newText, start + (needsLeadingNewline ? 1 : 0), start + insertStr.length - 1);
    }
  };

  // Helper hapus / bersihkan semua format dari teks yang diblok (Clear Formatting)
  const handleClearFormatting = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const hasSelection = start !== end;
    const targetText = hasSelection ? value.substring(start, end) : value;

    // Bersihkan tag markdown dan tag custom CBT
    const cleanedText = targetText
      .replace(/\[\/?(?:font|size|color|bg|sub|sup|center|right|justify|left|quote)[^\]]*\]/gi, '')
      .replace(/<\/?(?:b|i|u|s|sub|sup|kbd|del|strong|em)>/gi, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/==(.*?)==/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[\[(.*?)\]\]/g, '$1')
      .replace(/\[blank(?::\d+)?\]/gi, '')
      .replace(/\.{5,}/g, '');

    if (hasSelection) {
      const newText = value.substring(0, start) + cleanedText + value.substring(end);
      commitValue(newText, start, start + cleanedText.length);
    } else {
      commitValue(cleanedText, 0, cleanedText.length);
    }
  };

  // Helper khusus untuk menyisipkan kotak pesan/terminal error (seperti foto user)
  const applyTerminalBox = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const snippet = '\n```\nWindows cannot be installed to this disk...\n```\n';
      commitValue(value ? `${value}${snippet}` : snippet);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    const content = selectedText || 'Pesan kesalahan terminal / dialog error sistem...';
    const openTag = '\n```\n';
    const closeTag = '\n```\n';
    const newText = value.substring(0, start) + openTag + content + closeTag + value.substring(end);

    const newCursorStart = start + openTag.length;
    const newCursorEnd = newCursorStart + content.length;
    commitValue(newText, newCursorStart, newCursorEnd);
  };

  // Helper untuk menyisipkan garis pemisah horizontal
  const applyHorizontalRule = () => {
    const textarea = textareaRef.current;
    const insertStr = '\n---\n';
    if (!textarea) {
      commitValue(value ? `${value}${insertStr}` : insertStr);
      return;
    }
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const newText = value.substring(0, start) + insertStr + value.substring(end);
    commitValue(newText, start + insertStr.length, start + insertStr.length);
  };

  // Helper untuk soal rumpang
  const applyBlank = () => {
    const textarea = textareaRef.current;
    const blankStr = ' .................... ';
    if (!textarea) {
      commitValue(value ? `${value}${blankStr}` : blankStr);
      return;
    }
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const newText = value.substring(0, start) + blankStr + value.substring(end);
    commitValue(newText, start + blankStr.length, start + blankStr.length);
  };

  const closeAllMenus = () => {
    setShowColorMenu(false);
    setShowHighlightMenu(false);
    setShowFontMenu(false);
    setShowSizeMenu(false);
    setShowListMenu(false);
  };

  return (
    <div className="space-y-2">
      {/* 🛠️ Modern 2-Tier Formatting Ribbon Bar (Kelas Dunia & Sangat Rapi) */}
      <div 
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80"
        onMouseLeave={closeAllMenus}
      >
        {/* ── BARIS 1: Teks Utama, Font, Gaya, Pangkat/Indeks, Perataan & Riwayat ── */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 text-xs">
          {/* ↩️ / ↪️ Undo & Redo */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              disabled={!canUndo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUndo}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                canUndo 
                  ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs' 
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Undo (Urungkan Perubahan)"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRedo}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                canRedo 
                  ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs' 
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Redo (Ulangi Perubahan)"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 🔤 Font Family Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowFontMenu((p) => !p);
                setShowColorMenu(false);
                setShowHighlightMenu(false);
                setShowSizeMenu(false);
                setShowListMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Ubah jenis huruf teks yang diblok"
            >
              <Type size={13} className="text-purple-600 dark:text-purple-400" />
              <span>Font</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showFontMenu && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Pilih Jenis Huruf
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[font:sans]', '[/font]', 'Teks modern');
                    setShowFontMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 font-sans flex items-center justify-between transition cursor-pointer"
                >
                  <span>Sans (Modern Standar)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[font:serif]', '[/font]', 'Teks sastra & buku');
                    setShowFontMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 font-serif flex items-center justify-between transition cursor-pointer"
                >
                  <span>Serif (Sastra / Cerpen)</span>
                  <span className="text-[10px] text-purple-600 font-sans font-bold">Klasik</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[font:mono]', '[/font]', 'Teks koding komputer');
                    setShowFontMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center justify-between transition cursor-pointer"
                >
                  <span>Monospace (Koding / IT)</span>
                  <span className="text-[10px] text-cyan-600 font-sans font-bold">CLI</span>
                </button>
              </div>
            )}
          </div>

          {/* 📏 Font Size Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowSizeMenu((p) => !p);
                setShowColorMenu(false);
                setShowHighlightMenu(false);
                setShowFontMenu(false);
                setShowListMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Ubah ukuran teks yang diblok"
            >
              <span>Ukuran</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showSizeMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Ukuran Huruf
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[size:sm]', '[/size]', 'Catatan kecil');
                    setShowSizeMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span>Kecil (13px - Footnote)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[size:base]', '[/size]', 'Teks normal');
                    setShowSizeMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-sm font-medium flex items-center justify-between transition cursor-pointer"
                >
                  <span>Normal (16px - Default)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[size:lg]', '[/size]', 'Kalimat penting');
                    setShowSizeMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-900 dark:text-white text-base font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Besar (18px - Poin Utama)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyFormat('[size:xl]', '[/size]', 'Judul stimulus');
                    setShowSizeMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-950 dark:text-white text-lg font-black flex items-center justify-between transition cursor-pointer"
                >
                  <span>Ekstra Besar (22px)</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 🔠 Format Gaya: B, I, U, S */}
          <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800/50 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('**', '**', 'teks tebal')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition font-bold cursor-pointer"
              title="Tebalkan Teks (Bold) - **teks**"
            >
              <Bold size={14} />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('*', '*', 'teks miring')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition italic cursor-pointer"
              title="Miringkan Teks (Italic) - *teks*"
            >
              <Italic size={14} />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('<u>', '</u>', 'teks garis bawah')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition underline cursor-pointer"
              title="Garis Bawah (Underline) - <u>teks</u>"
            >
              <Underline size={14} />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('~~', '~~', 'teks dicoret')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition line-through cursor-pointer"
              title="Coret Teks (Strikethrough) - ~~teks~~"
            >
              <Strikethrough size={14} />
            </button>
          </div>

          {/* ⚗️ Subscript (X₂) & Superscript (X²) */}
          <div className="flex items-center gap-0.5 bg-purple-50/60 dark:bg-purple-950/30 p-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/50">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[sub]', '[/sub]', '2')}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded-md hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold transition cursor-pointer text-xs"
              title="Subscript / Indeks Bawah (Contoh rumus kimia: H₂O, CO₂)"
            >
              <SubscriptIcon size={13} />
              <span className="text-[11px]">X₂</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[sup]', '[/sup]', '2')}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded-md hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold transition cursor-pointer text-xs"
              title="Superscript / Pangkat Atas (Contoh matematika & satuan: x², m³, 32°C)"
            >
              <SuperscriptIcon size={13} />
              <span className="text-[11px]">X²</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 📐 Perataan Teks (Alignment Segmented Control) */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[left]', '[/left]', 'Teks rata kiri')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Rata Kiri (Align Left) - [left]...[/left]"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[center]', '[/center]', 'Teks rata tengah')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Rata Tengah (Align Center) - [center]...[/center]"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[right]', '[/right]', 'Teks rata kanan')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Rata Kanan (Align Right) - [right]...[/right]"
            >
              <AlignRight size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[justify]', '[/justify]', 'Teks rata kanan kiri seimbang')}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Rata Kanan Kiri (Justify) - [justify]...[/justify]"
            >
              <AlignJustify size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 🧹 Hapus Format (Clear Formatting) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearFormatting}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-semibold transition cursor-pointer"
            title="Hapus Semua Format Teks yang Diblok (Kembali ke teks polos biasa)"
          >
            <Eraser size={14} className="text-rose-500" />
            <span className="hidden sm:inline">Hapus Format</span>
          </button>
        </div>

        {/* ── BARIS 2: Warna, Elemen Khusus, IT, Narasi, Poin AKM, Preview & Bantuan ── */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 text-xs bg-slate-50/70 dark:bg-slate-900/40">
          {/* 🎨 Warna Teks Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowColorMenu((p) => !p);
                setShowHighlightMenu(false);
                setShowFontMenu(false);
                setShowSizeMenu(false);
                setShowListMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Beri warna pada teks yang diblok"
            >
              <Palette size={13} className="text-rose-600 dark:text-rose-400" />
              <span>Warna</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showColorMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Warna Teks
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:red]', '[/color]', 'teks merah');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 shrink-0" />
                    <span>Merah (Peringatan)</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:blue]', '[/color]', 'teks biru');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-600 dark:text-sky-400 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-sky-600 shrink-0" />
                    <span>Biru (Informasi)</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:green]', '[/color]', 'teks hijau');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Hijau (Sukses/Benar)</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:amber]', '[/color]', 'teks emas');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Emas / Kuning</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:purple]', '[/color]', 'teks ungu');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-purple-600 shrink-0" />
                    <span>Ungu (Spesial)</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[color:gray]', '[/color]', 'teks abu-abu');
                      setShowColorMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-semibold text-xs cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Abu-abu (Pudar)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🖍️ Stabilo / Highlight Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowHighlightMenu((p) => !p);
                setShowColorMenu(false);
                setShowFontMenu(false);
                setShowSizeMenu(false);
                setShowListMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Sorot teks dengan latar stabilo"
            >
              <Highlighter size={13} className="text-amber-500" />
              <span>Stabilo</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showHighlightMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Sorotan Stabilo
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[bg:yellow]', '[/bg]', 'sorotan kuning');
                      setShowHighlightMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-100/70 hover:bg-amber-100 text-amber-900 font-medium text-xs cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-sm bg-amber-300 border border-amber-400 shrink-0" />
                    <span>Stabilo Kuning</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[bg:green]', '[/bg]', 'sorotan hijau');
                      setShowHighlightMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-100/70 hover:bg-emerald-100 text-emerald-900 font-medium text-xs cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-sm bg-emerald-300 border border-emerald-400 shrink-0" />
                    <span>Stabilo Hijau</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[bg:blue]', '[/bg]', 'sorotan biru');
                      setShowHighlightMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg bg-sky-100/70 hover:bg-sky-100 text-sky-900 font-medium text-xs cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-sm bg-sky-300 border border-sky-400 shrink-0" />
                    <span>Stabilo Biru</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[bg:purple]', '[/bg]', 'sorotan ungu');
                      setShowHighlightMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg bg-purple-100/70 hover:bg-purple-100 text-purple-900 font-medium text-xs cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-sm bg-purple-300 border border-purple-400 shrink-0" />
                    <span>Stabilo Ungu</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 🔢 Menu List & Pernyataan AKM */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowListMenu((p) => !p);
                setShowColorMenu(false);
                setShowHighlightMenu(false);
                setShowFontMenu(false);
                setShowSizeMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Daftar Berurutan, Poin Pernyataan AKM (1)(2)(3), atau Bullet"
            >
              <ListOrdered size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Daftar / AKM</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showListMenu && (
              <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Format Penomoran Soal
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyListFormat('akm');
                    setShowListMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">(1)</span>
                    <span>Pernyataan AKM (1), (2), (3)</span>
                  </span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-1 rounded font-bold">AKM</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyListFormat('number');
                    setShowListMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">1.</span>
                    <span>Daftar Angka 1., 2., 3.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyListFormat('bullet');
                    setShowListMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">•</span>
                    <span>Daftar Poin Bullet (•)</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 💬 Kutipan / Narasi Bacaan [quote] */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('[quote]\n', '\n[/quote]', 'Tulis narasi atau kutipan wacana bacaan di sini...')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Kutipan Narasi Bacaan / Wacana Stimulus (Blockquote)"
          >
            <Quote size={13} className="text-purple-600 dark:text-purple-400" />
            <span>Kutipan</span>
          </button>

          {/* ─── Soal Rumpang (Fill in the blank) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyBlank}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Sisipkan Bagian Kosong / Soal Rumpang (..........)"
          >
            <span className="font-mono text-slate-400 font-black tracking-tighter">....</span>
            <span>Rumpang</span>
          </button>

          {/* ➖ Garis Pembatas (Divider) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyHorizontalRule}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Sisipkan Garis Pembatas Horizontal (---)"
          >
            <Minus size={14} className="opacity-70" />
            <span className="hidden sm:inline">Garis</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* 💻 IT & Terminal Snippets: Code, Kbd, Box */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('`', '`', 'perintah')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition cursor-pointer"
              title="Format Perintah / Koding Sebaris (Inline Code)"
            >
              <Code size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>`kode`</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[[', ']]', 'Shift + F10')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition cursor-pointer"
              title="Format Tombol Keyboard (misal: Shift + F10)"
            >
              <Keyboard size={12} className="text-sky-600 dark:text-sky-400" />
              <span>[Key]</span>
            </button>

            {/* 📦 KOTAK PESAN / TERMINAL ERROR (PERSIS FOTO USER) */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyTerminalBox}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold text-xs transition cursor-pointer shadow-2xs"
              title="Sisipkan Kotak Pesan Error / Terminal Output (seperti foto instalasi Windows 11)"
            >
              <Terminal size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>📦 Terminal/Error</span>
            </button>
          </div>

          {/* Spacer to push actions to the right */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* ℹ️ Panduan Singkat Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="Lihat panduan pintasan format teks soal CBT"
            >
              <HelpCircle size={15} />
            </button>

            {/* 👁️ Toggle Live Preview */}
            {showPreviewToggle && (
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ${
                  showPreview
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                }`}
                title="Tinjau langsung hasil render soal persis seperti di layar siswa"
              >
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPreview ? 'Tutup Preview' : 'Pratinjau Hasil'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 👁️ Real-Time Live Preview Box */}
      {showPreview && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-purple-200 dark:border-purple-800/80 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
              <Sparkles size={14} className="text-purple-600" />
              <span>Pratinjau Tampilan Soal (Sesuai di Layar Siswa)</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-bold">
              ● Live Real-Time
            </span>
          </div>

          <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed min-h-[50px] p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
            {value.trim() ? (
              <CbtRichText text={value} />
            ) : (
              <span className="text-slate-400 italic text-xs">
                Ketik teks pertanyaan atau opsi jawaban di atas untuk melihat pratinjau langsung di sini...
              </span>
            )}
          </div>
        </div>
      )}

      {/* ❓ Modal Bantuan Pintasan Format */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Panduan Format Teks Soal CBT (Lengkap & Canggih)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Guru dapat langsung memblok kata atau kalimat di kolom pertanyaan, lalu klik tombol toolbar untuk menerapkan gaya di bawah ini secara instan:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">⚗️ Rumus Kimia & Pangkat Matematika:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Indeks Bawah / Subscript (X₂): <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">H[sub]2[/sub]O</code> &rarr; H₂O</div>
                  <div>• Pangkat / Superscript (X²): <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">x[sup]2[/sup] + y[sup]2[/sup]</code> &rarr; x² + y²</div>
                  <div>• Satuan Ukuran: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">100 m[sup]3[/sup]</code> &rarr; 100 m³</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">📐 Perataan Teks (Alignment):</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Rata Tengah: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[center]Judul Soal[/center]</code></div>
                  <div>• Rata Kanan: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[right]Tanggal: 18 Nov 2026[/right]</code></div>
                  <div>• Rata Kanan Kiri: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[justify]Paragraf panjang...[/justify]</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔢 Poin Pernyataan AKM & Penomoran:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Soal AKM: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">(1) Pernyataan satu\n(2) Pernyataan dua</code></div>
                  <div>• Penomoran Angka: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">1. Langkah 1\n2. Langkah 2</code></div>
                  <div>• Bullet: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">• Poin penting</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">💬 Kutipan Wacana & Soal Rumpang:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Kutipan Narasi: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[quote]Teks wacana atau cerita...[/quote]</code></div>
                  <div>• Soal Rumpang: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">Ibu kota Indonesia adalah ..........</code></div>
                  <div>• Garis Pembatas: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">---</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">📦 Kotak Pesan / Terminal Error:</div>
                <code className="text-[11px] block bg-white dark:bg-slate-900 p-2 rounded-lg font-mono text-cyan-700 dark:text-cyan-300">
                  ```<br />
                  Windows cannot be installed to this disk...<br />
                  ```
                </code>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">⌨️ Tombol Keyboard & Kode Perintah:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Kode sebaris: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">`diskpart`</code></div>
                  <div>• Tombol keyboard: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[[Shift + F10]]</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔤 Gaya Font, Ukuran, & Warna:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Font Sastra/Cerpen: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[font:serif]Kutipan cerpen[/font]</code></div>
                  <div>• Font Komputer: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[font:mono]Kode IT[/font]</code></div>
                  <div>• Warna Teks: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-rose-600">[color:red]Penting![/color]</code></div>
                  <div>• Stabilo: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono bg-amber-100 text-amber-900">[bg:yellow]Sorotan teks[/bg]</code></div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
