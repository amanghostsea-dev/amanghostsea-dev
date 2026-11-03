'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  MonitorPlay, 
  Clock, 
  Users, 
  Key, 
  CheckCircle2, 
  Award, 
  FileCheck2,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  Sparkles,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  ShieldAlert,
  Check,
  X,
  ChevronRight,
  FileText
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleState, ScheduleState } from '@/lib/cbt-schedule';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox, 
  CbtDigitalStamp 
} from '@/components/cbt/CbtOfficialPrintComponents';
import { KopSuratConfig } from '@/app/admin/settings/types';

export interface AttemptItem {
  id: string;
  score: number;
  status: string;
  totalQuestions?: number;
  totalCorrect?: number;
  tabSwitchCount?: number;
  startedAt?: Date | string;
  submittedAt?: Date | string | null;
}

export interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status: string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  _count: {
    questions: number;
  };
  attempts: AttemptItem[];
}

interface SiswaCbtClientProps {
  exams: ExamItem[];
  studentName: string;
  studentNis?: string;
  studentClass: string;
  initials: string;
  kopSuratConfig?: KopSuratConfig;
}

export default function SiswaCbtClient({
  exams,
  studentName,
  studentNis = '-',
  studentClass,
  initials,
  kopSuratConfig,
}: SiswaCbtClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Main navigation tab: 'exams' (Daftar & Jadwal Ujian) | 'reports' (Laporan & Transkrip Nilai Siswa)
  const [activeView, setActiveView] = useState<'exams' | 'reports'>('exams');

  const [filterTab, setFilterTab] = useState<'ALL' | 'ONGOING' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Report filter state
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'PASSED' | 'REMEDIAL'>('ALL');
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamItem | null>(null);
  const [isPrintTranscriptModalOpen, setIsPrintTranscriptModalOpen] = useState(false);

  // Sync active view with search parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'laporan' || tabParam === 'transkrip' || tabParam === 'nilai') {
      setActiveView('reports');
    } else if (tabParam === 'ujian' || !tabParam) {
      setActiveView('exams');
    }
  }, [searchParams]);

  // Update clock every 30 seconds for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleViewSwitch = (view: 'exams' | 'reports') => {
    setActiveView(view);
    if (view === 'reports') {
      router.replace('/portal/siswa/cbt?tab=laporan', { scroll: false });
    } else {
      router.replace('/portal/siswa/cbt', { scroll: false });
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const attempt = exam.attempts[0];
    const isSubmitted = attempt?.status === 'SUBMITTED';
    const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status, currentTime);

    if (!matchesSearch) return false;

    if (filterTab === 'COMPLETED') {
      return isSubmitted;
    }
    if (filterTab === 'ONGOING') {
      return !isSubmitted && (schedState.state === 'ONGOING' || exam.status === 'ACTIVE');
    }
    if (filterTab === 'UPCOMING') {
      return !isSubmitted && schedState.state === 'UPCOMING' && exam.status !== 'ACTIVE';
    }

    return true;
  });

  // Calculate statistics for exam schedule cards
  const ongoingCount = exams.filter((e) => {
    const att = e.attempts[0];
    const isSub = att?.status === 'SUBMITTED';
    const st = getExamScheduleState(e.startTime, e.endTime, e.status, currentTime);
    return !isSub && (st.state === 'ONGOING' || e.status === 'ACTIVE');
  }).length;

  const upcomingCount = exams.filter((e) => {
    const att = e.attempts[0];
    const isSub = att?.status === 'SUBMITTED';
    const st = getExamScheduleState(e.startTime, e.endTime, e.status, currentTime);
    return !isSub && st.state === 'UPCOMING' && e.status !== 'ACTIVE';
  }).length;

  const completedCount = exams.filter((e) => e.attempts[0]?.status === 'SUBMITTED').length;

  // Completed exam attempts for the student's report card
  const completedExamsList = useMemo(() => {
    return exams.filter((exam) => {
      const att = exam.attempts[0];
      return att && att.status === 'SUBMITTED';
    });
  }, [exams]);

  // Compute student CBT GPA and Metrics
  const reportMetrics = useMemo(() => {
    if (completedExamsList.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        passedCount: 0,
        remedialCount: 0,
        accuracyAvg: 0,
        gradeLetter: 'N/A',
      };
    }

    const total = completedExamsList.length;
    let scoreSum = 0;
    let passed = 0;
    let totalQuestionsSum = 0;
    let totalCorrectSum = 0;

    completedExamsList.forEach((e) => {
      const att = e.attempts[0];
      const sc = att?.score || 0;
      scoreSum += sc;
      if (sc >= 75) passed += 1;

      const qCount = att?.totalQuestions || e._count.questions || 0;
      const cCount = att?.totalCorrect || 0;
      totalQuestionsSum += qCount;
      totalCorrectSum += cCount;
    });

    const avgScore = Math.round((scoreSum / total) * 10) / 10;
    const accuracyAvg = totalQuestionsSum > 0 
      ? Math.round((totalCorrectSum / totalQuestionsSum) * 100) 
      : Math.round(avgScore);

    let gradeLetter = 'C';
    if (avgScore >= 90) gradeLetter = 'A';
    else if (avgScore >= 80) gradeLetter = 'B';
    else if (avgScore >= 75) gradeLetter = 'C+';
    else if (avgScore >= 60) gradeLetter = 'C';
    else gradeLetter = 'D';

    return {
      total,
      avgScore,
      passedCount: passed,
      remedialCount: total - passed,
      accuracyAvg,
      gradeLetter,
    };
  }, [completedExamsList]);

  // Filtered list for student report view
  const filteredReportExams = useMemo(() => {
    return completedExamsList.filter((exam) => {
      const att = exam.attempts[0];
      const matchesSearch =
        exam.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
        exam.subject.toLowerCase().includes(reportSearch.toLowerCase());

      if (!matchesSearch) return false;

      const score = att?.score || 0;
      if (reportStatusFilter === 'PASSED' && score < 75) return false;
      if (reportStatusFilter === 'REMEDIAL' && score >= 75) return false;

      return true;
    });
  }, [completedExamsList, reportSearch, reportStatusFilter]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Navigation & Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/portal/siswa"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Portal Siswa
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25">
                <MonitorPlay size={24} />
              </span>
              Portal CBT & Nilai Evaluasi Siswa
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Jadwal pelaksanaan ujian dan rekapitulasi nilai resmi untuk <strong className="text-purple-600 dark:text-purple-400">{studentName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-extrabold flex items-center justify-center text-sm shadow-sm">
              {initials}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</div>
              <div className="text-[10px] text-slate-500 font-medium">NISN: {studentNis} • Kelas: {studentClass}</div>
            </div>
          </div>
        </div>

        {/* 🌟 MAIN VIEW TABS: 'Daftar Ujian' vs 'Transkrip & Laporan Nilai CBT' */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewSwitch('exams')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'exams'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <MonitorPlay size={16} /> Ruang & Jadwal Ujian ({exams.length})
            </button>

            <button
              type="button"
              onClick={() => handleViewSwitch('reports')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'reports'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet size={16} /> Transkrip & Laporan Nilai CBT Saya ({completedCount})
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Clock size={13} className="text-purple-500" />
            <span>Waktu Server: {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: RUANG & JADWAL UJIAN SISWA                                       */}
        {/* ========================================================================= */}
        {activeView === 'exams' && (
          <div className="space-y-6">
            {/* 📅 Fast Schedule Status Overview Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setFilterTab('ONGOING')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  filterTab === 'ONGOING'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Ujian Sedang Berlangsung
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{ongoingCount}</span>
                </div>
                <p className="text-[11px] text-slate-500">Sesi ujian aktif & dapat dikerjakan sekarang</p>
              </button>

              <button
                onClick={() => setFilterTab('UPCOMING')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  filterTab === 'UPCOMING'
                    ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <Calendar size={14} />
                    Jadwal Ujian Mendatang
                  </span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400">{upcomingCount}</span>
                </div>
                <p className="text-[11px] text-slate-500">Siapkan diri Anda sebelum jam mulai tiba</p>
              </button>

              <button
                onClick={() => handleViewSwitch('reports')}
                className={`p-4 rounded-2xl border text-left transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 group`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Ujian Telah Selesai
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">{completedCount}</span>
                </div>
                <p className="text-[11px] text-slate-500 group-hover:text-blue-600 flex items-center gap-1">
                  Buka Laporan Transkrip Nilai Lengkap <ChevronRight size={12} />
                </p>
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
                {[
                  { id: 'ALL', label: 'Semua Ujian' },
                  { id: 'ONGOING', label: `🟢 Berlangsung (${ongoingCount})` },
                  { id: 'UPCOMING', label: `⏳ Mendatang (${upcomingCount})` },
                  { id: 'COMPLETED', label: `✅ Selesai (${completedCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      filterTab === tab.id
                        ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari mata pelajaran atau ujian..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
            </div>

            {/* Exams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <MonitorPlay className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {filterTab === 'ONGOING'
                      ? 'Tidak ada ujian yang sedang berlangsung saat ini.'
                      : filterTab === 'UPCOMING'
                      ? 'Tidak ada jadwal ujian mendatang untuk kelas Anda.'
                      : filterTab === 'COMPLETED'
                      ? 'Anda belum menyelesaikan paket ujian apapun.'
                      : 'Belum ada paket ujian yang ditemukan.'}
                  </p>
                  {filterTab !== 'ALL' && (
                    <button
                      onClick={() => setFilterTab('ALL')}
                      className="mt-3 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Tampilkan Semua Ujian
                    </button>
                  )}
                </div>
              ) : (
                filteredExams.map((exam) => {
                  const attempt = exam.attempts[0];
                  const isSubmitted = attempt?.status === 'SUBMITTED';
                  const isInProgress = attempt?.status === 'IN_PROGRESS';
                  const isLiveTeacher = exam.status === 'ACTIVE';

                  const schedState = getExamScheduleState(
                    exam.startTime,
                    exam.endTime,
                    exam.status,
                    currentTime
                  );

                  // Determine if student is allowed to enter right now
                  const isUnlocked = isSubmitted || isInProgress || isLiveTeacher || schedState.isAccessible;

                  return (
                    <div
                      key={exam.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-6">
                        {/* Top Subject & Dynamic Status Pill */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                            {exam.subject}
                          </span>

                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 size={12} /> Selesai
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse">
                              Sedang Mengerjakan
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${schedState.badgeClass}`}>
                              {schedState.state === 'ONGOING' || isLiveTeacher ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Sesi Aktif
                                </>
                              ) : schedState.state === 'UPCOMING' ? (
                                <>
                                  <Clock size={11} />
                                  Terjadwal
                                </>
                              ) : (
                                schedState.label
                              )}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors">
                          {exam.title}
                        </h3>

                        {/* 📅 EXAM TIMETABLE BADGE */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 mb-4 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <Calendar size={13} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                              <span className="line-clamp-1">{formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-200/60 dark:border-slate-700/50">
                            <span>Status Waktu:</span>
                            <span className={`font-semibold ${
                              schedState.state === 'ONGOING' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : schedState.state === 'UPCOMING'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}>
                              {schedState.countdown}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                          {exam.description || 'Petunjuk ujian belum dicantumkan.'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-purple-500" />
                            <span>{exam.duration} Menit</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileCheck2 size={14} className="text-emerald-500" />
                            <span>{exam._count.questions} Butir Soal</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-blue-500" />
                            <span>{exam.classTarget}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Key size={14} className="text-amber-500" />
                            <span>{exam.token ? 'Butuh Token' : 'Tanpa Token'}</span>
                          </div>
                        </div>

                        {isSubmitted && (
                          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between mb-4">
                            <div>
                              <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 block">
                                Skor Ujian Anda:
                              </span>
                              <span className={`text-[10px] font-bold ${attempt.score >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {attempt.score >= 75 ? '✓ TUNTAS KKM' : '✕ PERLU REMEDIAL'}
                              </span>
                            </div>
                            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                              {attempt.score} / 100
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action CTA with Smart Time-Locking */}
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                        {isSubmitted ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/portal/siswa/cbt/${exam.id}`}
                              className="block text-center py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors shadow-sm"
                            >
                              Rincian Ujian
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExamForModal(exam);
                              }}
                              className="text-center py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                            >
                              <FileText size={13} /> Kartu Nilai
                            </button>
                          </div>
                        ) : schedState.state === 'ENDED' && !isInProgress && !isLiveTeacher ? (
                          <div className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <AlertCircle size={14} /> Waktu Ujian Telah Berakhir
                          </div>
                        ) : !isUnlocked ? (
                          <div className="space-y-1.5">
                            <button
                              disabled
                              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                            >
                              <Lock size={13} /> Ujian Belum Dimulai
                            </button>
                            <div className="text-[10px] text-center text-slate-400 font-medium">
                              {schedState.countdown}
                            </div>
                          </div>
                        ) : (
                          <Link
                            href={`/portal/siswa/cbt/${exam.id}`}
                            className={`w-full block text-center py-2.5 px-4 rounded-xl font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                              isLiveTeacher || schedState.state === 'ONGOING'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25'
                            }`}
                          >
                            {isInProgress
                              ? 'Lanjutkan Pengerjaan Ujian →'
                              : isLiveTeacher || schedState.state === 'ONGOING'
                              ? 'Masuk Ujian Sekarang →'
                              : 'Masuk Ruang Tunggu Standby →'}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TRANSKRIP & LAPORAN NILAI CBT SISWA                              */}
        {/* ========================================================================= */}
        {activeView === 'reports' && (
          <div className="space-y-6">
            {/* Student CBT KPI Analytics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Total Ujian Diikuti</span>
                  <Award size={18} className="text-purple-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {reportMetrics.total} <span className="text-xs font-medium text-slate-400">Paket</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Evaluasi resmi terselesaikan</p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Rata-rata Nilai CBT</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700">
                    Grade {reportMetrics.gradeLetter}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                  {reportMetrics.avgScore} <span className="text-xs font-medium text-slate-400">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Standar KKM Sekolah: 75</p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Status KKM</span>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {reportMetrics.passedCount} <span className="text-xs font-bold text-slate-500">Tuntas</span>
                </div>
                <p className="text-[11px] text-rose-500 mt-1">
                  {reportMetrics.remedialCount > 0 ? `${reportMetrics.remedialCount} paket perlu remedial` : 'Semua tuntas!'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Rata-rata Akurasi</span>
                  <GraduationCap size={18} className="text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                  {reportMetrics.accuracyAvg}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Persentase jawaban tepat</p>
              </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Cari mata pelajaran / ujian..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setReportStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      reportStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua ({completedExamsList.length})
                  </button>
                  <button
                    onClick={() => setReportStatusFilter('PASSED')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      reportStatusFilter === 'PASSED'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tuntas ({reportMetrics.passedCount})
                  </button>
                  <button
                    onClick={() => setReportStatusFilter('REMEDIAL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      reportStatusFilter === 'REMEDIAL'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Remedial ({reportMetrics.remedialCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsPrintTranscriptModalOpen(true)}
                  disabled={completedExamsList.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={15} /> Cetak Transkrip Nilai CBT Resmi
                </button>
              </div>
            </div>

            {/* Student Exam Results Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Histori Nilai & Lembar Evaluasi CBT
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nilai berikut telah dihitung otomatis oleh sistem dan disinkronkan ke buku nilai raport.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {filteredReportExams.length} Catatan Nilai
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Mata Pelajaran & Paket Ujian</th>
                      <th className="py-3.5 px-4">Waktu Selesai</th>
                      <th className="py-3.5 px-4 text-center">Soal & Benar</th>
                      <th className="py-3.5 px-4 text-center">Skor CBT</th>
                      <th className="py-3.5 px-4 text-center">Status KKM</th>
                      <th className="py-3.5 px-4 text-center">Integritas</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredReportExams.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center text-slate-400">
                          <FileCheck2 size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="font-medium">Belum ada rekaman nilai ujian yang selesai.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Ikuti dan selesaikan ujian Anda di tab "Ruang & Jadwal Ujian".
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredReportExams.map((exam, idx) => {
                        const att = exam.attempts[0];
                        const score = att?.score || 0;
                        const isPassed = score >= 75;
                        const submittedDate = att?.submittedAt ? new Date(att.submittedAt) : null;
                        const dateFormatted = submittedDate 
                          ? submittedDate.toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-';

                        const totalQ = att?.totalQuestions || exam._count.questions || 0;
                        const correctQ = att?.totalCorrect !== undefined ? att.totalCorrect : Math.round((score / 100) * totalQ);

                        return (
                          <tr key={exam.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                {exam.title}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-semibold text-purple-600 dark:text-purple-400">{exam.subject}</span>
                                <span>•</span>
                                <span>Target: {exam.classTarget}</span>
                                <span>•</span>
                                <span>Durasi: {exam.duration}m</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              <span className="font-medium text-slate-800 dark:text-slate-200 block">{dateFormatted} WIB</span>
                              <span className="text-[10px] text-slate-400">Telah diverifikasi</span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {correctQ} <span className="text-slate-400 font-normal">/ {totalQ}</span>
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {totalQ > 0 ? `${Math.round((correctQ / totalQ) * 100)}% tepat` : '-'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-xl text-base font-black ${
                                isPassed 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}>
                                {score}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {isPassed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check size={11} /> Tuntas
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Remedial
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {(att?.tabSwitchCount || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800" title={`Peringatan: Berpindah tab ${att?.tabSwitchCount} kali`}>
                                  <ShieldAlert size={12} /> {att?.tabSwitchCount}x Tab
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <Check size={12} /> Tertib
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/portal/siswa/cbt/${exam.id}`}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors"
                                  title="Lihat Soal & Pembahasan"
                                >
                                  Soal
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setSelectedExamForModal(exam)}
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Cetak Lembar Nilai Ujian Ini"
                                >
                                  <Printer size={12} /> Cetak
                                </button>
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
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INDIVIDUAL EXAM RESULT CARD MODAL                                 */}
      {/* ========================================================================= */}
      {selectedExamForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-2">
                <Award className="text-purple-600" size={20} />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Surat Keterangan Hasil Evaluasi Belajar CBT Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExamForModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="printable-single-cbt-card" className="space-y-4 bg-white text-black">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="SURAT KETERANGAN HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / SKH-CBT / ${new Date().getFullYear()} / ${studentNis}`}
                  subTitle="Sistem Evaluasi Berbasis Komputer & Verifikasi Akademik Resmi"
                />

                {/* 👤 IDENTITAS RESMI SISWA */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Nama Lengkap</span>
                    <span className="font-bold text-black">: {studentName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Kelas / Rombel</span>
                    <span className="font-bold text-black">: {studentClass}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">NISN / Nomor Induk</span>
                    <span className="font-mono font-bold text-black">: {studentNis}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Waktu Evaluasi</span>
                    <span>: {selectedExamForModal.attempts[0]?.submittedAt 
                      ? new Date(selectedExamForModal.attempts[0].submittedAt).toLocaleString('id-ID') 
                      : '-'}</span>
                  </div>
                </div>

                {/* 📚 RINCIAN PAKET UJIAN */}
                <div className="p-3 border border-black bg-purple-50/30 print-avoid-break space-y-1">
                  <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                    Mata Pelajaran: {selectedExamForModal.subject}
                  </div>
                  <div className="text-base font-black text-black">
                    {selectedExamForModal.title}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700 pt-0.5">
                    <span>Target: <strong>{selectedExamForModal.classTarget}</strong></span>
                    <span>•</span>
                    <span>KKM: <strong>75.00</strong></span>
                    <span>•</span>
                    <span>Total Soal: <strong>{selectedExamForModal._count.questions} Butir</strong></span>
                    <span>•</span>
                    <span>Durasi: <strong>{selectedExamForModal.duration} Menit</strong></span>
                  </div>
                </div>

                {/* 🎯 KOTAK NILAI RESMI KEDINASAN */}
                <div className="border-2 border-black p-4 bg-slate-50 flex items-center justify-between print-avoid-break">
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block uppercase">
                      Nilai Perolehan Ujian CBT:
                    </span>
                    <div className="text-4xl font-black text-black">
                      {Math.round(selectedExamForModal.attempts[0]?.score || 0)} <span className="text-xs font-normal text-slate-500">/ 100</span>
                    </div>
                    <span className="text-[10px] text-slate-500 italic block mt-0.5">
                      Status Evaluasi: {(selectedExamForModal.attempts[0]?.score || 0) >= 75 ? 'Tuntas Sesuai Kriteria Ketuntasan Minimal' : 'Belum Memenuhi Standar KKM'}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Status Kriteria Ketuntasan:</span>
                    {(selectedExamForModal.attempts[0]?.score || 0) >= 75 ? (
                      <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black border border-black uppercase tracking-wider">
                        ✓ LULUS / TUNTAS
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-white text-black text-xs font-black border-2 border-black uppercase tracking-wider">
                        WAJIB REMEDIAL
                      </span>
                    )}
                    <div className="text-[10px] text-slate-700">
                      Benar: <strong>{selectedExamForModal.attempts[0]?.totalCorrect || 0}</strong> dari {selectedExamForModal.attempts[0]?.totalQuestions || selectedExamForModal._count.questions} Soal
                    </div>
                  </div>
                </div>

                {/* 🛡️ KEABSAHAN & TANDA TANGAN */}
                <CbtSecurityValidationBox
                  examTitle={selectedExamForModal.title}
                />

                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={`Wali Kelas ${studentClass}`}
                  subjectName={selectedExamForModal.subject}
                  classNameTarget={studentClass}
                  mode="two-column"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedExamForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/25"
              >
                <Printer size={14} /> Cetak Kartu Lembar Nilai (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL OFFICIAL TRANSCRIPT REPORT MODAL (ALL CBT EXAMS)             */}
      {/* ========================================================================= */}
      {isPrintTranscriptModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={20} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Pratinjau Transkrip Nilai CBT Resmi Siswa
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Format transkrip resmi akademik SMK TI GAMA 1 BEKASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintTranscriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="printable-cbt-student-report" className="space-y-4 bg-white text-black">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="TRANSKRIP RESMI HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / CBT-TRANSKRIP / ${new Date().getFullYear()} / ${studentNis}`}
                  subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
                />

                {/* 👤 DATA SISWA LENGKAP */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Nama Lengkap Siswa</span>
                    <span className="font-bold text-black">: {studentName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Kelas / Rombel</span>
                    <span className="font-bold text-black">: {studentClass}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Nomor Induk (NISN)</span>
                    <span className="font-mono font-bold text-black">: {studentNis}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Tahun Pelajaran</span>
                    <span>: 2025/2026 (Semester Ganjil)</span>
                  </div>
                </div>

                {/* 📊 TABEL NILAI RESMI KEDINASAN */}
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black font-bold text-black text-center tracking-tight">
                      <th className="py-2.5 px-2 border-r border-black w-10">No</th>
                      <th className="py-2.5 px-3 border-r border-black text-left">Mata Pelajaran & Paket Ujian</th>
                      <th className="py-2.5 px-2 border-r border-black w-16">KKM</th>
                      <th className="py-2.5 px-2 border-r border-black w-20">Nilai CBT</th>
                      <th className="py-2.5 px-2 border-r border-black w-16">Predikat</th>
                      <th className="py-2.5 px-3">Status KKM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/40">
                    {completedExamsList.map((exam, idx) => {
                      const att = exam.attempts[0];
                      const score = att?.score || 0;
                      const isPassed = score >= 75;
                      let letter = 'C';
                      if (score >= 90) letter = 'A';
                      else if (score >= 80) letter = 'B';
                      else if (score >= 75) letter = 'C+';
                      else if (score >= 60) letter = 'C';
                      else letter = 'D';

                      return (
                        <tr key={exam.id} className="text-center print-avoid-break">
                          <td className="py-2 px-2 border-r border-black font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-black text-left">
                            <span className="font-bold text-black block">{exam.subject}</span>
                            <span className="text-[10px] text-slate-600">{exam.title}</span>
                          </td>
                          <td className="py-2 px-2 border-r border-black font-semibold">75.00</td>
                          <td className="py-2 px-2 border-r border-black font-black text-black text-sm">{Math.round(score)}</td>
                          <td className="py-2 px-2 border-r border-black font-bold">{letter}</td>
                          <td className="py-2 px-3 font-bold text-xs">
                            {isPassed ? (
                              <span className="text-emerald-800">TUNTAS</span>
                            ) : (
                              <span className="text-rose-800">REMEDIAL</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-black border-t-2 border-black">
                      <td colSpan={3} className="py-2.5 px-3 text-right border-r border-black">
                        Rata-Rata Nilai CBT:
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm font-black border-r border-black text-purple-900">
                        {reportMetrics.avgScore}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-black">
                        Grade {reportMetrics.gradeLetter}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs">
                        {reportMetrics.remedialCount === 0 ? 'LULUS SELURUH MATA PELAJARAN' : `${reportMetrics.passedCount} Tuntas / ${reportMetrics.remedialCount} Remedial`}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* 🔒 KEABSAHAN SISTEM CBT */}
                <CbtSecurityValidationBox
                  examTitle="Transkrip Evaluasi CBT Siswa"
                />

                {/* 🖋️ TANDA TANGAN RESMI */}
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={`Wali Kelas ${studentClass}`}
                  classNameTarget={studentClass}
                  mode="two-column"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintTranscriptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/25"
              >
                <Printer size={14} /> Cetak Transkrip Resmi Sekarang (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Styles for Clean Paper Rendering */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-cbt-student-report, #printable-cbt-student-report *,
          #printable-single-cbt-card, #printable-single-cbt-card * {
            visibility: visible !important;
          }
          #printable-cbt-student-report, #printable-single-cbt-card {
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
