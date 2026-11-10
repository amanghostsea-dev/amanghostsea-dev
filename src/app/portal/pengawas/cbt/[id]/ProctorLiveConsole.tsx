'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  Play, 
  Square, 
  Key, 
  Check, 
  X, 
  RefreshCw, 
  FileCheck2, 
  AlertCircle, 
  Download, 
  Eye, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { 
  toggleExamSession, 
  rotateExamToken,
  proctorResetStudentLoginAction,
  proctorAddExtraTimeAction,
  proctorToggleBlockAction,
  proctorForceSubmitAction
} from '@/app/admin/cbt/actions';
import { formatExamScheduleRange, getExamScheduleState } from '@/lib/cbt-schedule';
import { KopSuratConfig } from '@/app/admin/settings/types';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox 
} from '@/components/cbt/CbtOfficialPrintComponents';
import ConfirmModal from '@/components/ConfirmModal';

export interface ProctorAttemptItem {
  id: string;
  studentName: string;
  studentNis: string | null;
  studentClass: string | null;
  answers: string; // JSON { questionId: answer }
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  status: string; // IN_PROGRESS, SUBMITTED
  tabSwitchCount: number;
  extraTimeMinutes?: number;
  isBlocked?: boolean;
  proctorNotes?: string | null;
  startedAt: Date | string;
  submittedAt: Date | string | null;
}

export interface ScheduledStudentItem {
  studentName: string;
  studentNis: string;
  studentClass: string;
}

interface ProctorLiveConsoleProps {
  exam: {
    id: string;
    title: string;
    subject: string;
    classTarget: string;
    duration: number;
    token: string | null;
    status: string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    proctorName?: string | null;
    proctorNip?: string | null;
    proctor2Name?: string | null;
    roomName?: string | null;
    authorName?: string | null;
    updatedAt?: Date | string;
    questionsCount: number;
  };
  scheduledStudents: ScheduledStudentItem[];
  initialAttempts: ProctorAttemptItem[];
  kopSuratConfig?: KopSuratConfig;
  currentUser: {
    name: string;
    role: string;
  };
}

export default function ProctorLiveConsole({
  exam,
  scheduledStudents,
  initialAttempts,
  kopSuratConfig,
  currentUser,
}: ProctorLiveConsoleProps) {
  // Session & Token States
  const [examStatus, setExamStatus] = useState(exam.status || 'PUBLISHED');
  const [examToken, setExamToken] = useState((exam.token || '').split('|')[0]);
  const [attempts, setAttempts] = useState<ProctorAttemptItem[]>(initialAttempts);
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [togglingSession, setTogglingSession] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNATTENDED' | 'VIOLATION'>('ALL');

  // Confirmation Modals
  const [actionTargetAttempt, setActionTargetAttempt] = useState<{
    attemptId: string;
    studentName: string;
    type: 'RESET' | 'SUBMIT' | 'BLOCK' | 'UNBLOCK';
  } | null>(null);

  const [extraTimeTarget, setExtraTimeTarget] = useState<{
    attemptId: string;
    studentName: string;
    minutes: number;
  } | null>(null);

  // Print Modals
  const [isPrintAttendanceModalOpen, setIsPrintAttendanceModalOpen] = useState(false);
  const [isPrintBapModalOpen, setIsPrintBapModalOpen] = useState(false);
  const [bapNotes, setBapNotes] = useState('Pelaksanaan ujian berjalan tertib, aman, dan terkendali.');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Schedule information
  const scheduleText = formatExamScheduleRange(exam.startTime, exam.endTime);
  const scheduleState = getExamScheduleState(exam.startTime, exam.endTime, examStatus);

  // Dual-Key Session Toggle
  const handleToggleSession = async (open: boolean) => {
    setTogglingSession(true);
    const res = await toggleExamSession(exam.id, open);
    if (res.success && res.data) {
      setExamStatus(res.data.status);
      if (res.data.displayToken) {
        setExamToken(res.data.displayToken);
      }
      showToast(open ? 'Sesi ujian telah DIBUKA! Token resmi aktif.' : 'Sesi ujian telah DIKUNCI oleh Pengawas.');
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian.');
    }
    setTogglingSession(false);
  };

  // Rotate Token
  const handleRotateToken = async (manualToken?: string) => {
    setIsRotatingToken(true);
    const res = await rotateExamToken(exam.id, manualToken);
    if (res.success && res.displayToken) {
      setExamToken(res.displayToken);
      showToast(`Token baru dirilis: ${res.displayToken}`);
    } else {
      alert(res.error || 'Gagal merotasi token.');
    }
    setIsRotatingToken(false);
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(examToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Refresh attempts live in background (every 5 seconds)
  const refreshAttemptsLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/cbt/attempts?examId=${exam.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.attempts) {
          setAttempts(data.attempts);
        }
      }
    } catch {}
  }, [exam.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      refreshAttemptsLive();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshAttemptsLive]);

  // Combine roster students with live attempts
  const combinedRoster = useMemo(() => {
    const attemptMap = new Map<string, ProctorAttemptItem>();
    attempts.forEach(att => {
      // Key by studentName (or nis if available)
      attemptMap.set(att.studentName.toLowerCase().trim(), att);
      if (att.studentNis) {
        attemptMap.set(att.studentNis.toLowerCase().trim(), att);
      }
    });

    // Start with scheduled students
    const rows = scheduledStudents.map(std => {
      const att = attemptMap.get(std.studentName.toLowerCase().trim()) || 
                  attemptMap.get(std.studentNis.toLowerCase().trim());

      let answersCount = 0;
      if (att?.answers) {
        try {
          answersCount = Object.keys(JSON.parse(att.answers)).length;
        } catch {}
      }

      return {
        studentName: std.studentName,
        studentNis: std.studentNis,
        studentClass: std.studentClass,
        attempt: att || null,
        status: att ? att.status : 'UNATTENDED',
        answersCount,
        tabSwitchCount: att ? att.tabSwitchCount : 0,
        extraTimeMinutes: att?.extraTimeMinutes || 0,
        isBlocked: att?.isBlocked || false,
      };
    });

    // Also include any students who attempted but were not in the scheduled roster
    attempts.forEach(att => {
      const alreadyInList = rows.some(
        r => r.studentName.toLowerCase().trim() === att.studentName.toLowerCase().trim()
      );
      if (!alreadyInList) {
        let answersCount = 0;
        if (att.answers) {
          try {
            answersCount = Object.keys(JSON.parse(att.answers)).length;
          } catch {}
        }
        rows.push({
          studentName: att.studentName,
          studentNis: att.studentNis || '-',
          studentClass: att.studentClass || exam.classTarget,
          attempt: att,
          status: att.status,
          answersCount,
          tabSwitchCount: att.tabSwitchCount,
          extraTimeMinutes: att.extraTimeMinutes || 0,
          isBlocked: att.isBlocked || false,
        });
      }
    });

    return rows;
  }, [scheduledStudents, attempts, exam.classTarget]);

  // Statistics
  const totalRoster = combinedRoster.length;
  const inProgressCount = combinedRoster.filter(r => r.status === 'IN_PROGRESS').length;
  const submittedCount = combinedRoster.filter(r => r.status === 'SUBMITTED').length;
  const unattendedCount = combinedRoster.filter(r => r.status === 'UNATTENDED').length;
  const violationCount = combinedRoster.filter(r => r.tabSwitchCount > 0 || r.isBlocked).length;

  // Filtered rows for proctor table
  const filteredRoster = useMemo(() => {
    return combinedRoster.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        !q || 
        r.studentName.toLowerCase().includes(q) || 
        r.studentNis.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS';
      if (statusFilter === 'SUBMITTED') return r.status === 'SUBMITTED';
      if (statusFilter === 'UNATTENDED') return r.status === 'UNATTENDED';
      if (statusFilter === 'VIOLATION') return r.tabSwitchCount > 0 || r.isBlocked;

      return true;
    });
  }, [combinedRoster, searchQuery, statusFilter]);

  // Execute Proctor Interventions
  const handleConfirmAction = async () => {
    if (!actionTargetAttempt) return;
    const { attemptId, studentName, type } = actionTargetAttempt;

    if (type === 'RESET') {
      const res = await proctorResetStudentLoginAction(attemptId);
      if (res.success) {
        showToast(`Login siswa "${studentName}" berhasil di-reset. Siswa dapat login kembali!`);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal mereset login siswa.');
      }
    } else if (type === 'SUBMIT') {
      const res = await proctorForceSubmitAction(attemptId);
      if (res.success) {
        showToast(`Ujian siswa "${studentName}" berhasil dikumpulkan paksa!`);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal mengumpulkan ujian.');
      }
    } else if (type === 'BLOCK' || type === 'UNBLOCK') {
      const res = await proctorToggleBlockAction(attemptId, type === 'BLOCK', 'Pelanggaran pengawasan');
      if (res.success) {
        showToast(res.message);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal mengubah status blokir.');
      }
    }

    setActionTargetAttempt(null);
  };

  // Add extra time
  const handleAddExtraTime = async () => {
    if (!extraTimeTarget) return;
    const { attemptId, studentName, minutes } = extraTimeTarget;

    const res = await proctorAddExtraTimeAction(attemptId, minutes);
    if (res.success) {
      showToast(res.message);
      refreshAttemptsLive();
    } else {
      alert(res.error || 'Gagal menambah waktu dispensasi.');
    }

    setExtraTimeTarget(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* 🧭 TOP NAV BREADCRUMB & BACK */}
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <Link
          href="/portal/pengawas/cbt"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Jadwal Pengawas</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-emerald-400 font-mono text-[11px] font-bold">KONSOL AKTIF • REFRESH 5S</span>
        </div>
      </div>

      {/* 🔔 TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="max-w-7xl mx-auto">
          <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 🏛️ HEADER KONSOL PENGAWAS */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} /> Konsol Ruang Pengawas
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                Target: {exam.classTarget}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <MapPin size={12} className="text-blue-400" />
                <span>{exam.roomName || 'Lab Komputer 1'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {exam.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="text-purple-400 font-bold">{exam.subject}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock size={13} className="text-blue-400" />
                <span>{scheduleText} ({exam.duration} Menit)</span>
              </span>
              <span>•</span>
              <span>Pengawas: <strong className="text-white">{exam.proctorName || currentUser.name}</strong></span>
              {exam.proctor2Name && <span>• Pendamping: <strong className="text-slate-300">{exam.proctor2Name}</strong></span>}
            </div>
          </div>

          {/* TOKEN & SESSION ACTION BOX */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            {/* Giant Token Display */}
            <div className="text-center px-4 py-1 border-r border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Token Papan Tulis</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono tracking-widest text-emerald-400">
                  {examStatus === 'ACTIVE' ? (examToken || 'RPL2026') : 'TERKUNCI'}
                </span>
                {examStatus === 'ACTIVE' && (
                  <button
                    onClick={handleCopyToken}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                    title="Salin Token"
                  >
                    {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Key size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Actions: Start, Rolling, Projector */}
            <div className="flex flex-wrap items-center gap-2">
              {examStatus === 'ACTIVE' ? (
                <>
                  <button
                    onClick={() => handleRotateToken()}
                    disabled={isRotatingToken}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                    title="Ganti Token Baru (Rolling Token)"
                  >
                    <RefreshCw size={13} className={isRotatingToken ? 'animate-spin' : ''} />
                    <span>Putar Token</span>
                  </button>

                  <button
                    onClick={() => setIsWhiteboardModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    <Maximize2 size={14} />
                    <span>📺 Layar Proyektor</span>
                  </button>

                  <button
                    onClick={() => handleToggleSession(false)}
                    disabled={togglingSession}
                    className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-500/30 transition cursor-pointer"
                  >
                    <Square size={13} />
                    <span>Kunci Sesi</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleToggleSession(true)}
                  disabled={togglingSession}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer animate-pulse"
                >
                  <Play size={15} />
                  <span>Mulai & Rilis Sesi Ujian</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📊 REAL-TIME ATTENDANCE METRICS */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Users size={13} className="text-blue-400" /> Total Siswa Rombel
          </div>
          <div className="text-2xl font-black text-white">
            {totalRoster} <span className="text-xs font-normal text-slate-500">Siswa</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Sedang Mengerjakan
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {inProgressCount} <span className="text-xs font-normal text-slate-500">Aktif</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-blue-400" /> Sudah Kumpul
          </div>
          <div className="text-2xl font-black text-blue-400">
            {submittedCount} <span className="text-xs font-normal text-slate-500">Selesai</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-400" /> Belum Masuk / Hadir
          </div>
          <div className="text-2xl font-black text-amber-400">
            {unattendedCount} <span className="text-xs font-normal text-slate-500">Siswa</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-rose-400" /> Pelanggaran Integritas
          </div>
          <div className="text-2xl font-black text-rose-400">
            {violationCount} <span className="text-xs font-normal text-slate-500">Kasus</span>
          </div>
        </div>
      </div>

      {/* 🔍 FILTER & ACTION TOOLBAR */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Semua Peserta ({totalRoster})
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'IN_PROGRESS' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Mengerjakan ({inProgressCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'SUBMITTED' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Selesai ({submittedCount})
          </button>
          <button
            onClick={() => setStatusFilter('UNATTENDED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'UNATTENDED' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Belum Hadir ({unattendedCount})
          </button>
          <button
            onClick={() => setStatusFilter('VIOLATION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              statusFilter === 'VIOLATION' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle size={12} />
            <span>Pelanggaran Tab ({violationCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau NISN..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Print Buttons */}
          <button
            onClick={() => setIsPrintAttendanceModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer size={14} /> Daftar Hadir
          </button>
          <button
            onClick={() => setIsPrintBapModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <FileCheck2 size={14} /> Cetak BAP
          </button>
        </div>
      </div>

      {/* 👥 LIVE STUDENT PROCTORING TABLE */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-28">NISN / ID</th>
                <th className="py-3 px-4">Nama Lengkap Siswa</th>
                <th className="py-3 px-3 text-center">Status Kehadiran</th>
                <th className="py-3 px-3 text-center">Progres Soal</th>
                <th className="py-3 px-3 text-center">Integritas (Tab)</th>
                <th className="py-3 px-3 text-center">Dispensasi</th>
                <th className="py-3 px-4 text-center w-56">Kontrol Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Tidak ada siswa yang sesuai filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item, idx) => {
                  const att = item.attempt;
                  const isBlocked = item.isBlocked;
                  const hasViolation = item.tabSwitchCount > 0;

                  return (
                    <tr
                      key={item.studentNis + item.studentName}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isBlocked
                          ? 'bg-rose-950/20'
                          : hasViolation
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-slate-400">
                        {item.studentNis}
                      </td>

                      <td className="py-3 px-4 font-bold text-white uppercase">
                        <div>{item.studentName}</div>
                        {att?.proctorNotes && (
                          <div className="text-[10px] text-amber-400 font-normal italic mt-0.5">
                            Catatan: {att.proctorNotes}
                          </div>
                        )}
                      </td>

                      {/* Status Kehadiran */}
                      <td className="py-3 px-3 text-center">
                        {isBlocked ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            DIBLOKIR
                          </span>
                        ) : item.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>MENGERJAKAN</span>
                          </span>
                        ) : item.status === 'SUBMITTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            SELESAI (NILAI: {Math.round(att?.score || 0)})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                            BELUM LOGIN
                          </span>
                        )}
                      </td>

                      {/* Progres Soal */}
                      <td className="py-3 px-3 text-center">
                        {att ? (
                          <div className="space-y-1">
                            <div className="font-mono font-bold text-white">
                              {item.answersCount} / {exam.questionsCount}
                            </div>
                            <div className="w-20 mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    exam.questionsCount > 0
                                      ? (item.answersCount / exam.questionsCount) * 100
                                      : 0
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Integritas (Tab Switch) */}
                      <td className="py-3 px-3 text-center">
                        {item.tabSwitchCount === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300">
                            Tertib
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 animate-pulse flex items-center justify-center gap-1 mx-auto w-fit">
                            <AlertTriangle size={11} />
                            <span>{item.tabSwitchCount}x Pindah Tab</span>
                          </span>
                        )}
                      </td>

                      {/* Dispensasi Waktu */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.extraTimeMinutes > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            +{item.extraTimeMinutes}m
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {att ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Reset Login Siswa */}
                            <button
                              onClick={() => setActionTargetAttempt({
                                attemptId: att.id,
                                studentName: item.studentName,
                                type: 'RESET',
                              })}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 font-bold text-[11px] border border-blue-500/30 transition flex items-center gap-1 cursor-pointer"
                              title="Buka Kunci Login (jika siswa restart/ganti HP)"
                            >
                              <Unlock size={11} /> Reset
                            </button>

                            {/* Extra Time (+5m / +10m) */}
                            <button
                              onClick={() => setExtraTimeTarget({
                                attemptId: att.id,
                                studentName: item.studentName,
                                minutes: 5,
                              })}
                              className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-bold text-[11px] border border-purple-500/30 transition cursor-pointer"
                              title="Tambah Waktu Dispensasi +5 Menit"
                            >
                              +5m
                            </button>
                            <button
                              onClick={() => setExtraTimeTarget({
                                attemptId: att.id,
                                studentName: item.studentName,
                                minutes: 10,
                              })}
                              className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-bold text-[11px] border border-purple-500/30 transition cursor-pointer"
                              title="Tambah Waktu Dispensasi +10 Menit"
                            >
                              +10m
                            </button>

                            {/* Toggle Block */}
                            {isBlocked ? (
                              <button
                                onClick={() => setActionTargetAttempt({
                                  attemptId: att.id,
                                  studentName: item.studentName,
                                  type: 'UNBLOCK',
                                })}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition cursor-pointer"
                                title="Buka Blokir"
                              >
                                Buka
                              </button>
                            ) : (
                              <button
                                onClick={() => setActionTargetAttempt({
                                  attemptId: att.id,
                                  studentName: item.studentName,
                                  type: 'BLOCK',
                                })}
                                className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold text-[11px] border border-rose-500/30 transition cursor-pointer"
                                title="Tegur / Blokir Siswa"
                              >
                                Blokir
                              </button>
                            )}

                            {/* Force Submit (if in progress) */}
                            {item.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => setActionTargetAttempt({
                                  attemptId: att.id,
                                  studentName: item.studentName,
                                  type: 'SUBMIT',
                                })}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition cursor-pointer"
                                title="Paksa Kumpul Ujian Sekarang"
                              >
                                Kumpul
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">Belum login</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📺 WHITEBOARD PROJEKTOR LAYAR PENUH (PAPAN TULIS RUANGAN) */}
      {isWhiteboardModalOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col justify-between p-8 sm:p-14 text-white overflow-y-auto animate-fade-in font-sans">
          {/* Top Bar Proyektor */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-emerald-500 animate-ping"></span>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  SMART CBT • SESI UJIAN AKTIF (RUANG: {exam.roomName || 'LAB KOMPUTER'})
                </span>
                <h2 className="text-xl sm:text-2xl font-black">{exam.title}</h2>
              </div>
            </div>

            <button
              onClick={() => setIsWhiteboardModalOpen(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <Minimize2 size={16} /> Keluar Layar Penuh (ESC)
            </button>
          </div>

          {/* Central Giant Token */}
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <ShieldCheck size={16} /> Token Resmi Pengawas Ruangan
            </div>

            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border-4 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 max-w-xl w-full text-center relative overflow-hidden group">
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                Masukkan Kode Token Ini di Portal Siswa
              </div>

              <div className="text-6xl sm:text-8xl font-black font-mono tracking-widest text-emerald-400 select-all my-2 drop-shadow-md">
                {examToken || 'RPL2026'}
              </div>

              <div className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-4">
                <span>Target Rombel: <strong>{exam.classTarget}</strong></span>
                <span>•</span>
                <span>Durasi: <strong>{exam.duration} Menit</strong></span>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-md">
              Siswa wajib menjaga ketertiban, tidak berpindah jendela layar atau tab browser selama ujian berlangsung.
            </div>
          </div>

          {/* Bottom Bar Proyektor */}
          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-slate-400">
            <div>
              Pengawas: <strong>{exam.proctorName || currentUser.name}</strong>
            </div>
            <div>
              SMK TI GAMA 1 BEKASI • Sistem Evaluasi Terpusat
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL KONFIRMASI AKSI PENGAWAS */}
      <ConfirmModal
        isOpen={Boolean(actionTargetAttempt)}
        onClose={() => setActionTargetAttempt(null)}
        onConfirm={handleConfirmAction}
        title={
          actionTargetAttempt?.type === 'RESET'
            ? 'Buka Kunci / Reset Login Siswa'
            : actionTargetAttempt?.type === 'SUBMIT'
            ? 'Paksa Kumpulkan Ujian Siswa'
            : actionTargetAttempt?.type === 'BLOCK'
            ? 'Tegur & Blokir Siswa'
            : 'Buka Blokir Siswa'
        }
        message={
          actionTargetAttempt?.type === 'RESET'
            ? `Apakah Anda yakin ingin membuka kunci login untuk "${actionTargetAttempt?.studentName}"? Siswa dapat login kembali dari perangkat lain tanpa kehilangan jawaban yang sudah tersimpan.`
            : actionTargetAttempt?.type === 'SUBMIT'
            ? `Apakah Anda yakin ingin memaksa mengumpulkan lembar ujian milik "${actionTargetAttempt?.studentName}"? Skor akan langsung dihitung berdasarkan jawaban yang tersimpan saat ini.`
            : actionTargetAttempt?.type === 'BLOCK'
            ? `Apakah Anda yakin ingin memblokir akses ujian untuk "${actionTargetAttempt?.studentName}"? Ujian siswa akan dihentikan sementara.`
            : `Apakah Anda yakin ingin mencabut status blokir untuk "${actionTargetAttempt?.studentName}"?`
        }
        confirmText={
          actionTargetAttempt?.type === 'RESET'
            ? 'Ya, Buka Kunci Siswa'
            : actionTargetAttempt?.type === 'SUBMIT'
            ? 'Ya, Paksa Kumpul'
            : actionTargetAttempt?.type === 'BLOCK'
            ? 'Ya, Blokir Siswa'
            : 'Ya, Cabut Blokir'
        }
      />

      {/* ⏱️ MODAL TAMBAHAN WAKTU DISPENSASI */}
      {extraTimeTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Clock size={18} />
              <span>Tambah Waktu Dispensasi</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tambahkan waktu ekstra <strong>+{extraTimeTarget.minutes} Menit</strong> khusus untuk siswa <strong>"{extraTimeTarget.studentName}"</strong> karena kendala teknis perangkat?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setExtraTimeTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleAddExtraTime}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
              >
                Ya, Tambahkan +{extraTimeTarget.minutes} Menit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 MODAL CETAK DAFTAR HADIR RUANGAN */}
      {isPrintAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-black font-serif">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 font-sans">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-blue-600" />
                <span className="font-bold text-sm">Pratinjau Daftar Hadir Peserta Ujian Ruangan</span>
              </div>
              <button onClick={() => setIsPrintAttendanceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <CbtOfficialKopSurat
                config={kopSuratConfig}
                documentTitle="DAFTAR HADIR PESERTA UJIAN BERBASIS KOMPUTER (CBT)"
                documentNumber={`Nomor: 421.5 / DH-CBT / ${new Date().getFullYear()} / ${exam.classTarget.replace(/\s+/g, '-')}`}
                subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
              />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break font-sans">
                <div>Mata Pelajaran: <strong>{exam.subject}</strong></div>
                <div>Ruang / Lab: <strong>{exam.roomName || 'Lab Komputer 1'}</strong></div>
                <div>Paket Ujian: <strong>{exam.title}</strong></div>
                <div>Kelas / Rombel: <strong>{exam.classTarget}</strong></div>
                <div>Waktu Pelaksanaan: <strong>{scheduleText}</strong></div>
                <div>Pengawas Ruang: <strong>{exam.proctorName || currentUser.name}</strong></div>
              </div>

              {/* Tabel Absensi */}
              <table className="w-full text-left border-collapse border border-black text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-black text-black font-bold uppercase text-center">
                    <th className="py-2 px-1 border-r border-black w-8">No</th>
                    <th className="py-2 px-3 border-r border-black w-28">NISN / No Induk</th>
                    <th className="py-2 px-3 border-r border-black text-left">Nama Lengkap Peserta</th>
                    <th className="py-2 px-2 border-r border-black w-24">Waktu Mulai</th>
                    <th className="py-2 px-2 border-r border-black w-24">Waktu Selesai</th>
                    <th className="py-2 px-3 border-r border-black w-24 text-center">Kehadiran</th>
                    <th className="py-2 px-3 w-32 text-center">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  {combinedRoster.map((r, idx) => (
                    <tr key={r.studentNis + idx} className="print-avoid-break">
                      <td className="py-1.5 px-1 border-r border-black font-bold text-center">{idx + 1}</td>
                      <td className="py-1.5 px-3 border-r border-black font-mono">{r.studentNis}</td>
                      <td className="py-1.5 px-3 border-r border-black font-semibold uppercase">{r.studentName}</td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-mono text-[9.5px]">
                        {r.attempt?.startedAt ? new Date(r.attempt.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-mono text-[9.5px]">
                        {r.attempt?.submittedAt ? new Date(r.attempt.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-1.5 px-3 border-r border-black text-center font-bold">
                        {r.status === 'SUBMITTED' ? 'HADIR (SELESAI)' : r.status === 'IN_PROGRESS' ? 'HADIR (AKTIF)' : 'TIDAK HADIR'}
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-400 text-[9px] font-sans">
                        {idx + 1}. ....................
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan Pengawas */}
              <div className="pt-4">
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={exam.proctorName || currentUser.name}
                  subjectName={exam.subject}
                  classNameTarget={exam.classTarget}
                  mode="two-column"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2 font-sans">
              <button
                onClick={() => setIsPrintAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow"
              >
                <Printer size={15} /> Cetak Daftar Hadir (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 MODAL CETAK BERITA ACARA UJIAN (BAP) */}
      {isPrintBapModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-black font-serif">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 font-sans">
              <div className="flex items-center gap-2">
                <FileCheck2 size={18} className="text-blue-600" />
                <span className="font-bold text-sm">Pratinjau Berita Acara Pelaksanaan Ujian (BAP)</span>
              </div>
              <button onClick={() => setIsPrintBapModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <CbtOfficialKopSurat
                config={kopSuratConfig}
                documentTitle="BERITA ACARA PELAKSANAAN UJIAN BERBASIS KOMPUTER (CBT)"
                documentNumber={`Nomor: 421.5 / BAP-CBT / ${new Date().getFullYear()} / ${exam.classTarget.replace(/\s+/g, '-')}`}
                subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
              />

              <div className="text-xs text-justify leading-relaxed text-slate-800">
                Pada hari ini <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah diselenggarakan Ujian Berbasis Komputer (CBT) untuk:
              </div>

              {/* Rincian Pelaksanaan */}
              <div className="text-xs border border-black p-3 bg-slate-50/50 space-y-1 font-sans">
                <div className="grid grid-cols-2 gap-2">
                  <div>Mata Pelajaran: <strong>{exam.subject}</strong></div>
                  <div>Ruangan / Lab: <strong>{exam.roomName || 'Lab Komputer 1'}</strong></div>
                  <div>Paket Ujian: <strong>{exam.title}</strong></div>
                  <div>Kelas / Rombel: <strong>{exam.classTarget}</strong></div>
                  <div>Alokasi Waktu: <strong>{scheduleText} ({exam.duration} Menit)</strong></div>
                  <div>Token Resmi: <strong className="font-mono">{examToken}</strong></div>
                </div>
              </div>

              {/* Statistik Kehadiran BAP */}
              <div className="border border-black p-3 text-xs space-y-1 font-sans">
                <div className="font-bold mb-1 border-b border-black pb-1">Statistik Kehadiran Peserta Ujian:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>1. Jumlah Seharusnya: <strong>{totalRoster} Siswa</strong></div>
                  <div>2. Jumlah Hadir: <strong>{inProgressCount + submittedCount} Siswa</strong></div>
                  <div>3. Jumlah Tidak Hadir: <strong>{unattendedCount} Siswa</strong></div>
                </div>
              </div>

              {/* Catatan Integritas Ruangan */}
              <div className="border border-black p-3 text-xs space-y-1 font-sans">
                <div className="font-bold mb-1 border-b border-black pb-1">Catatan Kejadian Khusus / Integritas Pengawasan:</div>
                <p className="text-slate-800 italic">{bapNotes}</p>
                {violationCount > 0 && (
                  <p className="text-rose-800 font-bold text-[11px] pt-1">
                    ⚠️ Terdeteksi {violationCount} siswa yang melakukan perpindahan tab / jendela layar selama ujian.
                  </p>
                )}
              </div>

              {/* Keabsahan Sistem */}
              <CbtSecurityValidationBox
                examTitle={`BAP: ${exam.title} (${exam.classTarget})`}
              />

              {/* Tanda Tangan Pengawas 1 dan Pengawas 2 */}
              <div className="pt-4">
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={exam.proctorName || currentUser.name}
                  subjectName={exam.subject}
                  classNameTarget={exam.classTarget}
                  mode="two-column"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between font-sans">
              <input
                type="text"
                value={bapNotes}
                onChange={(e) => setBapNotes(e.target.value)}
                placeholder="Tulis catatan kejadian khusus di ruangan..."
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 w-80 text-black"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPrintBapModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow"
                >
                  <Printer size={15} /> Cetak Berita Acara (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
