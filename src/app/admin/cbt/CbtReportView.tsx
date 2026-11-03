'use client';

import { useState, useMemo, useRef } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  FileCheck2, 
  Sparkles, 
  GraduationCap, 
  Check, 
  X,
  FileText,
  RotateCcw,
  Settings2
} from 'lucide-react';
import { KopSuratConfig } from '@/app/admin/settings/types';
import { resetStudentAttemptAction, syncCbtScoresToStudentGradesAction } from './actions';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox, 
  CbtDigitalStamp 
} from '@/components/cbt/CbtOfficialPrintComponents';

export interface ReportAttemptItem {
  id: string;
  studentName: string;
  studentNis?: string | null;
  studentClass?: string | null;
  score: number;
  totalQuestions?: number;
  totalCorrect?: number;
  status: string;
  tabSwitchCount?: number;
  startedAt?: Date | string;
  submittedAt?: Date | string | null;
}

export interface ReportExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  authorName?: string | null;
  attempts: ReportAttemptItem[];
  _count?: {
    questions?: number;
  };
}

interface CbtReportViewProps {
  exams: ReportExamItem[];
  currentUser?: {
    name: string;
    role: string;
  };
  classPresets?: string[];
  subjectPresets?: string[];
  kopSuratConfig?: KopSuratConfig;
}

export default function CbtReportView({
  exams,
  currentUser,
  classPresets = [],
  subjectPresets = [],
  kopSuratConfig,
}: CbtReportViewProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';
  const isGuru = currentUser?.role === 'Guru';
  const currentUserName = currentUser?.name || '';

  // Filter States
  const [examFilter, setExamFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [passingFilter, setPassingFilter] = useState<'ALL' | 'PASSED' | 'REMEDIAL' | 'IN_PROGRESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyExams, setOnlyMyExams] = useState(isGuru);
  const [kkmScore] = useState(75);

  // Action States
  const [syncingExamId, setSyncingExamId] = useState<string | null>(null);
  const [resetTargetAttempt, setResetTargetAttempt] = useState<{ id: string; studentName: string; examTitle: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [printStudentCard, setPrintStudentCard] = useState<any | null>(null);
  const [isPrintCollectiveModalOpen, setIsPrintCollectiveModalOpen] = useState(false);

  // Flatten all attempts into uniform report rows
  const allRows = useMemo(() => {
    const list: Array<{
      attemptId: string;
      examId: string;
      examTitle: string;
      subject: string;
      examClassTarget: string;
      examAuthor: string;
      studentName: string;
      studentNis: string;
      studentClass: string;
      score: number;
      totalQuestions: number;
      totalCorrect: number;
      status: string;
      tabSwitchCount: number;
      startedAt: string | Date;
      submittedAt: string | Date | null;
    }> = [];

    for (const ex of exams) {
      for (const at of (ex.attempts || [])) {
        list.push({
          attemptId: at.id,
          examId: ex.id,
          examTitle: ex.title,
          subject: ex.subject,
          examClassTarget: ex.classTarget,
          examAuthor: ex.authorName || 'Guru Pengampu',
          studentName: at.studentName,
          studentNis: at.studentNis || '-',
          studentClass: at.studentClass || ex.classTarget || 'Semua Kelas',
          score: at.score,
          totalQuestions: at.totalQuestions || ex._count?.questions || 0,
          totalCorrect: at.totalCorrect || 0,
          status: at.status,
          tabSwitchCount: at.tabSwitchCount || 0,
          startedAt: at.startedAt || '',
          submittedAt: at.submittedAt || null,
        });
      }
    }
    return list;
  }, [exams]);

  // Apply All Active Filters
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (isGuru && onlyMyExams) {
        if (r.examAuthor.toLowerCase() !== currentUserName.toLowerCase()) {
          return false;
        }
      }
      if (examFilter !== 'ALL' && r.examId !== examFilter) return false;
      if (classFilter !== 'ALL' && r.studentClass !== classFilter) return false;
      if (subjectFilter !== 'ALL' && r.subject !== subjectFilter) return false;
      if (passingFilter === 'PASSED' && (r.score < kkmScore || r.status !== 'SUBMITTED')) return false;
      if (passingFilter === 'REMEDIAL' && (r.score >= kkmScore || r.status !== 'SUBMITTED')) return false;
      if (passingFilter === 'IN_PROGRESS' && r.status !== 'IN_PROGRESS') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.studentName.toLowerCase().includes(q) ||
          r.studentNis.toLowerCase().includes(q) ||
          r.studentClass.toLowerCase().includes(q) ||
          r.examTitle.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allRows, isGuru, onlyMyExams, currentUserName, examFilter, classFilter, subjectFilter, passingFilter, searchQuery, kkmScore]);

  // Analytics Metrics
  const totalAttempts = filteredRows.length;
  const submittedRows = filteredRows.filter((r) => r.status === 'SUBMITTED');
  const submittedCount = submittedRows.length;
  const passedCount = submittedRows.filter((r) => r.score >= kkmScore).length;
  const remedialCount = submittedRows.filter((r) => r.score < kkmScore).length;
  const passRate = submittedCount > 0 ? Math.round((passedCount / submittedCount) * 100) : 0;
  const avgScore = submittedCount > 0
    ? Math.round(submittedRows.reduce((sum, r) => sum + r.score, 0) / submittedCount)
    : 0;
  const highestScore = submittedCount > 0 ? Math.max(...submittedRows.map((r) => r.score)) : 0;
  const lowestScore = submittedCount > 0 ? Math.min(...submittedRows.map((r) => r.score)) : 0;
  const totalCheatingWarnings = filteredRows.reduce((sum, r) => sum + r.tabSwitchCount, 0);

  // Group classes for filter dropdown
  const groupedClasses = useMemo(() => {
    const onlyClasses = classPresets.filter((c) => c !== 'Semua Kelas');
    const x = onlyClasses.filter((c) => c.startsWith('X ') || c.startsWith('X-') || c === 'X');
    const xi = onlyClasses.filter((c) => c.startsWith('XI ') || c.startsWith('XI-') || c === 'XI');
    const xii = onlyClasses.filter((c) => c.startsWith('XII ') || c.startsWith('XII-') || c === 'XII');
    const others = onlyClasses.filter((c) => !x.includes(c) && !xi.includes(c) && !xii.includes(c));
    return { x, xi, xii, others };
  }, [classPresets]);

  // Handlers
  const handleResetAttempt = async () => {
    if (!resetTargetAttempt) return;
    setIsResetting(true);
    try {
      const res = await resetStudentAttemptAction(resetTargetAttempt.id);
      if (res?.success) {
        alert(res.message);
        setResetTargetAttempt(null);
        window.location.reload();
      } else {
        alert(res?.error || 'Gagal mereset ujian siswa.');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncToGrades = async (examId: string) => {
    setSyncingExamId(examId);
    try {
      const res = await syncCbtScoresToStudentGradesAction(examId);
      if (res?.success) {
        alert(res.message);
      } else {
        alert(res?.error || 'Gagal menyinkronkan nilai.');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menyinkronkan nilai ke buku nilai.');
    } finally {
      setSyncingExamId(null);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      alert('Tidak ada data hasil ujian yang dapat diekspor.');
      return;
    }

    const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas / Rombel', 'Mata Pelajaran', 'Paket Ujian', 'Skor Nilai', 'Status Ketuntasan', 'Jawaban Benar', 'Total Soal', 'Pelanggaran Tab Switch', 'Tanggal Submit'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.studentNis}"`,
      `"${r.studentClass}"`,
      `"${r.subject}"`,
      `"${r.examTitle.replace(/"/g, '""')}"`,
      r.score,
      r.status === 'SUBMITTED' ? (r.score >= kkmScore ? 'TUNTAS' : 'REMEDIAL') : 'SEDANG DIKERJAKAN',
      r.totalCorrect,
      r.totalQuestions,
      r.tabSwitchCount,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString('id-ID') : '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Hasil_CBT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrintReport = () => {
    setIsPrintCollectiveModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 🌟 ROLE-BASED CONTEXT BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white shadow-xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Award size={220} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold">
              <FileCheck2 size={14} className="text-purple-300" />
              Laporan Hasil & Rekapitulasi CBT • {isSuperAdmin ? 'Tingkat Sekolah (SuperAdmin)' : isGuru ? `Mode Guru: ${currentUserName}` : 'Semua Pengguna'}
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Laporan Evaluasi & Buku Nilai CBT
            </h2>
            <p className="text-xs md:text-sm text-purple-200 max-w-2xl leading-relaxed">
              {isSuperAdmin
                ? 'Pantau perolehan nilai seluruh siswa antar-jurusan dan rombel kelas, analisis ketuntasan KKM sekolah, kelola pelanggaran integritas, dan ekspor data resmi.'
                : 'Kelola nilai siswa untuk mata pelajaran yang Anda ampu, lakukan sinkronisasi otomatis langsung ke Buku Nilai Raport, serta berikan dispensasi ujian ulang.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <a
                href="/admin/settings#kop-surat"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm"
              >
                <Settings2 size={16} /> Atur Kop Surat
              </a>
            )}
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm"
            >
              <Download size={16} /> Ekspor Excel (CSV)
            </button>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-purple-500/30 cursor-pointer"
            >
              <Printer size={16} /> Cetak Rekap Resmi
            </button>
          </div>
        </div>
      </div>

      {/* 📊 ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Users size={14} className="text-purple-500" /> Total Peserta Ujian
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalAttempts} <span className="text-xs font-normal text-slate-400">Siswa</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {submittedCount} Selesai Submit
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Award size={14} className="text-indigo-500" /> Rata-Rata Nilai
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Standar KKM: {kkmScore}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> Ketuntasan Belajar
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {passRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {passedCount} Siswa Tuntas
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-500" /> Perlu Remedial
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {remedialCount} <span className="text-xs font-normal text-slate-400">Siswa</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Nilai di bawah {kkmScore}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-rose-500" /> Pelanggaran Integritas
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {totalCheatingWarnings} <span className="text-xs font-normal text-slate-400">Tab Switch</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Anti-curang detektor
          </div>
        </div>
      </div>

      {/* 🔍 FILTER TOOLBAR */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              placeholder="Cari siswa, NISN, kelas, atau nama ujian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          </div>

          {/* Quick Guru Toggle */}
          {isGuru && (
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Fokus Ujian Saya:
              </label>
              <button
                type="button"
                onClick={() => setOnlyMyExams(!onlyMyExams)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  onlyMyExams
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {onlyMyExams ? '✓ Ujian Saya Saja' : 'Semua Ujian Sekolah'}
              </button>
            </div>
          )}
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Filter Paket Ujian */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Pilih Paket Ujian:
            </label>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Paket Ujian ({exams.length})</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas & Rombel (Synced with Academic Classes) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Target Kelas & Rombel:
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Rombel Kelas</option>
              {groupedClasses.x.length > 0 && (
                <optgroup label="Tingkat X (Kelas 10)">
                  {groupedClasses.x.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.xi.length > 0 && (
                <optgroup label="Tingkat XI (Kelas 11)">
                  {groupedClasses.xi.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.xii.length > 0 && (
                <optgroup label="Tingkat XII (Kelas 12)">
                  {groupedClasses.xii.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.others.length > 0 && (
                <optgroup label="Kelas Lainnya">
                  {groupedClasses.others.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Filter Mata Pelajaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Mata Pelajaran:
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {subjectPresets.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filter Status Ketuntasan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Status Ketuntasan:
            </label>
            <select
              value={passingFilter}
              onChange={(e) => setPassingFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status Hasil</option>
              <option value="PASSED">✅ Tuntas (Skor ≥ {kkmScore})</option>
              <option value="REMEDIAL">⚠️ Remedial (Skor &lt; {kkmScore})</option>
              <option value="IN_PROGRESS">⏳ Sedang Mengerjakan</option>
            </select>
          </div>
        </div>
      </div>

      {/* 🚀 QUICK SYNC TO RAPORT BANNER (For Selected Exam Filter) */}
      {examFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-600 text-white">
              <Sparkles size={20} />
            </span>
            <div>
              <span className="text-xs font-black text-blue-950 dark:text-blue-100 block">
                Sinkronisasi Nilai Otomatis ke Buku Nilai Siswa (Raport)
              </span>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Pindahkan nilai ujian paket ini langsung ke tabel Buku Nilai Raport Guru dengan 1 kali klik.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSyncToGrades(examFilter)}
            disabled={syncingExamId === examFilter}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {syncingExamId === examFilter ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Menyinkronkan...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Sinkronkan ke Raport
              </>
            )}
          </button>
        </div>
      )}

      {/* 📋 MAIN RESULTS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Daftar Nilai Siswa ({filteredRows.length} Data)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Diurutkan berdasarkan pengerjaan terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama Siswa & NISN</th>
                <th className="p-4">Rombel Kelas</th>
                <th className="p-4">Paket Ujian / Mapel</th>
                <th className="p-4 text-center">Skor Nilai</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Benar / Soal</th>
                <th className="p-4 text-center">Anti-Curang</th>
                <th className="p-4">Waktu Submit</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center text-slate-400">
                    <GraduationCap className="mx-auto mb-2 text-slate-300" size={32} />
                    Tidak ada hasil ujian yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isPassed = row.score >= kkmScore;
                  const isSubmitted = row.status === 'SUBMITTED';

                  return (
                    <tr
                      key={row.attemptId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NISN: {row.studentNis}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/50 text-[11px] font-mono">
                          {row.studentClass}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {row.examTitle}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                          {row.subject} • Pengampu: {row.examAuthor}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-block">
                          <span
                            className={`text-base font-black px-3 py-1 rounded-xl block font-mono ${
                              !isSubmitted
                                ? 'bg-slate-100 text-slate-500'
                                : isPassed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {isSubmitted ? Math.round(row.score) : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {!isSubmitted ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                            Sedang Ujian
                          </span>
                        ) : isPassed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                            ✓ TUNTAS
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm shadow-amber-500/20">
                            REMEDIAL
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {isSubmitted ? `${row.totalCorrect} / ${row.totalQuestions}` : '—'}
                      </td>

                      <td className="p-4 text-center">
                        {row.tabSwitchCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">
                            ⚠️ {row.tabSwitchCount}x Tab
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold text-xs">Aman</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {row.submittedAt ? (
                          <div>
                            <div>{new Date(row.submittedAt).toLocaleDateString('id-ID')}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(row.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                          </div>
                        ) : (
                          'Belum selesai'
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintStudentCard(row)}
                            className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                            title="Cetak Lembar Nilai Siswa"
                          >
                            <Printer size={15} />
                          </button>

                          {(isSuperAdmin || isGuru) && (
                            <button
                              type="button"
                              onClick={() =>
                                setResetTargetAttempt({
                                  id: row.attemptId,
                                  studentName: row.studentName,
                                  examTitle: row.examTitle,
                                })
                              }
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Reset Ujian (Izinkan Ujian Ulang)"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🖨️ MODAL 1: CETAK REKAPITULASI RESMI KOLEKTIF (KELAS / MAPEL) */}
      {isPrintCollectiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <Printer className="text-purple-600" size={20} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Pratinjau Lembar Rekapitulasi Nilai Resmi CBT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Format cetak resmi standar Dinas Pendidikan & SMK TI GAMA 1 BEKASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintCollectiveModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="cbt-printable-collective-report" className="space-y-4 bg-white text-black">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="DAFTAR NILAI & REKAPITULASI HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / CBT-REKAP / ${new Date().getFullYear()} / SMK-GAMA`}
                  subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
                />

                {/* 📋 METADATA LAPORAN */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Mata Pelajaran</span>
                    <span>: {subjectFilter !== 'ALL' ? subjectFilter : (exams.find(e => e.id === examFilter)?.subject || 'Seluruh Mata Pelajaran Terpilih')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Tingkat / Target Kelas</span>
                    <span>: {classFilter !== 'ALL' ? classFilter : 'Seluruh Rombel Kelas'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Paket Ujian CBT</span>
                    <span>: {exams.find(e => e.id === examFilter)?.title || 'Seluruh Paket Ujian Terpilih'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Standar KKM Sekolah</span>
                    <span>: <strong>75.00</strong> (Kriteria Ketuntasan Minimal)</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Guru / Pengampu</span>
                    <span>: {isGuru ? currentUserName : (exams.find(e => e.id === examFilter)?.authorName || 'Tim Kurikulum & CBT')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Waktu Cetak</span>
                    <span>: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* 📊 TABEL NILAI RESMI */}
                <table className="w-full text-left border-collapse border border-black text-[10px] sm:text-xs">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black text-black font-bold uppercase text-center tracking-tight">
                      <th className="py-2 px-1 border-r border-black w-8">No</th>
                      <th className="py-2 px-2 border-r border-black w-24">NIS / NISN</th>
                      <th className="py-2 px-3 border-r border-black text-left">Nama Lengkap Siswa</th>
                      <th className="py-2 px-2 border-r border-black w-20">Kelas</th>
                      <th className="py-2 px-2 border-r border-black w-16">Benar</th>
                      <th className="py-2 px-2 border-r border-black w-16">Nilai</th>
                      <th className="py-2 px-2 border-r border-black w-14">Grade</th>
                      <th className="py-2 px-2 border-r border-black w-20">Status</th>
                      <th className="py-2 px-2">Integritas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/40">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                          Tidak ada data peserta ujian yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r, idx) => {
                        const isTuntas = r.score >= kkmScore;
                        let grade = 'C';
                        if (r.score >= 90) grade = 'A';
                        else if (r.score >= 80) grade = 'B';
                        else if (r.score >= 75) grade = 'C+';
                        else if (r.score >= 60) grade = 'C';
                        else grade = 'D';

                        return (
                          <tr key={r.attemptId} className="text-center print-avoid-break">
                            <td className="py-1.5 px-1 border-r border-black font-bold">{idx + 1}</td>
                            <td className="py-1.5 px-2 border-r border-black font-mono font-medium text-[10px]">{r.studentNis}</td>
                            <td className="py-1.5 px-3 border-r border-black text-left font-semibold uppercase">{r.studentName}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{r.studentClass}</td>
                            <td className="py-1.5 px-2 border-r border-black font-semibold">{r.totalCorrect} / {r.totalQuestions}</td>
                            <td className="py-1.5 px-2 border-r border-black font-black text-sm">{Math.round(r.score)}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{grade}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold text-[10px]">
                              {isTuntas ? (
                                <span className="text-emerald-800">TUNTAS</span>
                              ) : (
                                <span className="text-rose-800">REMEDIAL</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-[9px]">
                              {r.tabSwitchCount === 0 ? 'Tertib' : `⚠️ ${r.tabSwitchCount}x Tab`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-black text-[10px] sm:text-xs">
                      <td colSpan={4} className="py-2 px-3 text-right border-r border-black">
                        Statistik Evaluasi (Total: {totalAttempts} Peserta):
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black">
                        Avg:
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black font-black text-sm text-purple-900">
                        {avgScore}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black font-black">
                        {avgScore >= 75 ? 'TUNTAS' : 'REMED'}
                      </td>
                      <td colSpan={2} className="py-2 px-2 text-center font-bold">
                        {passRate}% Kelulusan ({passedCount} Tuntas / {remedialCount} Remedial)
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* 🔒 KEABSAHAN SISTEM CBT */}
                <CbtSecurityValidationBox
                  examTitle={exams.find(e => e.id === examFilter)?.title || 'Rekapitulasi Evaluasi CBT'}
                />

                {/* 🖋️ TANDA TANGAN 3 PIHAK */}
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={isGuru ? currentUserName : (exams.find(e => e.id === examFilter)?.authorName || 'Bpk. Ahmad ST')}
                  subjectName={subjectFilter !== 'ALL' ? subjectFilter : (exams.find(e => e.id === examFilter)?.subject || 'Mata Pelajaran')}
                  classNameTarget={classFilter !== 'ALL' ? classFilter : undefined}
                  mode="three-column"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintCollectiveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/25"
              >
                <Printer size={15} /> Cetak Rekap Dokumen Sekarang (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL 2: CETAK KARTU / TRANSKRIP RESMI SISWA INDIVIDUAL */}
      {printStudentCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2">
                <Award className="text-purple-600" size={20} />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Surat Keterangan Hasil Evaluasi Ujian (CBT) Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintStudentCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="cbt-printable-student-card" className="space-y-4 bg-white text-black">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="SURAT KETERANGAN HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / SKH-CBT / ${new Date().getFullYear()} / ${printStudentCard.studentNis}`}
                  subTitle="Sistem Evaluasi Berbasis Komputer & Verifikasi Akademik Resmi"
                />

                {/* 👤 IDENTITAS RESMI SISWA */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Nama Lengkap</span>
                    <span className="font-bold text-black">: {printStudentCard.studentName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Kelas / Rombel</span>
                    <span className="font-bold text-black">: {printStudentCard.studentClass}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">NISN / Nomor Induk</span>
                    <span className="font-mono font-bold text-black">: {printStudentCard.studentNis}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Waktu Evaluasi</span>
                    <span>: {printStudentCard.submittedAt ? new Date(printStudentCard.submittedAt).toLocaleString('id-ID') : '-'}</span>
                  </div>
                </div>

                {/* 📚 RINCIAN PAKET UJIAN */}
                <div className="p-3 border border-black bg-purple-50/30 print-avoid-break space-y-1">
                  <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                    Mata Pelajaran: {printStudentCard.subject}
                  </div>
                  <div className="text-base font-black text-black">
                    {printStudentCard.examTitle}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700 pt-0.5">
                    <span>Target: <strong>{printStudentCard.studentClass}</strong></span>
                    <span>•</span>
                    <span>KKM: <strong>75.00</strong></span>
                    <span>•</span>
                    <span>Total Soal: <strong>{printStudentCard.totalQuestions} Butir</strong></span>
                  </div>
                </div>

                {/* 🎯 KOTAK NILAI RESMI KEDINASAN */}
                <div className="border-2 border-black p-4 bg-slate-50 flex items-center justify-between print-avoid-break">
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block uppercase">
                      Nilai Perolehan Ujian CBT:
                    </span>
                    <div className="text-4xl font-black text-black">
                      {Math.round(printStudentCard.score)} <span className="text-xs font-normal text-slate-500">/ 100</span>
                    </div>
                    <span className="text-[10px] text-slate-500 italic block mt-0.5">
                      Terbilang: {printStudentCard.score >= 90 ? 'Sangat Baik' : printStudentCard.score >= 80 ? 'Baik' : printStudentCard.score >= 75 ? 'Cukup (Tuntas KKM)' : 'Perlu Peningkatan'}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Status Kriteria Ketuntasan:</span>
                    {printStudentCard.score >= kkmScore ? (
                      <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black border border-black uppercase tracking-wider">
                        ✓ LULUS / TUNTAS
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-white text-black text-xs font-black border-2 border-black uppercase tracking-wider">
                        WAJIB REMEDIAL
                      </span>
                    )}
                    <div className="text-[10px] text-slate-700">
                      Benar: <strong>{printStudentCard.totalCorrect}</strong> dari {printStudentCard.totalQuestions} Soal
                    </div>
                  </div>
                </div>

                {/* 🛡️ KEABSAHAN & TANDA TANGAN */}
                <CbtSecurityValidationBox
                  examTitle={printStudentCard.examTitle}
                />

                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={isGuru ? currentUserName : 'Guru Pengampu / Proktor'}
                  subjectName={printStudentCard.subject}
                  classNameTarget={printStudentCard.studentClass}
                  mode="two-column"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintStudentCard(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/25"
              >
                <Printer size={15} /> Cetak Lembar Nilai Siswa (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 MODAL KONFIRMASI RESET UJIAN */}
      <ConfirmModal
        isOpen={Boolean(resetTargetAttempt)}
        onClose={() => setResetTargetAttempt(null)}
        onConfirm={handleResetAttempt}
        title="Konfirmasi Reset Ujian Siswa"
        message={`Apakah Anda yakin ingin mereset hasil ujian untuk siswa "${resetTargetAttempt?.studentName}" pada paket "${resetTargetAttempt?.examTitle}"? Data nilai saat ini akan dihapus dan siswa dapat login untuk mengerjakan ujian ulang.`}
        confirmText="Ya, Reset Ujian"
        cancelText="Batal"
        isLoading={isResetting}
        variant="danger"
      />

      {/* 🖨️ GLOBAL PRINT CSS FOR HIGH-FIDELITY OFFICIAL DOCUMENTS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cbt-printable-collective-report, #cbt-printable-collective-report *,
          #cbt-printable-student-card, #cbt-printable-student-card * {
            visibility: visible !important;
          }
          #cbt-printable-collective-report, #cbt-printable-student-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10mm 12mm !important;
            font-size: 10.5pt !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

