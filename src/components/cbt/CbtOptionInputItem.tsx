'use client';

import React, { useState, useRef } from 'react';
import { 
  Calculator, 
  ImageIcon, 
  Trash2, 
  CheckCircle, 
  Upload, 
  X, 
  Sparkles, 
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import CbtRichText from './CbtRichText';
import CbtFormatToolbar from './CbtFormatToolbar';

interface CbtOptionInputItemProps {
  index: number;
  label: string; // 'A', 'B', 'C', 'D', 'E'
  value: string;
  isChecked: boolean;
  canDelete: boolean;
  radioName: string;
  placeholder?: string;
  onSelectCorrect: () => void;
  onChangeText: (text: string) => void;
  onDelete: () => void;
}

const QUICK_OPTION_FORMULAS = [
  { label: 'Pecahan', display: 'a/b', latex: '\\frac{a}{b}' },
  { label: 'Pangkat', display: 'x²', latex: 'x^{2}' },
  { label: 'Pangkat -n', display: 'x⁻ⁿ', latex: 'x^{-n}' },
  { label: 'Kurung Pangkat', display: '(a/b)ⁿ', latex: '\\left(\\frac{a}{b}\\right)^{n}' },
  { label: 'Akar', display: '√x', latex: '\\sqrt{x}' },
  { label: 'Akar Pecahan', display: '√(a/b)', latex: '\\sqrt{\\frac{a}{b}}' },
  { label: 'Akar Kurung ⁿ', display: '(√a/b)ⁿ', latex: '\\left(\\sqrt{\\frac{a}{b}}\\right)^{n}' },
  { label: 'PlusMinus', display: '±', latex: '\\pm' },
  { label: 'Pi', display: 'π', latex: '\\pi' },
  { label: 'Derajat', display: '°', latex: '^{\\circ}' },
  { label: 'Tidak Sama', display: '≠', latex: '\\neq' },
  { label: 'Kurang Sama', display: '≤', latex: '\\le' },
  { label: 'Lebih Sama', display: '≥', latex: '\\ge' },
  { label: 'Tak Hingga', display: '∞', latex: '\\infty' },
];

const QUICK_OPTION_TERMINALS = [
  { label: 'Perintah Linux/CLI', snippet: '[terminal]sudo systemctl restart nginx[/terminal]' },
  { label: 'Pesan Error', snippet: '[terminal]Error 404: File or directory not found[/terminal]' },
  { label: 'Query SQL', snippet: '[terminal]SELECT * FROM users WHERE active = 1;[/terminal]' },
  { label: 'Kotak Kosong', snippet: '[terminal]Tulis kode terminal di sini...[/terminal]' },
];

export default function CbtOptionInputItem({
  label,
  value,
  isChecked,
  canDelete,
  radioName,
  placeholder,
  onSelectCorrect,
  onChangeText,
  onDelete,
}: CbtOptionInputItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showStudioToolbar, setShowStudioToolbar] = useState(false);
  const [showMathPalette, setShowMathPalette] = useState(false);
  const [showTerminalPalette, setShowTerminalPalette] = useState(false);
  const [customTerminalText, setCustomTerminalText] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Cek apakah opsi ini memiliki foto dalam format markdown ![alt](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/;
  const imageMatch = value.match(imageRegex);
  const attachedImageUrl = imageMatch ? imageMatch[2] : null;

  // Cek apakah opsi ini mengandung rumus ($...$), foto, atau format teks khusus
  const hasRichContent = Boolean(
    value.includes('$') || 
    attachedImageUrl ||
    value.includes('`') ||
    value.includes('[') ||
    value.includes('*') ||
    value.includes('_') ||
    value.includes('<') ||
    value.includes('~') ||
    value.includes('==') ||
    value.includes('terminal')
  );

  // Sisipkan rumus KaTeX ke dalam opsi
  const handleInsertFormula = (latex: string) => {
    const wrapped = `$${latex}$`;
    const newText = value.trim() ? `${value.trim()} ${wrapped}` : wrapped;
    onChangeText(newText);
  };

  // Sisipkan kotak terminal/error ke dalam opsi
  const handleInsertTerminal = (snippetText?: string) => {
    const tagContent = snippetText || (customTerminalText.trim() ? `[terminal]${customTerminalText.trim()}[/terminal]` : '[terminal]Tulis kode terminal di sini...[/terminal]');
    const newText = value.trim() ? `${value.trim()} ${tagContent}` : tagContent;
    onChangeText(newText);
    setCustomTerminalText('');
    setShowTerminalPalette(false);
  };

  // Upload file gambar dari perangkat via /api/upload
  const handleUploadImageFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        // Bersihkan gambar lama bila ada, kemudian pasang gambar baru
        const cleanText = value.replace(imageRegex, '').trim();
        const markdownImg = `![Pilihan ${label}](${data.url})`;
        const newText = cleanText ? `${cleanText} ${markdownImg}` : markdownImg;
        onChangeText(newText);
        setShowImageModal(false);
        setImageInputUrl('');
      } else {
        alert(data.error || 'Gagal mengunggah foto opsi.');
      }
    } catch (err: unknown) {
      alert((err instanceof Error ? err.message : '') || 'Terjadi kesalahan jaringan saat mengunggah foto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Pasang gambar melalui URL
  const handleApplyUrlImage = () => {
    if (!imageInputUrl.trim()) return;
    const cleanText = value.replace(imageRegex, '').trim();
    const markdownImg = `![Pilihan ${label}](${imageInputUrl.trim()})`;
    const newText = cleanText ? `${cleanText} ${markdownImg}` : markdownImg;
    onChangeText(newText);
    setShowImageModal(false);
    setImageInputUrl('');
  };

  // Hapus foto dari opsi
  const handleRemoveImage = () => {
    const cleanText = value.replace(imageRegex, '').trim();
    onChangeText(cleanText);
  };

  const isAnyPaletteOpen = showStudioToolbar || showMathPalette || showTerminalPalette || showImageModal;
  const isAutoShow = isFocused || isAnyPaletteOpen;

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isChecked
          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Baris Input Utama */}
      <div className="flex items-center gap-2.5 p-3">
        {/* Radio Button Kunci Jawaban */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input
            type="radio"
            name={radioName}
            checked={isChecked}
            onChange={onSelectCorrect}
            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            title={`Pilih Opsi ${label} sebagai Kunci Jawaban Benar`}
          />
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
              isChecked
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {label}
          </span>
        </div>

        {/* Input Teks / Rumus Pilihan Jawaban */}
        <textarea
          ref={textareaRef}
          rows={value.includes('\n') ? Math.min(4, Math.max(2, value.split('\n').length)) : 1}
          required={!attachedImageUrl}
          placeholder={placeholder || `Teks atau rumus pilihan jawaban ${label}...`}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChangeText(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0 font-sans text-slate-900 dark:text-white resize-none py-1 leading-relaxed"
        />

        {/* Indikator Mini Foto Saat Diam (Jika Ada Lampiran Gambar) */}
        {attachedImageUrl && (
          <div
            className={`items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 flex-shrink-0 transition-all ${
              isAutoShow ? 'hidden' : 'flex group-hover:hidden group-focus-within:hidden'
            }`}
          >
            <ImageIcon size={12} />
            <span className="hidden sm:inline">Foto</span>
          </div>
        )}

        {/* Badge Kunci Jawaban (Selalu tampil jika opsi ini adalah kunci) */}
        {isChecked && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full flex-shrink-0">
            <CheckCircle size={12} />
            <span className="hidden sm:inline">Kunci</span>
          </span>
        )}

        {/* 🎛️ Tombol-tombol Pintas: Studio Format, Rumus, Terminal, Foto, Hapus */}
        <div
          className={`flex items-center gap-1 flex-shrink-0 transition-all duration-200 ease-out ${
            isAutoShow
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto'
          }`}
        >
          {/* 🎨 Tombol Studio Format (Persis Toolbar di Gambar Pengguna) */}
          <button
            type="button"
            onClick={() => {
              setShowStudioToolbar(!showStudioToolbar);
              setShowMathPalette(false);
              setShowTerminalPalette(false);
              setShowImageModal(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              showStudioToolbar
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-purple-600/30 font-bold'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
            }`}
            title={`Buka Studio Format Lengkap untuk Pilihan ${label} (Font, Ukuran, B, I, U, Warna, Stabilo, Rumus MTK, dll)`}
          >
            <Sparkles size={13} className={showStudioToolbar ? 'text-white' : 'text-purple-600 dark:text-purple-400'} />
            <span className="hidden sm:inline">Studio Format</span>
            <span className="sm:hidden">Format</span>
            {showStudioToolbar ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Tombol Sisipkan Rumus MTK Cepat */}
          <button
            type="button"
            onClick={() => {
              setShowMathPalette(!showMathPalette);
              setShowStudioToolbar(false);
              setShowTerminalPalette(false);
              setShowImageModal(false);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              showMathPalette
                ? 'bg-purple-600 text-white shadow-purple-600/30'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
            }`}
            title={`Sisipkan rumus matematika KaTeX cepat ke Opsi ${label}`}
          >
            <Calculator size={13} />
            <span className="hidden md:inline">Rumus</span>
          </button>

          {/* Tombol Sisipkan Kotak Terminal / Error */}
          <button
            type="button"
            onClick={() => {
              setShowTerminalPalette(!showTerminalPalette);
              setShowStudioToolbar(false);
              setShowMathPalette(false);
              setShowImageModal(false);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              showTerminalPalette
                ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800'
            }`}
            title={`Sisipkan kotak terminal/error output ke Opsi ${label}`}
          >
            <Terminal size={13} className={showTerminalPalette ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'} />
            <span className="hidden md:inline">Terminal</span>
          </button>

          {/* Tombol Sisipkan Foto/Gambar */}
          <button
            type="button"
            onClick={() => {
              setShowImageModal(!showImageModal);
              setShowStudioToolbar(false);
              setShowMathPalette(false);
              setShowTerminalPalette(false);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              attachedImageUrl
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
            }`}
            title={`Sisipkan atau ubah foto/diagram untuk Opsi ${label}`}
          >
            <ImageIcon size={13} />
            <span className="hidden sm:inline">{attachedImageUrl ? 'Foto Ada' : 'Foto'}</span>
          </button>

          {/* Tombol Hapus Opsi */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              title={`Hapus Pilihan ${label}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 🎨 STUDIO FORMAT SOAL CBT UNTUK OPSI JAWABAN (Lengkap, Rapi & Elegan) */}
      {showStudioToolbar && (
        <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-950/80 border-t border-purple-200/60 dark:border-purple-900/40 animate-in fade-in slide-in-from-top-1 duration-200">
          <CbtFormatToolbar
            textareaRef={textareaRef}
            value={value}
            onChange={onChangeText}
            title={`Studio Format Pilihan ${label}`}
            subtitle="Lengkap untuk Teks, Soal AKM, Wacana, IT, Rumus MTK & Tabel"
            targetLabel={`pilihan ${label}`}
            showPreviewToggle={false}
            defaultCollapsed={false}
            disableLocalStorageState={true}
            onClose={() => setShowStudioToolbar(false)}
            onInsertMath={(snippet) => {
              const wrapped = snippet.startsWith('$') ? snippet : `$${snippet}$`;
              const newText = value.trim() ? `${value.trim()} ${wrapped}` : wrapped;
              onChangeText(newText);
            }}
            onOpenTable={() => {
              const tableSnippet = '\n| Pilihan | Keterangan |\n| :--- | :--- |\n| Opsi 1 | Keterangan A |\n| Opsi 2 | Keterangan B |\n';
              const newText = value ? `${value}${tableSnippet}` : tableSnippet;
              onChangeText(newText);
            }}
          />
        </div>
      )}

      {/* Palet Pintasan Rumus Khusus Opsi Ini */}
      {showMathPalette && (
        <div className="px-3 py-2 bg-purple-50/70 dark:bg-purple-950/30 border-t border-purple-200/60 dark:border-purple-900/40 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-200">
            <span>Pilih Rumus Cepat untuk Opsi {label}:</span>
            <button
              type="button"
              onClick={() => setShowMathPalette(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_OPTION_FORMULAS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertFormula(item.latex)}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 hover:border-purple-500 hover:bg-purple-100/60 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                title={item.label}
              >
                <span className="text-purple-600 dark:text-purple-400 font-bold">{item.display}</span>
                <span className="text-[9px] text-slate-400 font-sans hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Palet Pintasan Kotak Terminal Khusus Opsi Ini */}
      {showTerminalPalette && (
        <div className="px-3 py-2.5 bg-cyan-50/70 dark:bg-cyan-950/30 border-t border-cyan-200/60 dark:border-cyan-900/40 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-900 dark:text-cyan-200">
            <span className="flex items-center gap-1">
              <Terminal size={12} className="text-cyan-600" />
              <span>Sisipkan Kotak Terminal / Error ke Opsi {label}:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTerminalPalette(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>

          {/* Preset Cepat */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_OPTION_TERMINALS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertTerminal(item.snippet)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 hover:border-cyan-500 hover:bg-cyan-100/60 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                title={`Sisipkan template ${item.label}`}
              >
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">&gt;_</span>
                <span className="text-[11px] font-sans">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Terminal Input */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">&gt;_</span>
              <input
                type="text"
                placeholder="Ketik perintah atau error kustom (contoh: npm run build / Error 500)..."
                value={customTerminalText}
                onChange={(e) => setCustomTerminalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertTerminal();
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleInsertTerminal()}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            >
              + Sisipkan
            </button>
          </div>
        </div>
      )}

      {/* Modal / Popup Sisipkan Foto untuk Opsi Ini */}
      {showImageModal && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border-t border-blue-200/60 dark:border-blue-900/40 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-1.5">
              <ImageIcon size={14} className="text-blue-600" />
              <span>Sisipkan Foto / Grafik untuk Pilihan {label}:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕ Batal
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm">
              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto dari Perangkat'}</span>
              <input
                type="file"
                accept="image/*"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImageFile(f);
                }}
                className="hidden"
              />
            </label>

            <span className="text-xs text-slate-400 text-center sm:text-left">atau</span>

            <div className="flex-1 flex items-center gap-1">
              <input
                type="text"
                placeholder="Tempel tautan URL gambar (https://...)"
                value={imageInputUrl}
                onChange={(e) => setImageInputUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />
              <button
                type="button"
                onClick={handleApplyUrlImage}
                disabled={!imageInputUrl.trim()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Realtime Jika Ada Rumus atau Foto */}
      {hasRichContent && (
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 text-[11px]">
              <Sparkles size={12} className="text-purple-500" />
              <span>Pratinjau Hasil Opsi {label}:</span>
            </span>

            <div className="flex items-center gap-2">
              {attachedImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Hapus foto dari opsi ini"
                >
                  <X size={11} /> Hapus Foto
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPreview ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-sm leading-relaxed">
              <CbtRichText text={value} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

