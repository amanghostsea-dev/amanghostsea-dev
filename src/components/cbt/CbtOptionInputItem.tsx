'use client';

import React, { useState, useRef } from 'react';
import { 
  ImageIcon, 
  Trash2, 
  CheckCircle, 
  Upload, 
  X, 
  Sparkles, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
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
  // 🎛️ Single-active accordion toolbar:
  isToolbarOpen?: boolean;
  onToggleToolbar?: () => void;
}

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
  isToolbarOpen,
  onToggleToolbar,
}: CbtOptionInputItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [internalShowStudioToolbar, setInternalShowStudioToolbar] = useState(false);
  const showStudioToolbar = isToolbarOpen !== undefined ? isToolbarOpen : internalShowStudioToolbar;

  const handleToggleStudioToolbar = () => {
    if (onToggleToolbar) {
      onToggleToolbar();
    } else {
      setInternalShowStudioToolbar((prev) => !prev);
    }
    setShowImageModal(false);
  };

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

  // Unggah file foto untuk opsi
  const handleUploadImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const cleanText = value.replace(imageRegex, '').trim();
        const newText = cleanText 
          ? `${cleanText}\n\n![Gambar Opsi ${label}](${data.url})` 
          : `![Gambar Opsi ${label}](${data.url})`;
        onChangeText(newText);
        setShowImageModal(false);
      } else {
        alert('Gagal mengunggah foto. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Upload option image error:', err);
      alert('Terjadi kesalahan saat mengunggah foto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Terapkan URL gambar eksternal
  const handleApplyUrlImage = () => {
    if (!imageInputUrl.trim()) return;
    const cleanText = value.replace(imageRegex, '').trim();
    const newText = cleanText 
      ? `${cleanText}\n\n![Gambar Opsi ${label}](${imageInputUrl.trim()})` 
      : `![Gambar Opsi ${label}](${imageInputUrl.trim()})`;
    onChangeText(newText);
    setShowImageModal(false);
    setImageInputUrl('');
  };

  // Hapus foto dari opsi
  const handleRemoveImage = () => {
    const cleanText = value.replace(imageRegex, '').trim();
    onChangeText(cleanText);
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-visible ${
        showStudioToolbar
          ? 'z-30 border-purple-400 dark:border-purple-600 bg-purple-50/15 dark:bg-purple-950/10 shadow-md ring-1 ring-purple-400/30'
          : isChecked
          ? 'z-10 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30 shadow-xs'
          : 'z-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* ── BARIS 1: HEADER & ACTION BAR ── */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
        {/* Sisi Kiri: Radio Kunci, Label Badge, & Indikator Status */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <label 
            className="flex items-center gap-2 cursor-pointer select-none group/radio"
            title={`Pilih Opsi ${label} sebagai Kunci Jawaban Benar`}
          >
            <input
              type="radio"
              name={radioName}
              checked={isChecked}
              onChange={onSelectCorrect}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors shadow-2xs ${
                isChecked
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover/radio:bg-slate-200 dark:group-hover/radio:bg-slate-700'
              }`}
            >
              {label}
            </span>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Pilihan {label}
            </span>
          </label>

          {/* Badge Kunci Jawaban */}
          {isChecked && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full shadow-2xs">
              <CheckCircle size={12} />
              <span>Kunci Jawaban</span>
            </span>
          )}

          {/* Badge Foto Terlampir */}
          {attachedImageUrl && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
              <ImageIcon size={12} />
              <span>Foto Terlampir</span>
            </span>
          )}
        </div>

        {/* Sisi Kanan: Tombol Aksi Bersih, Nyaman & Selalu Terlihat */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tombol Studio Format (Toggle Lengkap) */}
          <button
            type="button"
            onClick={handleToggleStudioToolbar}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              showStudioToolbar
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-purple-600/30 font-bold ring-2 ring-purple-600/20'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
            }`}
            title={`Buka Studio Format Lengkap untuk Pilihan ${label} (Font, Ukuran, B, I, U, Warna, Stabilo, Rumus MTK, dll)`}
          >
            <Sparkles size={13} className={showStudioToolbar ? 'text-white' : 'text-purple-600 dark:text-purple-400'} />
            <span className="hidden sm:inline">Studio Format</span>
            <span className="sm:hidden">Format</span>
            {showStudioToolbar ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Tombol Sisipkan Foto/Gambar */}
          <button
            type="button"
            onClick={() => {
              setShowImageModal(!showImageModal);
              if (!showImageModal && showStudioToolbar) {
                handleToggleStudioToolbar();
              }
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
              attachedImageUrl
                ? 'bg-blue-600 text-white shadow-blue-600/30 font-bold ring-2 ring-blue-600/20'
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

      {/* ── BARIS 2: TEXTAREA INPUT FULL-WIDTH (100% LEGA & TIDAK SESAK) ── */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          rows={value.includes('\n') ? Math.min(6, Math.max(2, value.split('\n').length)) : 1}
          required={!attachedImageUrl}
          placeholder={placeholder || `Ketikkan teks atau rumus jawaban pilihan ${label}... (buka Studio Format untuk font, warna, rumus MTK, tabel)`}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChangeText(e.target.value)}
          className={`w-full bg-slate-50/70 dark:bg-slate-950/50 rounded-xl px-3.5 py-2.5 text-sm font-sans text-slate-900 dark:text-white border transition-all resize-none leading-relaxed placeholder:text-slate-400 focus:outline-none min-h-[44px] ${
            isFocused
              ? 'border-purple-500 dark:border-purple-500 bg-white dark:bg-slate-900 ring-2 ring-purple-500/20 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        />
      </div>

      {/* ── BARIS 3: STUDIO FORMAT TOOLBAR (Lengkap, Rapi & Bebas Terpotong) ── */}
      {showStudioToolbar && (
        <div className="p-2 sm:p-2.5 bg-slate-50/90 dark:bg-slate-950/90 border-t border-purple-200/60 dark:border-purple-900/40 animate-in fade-in slide-in-from-top-1 duration-200 overflow-visible">
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
            onClose={handleToggleStudioToolbar}
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

      {/* ── MODAL / AREA UPLOAD FOTO ── */}
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
            <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs">
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

      {/* ── REAL-TIME PRATINJAU HASIL ── */}
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
                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showPreview ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-sm leading-relaxed shadow-2xs">
              <CbtRichText text={value} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
