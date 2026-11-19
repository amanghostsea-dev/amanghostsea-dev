'use client';

import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Copy,
  Check,
  Sparkles,
  Info,
  X,
  FileDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ExportableQuestionItem,
  generateExamQuestionsCsv,
  generateExamQuestionsTxt,
  generateExamQuestionsJson,
  generateExamQuestionsClipboard,
  generateBlankTemplateCsv,
  generateBlankTemplateTxt,
  triggerBrowserDownload,
} from '@/lib/cbt-bank-soal';

export interface CbtDownloadBankSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  examSubject: string;
  questions: ExportableQuestionItem[];
  totalPoints?: number;
  isSubset?: boolean;
}

export default function CbtDownloadBankSoalModal({
  isOpen,
  onClose,
  examTitle,
  examSubject,
  questions,
  totalPoints,
  isSubset = false,
}: CbtDownloadBankSoalModalProps) {
  const [copiedClipboard, setCopiedClipboard] = useState(false);
  const [activeTab, setActiveTab] = useState<'download' | 'guide'>('download');

  if (!isOpen) return null;

  const count = questions.length;
  const calculatedPoints =
    totalPoints !== undefined
      ? totalPoints
      : questions.reduce((acc, q) => acc + (q.points ?? 10), 0);

  const cleanSubject = (examSubject || 'Mapel').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanTitle = (examTitle || 'Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const suffix = isSubset ? `_${count}Soal_Pilihan` : `_${count}Soal`;

  // Handler Download CSV
  const handleDownloadCsv = () => {
    const csv = generateExamQuestionsCsv(examTitle, examSubject, questions);
    triggerBrowserDownload(
      csv,
      `Bank_Soal_CBT_${cleanSubject}_${cleanTitle}${suffix}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  // Handler Download TXT
  const handleDownloadTxt = () => {
    const txt = generateExamQuestionsTxt(examTitle, examSubject, questions);
    triggerBrowserDownload(
      txt,
      `Naskah_Soal_CBT_${cleanSubject}_${cleanTitle}${suffix}.txt`,
      'text/plain;charset=utf-8;'
    );
  };

  // Handler Download JSON
  const handleDownloadJson = () => {
    const json = generateExamQuestionsJson(examTitle, examSubject, questions);
    triggerBrowserDownload(
      json,
      `Master_Cadangan_CBT_${cleanSubject}_${cleanTitle}${suffix}.json`,
      'application/json;charset=utf-8;'
    );
  };

  // Handler Salin ke Clipboard
  const handleCopyToClipboard = () => {
    const clipboardText = generateExamQuestionsClipboard(questions);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clipboardText);
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 3000);
    }
  };

  // Handler Template Kosong
  const handleDownloadBlankCsv = () => {
    const csv = generateBlankTemplateCsv();
    triggerBrowserDownload(csv, 'Template_Bank_Soal_CBT_Kosong.csv', 'text/csv;charset=utf-8;');
  };

  const handleDownloadBlankTxt = () => {
    const txt = generateBlankTemplateTxt();
    triggerBrowserDownload(txt, 'Template_Naskah_Soal_CBT_Kosong.txt', 'text/plain;charset=utf-8;');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <Download size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Studio Unduh & Cadangan Bank Soal
                </h3>
                {isSubset && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {count} Soal Terpilih
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Format backup butir soal CBT resmi SMK Garuda Mahadhika. 100% siap di-upload ulang saat guru membuat paket baru.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Ringkasan Paket Ujian */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paket Soal Sumber</span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1" title={examTitle}>
                {examTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Mapel: <strong className="text-slate-700 dark:text-slate-200">{examSubject}</strong>
              </p>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Butir Soal</span>
                <span className="text-slate-800 dark:text-slate-200 font-extrabold text-sm">{count} Soal</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Total Skor</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{calculatedPoints} Poin</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Status Kompatibilitas</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <ShieldCheck size={13} /> 100% Siap Upload
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigasi: Opsi Download / Panduan Upload Ulang */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('download')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'download'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Pilihan Format Download (4 Opsi)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'guide'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Info size={14} /> Cara Upload Ulang ke Paket Baru
              </button>
            </div>
          </div>

          {activeTab === 'download' ? (
            <div className="space-y-3">
              {/* Opsi 1: Format Excel / Spreadsheet (.CSV) */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Format Tabel Excel / Spreadsheet (.CSV)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                        Standar Rekomendasi
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Format tabel resmi CBT (pemisah <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono font-bold text-emerald-600">;</code> & UTF-8 BOM). Langsung rapi di Microsoft Excel Indonesia & Google Sheets. <strong>Dapat langsung diunggah ulang di paket soal baru</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                >
                  <Download size={14} /> Unduh CSV (Excel)
                </button>
              </div>

              {/* Opsi 2: Format Naskah Dokumen Word / TXT */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Format Naskah Word / Dokumen Teks (.TXT)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        Mudah Diedit di Word
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Naskah bernomor rapi (<code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">1. Soal</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">A. Opsi</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">Kunci: A</code>). Cocok untuk dibuka di Microsoft Word / Notepad, dicetak arsip fisik guru, atau di-upload ulang.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                >
                  <Download size={14} /> Unduh Naskah (.TXT)
                </button>
              </div>

              {/* Opsi 3: Format Master Cadangan Digital (.JSON) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Layers size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Master Cadangan Digital Lengkap (.JSON)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                        Presisi Struktur Penuh
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Salinan digital lengkap struktur butir soal termasuk URL media gambar dan poin. File JSON ini kini <strong>dapat langsung diunggah kembali</strong> via menu Input Kolektif.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                >
                  <Download size={14} /> Unduh JSON
                </button>
              </div>

              {/* Opsi 4: Salin Cepat Teks Soal ke Clipboard */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Copy size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Salin Cepat Format Teks (Clipboard)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                        Tanpa Unduh File
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Salin seluruh teks soal lengkap dengan kunci dan bobot langsung ke clipboard. Anda tinggal membuka paket soal baru, buka Input Kolektif, lalu tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">Ctrl + V</kbd>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm ${
                    copiedClipboard
                      ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                  }`}
                >
                  {copiedClipboard ? (
                    <>
                      <Check size={14} /> Berhasil Disalin!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Salin Semua Soal
                    </>
                  )}
                </button>
              </div>

              {/* Unduh Template Kosong Baru */}
              <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                  <FileDown size={16} className="text-slate-400 shrink-0" />
                  <span>Perlu template bersih siap isi untuk menyusun soal baru dari nol?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadBlankCsv}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer"
                  >
                    Template Excel (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBlankTxt}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer"
                  >
                    Template Word (.txt)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Panduan Alur Kerja Upload Ulang */
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>Alur Praktis: Dari Backup Soal hingga Di-Upload Ulang</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 space-y-1">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs inline-flex items-center justify-center">
                    1
                  </span>
                  <h5 className="font-bold text-slate-800 dark:text-white pt-1">Unduh Backup Hari Ini</h5>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Klik tombol <strong>Unduh CSV</strong> (untuk Excel) atau <strong>Unduh Naskah</strong> (untuk Word). Simpan file di laptop/flashdisk Anda sebagai arsip aman.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 space-y-1">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs inline-flex items-center justify-center">
                    2
                  </span>
                  <h5 className="font-bold text-slate-800 dark:text-white pt-1">Buat Paket Soal Baru</h5>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Buka menu CBT, klik <strong>&quot;Tambah Ujian Baru&quot;</strong>, isi judul ujian, mata pelajaran, target kelas, lalu klik simpan untuk masuk ke lembar bank soal.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 space-y-1">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs inline-flex items-center justify-center">
                    3
                  </span>
                  <h5 className="font-bold text-slate-800 dark:text-white pt-1">Unggah File Kolektif</h5>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Di dalam paket baru, klik tombol <strong>&quot;Input Kolektif&quot;</strong>. Klik <strong>&quot;Unggah File&quot;</strong> lalu pilih file backup Anda (.csv, .txt, atau .json).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 space-y-1">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-extrabold text-xs inline-flex items-center justify-center">
                    4
                  </span>
                  <h5 className="font-bold text-slate-800 dark:text-white pt-1">Pratinjau & Simpan</h5>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Sistem secara instan membaca seluruh pertanyaan, kunci jawaban, dan skor. Klik <strong>&quot;Simpan Semua Soal&quot;</strong> dan paket baru siap diujikan!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Seluruh format hasil download terenkripsi UTF-8 standar resmi CBT SMK.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
