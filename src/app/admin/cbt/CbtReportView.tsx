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
  RotateCcw
} from 'lucide-react';
import { resetStudentAttemptAction, syncCbtScoresToStudentGradesAction } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

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
}

export default function CbtReportView({
  exams,
  currentUser,
  classPresets = [],
  subjectPresets = [],
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
    window.print();
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

      {/* 🖨️ MODAL PRINT KARTU HASIL UJIAN SISWA */}
      {printStudentCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">
                  SMK TI GAMA 1 BEKASI • SMART CBT
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  Transkrip Hasil Ujian CBT Siswa
                </h3>
              </div>
              <button
                onClick={() => setPrintStudentCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-semibold">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Lengkap:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{printStudentCard.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NISN / ID:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{printStudentCard.studentNis}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kelas & Rombel:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{printStudentCard.studentClass}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mata Pelajaran:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{printStudentCard.subject}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-900/60 text-center space-y-2">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                  Perolehan Nilai Akhir
                </span>
                <div className="text-5xl font-black text-purple-900 dark:text-white font-mono">
                  {Math.round(printStudentCard.score)}
                  <span className="text-lg font-normal text-slate-400"> / 100</span>
                </div>
                <div>
                  {printStudentCard.score >= kkmScore ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-500/30">
                      ✓ Dinyatakan Tuntas (Lulus KKM)
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-sm shadow-amber-500/30">
                      Wajib Mengikuti Remedial (KKM: {kkmScore})
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Jawaban Benar</span>
                  <span className="text-base font-bold text-emerald-600">{printStudentCard.totalCorrect} Soal</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total Soal</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{printStudentCard.totalQuestions} Soal</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Integritas</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{printStudentCard.tabSwitchCount === 0 ? '100% Bersih' : `${printStudentCard.tabSwitchCount}x Tab`}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPrintStudentCard(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={15} /> Cetak Lembar Nilai
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
    </div>
  );
}

