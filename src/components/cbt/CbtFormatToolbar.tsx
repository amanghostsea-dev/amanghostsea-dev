'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
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
  ChevronUp,
  Eye, 
  EyeOff, 
  HelpCircle,
  Sparkles,
  X,
  Table,
  Plus,
  Calculator,
  Pin,
  PinOff
} from 'lucide-react';
import CbtRichText from './CbtRichText';

export interface CbtFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (val: string) => void;
  title?: string;
  subtitle?: string;
  targetLabel?: string;
  showPreviewToggle?: boolean;
  onOpenTable?: () => void;
  onInsertMath?: (snippet: string) => void;
  defaultCollapsed?: boolean;
  disableLocalStorageState?: boolean;
  onClose?: () => void;
}

interface FormulaQuickItem {
  label: string;
  display: string;
  latex: string;
}

const QUICK_FORMULAS: FormulaQuickItem[] = [
  { label: 'Pecahan', display: 'a/b', latex: '\\frac{a}{b}' },
  { label: 'Pangkat', display: 'x²', latex: 'x^{2}' },
  { label: 'Pangkat -n', display: 'x⁻ⁿ', latex: 'x^{-n}' },
  { label: 'Akar', display: '√x', latex: '\\sqrt{x}' },
  { label: 'Akar Pecahan', display: '√(a/b)', latex: '\\sqrt{\\frac{a}{b}}' },
  { label: 'Akar n', display: 'ⁿ√x', latex: '\\sqrt[n]{x}' },
  { label: 'Indeks', display: 'x₁', latex: 'x_{1}' },
  { label: 'Derajat', display: '°', latex: '^{\\circ}' },
  { label: 'Kali', display: '×', latex: '\\times' },
  { label: 'Bagi', display: '÷', latex: '\\div' },
  { label: 'PlusMinus', display: '±', latex: '\\pm' },
  { label: 'Pi', display: 'π', latex: '\\pi' },
  { label: 'Tak Hingga', display: '∞', latex: '\\infty' },
  { label: 'Kurang Sama', display: '≤', latex: '\\le' },
  { label: 'Lebih Sama', display: '≥', latex: '\\ge' },
  { label: 'Tidak Sama', display: '≠', latex: '\\neq' },
  { label: 'Alpha', display: 'α', latex: '\\alpha' },
  { label: 'Beta', display: 'β', latex: '\\beta' },
  { label: 'Theta', display: 'θ', latex: '\\theta' },
  { label: 'Matriks 2x2', display: '[a b / c d]', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'Rumus ABC', display: '(-b±√D)/2a', latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Sistem Persamaan', display: '{ ax+by=c', latex: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}' },
  { label: 'Integral', display: '∫ f(x) dx', latex: '\\int_{a}^{b} f(x) \\, dx' },
  { label: 'Limit', display: 'lim x→0', latex: '\\lim_{x \\to 0} f(x)' },
  { label: 'Sigma', display: '∑ i=1..n', latex: '\\sum_{i=1}^{n} x_i' },
  { label: 'Mendekati', display: '≈', latex: '\\approx' },
];

export default function CbtFormatToolbar({
  textareaRef,
  value,
  onChange,
  title,
  subtitle,
  targetLabel = 'soal ujian',
  showPreviewToggle = true,
  onOpenTable,
  onInsertMath,
  defaultCollapsed = false,
  disableLocalStorageState = false,
  onClose,
}: CbtFormatToolbarProps) {
  // 🎛️ State Auto-Hide & Collapse
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && !disableLocalStorageState) {
      try {
        const savedPinned = localStorage.getItem('cbt_format_toolbar_pinned');
        if (savedPinned === 'true') return false;
        const savedCollapsed = localStorage.getItem('cbt_format_toolbar_collapsed');
        if (savedCollapsed !== null) return savedCollapsed === 'true';
      } catch {}
    }
    return defaultCollapsed;
  });

  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && !disableLocalStorageState) {
      try {
        return localStorage.getItem('cbt_format_toolbar_pinned') === 'true';
      } catch {}
    }
    return false;
  });

  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // 🧭 Posisi Menu Adaptif (Auto-flip ke atas bila dekat batas bawah layar)
  const [openUpward, setOpenUpward] = useState<Record<string, boolean>>({});

  const checkPlacement = (menuKey: string, el: HTMLElement | null) => {
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = spaceBelow < 290;
    setOpenUpward((prev) => ({ ...prev, [menuKey]: shouldOpenUp }));
  };

  // Menu Dropdowns
  const [showPreview, setShowPreview] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showMathMenu, setShowMathMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cbt_format_toolbar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      if (next) setIsCollapsed(false);
      try {
        localStorage.setItem('cbt_format_toolbar_pinned', String(next));
      } catch {}
      return next;
    });
  };

  // 🔄 Riwayat Undo & Redo (Max 50 perubahan)
  const historyRef = useRef<string[]>([value || '']);
  const historyIndexRef = useRef<number>(0);
  const isInternalUpdateRef = useRef<boolean>(false);

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

  // eslint-disable-next-line react-hooks/refs
  const canUndo = historyIndexRef.current > 0;
  // eslint-disable-next-line react-hooks/refs
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Helper format tag
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

  // Helper format perataan
  const applyAlignFormat = (align: 'left' | 'center' | 'right' | 'justify') => {
    setCurrentAlign(align);
    setShowAlignMenu(false);
    if (align === 'left') {
      applyFormat('[left]', '[/left]', 'Teks rata kiri');
    } else if (align === 'center') {
      applyFormat('[center]', '[/center]', 'Teks rata tengah');
    } else if (align === 'right') {
      applyFormat('[right]', '[/right]', 'Teks rata kanan');
    } else {
      applyFormat('[justify]', '[/justify]', 'Teks rata kanan-kiri');
    }
  };

  // Helper format list & poin AKM per baris
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

  // Helper hapus format teks
  const handleClearFormatting = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const hasSelection = start !== end;
    const targetText = hasSelection ? value.substring(start, end) : value;

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

  // Helper kotak terminal
  const applyTerminalBox = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const snippet = '[terminal]Pesan kesalahan terminal / dialog error sistem...[/terminal]';
      commitValue(value ? `${value} ${snippet}` : snippet);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    const content = selectedText || 'Pesan kesalahan terminal / dialog error sistem...';
    const openTag = '[terminal]';
    const closeTag = '[/terminal]';
    const newText = value.substring(0, start) + openTag + content + closeTag + value.substring(end);

    const newCursorStart = start + openTag.length;
    const newCursorEnd = newCursorStart + content.length;
    commitValue(newText, newCursorStart, newCursorEnd);
  };

  // Helper garis pembatas
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

  // Helper soal rumpang
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

  // Helper sisipkan rumus KaTeX
  const handleInsertFormula = (latex: string) => {
    setShowMathMenu(false);
    if (onInsertMath) {
      onInsertMath(`$${latex}$`);
      return;
    }
    applyFormat('$', '$', latex);
  };

  const closeAllMenus = () => {
    setShowColorMenu(false);
    setShowHighlightMenu(false);
    setShowFontMenu(false);
    setShowSizeMenu(false);
    setShowListMenu(false);
    setShowInsertMenu(false);
    setShowAlignMenu(false);
    setShowMathMenu(false);
  };

  const isAnyMenuOpen = Boolean(
    showColorMenu || 
    showHighlightMenu || 
    showFontMenu || 
    showSizeMenu || 
    showListMenu || 
    showInsertMenu || 
    showAlignMenu || 
    showMathMenu
  );

  // 🛡️ Menutup dropdown secara aman saat klik di luar toolbar (tanpa backdrop overlay yang memblokir klik)
  useEffect(() => {
    if (!isAnyMenuOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAnyMenuOpen]);

  return (
    <div ref={toolbarRef} className="space-y-2 relative">
      {/* 🌟 AUTO-HIDE COMPACT BAR (Jika Toolbar Diciutkan / Mode Minimalis) */}
      {isCollapsed ? (
        <div 
          className="flex flex-wrap items-center justify-between gap-2 p-2 sm:px-3 rounded-2xl bg-gradient-to-r from-slate-50 via-purple-50/40 to-slate-50 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 shadow-xs animate-in fade-in duration-200"
        >
          {/* Kiri: Identitas Toolbar & Status Auto-Hide */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                  Toolbar Format Soal
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  Auto-Hide
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:block">
                Tersusun rapi & hemat ruang layar
              </p>
            </div>
          </div>

          {/* Tengah: Tombol Cepat Pintasan Utama (1-Click Shortcut) */}
          <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('**', '**', 'teks tebal')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
              title="Tebalkan Teks (Bold)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('*', '*', 'teks miring')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 italic transition cursor-pointer"
              title="Miringkan Teks (Italic)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[sub]', '[/sub]', '2')}
              className="px-1.5 py-1 rounded-lg hover:bg-purple-50 text-purple-700 dark:text-purple-300 font-bold text-[11px] transition cursor-pointer"
              title="Indeks Bawah (Subscript X₂)"
            >
              X₂
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('[sup]', '[/sup]', '2')}
              className="px-1.5 py-1 rounded-lg hover:bg-purple-50 text-purple-700 dark:text-purple-300 font-bold text-[11px] transition cursor-pointer"
              title="Pangkat Atas (Superscript X²)"
            >
              X²
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyTerminalBox}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800 text-[11px] font-bold transition cursor-pointer"
              title="Kotak Terminal Error"
            >
              <Terminal size={12} className="text-cyan-600" />
              <span>Terminal</span>
            </button>
            {onOpenTable && (
              <button
                type="button"
                onClick={onOpenTable}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-800 dark:text-purple-300 text-[11px] font-bold transition cursor-pointer"
                title="Buat Tabel Soal"
              >
                <Table size={12} className="text-purple-600" />
                <span>Tabel</span>
              </button>
            )}
          </div>

          {/* Kanan: Tombol Buka Toolbar Lengkap */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="Buka toolbar lengkap dengan font, warna, stabilo, perataan, tabel, dan rumus"
            >
              <span>Buka Toolbar</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* 🛠️ FULL STUDIO TOOLBAR (Tersusun Sempurna & Tanpa Baris Terpotong) */
        <div 
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in duration-200 relative z-30"
        >
          {/* ── HEADER TOOLBAR: Judul, Status Pin, dan Tombol Sembunyikan ── */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Sparkles size={13} className="text-purple-600" />
                <span>{title || 'Studio Format Soal CBT'}</span>
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                {subtitle || (targetLabel ? `Lengkap untuk ${targetLabel} (Teks, Rumus MTK, Font, Warna & Simbol)` : 'Lengkap untuk Teks, Soal AKM, Wacana, IT, Rumus MTK & Tabel')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!onClose && (
                <button
                  type="button"
                  onClick={togglePin}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    isPinned 
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={isPinned ? 'Sematkan aktif: Toolbar selalu terbuka' : 'Klik untuk menyematkan agar selalu terbuka'}
                >
                  {isPinned ? <Pin size={11} className="fill-purple-600" /> : <PinOff size={11} />}
                  <span className="hidden md:inline">{isPinned ? 'Disematkan' : 'Sematkan'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    toggleCollapse();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                title="Sembunyikan toolbar"
              >
                <ChevronUp size={12} />
                <span>Sembunyikan</span>
              </button>
            </div>
          </div>

          {/* ── BARIS 1: Riwayat, Tipografi, Format Huruf, Pangkat/Indeks, Perataan & Hapus Format ── */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 text-xs">
            {/* ↩️ / ↪️ Undo & Redo */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
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
                <Undo2 size={13} />
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
                <Redo2 size={13} />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

            {/* 🔤 Font Family Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('font', e.currentTarget);
                  setShowFontMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Ubah jenis huruf teks yang diblok"
              >
                <Type size={13} className="text-purple-600 dark:text-purple-400" />
                <span>Font</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showFontMenu && (
                <div className={`absolute left-0 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['font'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
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
                onClick={(e) => {
                  checkPlacement('size', e.currentTarget);
                  setShowSizeMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Ubah ukuran teks yang diblok"
              >
                <span>Ukuran</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showSizeMenu && (
                <div className={`absolute left-0 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['size'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
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

            {/* 🔠 Format Gaya Huruf: B, I, U, S */}
            <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800/50 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('**', '**', 'teks tebal')}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition font-bold cursor-pointer"
                title="Tebalkan Teks (Bold) - **teks**"
              >
                <Bold size={13} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('*', '*', 'teks miring')}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition italic cursor-pointer"
                title="Miringkan Teks (Italic) - *teks*"
              >
                <Italic size={13} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('<u>', '</u>', 'teks garis bawah')}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition underline cursor-pointer"
                title="Garis Bawah (Underline) - <u>teks</u>"
              >
                <Underline size={13} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('~~', '~~', 'teks dicoret')}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition line-through cursor-pointer"
                title="Coret Teks (Strikethrough) - ~~teks~~"
              >
                <Strikethrough size={13} />
              </button>
            </div>

            {/* ⚗️ Subscript (X₂) & Superscript (X²) */}
            <div className="flex items-center gap-0.5 bg-purple-50/60 dark:bg-purple-950/30 p-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/50">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('[sub]', '[/sub]', '2')}
                className="px-2 py-1 rounded-md hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold transition cursor-pointer text-xs"
                title="Indeks Bawah / Subscript (Contoh: H₂O, CO₂)"
              >
                <span className="font-bold">X₂</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('[sup]', '[/sup]', '2')}
                className="px-2 py-1 rounded-md hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold transition cursor-pointer text-xs"
                title="Pangkat / Superscript (Contoh: x², m³, 32°C)"
              >
                <span className="font-bold">X²</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

            {/* 📐 Perataan Teks (Dropdown Ramping - Menghindari Terpotong / Wrap) */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('align', e.currentTarget);
                  setShowAlignMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Atur perataan teks (Kiri, Tengah, Kanan, Justify)"
              >
                {currentAlign === 'center' ? (
                  <AlignCenter size={13} className="text-purple-600" />
                ) : currentAlign === 'right' ? (
                  <AlignRight size={13} className="text-purple-600" />
                ) : currentAlign === 'justify' ? (
                  <AlignJustify size={13} className="text-purple-600" />
                ) : (
                  <AlignLeft size={13} className="text-purple-600" />
                )}
                <span className="hidden sm:inline">Rata</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showAlignMenu && (
                <div className={`absolute left-0 sm:left-0 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['align'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Posisi Perataan Teks
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyAlignFormat('left')}
                    className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <AlignLeft size={13} className="text-slate-500" />
                    <span>Rata Kiri (Default)</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyAlignFormat('center')}
                    className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <AlignCenter size={13} className="text-purple-600" />
                    <span>Rata Tengah ([center])</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyAlignFormat('right')}
                    className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <AlignRight size={13} className="text-purple-600" />
                    <span>Rata Kanan ([right])</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyAlignFormat('justify')}
                    className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <AlignJustify size={13} className="text-purple-600" />
                    <span>Rata Kanan Kiri ([justify])</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

            {/* 🧹 Hapus Format (Tx Icon Ringkas - Dijamin Pas & Tidak Terpotong) */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearFormatting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-bold transition cursor-pointer"
              title="Hapus Semua Format (Clear Formatting) - Kembalikan teks yang diblok ke teks polos biasa"
            >
              <Eraser size={13} className="text-rose-500" />
              <span className="font-mono text-[11px] font-black text-rose-600 dark:text-rose-400">Tx</span>
            </button>
          </div>

          {/* ── BARIS 2: Warna, Stabilo, AKM, Sisipkan Wacana/Rumpang/IT, Tabel & Rumus MTK ── */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 text-xs bg-slate-50/70 dark:bg-slate-900/40">
            {/* 🎨 Warna Teks Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('color', e.currentTarget);
                  setShowColorMenu((p) => !p);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Beri warna pada teks yang diblok"
              >
                <Palette size={13} className="text-rose-600 dark:text-rose-400" />
                <span>Warna</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showColorMenu && (
                <div className={`absolute left-0 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['color'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
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
                      <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
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
                      <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0" />
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
                      <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
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
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
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
                      <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
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
                      <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
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
                onClick={(e) => {
                  checkPlacement('highlight', e.currentTarget);
                  setShowHighlightMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Sorot teks dengan latar stabilo"
              >
                <Highlighter size={13} className="text-amber-500" />
                <span>Stabilo</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showHighlightMenu && (
                <div className={`absolute left-0 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['highlight'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
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

            {/* 🔢 Menu Daftar & Poin AKM */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('list', e.currentTarget);
                  setShowListMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Daftar Berurutan, Poin Pernyataan AKM (1)(2)(3), atau Bullet"
              >
                <ListOrdered size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Daftar / AKM</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showListMenu && (
                <div className={`absolute left-0 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-[60] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['list'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
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

            {/* ➕ Dropdown Sisipkan Elemen Khusus (Wacana, Rumpang, Garis, Tombol Key, Kode) */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('insert', e.currentTarget);
                  setShowInsertMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowAlignMenu(false);
                  setShowMathMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                title="Sisipkan Wacana Kutipan, Soal Rumpang, Garis, atau Tombol Keyboard"
              >
                <Plus size={13} className="text-purple-600" />
                <span>Sisipkan</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showInsertMenu && (
                <div className={`absolute left-0 sm:left-0 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-[60] max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['insert'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Elemen Khusus Soal
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[quote]\n', '\n[/quote]', 'Tulis narasi atau kutipan wacana bacaan di sini...');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Quote size={13} className="text-purple-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Kutipan Narasi Wacana</div>
                      <div className="text-[10px] text-slate-400">[quote]...[/quote]</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyBlank();
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="font-mono text-purple-600 font-bold shrink-0">....</span>
                    <div>
                      <div className="font-semibold">Bagian Kosong / Rumpang</div>
                      <div className="text-[10px] text-slate-400">Garis isian soal rumpang</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyHorizontalRule();
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Minus size={13} className="text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold">Garis Pembatas Horizontal</div>
                      <div className="text-[10px] text-slate-400">Pemisah bagian (---)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('[[', ']]', 'Shift + F10');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Keyboard size={13} className="text-sky-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Tombol Keyboard [Key]</div>
                      <div className="text-[10px] text-slate-400">[[Ctrl + Alt + Del]]</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('`', '`', 'perintah');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Code size={13} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Kode / Perintah Sebaris</div>
                      <div className="text-[10px] text-slate-400">`command`</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 📦 KOTAK PESAN / TERMINAL ERROR (Aksi Cepat 1-Klik) */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyTerminalBox}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800 font-bold text-xs transition cursor-pointer shadow-2xs"
              title="Sisipkan Kotak Pesan Error / Terminal Output (seperti dialog instalasi Windows)"
            >
              <Terminal size={12} className="text-cyan-600" />
              <span>📦 Terminal</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

            {/* 📊 TABEL: Terintegrasi Rapi Langsung di Toolbar */}
            {onOpenTable ? (
              <button
                type="button"
                onClick={onOpenTable}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs transition cursor-pointer shadow-2xs"
                title="Buka generator pembuat tabel fleksibel untuk soal ujian ini"
              >
                <Table size={12} className="text-purple-600" />
                <span>📊 Tabel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const sample = '\n| No | Keterangan | Nilai |\n|:---|:---|:---|\n| 1 | Data A | 100 |\n| 2 | Data B | 200 |\n';
                  commitValue(value ? `${value}${sample}` : sample);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs transition cursor-pointer"
                title="Sisipkan Tabel Data"
              >
                <Table size={12} className="text-purple-600" />
                <span>📊 Tabel</span>
              </button>
            )}

            {/* ∑ RUMUS MATEMATIKA & KaTeX: Terintegrasi Rapi */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  checkPlacement('math', e.currentTarget);
                  setShowMathMenu((p) => !p);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                  setShowFontMenu(false);
                  setShowSizeMenu(false);
                  setShowListMenu(false);
                  setShowInsertMenu(false);
                  setShowAlignMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition cursor-pointer shadow-2xs"
                title="Sisipkan rumus matematika, fisika, pecahan, akar, atau matriks KaTeX"
              >
                <Calculator size={12} className="text-indigo-600" />
                <span>∑ Rumus</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showMathMenu && (
                <div className={`absolute right-0 sm:right-0 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-[60] max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                  openUpward['math'] ? 'bottom-full mb-1.5' : 'top-full mt-1'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Pintasan Rumus KaTeX</span>
                    <span className="text-indigo-600 font-mono text-[9px]">$...$</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
                    {QUICK_FORMULAS.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertFormula(item.latex)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-100 dark:border-slate-800/80 text-left transition cursor-pointer"
                        title={item.latex}
                      >
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-1 rounded">{item.display}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Spacer ke Kanan */}
            <div className="ml-auto flex items-center gap-1.5">
              {/* ℹ️ Panduan Singkat Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Panduan Lengkap Pintasan Format Soal"
              >
                <HelpCircle size={14} />
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
      )}

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

      {/* ❓ Modal Bantuan Pintasan Format Lengkap */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Panduan Format Teks Soal CBT (Lengkap & Terpadu)
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
              Guru dapat memblok kata atau kalimat di kolom pertanyaan, lalu klik tombol toolbar untuk menerapkan format instan:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">⚗️ Rumus Kimia, Pangkat & Simbol:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Subscript (X₂): <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">H[sub]2[/sub]O</code> &rarr; H₂O</div>
                  <div>• Superscript (X²): <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">x[sup]2[/sup] + y[sup]2[/sup]</code> &rarr; x² + y²</div>
                  <div>• Rumus Matematika KaTeX: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono font-bold text-indigo-600">{"$\\frac{a}{b}$"}</code> &rarr; pecahan bertingkat</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">📐 Perataan Teks (Alignment):</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Rata Tengah: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[center]Judul Soal[/center]</code></div>
                  <div>• Rata Kanan: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[right]Tanggal / Sumber[/right]</code></div>
                  <div>• Rata Kanan Kiri: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[justify]Paragraf panjang...[/justify]</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔢 Poin Pernyataan AKM & Penomoran:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Soal AKM: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">(1) Pernyataan satu\n(2) Pernyataan dua</code></div>
                  <div>• Daftar Angka: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">1. Langkah 1\n2. Langkah 2</code></div>
                  <div>• Bullet: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">• Poin stimulus</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">💬 Kutipan Wacana, Soal Rumpang & Terminal:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Wacana Narasi: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[quote]Teks bacaan...[/quote]</code></div>
                  <div>• Soal Rumpang: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">Ibu kota negara adalah ..........</code></div>
                  <div>• Kotak Terminal / Error: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[terminal]pesan error[/terminal]</code> (fleksibel inline atau baris baru)</div>
                  <div>• Tombol Keyboard: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[[Shift + F10]]</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🧹 Hapus Format (Tx):</div>
                <p className="text-slate-700 dark:text-slate-300">
                  Klik tombol <strong>Tx</strong> untuk membersihkan seluruh tag format dari teks yang diblok agar kembali menjadi teks biasa tanpa menghapus kata-katanya.
                </p>
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
