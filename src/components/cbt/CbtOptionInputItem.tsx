'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  ImageIcon, 
  Trash2, 
  CheckCircle, 
  Upload, 
  X, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  Loader2 
} from 'lucide-react';
import CbtRichText from './CbtRichText';

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

export default function CbtOptionInputItem({
  index,
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
  const [showMathPalette, setShowMathPalette] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Cek apakah opsi ini memiliki foto dalam format markdown ![alt](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/;
  const imageMatch = value.match(imageRegex);
  const attachedImageUrl = imageMatch ? imageMatch[2] : null;

  // Cek apakah opsi ini mengandung rumus ($...$) atau foto
  const hasRichContent = Boolean(value.includes('$') || attachedImageUrl);

  // Sisipkan rumus KaTeX ke dalam opsi
  const handleInsertFormula = (latex: string) => {
    const wrapped = `$${latex}$`;
    const newText = value.trim() ? `${value.trim()} ${wrapped}` : wrapped;
    onChangeText(newText);
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
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan jaringan saat mengunggah foto.');
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

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
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
        <input
          type="text"
          required={!attachedImageUrl}
          placeholder={placeholder || `Teks atau rumus pilihan jawaban ${label}...`}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0 font-sans text-slate-900 dark:text-white"
        />

        {/* Tombol-tombol Pintas: Rumus, Foto, Kunci, Hapus */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Tombol Sisipkan Rumus MTK */}
          <button
            type="button"
            onClick={() => setShowMathPalette(!showMathPalette)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              showMathPalette
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
            }`}
            title={`Sisipkan rumus matematika KaTeX ke Opsi ${label}`}
          >
            <Calculator size={13} />
            <span className="hidden sm:inline">Rumus</span>
          </button>

          {/* Tombol Sisipkan Foto/Gambar */}
          <button
            type="button"
            onClick={() => setShowImageModal(!showImageModal)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              attachedImageUrl
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
            }`}
            title={`Sisipkan atau ubah foto/diagram untuk Opsi ${label}`}
          >
            <ImageIcon size={13} />
            <span className="hidden sm:inline">{attachedImageUrl ? 'Foto Ada' : 'Foto'}</span>
          </button>

          {/* Badge Kunci Jawaban */}
          {isChecked && (
            <span className="hidden md:flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
              <CheckCircle size={12} /> Kunci
            </span>
          )}

          {/* Tombol Hapus Opsi */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
              title={`Hapus Pilihan ${label}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

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

