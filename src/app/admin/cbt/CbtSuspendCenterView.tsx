'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Clock,
  BookOpen,
  User,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Users,
  GraduationCap,
  Layers,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import {
  SuspendedStudentItem,
  getGlobalSuspendedStudentsAction,
  adminUnblockStrike3Action,
  adminUnblockGlobalAllStrike3Action
} from './actions';

interface CbtSuspendCenterViewProps {
  initialSuspendedStudents?: SuspendedStudentItem[];
  currentUser?: {
    name?: string | null;
    role?: string | null;
  };
  isSuperAdmin: boolean;
  onSuspendedCountChange?: (count: number) => void;
}

export default function CbtSuspendCenterView({
  initialSuspendedStudents = [],
  currentUser,
  isSuperAdmin,
  onSuspendedCountChange,
}: CbtSuspendCenterViewProps) {
  const [students, setStudents] = useState<SuspendedStudentItem[]>(initialSuspendedStudents);

  // Sinkronkan jumlah siswa tersuspend ke parent (CbtDashboard) agar badge tab selalu 100% akurat
  useEffect(() => {
    onSuspendedCountChange?.(students.length);
  }, [students.length, onSuspendedCountChange]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [unblockingAll, setUnblockingAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Modern Dialog State
  const [confirmTarget, setConfirmTarget] = useState<SuspendedStudentItem | null>(null);
  const [isConfirmAllOpen, setIsConfirmAllOpen] = useState(false);

  // Modern Floating Cyber Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fetch suspended students from server
  const fetchSuspendedStudents = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await getGlobalSuspendedStudentsAction();
      if (res && res.success && res.data) {
        setStudents(res.data);
        setLastRefreshedAt(new Date());
      }
    } catch (e: any) {
      if (!isSilent) {
        setToastMessage({ type: 'error', text: 'Gagal memuat data suspend: ' + (e.message || 'Kesalahan jaringan') });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Polling data secara realtime tiap 10 detik agar pemantauan otomatis & up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSuspendedStudents(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchSuspendedStudents]);

  // Eksekusi Buka Suspend Per Siswa (dipanggil dari Modern Modal)
  const executeUnblockSingle = async (item: SuspendedStudentItem) => {
    setUnblockingId(item.id);
    try {
      const res = await adminUnblockStrike3Action(item.id, currentUser?.name || undefined);
      if (res.success) {
        // Optimistic removal from active suspended list
        setStudents(prev => prev.filter(s => s.id !== item.id));
        setConfirmTarget(null);
        setToastMessage({
          type: 'success',
          text: `Suspend siswa "${item.studentName}" resmi dibuka! Akun aktif kembali dan siswa dapat langsung melanjutkan ujian.`,
        });
      } else {
        setToastMessage({
          type: 'error',
          text: res.error || 'Gagal membuka suspend siswa.',
        });
      }
    } catch (e: any) {
      setToastMessage({
        type: 'error',
        text: 'Terjadi kesalahan sistem: ' + e.message,
      });
    } finally {
      setUnblockingId(null);
    }
  };

  // Eksekusi Buka Suspend SEMUA Siswa Sekaligus (dipanggil dari Modern Modal)
  const executeUnblockAll = async () => {
    if (students.length === 0) return;
    setUnblockingAll(true);
    try {
      const res = await adminUnblockGlobalAllStrike3Action(currentUser?.name || undefined);
      if (res.success) {
        setStudents([]);
        setIsConfirmAllOpen(false);
        setToastMessage({
          type: 'success',
          text: res.message || 'Berhasil membuka suspend seluruh siswa sekaligus!',
        });
      } else {
        setToastMessage({
          type: 'error',
          text: res.error || 'Gagal membuka suspend massal.',
        });
      }
    } catch (e: any) {
      setToastMessage({
        type: 'error',
        text: 'Terjadi kesalahan sistem: ' + e.message,
      });
    } finally {
      setUnblockingAll(false);
    }
  };

  // Ekstraksi opsi filter kelas & mapel
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.studentClass) set.add(s.studentClass);
    });
    return Array.from(set).sort();
  }, [students]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.examSubject) set.add(s.examSubject);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter siswa berdasarkan input pencarian dan dropdown filter
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        (s.studentNis && s.studentNis.toLowerCase().includes(q)) ||
        s.examTitle.toLowerCase().includes(q) ||
        s.examSubject.toLowerCase().includes(q) ||
        (s.studentClass && s.studentClass.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (selectedClass !== 'ALL' && s.studentClass !== selectedClass) return false;
      if (selectedSubject !== 'ALL' && s.examSubject !== selectedSubject) return false;

      return true;
    });
  }, [students, searchQuery, selectedClass, selectedSubject]);

  // Statistik ringkas
  const totalSuspended = students.length;
  const distinctExamsCount = useMemo(() => {
    const set = new Set(students.map(s => s.examId));
    return set.size;
  }, [students]);
  const totalViolationsRecorded = useMemo(() => {
    return students.reduce((acc, s) => acc + (s.tabSwitchCount || 0), 0);
  }, [students]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* 🚀 FLOATING CYBER TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 w-full max-w-md px-3 animate-in slide-in-from-top-3 fade-in duration-300">
          <div
            className={`p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all relative overflow-hidden ${toastMessage.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-500/25'
                : 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-500/25'
              }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${toastMessage.type === 'success'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-500/20'
                  : 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-500/20'
                }`}
            >
              {toastMessage.type === 'success' ? (
                <ShieldCheck size={22} className="animate-pulse" />
              ) : (
                <AlertTriangle size={22} className="animate-pulse" />
              )}
            </div>
            <div className="flex-1 pr-2 pt-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black tracking-tight">
                  {toastMessage.type === 'success' ? 'Dispensasi Berhasil Diberikan! 🎉' : 'Pemberitahuan Sistem'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${toastMessage.type === 'success'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    }`}
                >
                  {toastMessage.type === 'success' ? 'SUKSES' : 'PERHATIAN'}
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

            {/* Glowing progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-1 w-full ${toastMessage.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                  : 'bg-gradient-to-r from-rose-500 to-amber-300'
                }`}
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/50 to-slate-900 border border-rose-900/50 text-white shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/20">
              <ShieldAlert className="text-rose-400 animate-pulse" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Pusat Pemantauan &amp; Buka Suspend CBT
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-500/50">
                  Wewenang Khusus Admin Utama
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Pantau seluruh siswa yang ter-suspend total (Strike 3 / Pindah Tab $\ge$ 3x) dari <strong>seluruh paket ujian</strong> di sekolah. Buka suspend secara instan tanpa perlu masuk ke masing-masing paket ujian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => fetchSuspendedStudents(false)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Segarkan data suspend sekarang"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Menyegarkan...' : 'Segarkan Data'}</span>
            </button>

            {isSuperAdmin && totalSuspended > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmAllOpen(true)}
                disabled={unblockingAll}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                <span>Buka Suspend Semua ({totalSuspended})</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Pemantauan Realtime Aktif (Auto-refresh tiap 10 detik)</span>
          </div>
          <span>Terakhir diperiksa: {lastRefreshedAt.toLocaleTimeString('id-ID')} WIB</span>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Suspend */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Siswa Tersuspend Saat Ini</div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-2 mt-0.5">
              <span>{totalSuspended} Siswa</span>
              {totalSuspended > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  Perlu Dispensasi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Paket Ujian Terdampak */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0">
            <BookOpen size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Paket Ujian Terimbas</div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
              {distinctExamsCount} Paket Soal
            </div>
          </div>
        </div>

        {/* Card 3: Total Pelanggaran Tab */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pindah Tab Dicatat</div>
            <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">
              {totalViolationsRecorded}x Pelanggaran
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, NISN, atau judul ujian..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <GraduationCap size={15} className="text-slate-400 shrink-0 hidden sm:inline" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            >
              <option value="ALL">Semua Kelas ({classOptions.length})</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <BookOpen size={15} className="text-slate-400 shrink-0 hidden sm:inline" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            >
              <option value="ALL">Semua Mapel ({subjectOptions.length})</option>
              {subjectOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {(selectedClass !== 'ALL' || selectedSubject !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedClass('ALL');
                setSelectedSubject('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table or Empty State */}
      {students.length === 0 ? (
        /* Empty State: Semua Berjalan Tertib */
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={44} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Tidak Ada Siswa yang Tersuspend
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Seluruh peserta ujian CBT di sekolah saat ini berstatus tertib dan lancar. Sistem anti-curang tetap aktif memantau di latar belakang.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <Sparkles size={14} />
            <span>Kondisi CBT Sekolah Aman Terkendali</span>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        /* Filter Empty State */
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Search className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            Tidak Ada Siswa yang Cocok dengan Filter
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau reset filter kelas / mata pelajaran.
          </p>
        </div>
      ) : (
        /* Table of Suspended Students */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                Daftar Siswa Terblokir / Suspend Total ({filteredStudents.length})
              </h3>
            </div>
            <div className="text-xs text-slate-400">
              Menampilkan {filteredStudents.length} dari {totalSuspended} siswa tersuspend
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
                  <th className="py-3 px-4 text-center">Pelanggaran Tab</th>
                  <th className="py-3 px-4 text-center">Status Akun</th>
                  <th className="py-3 px-4 text-right">Aksi Admin Utama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredStudents.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    {/* No */}
                    <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Siswa */}
                    <td className="py-4 px-4">
                      <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                        <User size={13} className="text-rose-500 shrink-0" />
                        <span>{item.studentName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        NISN: {item.studentNis || '-'}
                      </div>
                    </td>

                    {/* Kelas */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        <GraduationCap size={12} className="text-indigo-500" />
                        {item.studentClass || '-'}
                      </span>
                    </td>

                    {/* Paket Ujian & Mapel */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                        {item.examTitle}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{item.examSubject}</span>
                        {item.examAuthorName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{item.examAuthorName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Pelanggaran */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                        <AlertTriangle size={12} />
                        {item.tabSwitchCount}x Pindah Tab
                      </span>
                      {item.startedAt && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Mulai: {new Date(item.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>

                    {/* Status Akun */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs">
                        {item.tabSwitchCount >= 5 || item.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]')
                          ? 'DISKUALIFIKASI (5x)'
                          : item.tabSwitchCount === 4 || item.proctorNotes?.includes('[STRIKE_4_FATAL]')
                            ? 'SUSPEND FATAL (4x)'
                            : 'SUSPEND (STRIKE 3)'}
                      </span>
                    </td>

                    {/* Aksi Cepat */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Tombol Buka Suspend (Memicu Modern Cyber Modal) */}
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(item)}
                          disabled={unblockingId === item.id}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Buka suspend akun siswa ini"
                        >
                          <ShieldCheck size={14} />
                          <span>Buka Suspend</span>
                        </button>

                        {/* Tombol Link ke Paket Ujian */}
                        <Link
                          href={`/admin/cbt/${item.examId}`}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Buka Halaman Detail Paket Ujian ini"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Card di Bawah Tabel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info size={15} className="text-purple-600 shrink-0" />
            <span>
              <strong>Catatan Sistem:</strong> Menekan tombol <em>Buka Suspend</em> akan langsung mereset status blokir di server dan membuka kunci di perangkat siswa secara otomatis tanpa perlu siswa login ulang atau memasukkan token kembali. Jawaban yang sudah dikerjakan siswa dijamin 100% aman tersimpan.
            </span>
          </div>
        </div>
      )}

      {/* 🛡️ ULTRA-CANGGIH MODAL KONFIRMASI BUKA SUSPEND (SINGLE SISWA) */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Cyber Accent Line */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              disabled={unblockingId !== null}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-8 space-y-5">
              {/* Header Icon & Title */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-500/10">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Sparkles size={11} /> Dispensasi Resmi Admin Utama
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    Buka Suspend Siswa?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfirmasi pemberian izin dispensasi agar siswa dapat langsung melanjutkan ujian.
                  </p>
                </div>
              </div>

              {/* Siswa Card Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identitas Peserta</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User size={15} className="text-emerald-500" />
                      <span>{confirmTarget.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>NISN: {confirmTarget.studentNis || '-'}</span>
                      <span>•</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">Kelas: {confirmTarget.studentClass || '-'}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                    {confirmTarget.tabSwitchCount}x Pindah Tab
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paket Ujian &amp; Mapel</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{confirmTarget.examTitle}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{confirmTarget.examSubject} • {confirmTarget.examAuthorName || 'Guru Mapel'}</div>
                </div>
              </div>

              {/* Safety Guarantees Checklist */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>Kunci ujian otomatis terbuka seketika di perangkat siswa</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300/90 pl-5">
                  <span>• Siswa tidak perlu login ulang atau memasukkan token</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300/90 pl-5">
                  <span>• Jawaban yang telah dikerjakan 100% aman dan tidak hilang</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={unblockingId !== null}
                  onClick={() => setConfirmTarget(null)}
                  className="w-full sm:w-1/2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={unblockingId !== null}
                  onClick={() => executeUnblockSingle(confirmTarget)}
                  className="w-full sm:w-1/2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {unblockingId === confirmTarget.id ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Membuka Suspend...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Ya, Buka Suspend</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ ULTRA-CANGGIH MODAL KONFIRMASI BUKA SUSPEND MASSAL (SEMUA SISWA) */}
      {isConfirmAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Cyber Accent Line */}
            <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-rose-500 to-amber-500 shadow-sm" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsConfirmAllOpen(false)}
              disabled={unblockingAll}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-500/10">
                  <Users size={32} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    <AlertTriangle size={11} /> Tindakan Massal Admin Utama
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    Buka Suspend Semua Siswa?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Anda akan membuka suspend untuk seluruh <strong>{students.length} siswa</strong> yang saat ini terblokir di seluruh paket ujian sekolah.
                  </p>
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Total Siswa Tersuspend:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-black">{students.length} Siswa</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Paket Ujian Terdampak:</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-black">{distinctExamsCount} Paket Soal</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Dampak Tindakan:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Semua langsung aktif serentak</strong>
                </div>
              </div>

              {/* Reassurance */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>Seluruh sesi perangkat siswa langsung dilepas &amp; jawaban tersimpan utuh</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={unblockingAll}
                  onClick={() => setIsConfirmAllOpen(false)}
                  className="w-full sm:w-1/2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={unblockingAll}
                  onClick={executeUnblockAll}
                  className="w-full sm:w-1/2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {unblockingAll ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Membuka Semua...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Ya, Buka Semua Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
