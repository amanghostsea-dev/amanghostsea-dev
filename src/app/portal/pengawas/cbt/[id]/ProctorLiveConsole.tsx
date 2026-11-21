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
  ArrowLeft,
  ArrowRight,
  Zap
} from 'lucide-react';
import { 
  toggleExamSession, 
  rotateExamToken,
  proctorResetStudentLoginAction,
  proctorAddExtraTimeAction,
  proctorToggleBlockAction,
  proctorForceSubmitAction,
  proctorUnlockStrike2Action,
  proctorUnlockFatalStrike4Action
} from '@/app/admin/cbt/actions';
import { 
  formatExamScheduleRange, 
  getExamScheduleState, 
  checkScheduleDiscrepancy, 
  ScheduleDiscrepancyResult,
  formatClassTargetDisplay 
} from '@/lib/cbt-schedule';
import { KopSuratConfig } from '@/app/admin/settings/types';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox,
  CbtPrintModalWrapper
} from '@/components/cbt/CbtOfficialPrintComponents';
import ConfirmModal from '@/components/ConfirmModal';

export interface ProctorAttemptItem {
  id: string;
  examId?: string;
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
  religionCode?: string;
  examId?: string;
  examTitle?: string;
}

export interface ParallelReligionExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  targetReligion?: string | null;
  effectiveReligion: string;
  questionsCount: number;
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
    targetReligion?: string | null;
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
  parallelExams?: ParallelReligionExamItem[];
  allExamIds?: string[];
}

export default function ProctorLiveConsole({
  exam,
  scheduledStudents,
  initialAttempts,
  kopSuratConfig,
  currentUser,
  parallelExams,
  allExamIds,
}: ProctorLiveConsoleProps) {
  // Session & Token States
  const [examStatus, setExamStatus] = useState(exam.status || 'PUBLISHED');
  const [examToken, setExamToken] = useState((exam.token || '').split('|')[0]);
  const [attempts, setAttempts] = useState<ProctorAttemptItem[]>(initialAttempts);
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [togglingSession, setTogglingSession] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // 🔄 Dynamic 10-Minute Rolling Token System (600 seconds)
  const calculateRemainingTokenTime = useCallback(() => {
    if (!exam.updatedAt) return 600;
    const elapsed = Math.floor((Date.now() - new Date(exam.updatedAt).getTime()) / 1000);
    const remaining = 600 - (elapsed % 600);
    return remaining > 0 ? remaining : 600;
  }, [exam.updatedAt]);

  const [tokenTimer, setTokenTimer] = useState<number>(() => calculateRemainingTokenTime());

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNATTENDED' | 'VIOLATION'>('ALL');
  const [religionFilter, setReligionFilter] = useState<string>('ALL');
  const [packetFilter, setPacketFilter] = useState<string>('ALL');

  const hasParallelExams = Boolean(parallelExams && parallelExams.length > 0);
  const isParallelReligionSession = hasParallelExams && (
    (exam.targetReligion && exam.targetReligion !== 'ALL') ||
    parallelExams!.some((p) => p.effectiveReligion !== 'ALL')
  );
  const isParallelMajorSession = hasParallelExams && !isParallelReligionSession;
  const allExamIdsList = useMemo(() => {
    if (allExamIds && allExamIds.length > 0) return allExamIds;
    return [exam.id];
  }, [allExamIds, exam.id]);

  // Confirmation Modals
  const [actionTargetAttempt, setActionTargetAttempt] = useState<{
    attemptId: string;
    studentName: string;
    type: 'RESET' | 'SUBMIT' | 'BLOCK' | 'UNBLOCK' | 'UNLOCK_STRIKE_2' | 'UNLOCK_FATAL_STRIKE_4';
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
  const scheduleState = getExamScheduleState(exam.startTime, exam.endTime, examStatus, new Date(), exam.updatedAt, exam.duration);

  // Schedule Discrepancy Notice Modal State (Token Release outside scheduled window)
  const [scheduleNoticeModal, setScheduleNoticeModal] = useState<ScheduleDiscrepancyResult | null>(null);

  // Dual-Key Session Toggle
  const handleToggleSession = async (open: boolean, forceAllowOutsideSchedule: boolean = false) => {
    // ⏰ Verifikasi Jadwal Resmi Ujian saat pengawas membuka sesi / merilis token
    if (open && !forceAllowOutsideSchedule) {
      const discrepancy = checkScheduleDiscrepancy(exam.startTime, exam.endTime);
      if (discrepancy.isOutside) {
        setScheduleNoticeModal(discrepancy);
        return;
      }
    }

    setTogglingSession(true);
    const res = await toggleExamSession(exam.id, open);
    if (res.success && res.data) {
      setExamStatus(res.data.status);
      if (res.data.displayToken) {
        setExamToken(res.data.displayToken);
        setTokenTimer(600);
      }
      showToast(open ? 'Sesi ujian telah DIBUKA! Token resmi 10 menit aktif.' : 'Sesi ujian telah DIKUNCI oleh Pengawas.');
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian.');
    }
    setTogglingSession(false);
  };

  // Rotate Token (10-minute cycle reset)
  const handleRotateToken = async (manualToken?: string) => {
    setIsRotatingToken(true);
    const res = await rotateExamToken(exam.id, manualToken);
    if (res.success && res.displayToken) {
      setExamToken(res.displayToken);
      setTokenTimer(600);
      showToast(`Token baru dirilis: ${res.displayToken} (Siklus 10 Menit Singkron)`);
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

  // Refresh attempts & sync token live with teacher and server (every 10 seconds while active)
  const refreshAttemptsLive = useCallback(async () => {
    // Hemat koneksi DB: Jangan request jika tab pengawas sedang tidak aktif/tersembunyi
    if (typeof document !== 'undefined' && document.hidden) return;

    try {
      const res = await fetch(`/api/cbt/attempts?examId=${allExamIdsList.join(',')}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.attempts) {
          setAttempts(data.attempts);
        }
        if (data.exam) {
          if (data.exam.displayToken && data.exam.displayToken !== examToken) {
            setExamToken(data.exam.displayToken);
          }
          if (data.exam.status && data.exam.status !== examStatus) {
            setExamStatus(data.exam.status);
          }
          if (typeof data.exam.remainingSeconds === 'number') {
            setTokenTimer(data.exam.remainingSeconds);
          }
        }
      }
    } catch {}
  }, [allExamIdsList, examToken, examStatus]);

  useEffect(() => {
    if (examStatus !== 'ACTIVE') return;

    const timer = setInterval(() => {
      refreshAttemptsLive();
    }, 10000);
    return () => clearInterval(timer);
  }, [examStatus, refreshAttemptsLive]);

  // ⏱️ Auto-countdown & auto-rotation effect for 10-minute rolling token cycle
  useEffect(() => {
    if (examStatus !== 'ACTIVE') return;

    const interval = setInterval(() => {
      setTokenTimer((prev) => {
        if (prev <= 1) {
          handleRotateToken();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examStatus, exam.id]);

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

      const assignedExamId = att?.examId || std.examId || exam.id;
      const religionCode = std.religionCode || (
        assignedExamId === exam.id
          ? (exam.targetReligion || 'ALL')
          : parallelExams?.find(p => p.id === assignedExamId)?.effectiveReligion || 'ALL'
      );
      const assignedQuestionsCount = (assignedExamId === exam.id)
        ? exam.questionsCount
        : (parallelExams?.find(p => p.id === assignedExamId)?.questionsCount || exam.questionsCount);

      return {
        studentName: std.studentName,
        studentNis: std.studentNis,
        studentClass: std.studentClass,
        religionCode,
        assignedExamId,
        assignedQuestionsCount,
        assignedExamTitle: std.examTitle || (assignedExamId === exam.id ? exam.title : parallelExams?.find(p => p.id === assignedExamId)?.title),
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
        const assignedExamId = att.examId || exam.id;
        const religionCode = assignedExamId === exam.id
          ? (exam.targetReligion || 'ALL')
          : parallelExams?.find(p => p.id === assignedExamId)?.effectiveReligion || 'ALL';
        const assignedQuestionsCount = (assignedExamId === exam.id)
          ? exam.questionsCount
          : (parallelExams?.find(p => p.id === assignedExamId)?.questionsCount || exam.questionsCount);

        rows.push({
          studentName: att.studentName,
          studentNis: att.studentNis || '-',
          studentClass: att.studentClass || exam.classTarget,
          religionCode,
          assignedExamId,
          assignedQuestionsCount,
          assignedExamTitle: assignedExamId === exam.id ? exam.title : parallelExams?.find(p => p.id === assignedExamId)?.title,
          attempt: att,
          status: att.status,
          answersCount,
          tabSwitchCount: att.tabSwitchCount,
          extraTimeMinutes: att.extraTimeMinutes || 0,
          isBlocked: att.isBlocked || false,
        });
      }
    });

    // Urutkan rapi berdasarkan Kelas/Rombel lalu Abjad Nama Siswa
    rows.sort((a, b) => {
      const classCompare = (a.studentClass || '').localeCompare(b.studentClass || '');
      if (classCompare !== 0) return classCompare;
      return (a.studentName || '').localeCompare(b.studentName || '');
    });

    return rows;
  }, [scheduledStudents, attempts, exam.classTarget, exam.id, exam.questionsCount, exam.targetReligion, exam.title, parallelExams]);

  // Statistics
  const totalRoster = combinedRoster.length;
  const inProgressCount = combinedRoster.filter(r => r.status === 'IN_PROGRESS').length;
  const submittedCount = combinedRoster.filter(r => r.status === 'SUBMITTED').length;
  const unattendedCount = combinedRoster.filter(r => r.status === 'UNATTENDED').length;
  const violationCount = combinedRoster.filter(r => r.tabSwitchCount > 0 || r.isBlocked).length;
  const strike2Pending = combinedRoster.filter(r => r.tabSwitchCount === 2 && !r.attempt?.proctorNotes?.includes('[IZIN_LANJUT_P2]') && !r.isBlocked);
  const strike3Banned = combinedRoster.filter(r => 
    (r.isBlocked || r.tabSwitchCount >= 3 || r.attempt?.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) &&
    !r.attempt?.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]')
  );

  const islamCount = combinedRoster.filter(r => r.religionCode === 'ISLAM').length;
  const kristenCount = combinedRoster.filter(r => r.religionCode === 'KRISTEN').length;
  const otherRelCount = combinedRoster.filter(r => r.religionCode && r.religionCode !== 'ISLAM' && r.religionCode !== 'KRISTEN' && r.religionCode !== 'ALL').length;

  // Filtered rows for proctor table
  const filteredRoster = useMemo(() => {
    return combinedRoster.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        !q || 
        r.studentName.toLowerCase().includes(q) || 
        r.studentNis.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (religionFilter !== 'ALL' && r.religionCode !== religionFilter) return false;
      if (packetFilter !== 'ALL' && r.assignedExamId !== packetFilter) return false;

      if (statusFilter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS';
      if (statusFilter === 'SUBMITTED') return r.status === 'SUBMITTED';
      if (statusFilter === 'UNATTENDED') return r.status === 'UNATTENDED';
      if (statusFilter === 'VIOLATION') return r.tabSwitchCount > 0 || r.isBlocked;

      return true;
    });
  }, [combinedRoster, searchQuery, statusFilter, religionFilter, packetFilter]);

  // Execute Proctor Interventions
  const handleConfirmAction = async () => {
    if (!actionTargetAttempt) return;
    const { attemptId, studentName, type } = actionTargetAttempt;

    if (type === 'RESET') {
      const res = await proctorResetStudentLoginAction(attemptId);
      if (res.success) {
        showToast(`Siswa "${studentName}" berhasil di-reset. Blokir pelanggaran dibuka dan layar siswa otomatis melanjutkan ujian!`);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal mereset siswa.');
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
    } else if (type === 'UNLOCK_STRIKE_2') {
      const res = await proctorUnlockStrike2Action(attemptId, currentUser.name);
      if (res.success) {
        showToast(res.message);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal membuka kunci ujian.');
      }
    } else if (type === 'UNLOCK_FATAL_STRIKE_4') {
      const res = await proctorUnlockFatalStrike4Action(attemptId, currentUser.name);
      if (res.success) {
        showToast(res.message);
        refreshAttemptsLive();
      } else {
        alert(res.error || 'Gagal membuka kunci darurat fatal.');
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
          <span className="hidden sm:inline text-slate-500 font-mono text-[10.5px]">Created By Abdul Rahman</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-emerald-400 font-mono text-[11px] font-bold">KONSOL AKTIF • REFRESH 5S</span>
        </div>
      </div>

      {/* 🔔 TOAST NOTIFICATION (FUTURISTIC FLOATING CYBER PILL) */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg w-full px-4 pointer-events-none">
          <div className="p-4 rounded-2xl bg-slate-950/95 border border-emerald-500/60 text-white text-xs font-bold flex items-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-xl pointer-events-auto">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">KONSOL PENGAWAS RESMI</div>
              <p className="text-xs text-slate-100 font-semibold">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ CYBER ALERT: SISWA TERKUNCI STRIKE 2 BUTUH TINDAKAN PENGAWAS */}
      {strike2Pending.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="p-4 rounded-3xl bg-amber-950/70 border-2 border-amber-500/70 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] backdrop-blur-xl animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Lock size={22} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/50 text-[10px] font-mono font-bold uppercase">
                    PERHATIAN PENGAWAS
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {strike2Pending.length} SISWA TERKUNCI (PELANGGARAN KE-2)
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  {strike2Pending.map(s => s.studentName).join(', ')} sedang menunggu verifikasi Pengawas untuk membuka kunci ujian.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter('VIOLATION')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/25 shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Siswa Terkunci</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ⛔ CYBER ALERT: SISWA DI-SUSPEND TOTAL (STRIKE 3) */}
      {strike3Banned.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="p-4 rounded-3xl bg-rose-950/70 border border-rose-600/70 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_50px_rgba(244,63,94,0.25)] backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-mono font-bold uppercase">
                    SUSPEND TOTAL SISTEM
                  </span>
                  <span className="text-[11px] font-mono text-rose-400 font-bold">
                    {strike3Banned.length} SISWA MENCAPAI 3X PELANGGARAN
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  {strike3Banned.map(s => s.studentName).join(', ')} otomatis di-suspend permanen dan tercatat di BAP. Wewenang buka blokir dipegang oleh Admin Utama.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter('VIOLATION')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/25 shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lihat di Rekap</span>
              <ArrowRight size={14} />
            </button>
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
              {examStatus === 'ACTIVE' && scheduleState.isOutsideSchedule && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle size={13} /> Sesi Live (Susulan)
                </span>
              )}
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

            {isParallelReligionSession && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-purple-950/70 border border-emerald-500/40 text-xs shadow-lg mt-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span className="text-base">🕌</span>
                  <span>Sesi Paralel Agama Terpadu:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {islamCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-900/80 text-emerald-300 border border-emerald-600/50 font-bold flex items-center gap-1">
                      ☪️ Islam ({islamCount})
                    </span>
                  )}
                  {kristenCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-900/80 text-purple-300 border border-purple-600/50 font-bold flex items-center gap-1">
                      ✝️ Kristen ({kristenCount})
                    </span>
                  )}
                  {otherRelCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-300 border border-blue-600/50 font-bold flex items-center gap-1">
                      ☸️ Lainnya ({otherRelCount})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 sm:ml-auto flex items-center gap-1.5 font-mono">
                  <span className="text-emerald-400 font-bold">✓ 1 Token Serentak</span>
                  <span className="text-slate-500">•</span>
                  <span>Soal otomatis sesuai agama siswa</span>
                </div>
              </div>
            )}

            {isParallelMajorSession && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 border border-indigo-500/40 text-xs shadow-lg mt-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span className="text-base">🏢</span>
                  <span>Sesi Terpadu Ruangan ({parallelExams!.length + 1} Paket Soal):</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-600/50 font-bold flex items-center gap-1">
                    📋 {exam.title} ({formatClassTargetDisplay(exam.classTarget, true)})
                  </span>
                  {parallelExams?.map((p) => (
                    <span key={p.id} className="px-2.5 py-0.5 rounded-md bg-indigo-900/80 text-indigo-200 border border-indigo-600/50 font-bold flex items-center gap-1">
                      📋 {p.title} ({formatClassTargetDisplay(p.classTarget, true)})
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-slate-300 sm:ml-auto flex items-center gap-1.5 font-mono">
                  <span className="text-emerald-400 font-bold">✓ 1 Token Serentak</span>
                  <span className="text-slate-500">•</span>
                  <span>Soal otomatis sesuai jurusan siswa</span>
                </div>
              </div>
            )}

            {examStatus === 'ACTIVE' && scheduleState.isOutsideSchedule && (
              <div className="mt-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span>
                  <strong>Info Ujian Susulan:</strong> Sesi ujian ini dibuka di luar jadwal resmi ({scheduleState.countdown}). Siswa tetap dapat login & mengerjakan ujian.
                </span>
              </div>
            )}
          </div>

          {/* TOKEN & SESSION ACTION BOX */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            {/* Giant Token Display & 10-Minute Dynamic Rolling Timer */}
            <div className="text-center px-4 py-1 border-r border-slate-800">
              <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <span>Token Papan Tulis</span>
                {examStatus === 'ACTIVE' && (
                  <span className="flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>10 MNT</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono tracking-widest text-emerald-400 select-all">
                  {examStatus === 'ACTIVE' ? (examToken || 'RPL2026') : 'TERKUNCI'}
                </span>
                {examStatus === 'ACTIVE' && (
                  <button
                    onClick={handleCopyToken}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    title="Salin Token"
                  >
                    {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Key size={14} />}
                  </button>
                )}
              </div>
              {examStatus === 'ACTIVE' && (
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono mt-1">
                  <span className="text-slate-400 text-[9.5px]">Auto-Reset:</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded ${
                    tokenTimer <= 60 
                      ? 'bg-rose-900/80 text-rose-300 animate-pulse' 
                      : 'bg-slate-900 text-emerald-300'
                  }`}>
                    {Math.floor(tokenTimer / 60).toString().padStart(2, '0')}:{(tokenTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Actions: Start, Rolling, Projector */}
            <div className="flex flex-wrap items-center gap-2">
              {examStatus === 'ACTIVE' ? (
                <>
                  <button
                    onClick={() => handleRotateToken()}
                    disabled={isRotatingToken}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                    title="Reset & Putar Token Baru (Siklus 10 Menit Singkron Guru & Pengawas)"
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
                  <span>{scheduleState.state === 'ENDED' ? 'Buka Sesi Susulan & Rilis Token' : 'Mulai & Rilis Sesi Ujian'}</span>
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
          {isParallelReligionSession && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 mr-1">
              <span className="text-[10.5px] font-bold text-slate-400 pl-1.5 pr-0.5">Agama:</span>
              <button
                onClick={() => setReligionFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  religionFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({totalRoster})
              </button>
              {islamCount > 0 && (
                <button
                  onClick={() => setReligionFilter('ISLAM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    religionFilter === 'ISLAM'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <span>☪️ Islam ({islamCount})</span>
                </button>
              )}
              {kristenCount > 0 && (
                <button
                  onClick={() => setReligionFilter('KRISTEN')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    religionFilter === 'KRISTEN'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-purple-400'
                  }`}
                >
                  <span>✝️ Kristen ({kristenCount})</span>
                </button>
              )}
            </div>
          )}

          {isParallelMajorSession && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 mr-1">
              <span className="text-[10.5px] font-bold text-slate-400 pl-1.5 pr-0.5">Paket Soal:</span>
              <button
                onClick={() => setPacketFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  packetFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({totalRoster})
              </button>
              <button
                onClick={() => setPacketFilter(exam.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  packetFilter === exam.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-indigo-400'
                }`}
              >
                <span>📋 {exam.subject || exam.title} ({combinedRoster.filter((r) => r.assignedExamId === exam.id).length})</span>
              </button>
              {parallelExams?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPacketFilter(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    packetFilter === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <span>📋 {p.subject || p.title} ({combinedRoster.filter((r) => r.assignedExamId === p.id).length})</span>
                </button>
              ))}
            </div>
          )}

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{item.studentName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950/70 text-purple-300 border border-purple-800/60 normal-case tracking-tight font-sans">
                            {item.studentClass}
                          </span>
                          {hasParallelExams && !isParallelReligionSession && item.assignedExamTitle && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-500/50 normal-case tracking-tight font-sans flex items-center gap-1">
                              📋 {item.assignedExamTitle}
                            </span>
                          )}
                          {isParallelReligionSession && (
                            item.religionCode === 'KRISTEN' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-900/80 text-purple-200 border border-purple-500/50 normal-case tracking-tight font-sans flex items-center gap-1">
                                ✝️ Kristen
                              </span>
                            ) : item.religionCode === 'KATOLIK' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-500/50 normal-case tracking-tight font-sans flex items-center gap-1">
                                ✝️ Katolik
                              </span>
                            ) : item.religionCode === 'ISLAM' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-900/80 text-emerald-200 border border-emerald-500/50 normal-case tracking-tight font-sans flex items-center gap-1">
                                ☪️ Islam
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 normal-case tracking-tight font-sans">
                                ☸️ {item.religionCode || 'Umum'}
                              </span>
                            )
                          )}
                        </div>
                        {att?.proctorNotes && (
                          <div className="text-[10px] text-amber-400 font-normal italic mt-0.5 normal-case font-sans">
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
                              {item.answersCount} / {item.assignedQuestionsCount || exam.questionsCount}
                            </div>
                            <div className="w-20 mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.assignedQuestionsCount || exam.questionsCount) > 0
                                      ? (item.answersCount / (item.assignedQuestionsCount || exam.questionsCount)) * 100
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
                        ) : item.tabSwitchCount === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center gap-1 mx-auto w-fit" title="Peringatan Awal: Siswa ditegur di layar">
                            <AlertTriangle size={11} />
                            <span>1x Pindah Tab (Peringatan)</span>
                          </span>
                        ) : item.tabSwitchCount === 2 ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border flex items-center justify-center gap-1 mx-auto w-fit ${
                            att?.proctorNotes?.includes('[IZIN_LANJUT_P2]')
                              ? 'bg-amber-950/70 text-amber-300 border-amber-700'
                              : 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                          }`} title={att?.proctorNotes?.includes('[IZIN_LANJUT_P2]') ? 'Pelanggaran ke-2: Izin lanjut sudah diberikan oleh Pengawas' : 'Pelanggaran ke-2: Pengerjaan soal terkunci. Menunggu izin pengawas!'}>
                            <Lock size={11} />
                            <span>{att?.proctorNotes?.includes('[IZIN_LANJUT_P2]') ? '2x Tab (Izin Diberikan)' : '2x Tab (TERKUNCI)'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 animate-pulse flex items-center justify-center gap-1 mx-auto w-fit" title="Pelanggaran ke-3: Akun di-suspend permanen. Wajib melapor ke Admin Utama">
                            <AlertTriangle size={11} />
                            <span>{item.tabSwitchCount}x (SUSPEND TOTAL - LAPOR ADMIN)</span>
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
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* 🛑 TIER 5: DISKUALIFIKASI TOTAL SISTEM (5x Pelanggaran) */}
                            {(item.tabSwitchCount >= 5 || att?.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]')) ? (
                              <span 
                                className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 font-bold text-[10px] border border-rose-800 flex items-center gap-1 shadow-xs"
                                title="Siswa telah 5x melanggar tata tertib dan didiskualifikasi permanen oleh sistem. Hanya Admin Utama di Pusat Suspend yang berwenang memberikan dispensasi."
                              >
                                🛑 Diskualifikasi (5x)
                              </span>
                            ) : (item.tabSwitchCount === 4 || att?.proctorNotes?.includes('[STRIKE_4_FATAL]')) ? (
                              /* 🚨 TIER 4: PELANGGARAN FATAL KE-4 (Pasca Dispensasi Admin Utama) */
                              !att?.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]') ? (
                                <button
                                  onClick={() => setActionTargetAttempt({
                                    attemptId: att.id,
                                    studentName: item.studentName,
                                    type: 'UNLOCK_FATAL_STRIKE_4',
                                  })}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-[11px] shadow-sm animate-pulse transition flex items-center gap-1 cursor-pointer border border-rose-400/50"
                                  title="Buka Kunci Darurat Pelanggaran ke-4 (Pasca-Dispensasi Admin Utama) - Siswa Langsung Melanjutkan & Tercatat di BAP"
                                >
                                  <Unlock size={12} /> Buka Kunci Fatal (BAP)
                                </button>
                              ) : (
                                <span 
                                  className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800"
                                  title="Izin darurat terakhir telah diberikan oleh Pengawas Ruang."
                                >
                                  ✓ Dispensasi Fatal Pengawas
                                </span>
                              )
                            ) : (item.tabSwitchCount === 3 || att?.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) ? (
                              /* ⛔ TIER 3: SUSPEND TOTAL SISTEM (Pelanggaran ke-3) */
                              !att?.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') ? (
                                <span 
                                  className="px-2 py-1 rounded-lg bg-rose-950 text-rose-300 font-bold text-[10px] border border-rose-800"
                                  title="Siswa telah 3x melanggar tata tertib dan di-suspend total oleh sistem. Wajib dibuka oleh Admin Utama di menu Pusat Suspend."
                                >
                                  Wajib Admin Utama
                                </span>
                              ) : (
                                <span 
                                  className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800"
                                  title="Akun siswa telah resmi dibuka oleh Admin Utama."
                                >
                                  ✓ Dispensasi Admin
                                </span>
                              )
                            ) : item.tabSwitchCount === 2 ? (
                              /* 🚫 TIER 2: TERKUNCI SEMENTARA PENGAWAS (Pelanggaran ke-2) */
                              !att?.proctorNotes?.includes('[IZIN_LANJUT_P2]') ? (
                                <button
                                  onClick={() => setActionTargetAttempt({
                                    attemptId: att.id,
                                    studentName: item.studentName,
                                    type: 'UNLOCK_STRIKE_2',
                                  })}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm animate-pulse transition flex items-center gap-1 cursor-pointer"
                                  title="Buka Kunci Pelanggaran ke-2 agar siswa bisa langsung melanjutkan ujian (Tercatat di BAP)"
                                >
                                  <Unlock size={12} /> Buka Kunci P2
                                </button>
                              ) : (
                                <span 
                                  className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800"
                                  title="Kunci pelanggaran ke-2 telah dibuka oleh Pengawas."
                                >
                                  ✓ Kunci Telah Dibuka
                                </span>
                              )
                            ) : (
                              /* 🟢 TIER 0-1: KONDISI NORMAL ATAU PERINGATAN 1x */
                              <button
                                onClick={() => setActionTargetAttempt({
                                  attemptId: att.id,
                                  studentName: item.studentName,
                                  type: 'RESET',
                                })}
                                className="px-2 py-1 rounded-lg font-bold text-[11px] border transition flex items-center gap-1 cursor-pointer bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/30"
                                title="Reset sesi siswa"
                              >
                                <Unlock size={11} /> Reset
                              </button>
                            )}

                            {/* Extra Time (+5m / +10m) */}
                            <button
                              onClick={() => setExtraTimeTarget({
                                attemptId: att.id,
                                studentName: item.studentName,
                                minutes: 5,
                              })}
                              className="px-1.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-bold text-[11px] border border-purple-500/30 transition cursor-pointer"
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
                              className="px-1.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-bold text-[11px] border border-purple-500/30 transition cursor-pointer"
                              title="Tambah Waktu Dispensasi +10 Menit"
                            >
                              +10m
                            </button>

                            {/* Manual Block Toggle (Hanya untuk kasus insidental di luar sistem otomatis) */}
                            {item.tabSwitchCount < 2 && !att?.proctorNotes?.includes('STRIKE') && (
                              isBlocked ? (
                                <button
                                  onClick={() => setActionTargetAttempt({
                                    attemptId: att.id,
                                    studentName: item.studentName,
                                    type: 'UNBLOCK',
                                  })}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition cursor-pointer"
                                  title="Buka Blokir Manual Pengawas"
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
                                  title="Tegur / Blokir Siswa Secara Manual"
                                >
                                  Blokir
                                </button>
                              )
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
              <ShieldCheck size={16} />
              {isParallelReligionSession
                ? '🕌 Token Resmi Sesi Paralel Agama Terpadu'
                : isParallelMajorSession
                ? `🏢 Token Resmi Sesi Terpadu Ruangan (${parallelExams!.length + 1} Paket)`
                : 'Token Resmi Pengawas Ruangan'}
            </div>

            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border-4 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 max-w-xl w-full text-center relative overflow-hidden group">
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                Masukkan Kode Token Ini di Portal Siswa
              </div>

              <div className="text-6xl sm:text-8xl font-black font-mono tracking-widest text-emerald-400 select-all my-2 drop-shadow-md">
                {examToken || 'RPL2026'}
              </div>

              <div className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-4 flex-wrap">
                <span>Target Rombel: <strong>{exam.classTarget}</strong></span>
                <span>•</span>
                <span>Durasi: <strong>{exam.duration} Menit</strong></span>
                {isParallelReligionSession && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">PAI Islam &amp; PAK Kristen</span>
                  </>
                )}
                {isParallelMajorSession && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{parallelExams!.length + 1} Paket Soal Terpadu</span>
                  </>
                )}
              </div>

              {/* ⏱️ Dynamic 10-Minute Countdown Display on Whiteboard */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <RefreshCw size={13} className={isRotatingToken ? 'animate-spin text-emerald-400' : 'text-slate-500'} />
                  <span>Auto-Reset (Siklus 10 Menit):</span>
                </span>
                <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                  tokenTimer <= 60 
                    ? 'bg-rose-900/80 text-rose-300 animate-pulse' 
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                }`}>
                  {Math.floor(tokenTimer / 60).toString().padStart(2, '0')}:{(tokenTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-md space-y-1">
              {isParallelReligionSession ? (
                <div className="text-amber-300 font-medium text-xs">
                  🕌 1 Token berlaku serentak untuk seluruh siswa. Soal ujian otomatis disesuaikan dengan agama masing-masing siswa.
                </div>
              ) : isParallelMajorSession ? (
                <div className="text-amber-300 font-medium text-xs">
                  🏢 1 Token berlaku serentak untuk seluruh siswa di ruangan ini ({parallelExams!.length + 1} Paket Soal). Sistem otomatis memecah lembar soal sesuai jurusan masing-masing siswa.
                </div>
              ) : (
                <div>Siswa wajib menjaga ketertiban, tidak berpindah jendela layar atau tab browser selama ujian berlangsung.</div>
              )}
              <div className="text-[11px] text-emerald-400/90 font-mono">Token tersinkronisasi otomatis setiap saat dengan akun Guru &amp; Pengawas.</div>
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
            : actionTargetAttempt?.type === 'UNLOCK_STRIKE_2'
            ? 'Izinkan Lanjut Ujian (Buka Kunci Pelanggaran ke-2)'
            : actionTargetAttempt?.type === 'UNLOCK_FATAL_STRIKE_4'
            ? '🚨 Buka Kunci Darurat Pelanggaran Fatal ke-4 (BAP)'
            : 'Buka Blokir Siswa'
        }
        message={
          actionTargetAttempt?.type === 'RESET'
            ? `Apakah Anda yakin ingin membuka kunci & me-reset siswa "${actionTargetAttempt?.studentName}"? Akses ujian dan blokir pelanggaran siswa akan dibuka secara otomatis sehingga siswa dapat langsung melanjutkan ujian tanpa kehilangan jawaban.`
            : actionTargetAttempt?.type === 'SUBMIT'
            ? `Apakah Anda yakin ingin memaksa mengumpulkan lembar ujian milik "${actionTargetAttempt?.studentName}"? Skor akan langsung dihitung berdasarkan jawaban yang tersimpan saat ini.`
            : actionTargetAttempt?.type === 'BLOCK'
            ? `Apakah Anda yakin ingin memblokir akses ujian untuk "${actionTargetAttempt?.studentName}"? Ujian siswa akan dihentikan sementara.`
            : actionTargetAttempt?.type === 'UNLOCK_STRIKE_2'
            ? `Apakah Anda yakin ingin mengizinkan siswa "${actionTargetAttempt?.studentName}" melanjutkan ujian? Siswa telah terdeteksi melakukan pelanggaran ke-2 (keluar layar). Pemberian izin ini akan dicatat secara otomatis ke Berita Acara Ujian (BAP).`
            : actionTargetAttempt?.type === 'UNLOCK_FATAL_STRIKE_4'
            ? `PERHATIAN FATAL: Siswa "${actionTargetAttempt?.studentName}" sebelumnya SUDAH MENERIMA DISPENSASI DARI ADMIN UTAMA dan kembali melanggar untuk yang ke-4 kalinya di kelas. Apakah Anda yakin ingin memberikan KESEMPATAN DARURAT TERAKHIR di ruang ujian? Pemberian izin darurat ini akan dicatat secara resmi ke Berita Acara Pelaksanaan (BAP) sebagai Catatan Fatal.`
            : `Apakah Anda yakin ingin mencabut status blokir untuk "${actionTargetAttempt?.studentName}"?`
        }
        confirmText={
          actionTargetAttempt?.type === 'RESET'
            ? 'Ya, Reset & Buka Ujian Siswa'
            : actionTargetAttempt?.type === 'SUBMIT'
            ? 'Ya, Paksa Kumpul'
            : actionTargetAttempt?.type === 'BLOCK'
            ? 'Ya, Blokir Siswa'
            : actionTargetAttempt?.type === 'UNLOCK_STRIKE_2'
            ? 'Ya, Izinkan Lanjut Ujian'
            : actionTargetAttempt?.type === 'UNLOCK_FATAL_STRIKE_4'
            ? 'Ya, Berikan Izin Darurat Fatal (BAP)'
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
      <CbtPrintModalWrapper
        isOpen={isPrintAttendanceModalOpen}
        onClose={() => setIsPrintAttendanceModalOpen(false)}
        title="Pratinjau Daftar Hadir Peserta Ujian Ruangan"
        subtitle="Dokumen presensi resmi peserta ujian berbasis komputer"
        maxWidth="max-w-5xl"
        printButtonText="Cetak Daftar Hadir (PDF)"
      >
        <div id="cbt-printable-attendance-sheet" className="space-y-4 bg-white text-black cbt-printable-sheet">
              <CbtOfficialKopSurat
                config={kopSuratConfig}
                documentTitle="DAFTAR HADIR PESERTA UJIAN BERBASIS KOMPUTER (CBT)"
                documentNumber={`Nomor: 421.5 / DH-CBT / ${new Date().getFullYear()} / ${exam.classTarget.replace(/\s+/g, '-')}`}
                subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
              />

              {/* Metadata Kedinasan Resmi */}
              <div className="border border-black p-3 text-[11px] font-sans print-avoid-break mb-2 bg-white">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Mata Pelajaran</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1 uppercase">
                      {isParallelReligionSession ? `${exam.subject} (SESI PARALEL AGAMA TERPADU)` : exam.subject}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Ruang / Lab</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{exam.roomName || 'Lab Komputer Utama'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Paket Ujian</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1 uppercase">{exam.title}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Kelas / Rombel</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{exam.classTarget}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Hari, Tanggal</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">
                      {exam.startTime
                        ? new Date(exam.startTime).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Alokasi Waktu</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{scheduleText} ({exam.duration} Menit)</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Pengawas Ruang 1</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{exam.proctorName || currentUser.name}</span>
                  </div>
                  {exam.proctor2Name ? (
                    <div className="flex">
                      <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Pengawas Ruang 2</span>
                      <span className="w-3 text-center">:</span>
                      <span className="font-bold text-black flex-1">{exam.proctor2Name}</span>
                    </div>
                  ) : (
                    <div className="flex">
                      <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Token Sesi</span>
                      <span className="w-3 text-center">:</span>
                      <span className="font-mono font-bold text-black flex-1 tracking-wider">{examToken}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabel Absensi Standar Ujian Kedinasan */}
              <table className="w-full text-left border-collapse border border-black text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-black text-black font-bold uppercase text-center">
                    <th className="py-2 px-1 border-r border-black w-8">No</th>
                    <th className="py-2 px-2 border-r border-black w-24">NISN / No Induk</th>
                    <th className="py-2 px-3 border-r border-black text-left">Nama Lengkap Peserta</th>
                    <th className="py-2 px-2 border-r border-black w-20 text-center">Waktu Mulai</th>
                    <th className="py-2 px-2 border-r border-black w-20 text-center">Waktu Selesai</th>
                    <th className="py-2 px-2 border-r border-black w-24 text-center">Kehadiran</th>
                    <th className="py-2 px-2 w-36 text-center">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  {combinedRoster.map((r, idx) => (
                    <tr key={r.studentNis + idx} className="print-avoid-break">
                      <td className="py-2 px-1 border-r border-black font-bold text-center">{idx + 1}</td>
                      <td className="py-2 px-2 border-r border-black font-mono text-[10.5px] text-center">{r.studentNis}</td>
                      <td className="py-2 px-3 border-r border-black font-semibold uppercase">
                        <div>{r.studentName}</div>
                        <div className="text-[9px] font-normal text-slate-700 tracking-normal capitalize">
                          {r.studentClass} {isParallelReligionSession && r.religionCode ? `(${r.religionCode})` : ''}
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center font-mono text-[9.5px]">
                        {r.attempt?.startedAt ? new Date(r.attempt.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center font-mono text-[9.5px]">
                        {r.attempt?.submittedAt ? new Date(r.attempt.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center font-bold text-[9.5px]">
                        {r.status === 'SUBMITTED' ? (
                          <span className="text-black">HADIR (SELESAI)</span>
                        ) : r.status === 'IN_PROGRESS' ? (
                          <span className="text-blue-900">HADIR (AKTIF)</span>
                        ) : (
                          <span className="text-rose-900 font-normal italic">TIDAK HADIR</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-slate-700 font-sans text-[10px]">
                        <div className={idx % 2 === 0 ? 'text-left pl-1 font-mono' : 'text-right pr-2 font-mono'}>
                          <span>{idx + 1}.</span> <span className="tracking-tighter">................................</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Rekapitulasi Kehadiran */}
              <div className="border border-black p-2.5 text-[10.5px] font-sans print-avoid-break mt-2 bg-slate-50 flex items-center justify-between">
                <div className="font-bold uppercase text-slate-800">
                  Rekapitulasi Kehadiran Ruangan:
                </div>
                <div className="flex items-center gap-6 text-[11px]">
                  <div>Total Terdaftar: <strong className="font-mono text-black">{totalRoster}</strong> Siswa</div>
                  <div>Jumlah Hadir: <strong className="font-mono text-black">{inProgressCount + submittedCount}</strong> Siswa</div>
                  <div>Tidak Hadir: <strong className="font-mono text-black">{unattendedCount}</strong> Siswa</div>
                </div>
              </div>

              {/* Security Validation Box */}
              <CbtSecurityValidationBox
                examTitle={`Daftar Hadir: ${exam.title} (${exam.classTarget})`}
              />

              {/* Tanda Tangan Pengawas & Kepala Sekolah */}
              <div className="pt-2 print-avoid-break">
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  roleTitle="Pengawas Ujian"
                  proctorName={exam.proctorName || currentUser.name}
                  proctorNip={exam.proctorNip || ''}
                  proctor2Name={exam.proctor2Name || undefined}
                  teacherName={exam.proctorName || currentUser.name}
                  subTitle="Pengawas Ruang Ujian"
                  subjectName={exam.subject}
                  classNameTarget={exam.classTarget}
                  mode="two-column"
                />
              </div>
            </div>
      </CbtPrintModalWrapper>

      {/* 📜 MODAL CETAK BERITA ACARA UJIAN (BAP) */}
      <CbtPrintModalWrapper
        isOpen={isPrintBapModalOpen}
        onClose={() => setIsPrintBapModalOpen(false)}
        title="Pratinjau Berita Acara Pelaksanaan Ujian (BAP)"
        subtitle="Dokumen berita acara resmi pelaksanaan ujian berbasis komputer"
        maxWidth="max-w-5xl"
        printButtonText="Cetak Berita Acara (PDF)"
        footerExtra={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Catatan Kejadian Khusus:</span>
            <input
              type="text"
              value={bapNotes}
              onChange={(e) => setBapNotes(e.target.value)}
              placeholder="Tulis catatan kejadian khusus di ruangan..."
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 w-72 sm:w-80 text-black bg-white"
            />
          </div>
        }
      >
        <div id="cbt-printable-bap-sheet" className="space-y-4 bg-white text-black cbt-printable-sheet">
              <CbtOfficialKopSurat
                config={kopSuratConfig}
                documentTitle="BERITA ACARA PELAKSANAAN UJIAN BERBASIS KOMPUTER (CBT)"
                documentNumber={`Nomor: 421.5 / BAP-CBT / ${new Date().getFullYear()} / ${exam.classTarget.replace(/\s+/g, '-')}`}
                subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
              />

              <div className="text-xs text-justify leading-relaxed text-black">
                Pada hari ini <strong>{exam.startTime
                  ? new Date(exam.startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah diselenggarakan Ujian Berbasis Komputer (CBT) di lingkungan <strong>{kopSuratConfig?.schoolName || 'SMK GARUDA MAHADHIKA'}</strong> dengan rincian pelaksanaan sebagai berikut:
              </div>

              {/* Rincian Pelaksanaan Kedinasan */}
              <div className="border border-black p-3 text-[11px] font-sans print-avoid-break bg-white">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Mata Pelajaran</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1 uppercase">
                      {isParallelReligionSession ? `${exam.subject} (SESI PARALEL AGAMA TERPADU)` : exam.subject}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Ruang / Lab</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{exam.roomName || 'Lab Komputer Utama'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Paket Ujian</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1 uppercase">{exam.title}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Kelas / Rombel</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{exam.classTarget}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Alokasi Waktu</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-bold text-black flex-1">{scheduleText} ({exam.duration} Menit)</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-800 flex-shrink-0">Token Resmi</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-mono font-bold text-black flex-1 tracking-wider">{examToken}</span>
                  </div>
                </div>
              </div>

              {/* Statistik Kehadiran BAP */}
              <div className="border border-black p-3 text-xs space-y-1 font-sans print-avoid-break bg-slate-50">
                <div className="font-bold mb-1 border-b border-black pb-1 uppercase text-slate-900">Statistik Kehadiran Peserta Ujian:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>1. Jumlah Seharusnya: <strong>{totalRoster} Siswa</strong></div>
                  <div>2. Jumlah Hadir: <strong>{inProgressCount + submittedCount} Siswa</strong></div>
                  <div>3. Jumlah Tidak Hadir: <strong>{unattendedCount} Siswa</strong></div>
                </div>
              </div>

              {/* Catatan Kejadian Khusus & Rekapitulasi Pelanggaran Siswa (BAP Resmi) */}
              <div className="border border-black p-3 text-xs space-y-2 font-sans print-avoid-break bg-white">
                <div className="font-bold border-b border-black pb-1 flex items-center justify-between">
                  <span>Catatan Kejadian Khusus &amp; Rekapitulasi Pelanggaran Siswa (BAP):</span>
                  <span className="text-[11px] font-normal">
                    Total: <strong>{violationCount} Siswa Terindikasi</strong>
                  </span>
                </div>
                {bapNotes && (
                  <div className="p-2 bg-slate-50 border border-slate-300 rounded text-[11px] italic text-slate-800">
                    Catatan Khusus Pengawas: &quot;{bapNotes}&quot;
                  </div>
                )}

                {violationCount > 0 ? (
                  <div className="overflow-x-auto pt-1">
                    <p className="text-rose-800 font-bold text-[11px] mb-1.5">
                      ⚠️ Rekapitulasi Pelanggaran Tata Tertib Berdasarkan Tingkat Tertinggi:
                    </p>
                    <table className="w-full border-collapse border border-black text-[10.5px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-black px-1.5 py-1 w-8">No</th>
                          <th className="border border-black px-2 py-1 text-left">Nama Peserta</th>
                          <th className="border border-black px-1.5 py-1">NISN / No Induk</th>
                          <th className="border border-black px-1.5 py-1">Pindah Tab</th>
                          <th className="border border-black px-2 py-1 text-left">Pelanggaran Tertinggi &amp; Status Tindakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedRoster
                          .filter((r) => r.tabSwitchCount > 0 || r.isBlocked)
                          .map((r, idx) => {
                            const isStrike5 = r.tabSwitchCount >= 5 || r.attempt?.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]');
                            const isStrike4 = !isStrike5 && (r.tabSwitchCount === 4 || r.attempt?.proctorNotes?.includes('[STRIKE_4_FATAL]'));
                            const isStrike4Unblocked = r.attempt?.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]');
                            const isStrike3Active = !isStrike5 && !isStrike4 && (r.tabSwitchCount === 3 || r.isBlocked || r.attempt?.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) && !r.attempt?.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]');
                            const isStrike3Unblocked = !isStrike5 && !isStrike4 && (r.attempt?.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || r.attempt?.proctorNotes?.includes('[ADMIN_UNBLOCK]'));
                            const isStrike2 = !isStrike5 && !isStrike4 && !isStrike3Active && !isStrike3Unblocked && r.tabSwitchCount === 2;

                            return (
                              <tr key={r.studentNis + r.studentName} className={isStrike4 ? 'bg-amber-50/80 font-semibold' : isStrike3Active ? 'bg-rose-50/70 font-semibold' : ''}>
                                <td className="border border-black px-1.5 py-1 text-center font-mono">{idx + 1}</td>
                                <td className="border border-black px-2 py-1 font-bold">{r.studentName}</td>
                                <td className="border border-black px-1.5 py-1 text-center font-mono">{r.studentNis || '-'}</td>
                                <td className="border border-black px-1.5 py-1 text-center font-bold font-mono">{r.tabSwitchCount}x</td>
                                <td className="border border-black px-2 py-1">
                                  {isStrike5 ? (
                                    <div className="text-red-950 leading-snug">
                                      <strong className="text-red-700">🛑 TINGKAT 5 (DISKUALIFIKASI):</strong> Melakukan 5x Pelanggaran • Ujian Diakhiri Otomatis oleh Sistem
                                    </div>
                                  ) : isStrike4 ? (
                                    <div className="text-rose-950 leading-snug">
                                      <strong className="text-rose-700">🚨 TINGKAT 4 (FATAL):</strong> Pelanggaran Pasca-Dispensasi Admin • {isStrike4Unblocked ? 'Izin Darurat Terakhir Diberikan Pengawas Ruang (Tercatat di BAP)' : 'Terkunci Kritis - Wajib Izin Pengawas'}
                                    </div>
                                  ) : isStrike3Active ? (
                                    <div className="text-rose-900 leading-snug">
                                      <strong className="text-rose-700">⛔ TINGKAT 3 (BERAT):</strong> Akun di-Suspend Sistem • Wajib Melapor ke Admin Utama
                                    </div>
                                  ) : isStrike3Unblocked ? (
                                    <div className="text-emerald-900 leading-snug">
                                      <strong className="text-emerald-700">✓ DISPENSASI ADMIN UTAMA:</strong> Suspend dicabut resmi oleh Admin Utama • Siswa diizinkan melanjutkan ujian
                                    </div>
                                  ) : isStrike2 ? (
                                    <div className="text-amber-900 leading-snug">
                                      <strong className="text-amber-800">🚫 TINGKAT 2 (SEDANG):</strong> Layar Terkunci • {r.attempt?.proctorNotes?.includes('[IZIN_LANJUT_P2]') ? 'Izin Lanjut Ujian Diberikan oleh Pengawas' : 'Menunggu Konfirmasi Pengawas Ruang'}
                                    </div>
                                  ) : (
                                    <div className="text-slate-800 leading-snug">
                                      <strong>⚠️ TINGKAT 1 (RINGAN):</strong> Diberi Notifikasi Teguran di Layar Siswa (Ujian Tetap Berjalan)
                                    </div>
                                  )}
                                  {r.attempt?.proctorNotes && (
                                    <div className="text-[9.5px] text-slate-600 font-mono italic mt-0.5">
                                      Log Sistem: {r.attempt.proctorNotes}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-emerald-50/60 border border-emerald-300 text-emerald-900 text-[11px] italic">
                    ✓ Seluruh peserta mematuhi tata tertib pelaksanaan ujian dengan tertib. Tidak terdeteksi pelanggaran perpindahan tab atau jendela layar.
                  </div>
                )}
              </div>

              {/* Keabsahan Sistem */}
              <CbtSecurityValidationBox
                examTitle={`BAP: ${exam.title} (${exam.classTarget})`}
              />

              {/* Tanda Tangan Pengawas 1 dan Pengawas 2 */}
              <div className="pt-2 print-avoid-break">
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  roleTitle="Pengawas Ujian"
                  proctorName={exam.proctorName || currentUser.name}
                  proctorNip={exam.proctorNip || ''}
                  proctor2Name={exam.proctor2Name || undefined}
                  teacherName={exam.proctorName || currentUser.name}
                  subTitle="Pengawas Ruang Ujian"
                  subjectName={exam.subject}
                  classNameTarget={exam.classTarget}
                  mode="two-column"
                />
              </div>
            </div>
      </CbtPrintModalWrapper>

      {/* ⚠️ MODAL PERINGATAN / NOTIFIKASI KETIDAKSESUAIAN JADWAL RILIS TOKEN */}
      {scheduleNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-white">
                  Pemberitahuan Waktu Ujian
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rilis token / sesi dilakukan di luar jadwal resmi paket ujian
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-800/40">
                <span className="text-slate-400 font-medium">Paket Ujian:</span>
                <span className="font-bold text-white truncate max-w-[240px]">
                  {exam.title}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-800/40">
                <span className="text-slate-400 font-medium">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-200">
                  {exam.subject} ({formatClassTargetDisplay(exam.classTarget, true)})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-800/40">
                <span className="text-slate-400 font-medium">Jadwal Resmi:</span>
                <span className="font-mono font-bold text-slate-200">
                  {scheduleNoticeModal.scheduledRangeText}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-800/40">
                <span className="text-slate-400 font-medium">Waktu Sekarang:</span>
                <span className="font-mono font-bold text-purple-400">
                  {scheduleNoticeModal.formattedCurrentTime}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-900/40 text-amber-200 font-medium text-[11px] leading-relaxed">
                {scheduleNoticeModal.message}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-900/50 text-[11px] text-blue-200 flex items-start gap-2">
              <Zap size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Ujian Tetap Bisa Dilakukan:</strong> Notifikasi ini bertujuan untuk memastikan pengawas mengetahui kesesuaian waktu ujian. Ujian tetap dapat dikerjakan siswa (misalnya untuk ujian susulan, remedial, atau penyesuaian waktu oleh pengawas).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal / Cek Jadwal
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduleNoticeModal(null);
                  handleToggleSession(true, true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Tetap Buka Sesi Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer identitas pengembang */}
      <footer className="max-w-7xl mx-auto pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
        <span>Smart CBT Live Proctor Console • SMK Digital</span>
        <span className="hidden sm:inline text-slate-700">•</span>
        <span className="font-semibold text-slate-400">Created By Abdul Rahman</span>
      </footer>
    </div>
  );
}
