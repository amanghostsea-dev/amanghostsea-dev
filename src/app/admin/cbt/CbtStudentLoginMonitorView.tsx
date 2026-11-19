'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  BookOpen,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  ExternalLink,
  X,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  Eye,
  FileSpreadsheet,
  Lock,
  Unlock,
  Info,
  Radio
} from 'lucide-react';
import {
  StudentLoginItem,
  getGlobalStudentLoginsAction,
  adminResetStudentSessionAction,
  adminUnblockStrike3Action
} from './actions';
import { KopSuratConfig } from '@/app/admin/settings/types';
import {
  CbtOfficialKopSurat,
  CbtOfficialSignatures,
  CbtSecurityValidationBox
} from '@/components/cbt/CbtOfficialPrintComponents';

interface CbtStudentLoginMonitorViewProps {
  currentUser?: {
    name?: string | null;
    role?: string | null;
  };
  isSuperAdmin: boolean;
  kopSuratConfig?: KopSuratConfig;
  onActiveLoginCountChange?: (count: number) => void;
}

export default function CbtStudentLoginMonitorView({
  currentUser,
  isSuperAdmin,
  kopSuratConfig,
  onActiveLoginCountChange,
}: CbtStudentLoginMonitorViewProps) {
  // Mode Tampilan: Default 'ACTIVE_ONLY' (Hanya siswa yang sedang login & ujian aktif)
  const [viewScope, setViewScope] = useState<'ACTIVE_ONLY' | 'SUBMITTED_TODAY' | 'ALL_TODAY'>('ACTIVE_ONLY');
  const [scopeCounts, setScopeCounts] = useState({ active: 0, submitted: 0, total: 0 });

  const [logins, setLogins] = useState<StudentLoginItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedExam, setSelectedExam] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterTodayOnly, setFilterTodayOnly] = useState<boolean>(true);

  // Reset Sesi Dialog State
  const [resetTarget, setResetTarget] = useState<StudentLoginItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modern Floating Cyber Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fetch data dari server sesuai scope yang dipilih
  const fetchLogins = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await getGlobalStudentLoginsAction({ scope: viewScope });
      if (res && res.success && res.data) {
        setLogins(res.data);
        setScopeCounts({
          active: res.activeCount,
          submitted: res.submittedCount,
          total: res.totalCount,
        });
        setLastRefreshedAt(new Date());
        onActiveLoginCountChange?.(res.activeCount);
      } else if (!isSilent) {
        setToastMessage({ type: 'error', text: res.error || 'Gagal memuat data radar siswa.' });
      }
    } catch (e: any) {
      if (!isSilent) {
        setToastMessage({ type: 'error', text: 'Terjadi kesalahan jaringan: ' + e.message });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [viewScope, onActiveLoginCountChange]);

  // Initial fetch and auto-refresh polling every 10 seconds
  useEffect(() => {
    fetchLogins(false);
    const interval = setInterval(() => {
      fetchLogins(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLogins]);

  // Eksekusi Reset Sesi Login Siswa
  const executeResetSession = async (item: StudentLoginItem) => {
    setIsResetting(true);
    try {
      const res = await adminResetStudentSessionAction(item.id, currentUser?.name || undefined);
      if (res.success) {
        setResetTarget(null);
        setToastMessage({
          type: 'success',
          text: `Sesi siswa "${item.studentName}" berhasil di-reset. Siswa dapat login kembali di perangkat baru.`,
        });
        fetchLogins(true);
      } else {
        setToastMessage({
          type: 'error',
          text: res.error || 'Gagal mereset sesi siswa.',
        });
      }
    } catch (e: any) {
      setToastMessage({
        type: 'error',
        text: 'Kesalahan sistem: ' + e.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Opsi Dropdown Kelas & Ujian
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    logins.forEach((s) => {
      if (s.studentClass) set.add(s.studentClass);
    });
    return Array.from(set).sort();
  }, [logins]);

  const examOptions = useMemo(() => {
    const map = new Map<string, string>();
    logins.forEach((s) => {
      if (s.examId && s.examTitle) {
        map.set(s.examId, s.examTitle);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [logins]);

  // Filter siswa berdasarkan input pencarian & dropdown
  const filteredLogins = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return logins.filter((item) => {
      // Filter Tanggal Hari Ini
      if (filterTodayOnly) {
        const itemDateStr = item.startedAt ? item.startedAt.split('T')[0] : '';
        if (itemDateStr !== todayStr) return false;
      }

      // Filter Pencarian Teks
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchNis = item.studentNis ? item.studentNis.toLowerCase().includes(q) : false;
        const matchExam = item.examTitle.toLowerCase().includes(q);
        const matchSubject = item.examSubject.toLowerCase().includes(q);
        const matchClass = item.studentClass ? item.studentClass.toLowerCase().includes(q) : false;
        if (!matchName && !matchNis && !matchExam && !matchSubject && !matchClass) {
          return false;
        }
      }

      // Filter Kelas
      if (selectedClass !== 'ALL' && item.studentClass !== selectedClass) {
        return false;
      }

      // Filter Paket Ujian
      if (selectedExam !== 'ALL' && item.examId !== selectedExam) {
        return false;
      }

      // Filter Status
      if (selectedStatus === 'IN_PROGRESS' && item.status !== 'IN_PROGRESS') return false;
      if (selectedStatus === 'SUBMITTED' && item.status !== 'SUBMITTED') return false;
      if (selectedStatus === 'BLOCKED' && !item.isBlocked && item.tabSwitchCount < 3) return false;

      return true;
    });
  }, [logins, searchQuery, selectedClass, selectedExam, selectedStatus, filterTodayOnly]);

  // Metrik ringkas
  const distinctClassesCount = useMemo(() => {
    const set = new Set(logins.map((l) => l.studentClass).filter(Boolean));
    return set.size;
  }, [logins]);

  const distinctExamsCount = useMemo(() => {
    const set = new Set(logins.map((l) => l.examId));
    return set.size;
  }, [logins]);

  // Fungsi Ekspor CSV / Excel
  const handleExportCsv = () => {
    if (filteredLogins.length === 0) {
      setToastMessage({ type: 'error', text: 'Tidak ada data siswa untuk diekspor.' });
      return;
    }

    const headers = [
      'No',
      'Nama Siswa',
      'NIS/NISN',
      'Kelas / Rombel',
      'Paket Ujian',
      'Mata Pelajaran',
      'Status Pengerjaan',
      'Waktu Login Mulai',
      'Waktu Selesai Submit',
      'Soal Terjawab',
      'Total Soal',
      'Persentase Progres',
      'Nilai Akhir',
      'Pindah Tab (Pelanggaran)',
      'Status Blokir'
    ];

    const rows = filteredLogins.map((item, idx) => {
      const pct = item.totalQuestions > 0 ? Math.round((item.answeredCount / item.totalQuestions) * 100) : 0;
      const loginTime = new Date(item.startedAt).toLocaleString('id-ID');
      const submitTime = item.submittedAt ? new Date(item.submittedAt).toLocaleString('id-ID') : '-';

      return [
        idx + 1,
        `"${item.studentName.replace(/"/g, '""')}"`,
        `"${item.studentNis || '-'}"`,
        `"${item.studentClass || '-'}"`,
        `"${item.examTitle.replace(/"/g, '""')}"`,
        `"${item.examSubject.replace(/"/g, '""')}"`,
        item.status === 'IN_PROGRESS' ? 'Sedang Ujian Online' : 'Selesai',
        `"${loginTime}"`,
        `"${submitTime}"`,
        item.answeredCount,
        item.totalQuestions,
        `${pct}%`,
        item.score,
        item.tabSwitchCount,
        item.isBlocked ? 'Terkunci/Suspend' : 'Normal'
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Radar_Siswa_CBT_${viewScope}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({
      type: 'success',
      text: `Berhasil mengekspor ${filteredLogins.length} data siswa ke CSV!`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* 🚀 FLOATING CYBER TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 w-full max-w-md px-3 animate-in slide-in-from-top-3 fade-in duration-300">
          <div
            className={`p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all relative overflow-hidden ${
              toastMessage.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-500/25'
                : 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-500/25'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                toastMessage.type === 'success'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-500/20'
                  : 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-500/20'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 size={22} className="animate-pulse" />
              ) : (
                <AlertTriangle size={22} className="animate-pulse" />
              )}
            </div>
            <div className="flex-1 pr-2 pt-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black tracking-tight">
                  {toastMessage.type === 'success' ? 'Aksi Berhasil' : 'Pemberitahuan Sistem'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    toastMessage.type === 'success'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {toastMessage.type === 'success' ? 'SUKSES' : 'INFO'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {toastMessage.text}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Tutup notifikasi"
            >
              <X size={16} />
            </button>
            <div
              className={`absolute bottom-0 left-0 h-1 w-full ${
                toastMessage.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                  : 'bg-gradient-to-r from-rose-500 to-amber-300'
              }`}
            />
          </div>
        </div>
      )}

      {/* 🧭 HEADER BANNER CYBER MONITOR */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-900/50 text-white shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Radio className="text-emerald-400 animate-pulse" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {viewScope === 'ACTIVE_ONLY'
                    ? 'Live Radar Siswa Ujian CBT'
                    : viewScope === 'SUBMITTED_TODAY'
                    ? 'Riwayat Siswa Selesai Ujian'
                    : 'Semua Aktivitas Sesi CBT'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {viewScope === 'ACTIVE_ONLY' ? 'Realtime Online' : 'Arsip Data'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {viewScope === 'ACTIVE_ONLY'
                  ? 'Memantau aktivitas detik ini dari siswa yang sedang login & mengerjakan soal. Siswa yang logout atau selesai ujian akan otomatis hilang dari radar ini.'
                  : 'Melihat rekap data siswa yang telah menyelesaikan / mengumpulkan ujian pada hari ini.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            {/* Tombol Segarkan Data */}
            <button
              type="button"
              onClick={() => fetchLogins(false)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Segarkan radar sekarang"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Menyegarkan...' : 'Segarkan Data'}</span>
            </button>

            {/* Tombol Ekspor CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer"
              title="Unduh Laporan Format CSV / Excel"
            >
              <Download size={14} className="text-teal-400" />
              <span>Ekspor CSV</span>
            </button>

            {/* Tombol Cetak Presensi */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Cetak Berita Acara Presensi Login CBT"
            >
              <Printer size={15} />
              <span>Cetak Presensi</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Radar Realtime Aktif (Sinkronisasi otomatis tiap 10 detik)</span>
          </div>
          <span>Terakhir diperiksa: {lastRefreshedAt.toLocaleTimeString('id-ID')} WIB</span>
        </div>
      </div>

      {/* 📊 QUICK STAT METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Sedang Ujian (Online) */}
        <button
          type="button"
          onClick={() => setViewScope('ACTIVE_ONLY')}
          className={`p-4 rounded-2xl text-left transition-all border shadow-xs flex items-center gap-3.5 cursor-pointer ${
            viewScope === 'ACTIVE_ONLY'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center shrink-0">
            <Radio size={22} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sedang Ujian Online</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span>{scopeCounts.active} Siswa</span>
              {scopeCounts.active > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
          </div>
        </button>

        {/* Card 2: Sudah Selesai */}
        <button
          type="button"
          onClick={() => setViewScope('SUBMITTED_TODAY')}
          className={`p-4 rounded-2xl text-left transition-all border shadow-xs flex items-center gap-3.5 cursor-pointer ${
            viewScope === 'SUBMITTED_TODAY'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Selesai Ujian Hari Ini</div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {scopeCounts.submitted} Siswa
            </div>
          </div>
        </button>

        {/* Card 3: Rombel Terlibat */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center shrink-0">
            <GraduationCap size={22} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rombel Terlibat</div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {distinctClassesCount} Rombel
            </div>
          </div>
        </div>

        {/* Card 4: Paket Ujian Aktif */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0">
            <BookOpen size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Paket Ujian Aktif</div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
              {distinctExamsCount} Paket
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 RADAR SCOPE MODE SELECTOR TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setViewScope('ACTIVE_ONLY')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            viewScope === 'ACTIVE_ONLY'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio size={14} className={viewScope === 'ACTIVE_ONLY' ? 'animate-pulse' : 'text-emerald-500'} />
          <span>Radar Siswa Sedang Ujian</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${viewScope === 'ACTIVE_ONLY' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}`}>
            {scopeCounts.active} Online
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewScope('SUBMITTED_TODAY')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            viewScope === 'SUBMITTED_TODAY'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 size={14} className={viewScope === 'SUBMITTED_TODAY' ? '' : 'text-blue-500'} />
          <span>Riwayat Selesai Hari Ini</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${viewScope === 'SUBMITTED_TODAY' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'}`}>
            {scopeCounts.submitted}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewScope('ALL_TODAY')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            viewScope === 'ALL_TODAY'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers size={14} className={viewScope === 'ALL_TODAY' ? '' : 'text-purple-500'} />
          <span>Semua Aktivitas</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${viewScope === 'ALL_TODAY' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {scopeCounts.total}
          </span>
        </button>
      </div>

      {/* 🔍 FILTER & SEARCH COMMAND BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, NISN, atau judul ujian..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Toggle Hari Ini vs Semua */}
          <button
            type="button"
            onClick={() => setFilterTodayOnly(!filterTodayOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              filterTodayOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Calendar size={13} />
            <span>{filterTodayOnly ? 'Hari Ini Saja' : 'Semua Tanggal'}</span>
          </button>

          {/* Filter Kelas */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="ALL">Semua Kelas ({classOptions.length})</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Paket Ujian */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-[180px] truncate"
            >
              <option value="ALL">Semua Paket Ujian ({examOptions.length})</option>
              {examOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          {(selectedClass !== 'ALL' || selectedExam !== 'ALL' || selectedStatus !== 'ALL' || searchQuery || !filterTodayOnly) && (
            <button
              onClick={() => {
                setSelectedClass('ALL');
                setSelectedExam('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
                setFilterTodayOnly(true);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 📋 MAIN TABLE OF LOGGED-IN STUDENTS */}
      {isLoading && logins.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <RefreshCw className="animate-spin mx-auto text-emerald-500 mb-3" size={32} />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            Memuat Radar Presensi Siswa CBT...
          </h4>
        </div>
      ) : filteredLogins.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Radio size={28} />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">
              {viewScope === 'ACTIVE_ONLY'
                ? 'Tidak Ada Siswa yang Sedang Ujian Saat Ini'
                : 'Tidak Ada Data Siswa yang Sesuai'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {viewScope === 'ACTIVE_ONLY'
                ? 'Radar sedang siaga memantau. Begitu siswa mulai login dan membuka lembar ujian, status dan progres pengerjaannya akan otomatis muncul di sini secara realtime.'
                : 'Coba ubah kata kunci pencarian atau matikan filter kelas/mapel untuk menampilkan data lainnya.'}
            </p>
          </div>
          {viewScope === 'ACTIVE_ONLY' && scopeCounts.submitted > 0 && (
            <button
              type="button"
              onClick={() => setViewScope('SUBMITTED_TODAY')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Lihat {scopeCounts.submitted} Siswa yang Telah Selesai Hari Ini</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${viewScope === 'ACTIVE_ONLY' ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`} />
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {viewScope === 'ACTIVE_ONLY'
                  ? `Radar Siswa Sedang Ujian Online (${filteredLogins.length} Siswa Aktif)`
                  : viewScope === 'SUBMITTED_TODAY'
                  ? `Daftar Siswa Selesai Ujian Hari Ini (${filteredLogins.length} Siswa)`
                  : `Daftar Seluruh Peserta CBT (${filteredLogins.length} Siswa)`}
              </h3>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Menampilkan {filteredLogins.length} peserta {viewScope === 'ACTIVE_ONLY' ? 'sedang aktif' : 'terdata'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Identitas Siswa</th>
                  <th className="py-3 px-4">Kelas / Rombel</th>
                  <th className="py-3 px-4">Paket Ujian &amp; Mapel</th>
                  <th className="py-3 px-4 text-center">Waktu Login / Selesai</th>
                  <th className="py-3 px-4 text-center">Progres Lembar Soal</th>
                  <th className="py-3 px-4 text-center">Status Sesi</th>
                  <th className="py-3 px-4 text-center">Perangkat</th>
                  <th className="py-3 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogins.map((item, idx) => {
                  const progressPct = item.totalQuestions > 0 ? Math.round((item.answeredCount / item.totalQuestions) * 100) : 0;
                  const isSuspended = item.isBlocked || item.tabSwitchCount >= 3;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* No */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Identitas Siswa */}
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                            {item.studentName.charAt(0).toUpperCase()}
                          </span>
                          <span>{item.studentName}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 pl-7.5">
                          NISN: {item.studentNis || '-'}
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <GraduationCap size={12} />
                          {item.studentClass || '-'}
                        </span>
                      </td>

                      {/* Paket Ujian & Mapel */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1 max-w-[220px]">
                          {item.examTitle}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">{item.examSubject}</span>
                          {item.examAuthorName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{item.examAuthorName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Waktu Login & Selesai */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Clock size={12} className="text-slate-400" />
                          <span>{new Date(item.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.status === 'SUBMITTED' && item.submittedAt ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              Selesai: {new Date(item.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Sedang Mengerjakan
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progres Lembar Soal */}
                      <td className="py-4 px-4 text-center">
                        <div className="w-full max-w-[120px] mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-600 dark:text-slate-300">
                              {item.answeredCount} / {item.totalQuestions}
                            </span>
                            <span className={progressPct === 100 ? 'text-emerald-600' : 'text-slate-400'}>
                              {progressPct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                item.status === 'SUBMITTED'
                                  ? 'bg-blue-500'
                                  : progressPct === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-purple-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          {item.status === 'SUBMITTED' ? (
                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                              Nilai: {item.score} ({item.totalCorrect} Benar)
                            </div>
                          ) : item.answeredCount === 0 ? (
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                              Baru Masuk Soal
                            </div>
                          ) : (
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Sedang Menjawab
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Sesi & Anti-Curang */}
                      <td className="py-4 px-4 text-center">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                            <ShieldAlert size={11} />
                            {item.tabSwitchCount >= 5 ? 'DISKUALIFIKASI' : 'SUSPEND'}
                          </span>
                        ) : item.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <CheckCircle2 size={11} /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ujian Aktif
                          </span>
                        )}

                        {item.tabSwitchCount > 0 && !isSuspended && (
                          <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                            {item.tabSwitchCount}x Tab
                          </div>
                        )}
                      </td>

                      {/* Perangkat & Browser */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {item.deviceType === 'mobile' ? (
                            <Smartphone size={14} className="text-emerald-500" />
                          ) : item.deviceType === 'tablet' ? (
                            <Tablet size={14} className="text-purple-500" />
                          ) : (
                            <Laptop size={14} className="text-blue-500" />
                          )}
                          <span className="truncate max-w-[120px]" title={item.deviceInfo || 'Perangkat Terdeteksi'}>
                            {item.deviceInfo || 'Perangkat Siswa'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi Cepat Admin */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Reset Sesi Login (berguna jika HP mati / ganti PC) */}
                          <button
                            type="button"
                            onClick={() => setResetTarget(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Reset sesi perangkat jika siswa ganti HP atau komputer cadangan"
                          >
                            <Unlock size={12} className="text-amber-500" />
                            <span className="hidden sm:inline">Reset Sesi</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Info Bar Bawah Tabel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-emerald-600 shrink-0" />
              <span>
                <strong>Live Active Radar:</strong> Hanya menampilkan siswa yang detik ini aktif di ruang ujian. Siswa yang logout atau selesai akan otomatis hilang dari daftar ini.
              </span>
            </div>
            <div className="font-mono text-[11px]">
              Total Aktif Ditampilkan: {filteredLogins.length}
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ MODAL KONFIRMASI RESET SESI PERANGKAT SISWA */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-sm" />
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              disabled={isResetting}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="p-6 space-y-4">
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-500/10">
                  <Unlock size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Reset Sesi Login Perangkat?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lepaskan ikatan sesi perangkat untuk siswa berikut:
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {resetTarget.studentName}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Kelas: <strong className="text-indigo-600">{resetTarget.studentClass || '-'}</strong> • NISN: {resetTarget.studentNis || '-'}
                </div>
                <div className="text-slate-500 dark:text-slate-400 truncate">
                  Ujian: {resetTarget.examTitle}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tindakan ini berguna jika siswa mengalami masalah HP mati, browser terhenti, atau perlu berpindah ke komputer cadangan. Jawaban yang sudah disimpan dijamin aman.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setResetTarget(null)}
                  className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => executeResetSession(resetTarget)}
                  className="w-1/2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isResetting ? <RefreshCw size={13} className="animate-spin" /> : <Unlock size={13} />}
                  <span>{isResetting ? 'Mereset...' : 'Ya, Reset Sesi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL CETAK BERITA ACARA PRESENSI LOGIN CBT */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-white text-slate-900 rounded-3xl shadow-2xl border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Top Controls (Hidden on Print) */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Pratinjau Cetak Berita Acara Presensi Siswa CBT
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer size={14} /> Cetak Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Paper View */}
            <div className="p-8 overflow-y-auto space-y-6 bg-white font-serif text-slate-950">
              {/* Kop Surat Resmi */}
              <CbtOfficialKopSurat config={kopSuratConfig} />

              <div className="text-center space-y-1">
                <h3 className="text-base font-black uppercase tracking-wider underline">
                  BERITA ACARA &amp; DAFTAR PRESENSI SISWA UJIAN CBT
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Ringkasan */}
              <div className="grid grid-cols-2 text-xs font-sans gap-2 p-3 bg-slate-50 border rounded-xl">
                <div>
                  <div>Total Peserta Terdata: <strong>{filteredLogins.length} Siswa</strong></div>
                  <div>Status Sedang Ujian: <strong>{scopeCounts.active} Siswa</strong></div>
                </div>
                <div>
                  <div>Status Selesai Ujian: <strong>{scopeCounts.submitted} Siswa</strong></div>
                  <div>Rombel Terdaftar: <strong>{distinctClassesCount} Rombel</strong></div>
                </div>
              </div>

              {/* Tabel Cetak */}
              <table className="w-full text-left text-xs font-sans border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2">Nama Siswa</th>
                    <th className="border border-slate-300 p-2">NISN</th>
                    <th className="border border-slate-300 p-2">Kelas</th>
                    <th className="border border-slate-300 p-2">Paket Ujian</th>
                    <th className="border border-slate-300 p-2 text-center">Waktu Login</th>
                    <th className="border border-slate-300 p-2 text-center">Status</th>
                    <th className="border border-slate-300 p-2 text-center w-24">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogins.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-bold">{item.studentName}</td>
                      <td className="border border-slate-300 p-2 font-mono">{item.studentNis || '-'}</td>
                      <td className="border border-slate-300 p-2">{item.studentClass || '-'}</td>
                      <td className="border border-slate-300 p-2">{item.examTitle}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">
                        {new Date(item.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {item.status === 'IN_PROGRESS' ? 'Ujian' : 'Selesai'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-300">
                        {idx + 1}. .........
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan Resmi */}
              <CbtOfficialSignatures
                config={kopSuratConfig}
                proctorName={currentUser?.name || 'Admin CBT'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
