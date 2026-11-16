'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Copy,
  Check,
  FileSpreadsheet,
  Eye,
  HelpCircle,
  X,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import CbtRichText from './CbtRichText';

interface CbtTableBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (markdownTable: string) => void;
}

type Alignment = 'left' | 'center' | 'right';

interface TablePreset {
  id: string;
  title: string;
  desc: string;
  cols: number;
  rows: number;
  headers: string[];
  alignments: Alignment[];
  sampleData: string[][];
}

const PRESETS: TablePreset[] = [
  {
    id: 'perbandingan',
    title: '📋 2 Kolom (Perbandingan / Istilah)',
    desc: 'Cocok untuk perbandingan karakteristik atau definisi konsep',
    cols: 2,
    rows: 3,
    headers: ['Aspek / Karakteristik', 'Keterangan / Definisi'],
    alignments: ['left', 'left'],
    sampleData: [
      ['RAM (Random Access Memory)', 'Penyimpanan sementara berkecepatan tinggi'],
      ['ROM (Read Only Memory)', 'Penyimpanan permanen berisi instruksi booting'],
      ['Harddisk / SSD', 'Media penyimpanan data sekunder berkapasitas besar'],
    ],
  },
  {
    id: 'nilai',
    title: '📊 3 Kolom (No, Nama / Data, Nilai)',
    desc: 'Format umum untuk daftar nilai, frekuensi, atau hasil pengukuran',
    cols: 3,
    rows: 4,
    headers: ['No', 'Komponen / Keterangan', 'Nilai / Hasil'],
    alignments: ['center', 'left', 'right'],
    sampleData: [
      ['1', 'Nilai Ujian Harian 1', '85'],
      ['2', 'Nilai Ujian Harian 2', '92'],
      ['3', 'Nilai Tugas Mandiri', '88'],
      ['4', 'Nilai Proyek Praktik', '95'],
    ],
  },
  {
    id: 'akuntansi',
    title: '💼 4 Kolom (Jurnal Akuntansi)',
    desc: 'Format standar jurnal umum akuntansi (No, Akun, Debit, Kredit)',
    cols: 4,
    rows: 3,
    headers: ['No', 'Nama Akun / Rekening', 'Debit (Rp)', 'Kredit (Rp)'],
    alignments: ['center', 'left', 'right', 'right'],
    sampleData: [
      ['1', 'Kas Operasional', '15.000.000', '-'],
      ['2', 'Pendapatan Jasa Servis', '-', '15.000.000'],
      ['3', 'Beban Sewa Kantor', '2.500.000', '-'],
    ],
  },
  {
    id: 'matriks',
    title: '📈 5 Kolom (Matriks / Data Statistik)',
    desc: 'Untuk tabel observasi, eksperimen sains, atau data multisampel',
    cols: 5,
    rows: 3,
    headers: ['No', 'Sampel', 'Kadar A (%)', 'Kadar B (%)', 'Keterangan'],
    alignments: ['center', 'left', 'center', 'center', 'left'],
    sampleData: [
      ['1', 'Bahan Uji X-01', '12.5', '84.0', 'Memenuhi Standar'],
      ['2', 'Bahan Uji X-02', '14.2', '81.5', 'Memenuhi Standar'],
      ['3', 'Bahan Uji X-03', '09.8', '88.3', 'Perlu Pengujian Ulang'],
    ],
  },
];

export default function CbtTableBuilderModal({
  isOpen,
  onClose,
  onInsertTable,
}: CbtTableBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'paste' | 'help'>('editor');
  
  // Table configuration state
  const [hasHeader, setHasHeader] = useState(true);
  const [headers, setHeaders] = useState<string[]>(['No', 'Nama / Uraian', 'Nilai']);
  const [alignments, setAlignments] = useState<Alignment[]>(['center', 'left', 'right']);
  const [tableData, setTableData] = useState<string[][]>([
    ['1', 'Data Baris Pertama', '100'],
    ['2', 'Data Baris Kedua', '200'],
    ['3', 'Data Baris Ketiga', '300'],
  ]);

  // Paste from Excel / Sheets state
  const [pasteInput, setPasteInput] = useState('');
  const [pasteHasHeader, setPasteHasHeader] = useState(true);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Apply a preset
  const applyPreset = (preset: TablePreset) => {
    setHasHeader(true);
    setHeaders([...preset.headers]);
    setAlignments([...preset.alignments]);
    setTableData(preset.sampleData.map((row) => [...row]));
    setActiveTab('editor');
  };

  // Column operations
  const addColumn = () => {
    if (headers.length >= 10) return; // Safety limit
    const nextColIdx = headers.length + 1;
    setHeaders((prev) => [...prev, `Kolom ${nextColIdx}`]);
    setAlignments((prev) => [...prev, 'left']);
    setTableData((prev) => prev.map((row) => [...row, '']));
  };

  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders((prev) => prev.filter((_, idx) => idx !== colIdx));
    setAlignments((prev) => prev.filter((_, idx) => idx !== colIdx));
    setTableData((prev) => prev.map((row) => row.filter((_, idx) => idx !== colIdx)));
  };

  const toggleAlignment = (colIdx: number) => {
    const cycle: Record<Alignment, Alignment> = {
      left: 'center',
      center: 'right',
      right: 'left',
    };
    setAlignments((prev) => {
      const next = [...prev];
      next[colIdx] = cycle[next[colIdx] || 'left'];
      return next;
    });
  };

  // Row operations
  const addRow = () => {
    if (tableData.length >= 30) return;
    const newRow = new Array(headers.length).fill('');
    // Auto-fill row number if first column is aligned center or labeled 'No'
    if (headers[0]?.toLowerCase().includes('no')) {
      newRow[0] = String(tableData.length + 1);
    }
    setTableData((prev) => [...prev, newRow]);
  };

  const removeRow = (rowIdx: number) => {
    if (tableData.length <= 1) return;
    setTableData((prev) => prev.filter((_, idx) => idx !== rowIdx));
  };

  const clearAllData = () => {
    setTableData((prev) => prev.map((row) => row.map(() => '')));
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    setTableData((prev) => {
      const updated = prev.map((r) => [...r]);
      if (updated[rowIdx]) {
        updated[rowIdx][colIdx] = value;
      }
      return updated;
    });
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    setHeaders((prev) => {
      const updated = [...prev];
      updated[colIdx] = value;
      return updated;
    });
  };

  // Convert Excel / TSV / CSV paste
  const handleConvertPaste = () => {
    const raw = pasteInput.trim();
    if (!raw) return;

    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Detect delimiter: tab (Excel copy) or semicolon or comma
    let delimiter = '\t';
    if (lines[0].includes('\t')) delimiter = '\t';
    else if (lines[0].includes(';')) delimiter = ';';
    else if (lines[0].includes(',')) delimiter = ',';

    const parsedRows = lines.map((line) =>
      line.split(delimiter).map((cell) => cell.replace(/^["']|["']$/g, '').trim())
    );

    const maxCols = Math.max(...parsedRows.map((r) => r.length));
    if (maxCols === 0) return;

    let newHeaders: string[] = [];
    let newData: string[][] = [];

    if (pasteHasHeader && parsedRows.length > 0) {
      newHeaders = parsedRows[0];
      while (newHeaders.length < maxCols) {
        newHeaders.push(`Kolom ${newHeaders.length + 1}`);
      }
      newData = parsedRows.slice(1);
    } else {
      newHeaders = Array.from({ length: maxCols }, (_, i) => `Kolom ${i + 1}`);
      newData = parsedRows;
    }

    if (newData.length === 0) {
      newData = [Array(maxCols).fill('')];
    } else {
      newData = newData.map((row) => {
        const padded = [...row];
        while (padded.length < maxCols) padded.push('');
        return padded.slice(0, maxCols);
      });
    }

    // Auto-detect numeric alignment: if column has mostly numbers, align right
    const newAlignments: Alignment[] = newHeaders.map((h, colIdx) => {
      if (h.toLowerCase().includes('no')) return 'center';
      const sampleValues = newData.slice(0, 5).map((r) => r[colIdx]).filter(Boolean);
      const isNumeric = sampleValues.length > 0 && sampleValues.every((val) => /^[\d\.,\s\+\-%]+$/.test(val));
      return isNumeric ? 'right' : 'left';
    });

    setHasHeader(true);
    setHeaders(newHeaders);
    setAlignments(newAlignments);
    setTableData(newData);
    setActiveTab('editor');
  };

  // Generate clean Markdown table
  const generatedMarkdown = useMemo(() => {
    const colCount = headers.length;
    if (colCount === 0) return '';

    // Calculate alignment tokens
    const sepCells = alignments.map((align) => {
      if (align === 'center') return ':---:';
      if (align === 'right') return '---:';
      return ':---';
    });

    const headerLine = hasHeader
      ? `| ${headers.map((h) => (h.trim() ? h.trim() : ' ')).join(' | ')} |`
      : `| ${headers.map((_, i) => `Kolom ${i + 1}`).join(' | ')} |`;

    const sepLine = `| ${sepCells.join(' | ')} |`;

    const dataLines = tableData.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < colCount) paddedRow.push('');
      return `| ${paddedRow.slice(0, colCount).map((c) => (c.trim() ? c.trim() : ' ')).join(' | ')} |`;
    });

    return `\n${headerLine}\n${sepLine}\n${dataLines.join('\n')}\n`;
  }, [hasHeader, headers, alignments, tableData]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generatedMarkdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleInsert = () => {
    onInsertTable(generatedMarkdown);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Table size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                Pembuat & Pengatur Tabel Soal CBT
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  Fleksibel
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur kolom, baris, perataan teks, dan rumus matematika dalam tabel naskah soal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Table size={14} /> Editor Sel Tabel ({headers.length} Kolom × {tableData.length} Baris)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye size={14} /> Pratinjau Tampilan Siswa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet size={14} /> Tempel dari Excel / Sheets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('help')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle size={14} /> Panduan & Format Markdown
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: SPREADSHEET-LIKE CELL EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              
              {/* Presets Row */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    Pilihan Cepat Template Format Tabel:
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400">
                    Klik salah satu untuk menerapkan struktur
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-left p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-800/60 bg-white dark:bg-slate-900 hover:border-purple-500 hover:shadow-xs transition cursor-pointer group"
                    >
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {preset.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addColumn}
                    disabled={headers.length >= 10}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <Plus size={14} /> Tambah Kolom ({headers.length}/10)
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={tableData.length >= 30}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <Plus size={14} /> Tambah Baris ({tableData.length}/30)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    Header Judul Kolom
                  </label>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={clearAllData}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer flex items-center gap-1"
                    title="Kosongkan isi sel tanpa menghapus struktur"
                  >
                    <Trash2 size={12} /> Kosongkan Isi
                  </button>
                </div>
              </div>

              {/* Interactive Spreadsheet Grid */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <table className="w-full border-collapse text-xs">
                  {/* Column configuration bar (Alignments & Delete) */}
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="w-12 px-2 py-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        #
                      </th>
                      {headers.map((_, colIdx) => {
                        const align = alignments[colIdx] || 'left';
                        return (
                          <th
                            key={colIdx}
                            className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-w-[150px]"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Kolom {colIdx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleAlignment(colIdx)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                    align === 'center'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                      : align === 'right'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                  }`}
                                  title="Klik untuk ubah perataan teks (Kiri / Tengah / Kanan)"
                                >
                                  {align === 'center' ? (
                                    <>
                                      <AlignCenter size={10} /> Tengah
                                    </>
                                  ) : align === 'right' ? (
                                    <>
                                      <AlignRight size={10} /> Kanan
                                    </>
                                  ) : (
                                    <>
                                      <AlignLeft size={10} /> Kiri
                                    </>
                                  )}
                                </button>
                                {headers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeColumn(colIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                    title="Hapus Kolom Ini"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="w-10 px-2 py-2"></th>
                    </tr>

                    {/* Header Row Inputs */}
                    {hasHeader && (
                      <tr className="bg-purple-50/50 dark:bg-purple-950/30 border-b-2 border-purple-200 dark:border-purple-800/80">
                        <td className="px-2 py-2 text-center text-[10px] font-black text-purple-700 dark:text-purple-300 border-r border-slate-200 dark:border-slate-800">
                          JUDUL
                        </td>
                        {headers.map((h, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                          >
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                              placeholder={`Judul Kolom ${colIdx + 1}`}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2"></td>
                      </tr>
                    )}
                  </thead>

                  {/* Data Rows Inputs */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tableData.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/40'}
                      >
                        <td className="px-2 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800">
                          {rowIdx + 1}
                        </td>
                        {headers.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                          >
                            <input
                              type="text"
                              value={row[colIdx] || ''}
                              onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                              placeholder={`Baris ${rowIdx + 1}, Kolom ${colIdx + 1}`}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center">
                          {tableData.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(rowIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Hapus Baris Ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600" />
                  Tips: Anda juga dapat memasukkan rumus KaTeX ke dalam sel, misal: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">$x^2$</code>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Lihat Hasil Pratinjau Siswa <ArrowRight size={13} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: LIVE STUDENT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Eye size={14} className="text-purple-600" />
                  Pratinjau Nyata di Layar Siswa (Kompatibel HP, Tablet, Laptop)
                </h4>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <CbtRichText text={generatedMarkdown} />
                </div>
              </div>

              {/* Collapsible raw Markdown preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kode Sintaks Markdown Tabel (Tersimpan otomatis di naskah soal)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedMarkdown ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Salin Kode
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
                  {generatedMarkdown.trim()}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE FROM EXCEL / SPREADSHEET */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-1">
                  <FileSpreadsheet size={16} className="text-blue-600 dark:text-blue-400" />
                  Tempel Tabel dari Microsoft Excel / Google Sheets / Word
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Buka file Excel atau Google Sheets Anda, blok tabel yang diinginkan lalu tekan <b>Ctrl + C</b> (Copy).
                  Kemudian tempel (<b>Ctrl + V</b>) pada kotak di bawah ini dan klik tombol konversi.
                </p>
              </div>

              <div>
                <textarea
                  rows={7}
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder={`Tempel baris tabel Excel di sini...\nContoh:\nNo\tNama Akun\tDebit\tKredit\n1\tKas Operasional\t10.000.000\t-\n2\tPendapatan\t-\t10.000.000`}
                  className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pasteHasHeader}
                    onChange={(e) => setPasteHasHeader(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  Baris pertama adalah judul kolom (Header)
                </label>

                <button
                  type="button"
                  onClick={handleConvertPaste}
                  disabled={!pasteInput.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Sparkles size={14} /> Konversi Menjadi Tabel CBT
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: HELP & MARKDOWN GUIDE */}
          {activeTab === 'help' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <HelpCircle size={16} className="text-purple-600" />
                  Format Standar Tabel CBT (Markdown)
                </h4>
                <p>
                  Sistem CBT menggunakan format standar Markdown Table yang diakui secara universal.
                  Format ini sangat ringan, tidak memberatkan database, dan aman disalin atau di-export.
                </p>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">1. Aturan Perataan Kolom (Alignment):</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">:---</code> = Rata Kiri (Standar untuk teks narasi, nama, uraian)</li>
                    <li><code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">:---:</code> = Rata Tengah (Cocok untuk nomor, kode, simbol)</li>
                    <li><code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">---:</code> = Rata Kanan (Standar akuntansi untuk angka, harga, nominal)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">2. Contoh Format Akuntansi Jurnal:</p>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
{`| No | Akun | Debit | Kredit |
| :---: | :--- | ---: | ---: |
| 1 | Kas | Rp 5.000.000 | - |
| 2 | Modal Usaha | - | Rp 5.000.000 |`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">3. Mendukung Rumus Matematika (KaTeX):</p>
                  <p>
                    Anda dapat meletakkan rumus matematika di dalam sel tabel menggunakan simbol dollar, misalnya:
                    <br />
                    <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">| Nilai x | $f(x) = x^2 + 2x$ |</code>
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Ukuran: <b>{headers.length} Kolom</b> × <b>{tableData.length} Baris</b></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md hover:shadow-lg"
            >
              <Sparkles size={14} />
              Sisipkan Tabel ke Soal Ujian
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
