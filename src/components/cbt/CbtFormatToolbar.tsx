'use client';

import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
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
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Helper menerapkan format pada teks yang diblok/diseleksi
  const applyFormat = (openTag: string, closeTag: string, defaultPlaceholder: string = 'teks') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value} ${openTag}${defaultPlaceholder}${closeTag}` : `${openTag}${defaultPlaceholder}${closeTag}`);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    const replacement = selectedText ? selectedText : defaultPlaceholder;
    const newText = value.substring(0, start) + openTag + replacement + closeTag + value.substring(end);

    onChange(newText);

    // Kembalikan fokus dan seleksi teks
    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + openTag.length;
      const newCursorEnd = newCursorStart + replacement.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 15);
  };

  // Helper khusus untuk menyisipkan kotak pesan/terminal error (seperti foto user)
  const applyTerminalBox = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const snippet = '\n```\nWindows cannot be installed to this disk...\n```\n';
      onChange(value ? `${value}${snippet}` : snippet);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = value.substring(start, end);

    const content = selectedText || 'Pesan kesalahan terminal / dialog error sistem...';
    const openTag = '\n```\n';
    const closeTag = '\n```\n';
    const newText = value.substring(0, start) + openTag + content + closeTag + value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + openTag.length;
      const newCursorEnd = newCursorStart + content.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 15);
  };

  const closeAllMenus = () => {
    setShowColorMenu(false);
    setShowHighlightMenu(false);
    setShowFontMenu(false);
    setShowSizeMenu(false);
  };

  return (
    <div className="space-y-2">
      {/* 🛠️ Modern Formatting Ribbon Bar */}
      <div 
        className="flex flex-wrap items-center gap-1.5 p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs"
        onMouseLeave={closeAllMenus}
      >
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
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Ubah jenis huruf teks yang diblok"
          >
            <Type size={14} className="text-purple-600 dark:text-purple-400" />
            <span>Font</span>
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {showFontMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
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
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Ubah ukuran teks yang diblok"
          >
            <span>Ukuran</span>
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {showSizeMenu && (
            <div className="absolute left-0 top-full mt-1 w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
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

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* 🔠 Format Buttons: B, I, U, S */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('**', '**', 'teks tebal')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-bold cursor-pointer"
            title="Tebalkan Teks (Bold) - **teks**"
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('*', '*', 'teks miring')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition italic cursor-pointer"
            title="Miringkan Teks (Italic) - *teks*"
          >
            <Italic size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('<u>', '</u>', 'teks garis bawah')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition underline cursor-pointer"
            title="Garis Bawah (Underline) - <u>teks</u>"
          >
            <Underline size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('~~', '~~', 'teks dicoret')}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition line-through cursor-pointer"
            title="Coret Teks (Strikethrough) - ~~teks~~"
          >
            <Strikethrough size={15} />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* 💻 IT & Terminal Snippets: Code, Kbd, Box */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('`', '`', 'perintah')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition cursor-pointer"
            title="Format Perintah / Koding Sebaris (Inline Code)"
          >
            <Code size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>`kode`</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('[[', ']]', 'Shift + F10')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition cursor-pointer"
            title="Format Tombol Keyboard (misal: Shift + F10)"
          >
            <Keyboard size={13} className="text-sky-600 dark:text-sky-400" />
            <span>[Key]</span>
          </button>

          {/* 📦 KOTAK PESAN / TERMINAL ERROR (PERSIS FOTO USER) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyTerminalBox}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold text-xs transition cursor-pointer shadow-xs"
            title="Sisipkan Kotak Pesan Error / Terminal Output (seperti foto instalasi Windows 11)"
          >
            <Terminal size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span>📦 Kotak Terminal / Error</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

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
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Beri warna pada teks yang diblok"
          >
            <Palette size={14} className="text-rose-600 dark:text-rose-400" />
            <span>Warna</span>
            <ChevronDown size={12} className="opacity-60" />
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
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            title="Sorot teks dengan latar stabilo"
          >
            <Highlighter size={14} className="text-amber-500" />
            <span>Stabilo</span>
            <ChevronDown size={12} className="opacity-60" />
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

        {/* ℹ️ Panduan Singkat Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition ml-auto cursor-pointer"
          title="Lihat panduan pintasan format teks"
        >
          <HelpCircle size={15} />
        </button>

        {/* 👁️ Toggle Live Preview */}
        {showPreviewToggle && (
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              showPreview
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
            }`}
            title="Tinjau langsung hasil render soal persis seperti di layar siswa"
          >
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showPreview ? 'Tutup Preview' : 'Pratinjau Hasil'}</span>
          </button>
        )}
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

          <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed min-h-[50px] p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Panduan Pintasan Format Teks Soal CBT
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
              Guru dapat langsung memblok kata atau kalimat di kolom pertanyaan, lalu klik tombol toolbar untuk menerapkan gaya di bawah ini:
            </p>

            <div className="space-y-2 text-xs">
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
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔤 Gaya Font & Ukuran Huruf:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Font Sastra/Cerpen: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[font:serif]Kutipan cerpen[/font]</code></div>
                  <div>• Font Komputer: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[font:mono]Kode IT[/font]</code></div>
                  <div>• Ukuran Besar: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[size:lg]Kalimat penting[/size]</code></div>
                  <div>• Ukuran Kecil: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono">[size:sm]Sumber: Kemdikbud[/size]</code></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">🎨 Warna & Stabilo:</div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div>• Warna Merah: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-rose-600">[color:red]Teks bahaya[/color]</code></div>
                  <div>• Warna Biru: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-sky-600">[color:blue]Teks info[/color]</code></div>
                  <div>• Stabilo Kuning: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono bg-amber-100 text-amber-900">[bg:yellow]Teks sorotan[/bg]</code></div>
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
