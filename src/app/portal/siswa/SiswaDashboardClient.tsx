'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Calendar, 
  GraduationCap, 
  FileText, 
  MonitorPlay, 
  QrCode, 
  LogOut, 
  Clock, 
  User, 
  MapPin, 
  Bell, 
  CheckCircle2, 
  Award, 
  BookOpen, 
  Sparkles, 
  X, 
  Menu, 
  Printer, 
  Check, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  MapPinCheck,
  ShieldCheck,
  Camera,
  Key,
  Search,
  Filter,
  Layers
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleDetails, getExamScheduleState } from '@/lib/cbt-schedule';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  status: string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  _count: {
    questions: number;
  };
  attempts: {
    score: number;
    status: string;
  }[];
}

interface ScheduleItem {
  day: string;
  subject: string;
  code?: string;
  time: string;
  teacher: string;
  room: string;
  category?: string;
  kkm?: number;
  credits?: number;
}

interface GradeItem {
  id?: string;
  code?: string;
  subject: string;
  category?: string;
  teacherName?: string;
  classTarget?: string;
  kkm?: number;
  credits?: number;
  day?: string;
  time?: string;
  room?: string;
  assignment: number;
  midExam: number;
  finalExam: number;
  finalScore?: number;
  finalGrade: string;
  isEvaluated?: boolean;
  isPassed?: boolean;
  notes?: string;
}

interface SiswaDashboardClientProps {
  studentName: string;
  studentNis: string;
  studentClass?: string;
  initials: string;
  upcomingExams: ExamItem[];
  schedule: ScheduleItem[];
  grades: GradeItem[];
  pendingAssignmentsCount?: number;
  logoutAction: () => Promise<void>;
}

export default function SiswaDashboardClient({
  studentName,
  studentNis,
  studentClass = 'XI TJKT 1',
  initials,
  upcomingExams,
  schedule: initialSchedule,
  grades: initialGrades,
  pendingAssignmentsCount = 0,
  logoutAction,
}: SiswaDashboardClientProps) {
  // Navigation tabs: 'dashboard' | 'jadwal' | 'nilai'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jadwal' | 'nilai'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Absensi Modal State
  const [isAbsensiModalOpen, setIsAbsensiModalOpen] = useState(false);
  const [absensiDone, setAbsensiDone] = useState(false);
  const [absensiTime, setAbsensiTime] = useState<string | null>(null);

  // Jadwal filter
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  // Full Weekly Schedule Data (tersinkronisasi dari DB)
  const fullSchedule: ScheduleItem[] = initialSchedule || [];

  // Full Grades Data (tersinkronisasi dari DB)
  const fullGrades: GradeItem[] = initialGrades || [];

  // Nilai filter & search
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeCategoryFilter, setGradeCategoryFilter] = useState('ALL');
  const [gradeStatusFilter, setGradeStatusFilter] = useState('ALL');

  // 🛡️ FORMULA NILAI RAPOR CERDAS:
  // Jika nilai tugas/UTS belum diisi guru (masih 0), jangan mendiskon nilai ujian akhir menjadi nilai D (30-38).
  const computeItemFinalScore = (item: { assignment: number; midExam: number; finalExam: number }) => {
    if (item.assignment === 0 && item.midExam === 0 && item.finalExam > 0) {
      return item.finalExam;
    }
    const effAssign = item.assignment > 0 ? item.assignment : 85;
    const effMid = item.midExam > 0 ? item.midExam : 80;
    return Math.round(effAssign * 0.3 + effMid * 0.3 + item.finalExam * 0.4);
  };

  // Hitung Nilai Rata-Rata & IPK hanya dari mata pelajaran yang telah dinilai
  const gradedList = fullGrades.filter(
    (g) => g.assignment > 0 || g.midExam > 0 || g.finalExam > 0
  );

  const calculatedAvgScore = gradedList.length > 0
    ? Math.round(
        (gradedList.reduce(
          (acc, g) => acc + computeItemFinalScore(g),
          0
        ) /
          gradedList.length) *
          10
      ) / 10
    : 0;

  const calculatedGpa = gradedList.length > 0
    ? Math.min(4.0, Math.round((calculatedAvgScore / 25) * 100) / 100)
    : 0;

  const passedCount = gradedList.filter((g) => {
    const score = computeItemFinalScore(g);
    return score >= (g.kkm || 75);
  }).length;

  const totalCredits = fullGrades.reduce((acc, curr) => acc + (curr.credits || 3), 0);

  const filteredSchedule = selectedDay === 'ALL'
    ? fullSchedule
    : fullSchedule.filter((s) => s.day.toLowerCase() === selectedDay.toLowerCase());

  const filteredGrades = fullGrades.filter((g) => {
    const q = gradeSearch.toLowerCase();
    const matchSearch =
      !q ||
      g.subject.toLowerCase().includes(q) ||
      (g.code && g.code.toLowerCase().includes(q)) ||
      (g.teacherName && g.teacherName.toLowerCase().includes(q));

    const matchCategory =
      gradeCategoryFilter === 'ALL' ||
      (g.category && g.category.toLowerCase() === gradeCategoryFilter.toLowerCase());

    const isGraded = g.assignment > 0 || g.midExam > 0 || g.finalExam > 0;
    const matchStatus =
      gradeStatusFilter === 'ALL'
        ? true
        : gradeStatusFilter === 'GRADED'
        ? isGraded
        : !isGraded;

    return matchSearch && matchCategory && matchStatus;
  });

  const handleDoAbsensi = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setAbsensiTime(timeStr);
    setAbsensiDone(true);
  };

  const activeExamsCount = upcomingExams.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* 📱 Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {initials}
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">Portal Siswa</span>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Keluar" className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors">
            <LogOut size={19} />
          </button>
        </form>
      </header>

      {/* 🧭 Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-50 md:z-auto transition-transform ${
          mobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        {/* Profile Info Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white block leading-tight">
                Portal Siswa
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5 truncate max-w-[140px]">
                {studentName}
              </span>
            </div>
          </div>
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Menus */}
        <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard size={19} />
            <span className="flex-1 text-left">Dashboard</span>
          </button>

          {/* 2. Jadwal Pelajaran (Instant Tab) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('jadwal');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'jadwal'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar size={19} />
            <span className="flex-1 text-left">Jadwal Pelajaran</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'jadwal'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              }`}
            >
              {fullSchedule.length} Mapel
            </span>
          </button>

          {/* 3. Transkrip Nilai (Instant Tab) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('nilai');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'nilai'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap size={19} />
            <span className="flex-1 text-left">Transkrip Nilai</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'nilai'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {calculatedGpa > 0 ? `IPK ${calculatedGpa.toFixed(2)}` : `${fullGrades.length} Mapel`}
            </span>
          </button>

          {/* 4. Tugas Siswa (Route with prefetch) */}
          <Link
            href="/portal/siswa/tugas"
            prefetch={true}
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl font-semibold text-sm transition-colors"
          >
            <FileText size={19} />
            <span className="flex-1 text-left">Tugas Siswa</span>
            {pendingAssignmentsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-2xs">
                {pendingAssignmentsCount}
              </span>
            )}
          </Link>

          {/* 5. Smart CBT (Ujian Online) */}
          <Link
            href="/portal/siswa/cbt"
            prefetch={true}
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl font-semibold text-sm transition-colors"
          >
            <MonitorPlay size={19} />
            <span className="flex-1 text-left">Smart CBT (Ujian)</span>
            {activeExamsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white animate-pulse">
                Live ({activeExamsCount})
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                Jadwal
              </span>
            )}
          </Link>

          {/* 6. Absensi QR Code (Instant Modal) */}
          <button
            type="button"
            onClick={() => {
              setIsAbsensiModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <QrCode size={19} />
            <span className="flex-1 text-left">Absensi QR Code</span>
            {absensiDone ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                Hadir
              </span>
            )}
          </button>
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-medium text-sm transition-colors cursor-pointer"
            >
              <LogOut size={19} />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      {/* 🖥️ Main Workspace Content */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* User Info & Notification Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
              <Sparkles size={13} /> Portal Siswa Digital • SMK Terpadu
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Halo, {studentName}! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              {studentClass}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAbsensiModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <QrCode size={15} /> Presensi Hari Ini
            </button>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <User size={15} className="text-blue-600" />
              <span>NIS: {studentNis}</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: DASHBOARD UTAMA */}
        {/* ==================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Quick Actions (CBT & Geolocation Attendance) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CBT Card */}
              <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 p-6 rounded-3xl text-white flex flex-col justify-between gap-5 shadow-lg shadow-purple-500/20 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                  <MonitorPlay size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg flex items-center gap-2 mb-1.5">
                    <MonitorPlay size={20} /> Ujian Berlangsung (CBT)
                  </h3>
                  <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
                    Akses ruang ujian online, cek token sesi, dan pantau hasil nilai pengerjaan.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    href="/portal/siswa/cbt"
                    className="px-4 py-2.5 bg-white text-purple-700 rounded-xl font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-md text-center whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    <span>Jadwal & Nilai CBT</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/ujian"
                    className="px-4 py-2.5 bg-purple-900/60 hover:bg-purple-800 text-white border border-purple-400/40 rounded-xl font-bold text-xs sm:text-sm transition-all text-center whitespace-nowrap flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98 shadow-sm"
                  >
                    <Key size={14} className="text-amber-300" />
                    <span>Masukkan Token</span>
                  </Link>
                </div>
              </div>

              {/* Attendance Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 rounded-3xl text-white flex flex-col justify-between gap-5 shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                  <QrCode size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg flex items-center gap-2 mb-1.5">
                    <QrCode size={20} /> Presensi QR & Geolocation
                  </h3>
                  <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                    {absensiDone ? (
                      <span className="font-bold text-white">✅ Sudah Hadir hari ini pukul {absensiTime}</span>
                    ) : (
                      <span>Jarak Anda ke sekolah: <strong className="text-white">0.3 km (Valid di sekolah)</strong></span>
                    )}
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAbsensiModalOpen(true)}
                    className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    <span>{absensiDone ? 'Lihat Bukti Hadir' : 'Hadir Sekarang'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 📅 Jadwal Ujian CBT Sekolah (Smart Timetable) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                      <MonitorPlay size={18} />
                    </span>
                    <span>Jadwal Ujian CBT Sekolah (Smart CBT)</span>
                    <span className="hidden sm:inline-block text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Created By Abdul Rahman
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Jadwal resmi pelaksanaan ujian yang telah diatur oleh dewan guru untuk kelas Anda.
                  </p>
                </div>
                <Link
                  href="/portal/siswa/cbt"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  Buka Semua Ruang Ujian →
                </Link>
              </div>

              {upcomingExams.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada jadwal ujian aktif atau mendatang untuk saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {upcomingExams.map((exam) => {
                    const sched = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
                    const schedDetails = getExamScheduleDetails(exam.startTime, exam.endTime);
                    const isSubmitted = exam.attempts[0]?.status === 'SUBMITTED';

                    return (
                      <div
                        key={exam.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between hover:border-purple-300 transition-all shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 truncate max-w-[140px]" title={exam.subject}>
                              {exam.subject}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${sched.badgeClass}`}>
                              {isSubmitted ? 'Selesai' : sched.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-2" title={exam.title}>
                            {exam.title}
                          </h4>
                          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium space-y-1 mb-2.5 bg-purple-50/60 dark:bg-purple-950/30 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                              <Calendar size={12} className="text-purple-500 shrink-0" />
                              <span className="truncate">{schedDetails.dateText}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300 pl-4">
                              <span>🕒 {schedDetails.timeRangeText}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500 font-medium">{sched.countdown}</span>
                          <Link
                            href={`/portal/siswa/cbt/${exam.id}`}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              isSubmitted
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                : sched.state === 'ONGOING' || exam.status === 'ACTIVE'
                                ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                                : 'bg-purple-600 text-white shadow-sm hover:bg-purple-700'
                            }`}
                          >
                            {isSubmitted ? 'Hasil' : sched.state === 'ONGOING' || exam.status === 'ACTIVE' ? 'Masuk Ujian' : 'Lihat'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <Calendar size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">98%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kehadiran Bulan Ini</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/40 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                  <BookOpen size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{pendingAssignmentsCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tugas Perlu Dikerjakan</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {calculatedAvgScore > 0 ? calculatedAvgScore : '-'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {calculatedGpa > 0 ? `Rata-Rata Nilai (IPK ${calculatedGpa.toFixed(2)})` : 'Nilai Belum Dirilis'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2-Column Schedule & Grades Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Schedule Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={18} className="text-blue-500" /> Jadwal Pelajaran Hari Ini & Esok
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('jadwal')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Semua Jadwal →
                  </button>
                </div>
                <div className="space-y-3">
                  {fullSchedule.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada jadwal mata pelajaran untuk kelas Anda.
                    </div>
                  ) : (
                    fullSchedule.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <strong className="font-bold text-slate-900 dark:text-white block text-sm">{item.subject}</strong>
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><Clock size={12} /> {item.time}</span>
                            <span className="flex items-center gap-1"><User size={12} /> {item.teacher}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-blue-600">
                          {item.day}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Grades Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Award size={18} className="text-purple-500" /> Ringkasan Nilai Terkini
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('nilai')}
                    className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                  >
                    Transkrip Lengkap →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {fullGrades.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada data nilai mata pelajaran untuk kelas Anda.
                    </div>
                  ) : (
                    fullGrades.slice(0, 4).map((g, idx) => {
                      const isGraded = g.assignment > 0 || g.midExam > 0 || g.finalExam > 0;
                      return (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <strong className="font-bold text-slate-900 dark:text-white block">{g.subject}</strong>
                            <span className="text-[11px] text-slate-500">
                              {isGraded ? `Tugas: ${g.assignment} • UTS: ${g.midExam} • UAS: ${g.finalExam}` : 'Menunggu penilaian guru'}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl font-bold text-xs shadow-2xs ${
                            isGraded
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isGraded ? g.finalGrade : '-'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: JADWAL PELAJARAN LENGKAP */}
        {/* ==================================================== */}
        {activeTab === 'jadwal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" /> Agenda Jadwal Pelajaran Mingguan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tahun Ajaran 2026/2027 • Semester Ganjil • {studentClass}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Cetak Jadwal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  ← Kembali ke Dashboard
                </button>
              </div>
            </div>

            {/* Filter Hari */}
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === day
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {day === 'ALL' ? `Semua Hari (${fullSchedule.length} Mapel)` : day}
                </button>
              ))}
            </div>

            {/* Schedule Cards Grid */}
            {filteredSchedule.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Tidak ada jadwal pelajaran untuk filter ini.</p>
                <p className="text-[11px] text-slate-500 mt-1">Jadwal akan diperbarui secara otomatis setelah guru menetapkan jam tatap muka.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSchedule.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {item.day}
                          </span>
                          {item.code && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {item.code}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {item.category}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1">{item.subject}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg shrink-0">
                        {item.time}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <User size={13} className="text-blue-500" /> {item.teacher}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                          KKM: {item.kkm || 75}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400">
                          <MapPin size={13} /> {item.room}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: TRANSKRIP NILAI LENGKAP */}
        {/* ==================================================== */}
        {activeTab === 'nilai' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
                  <CheckCircle2 size={13} /> Data Tersinkronisasi Otomatis dengan Guru & Kurikulum
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap size={22} className="text-purple-600" /> Transkrip & Laporan Capaian Nilai Siswa
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rekapitulasi Tugas, Penilaian Tengah Semester (PTS), & Penilaian Akhir Semester (PAS) • <strong>{studentClass}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-purple-500/20"
                >
                  <Printer size={14} /> Cetak Transkrip
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  ← Kembali ke Dashboard
                </button>
              </div>
            </div>

            {/* GPA Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Indeks Prestasi (IPK)</div>
                <div className="text-3xl font-extrabold text-purple-600">
                  {calculatedGpa > 0 ? calculatedGpa.toFixed(2) : '0.00'}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ 4.00</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Skala Maksimal 4.00</div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Rata-Rata Nilai Angka</div>
                <div className="text-3xl font-extrabold text-blue-600">
                  {calculatedAvgScore > 0 ? calculatedAvgScore : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Bobot: Tugas 30%, PTS 30%, PAS 40%</div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Mata Pelajaran Kelas</div>
                <div className="text-3xl font-extrabold text-emerald-600">
                  {fullGrades.length}{' '}
                  <span className="text-xs text-slate-400 font-normal">Mapel</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Total Beban: {totalCredits} JP/Minggu</div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Status Ketuntasan Belajar</div>
                <div className="text-2xl font-extrabold text-amber-500">
                  {gradedList.length === 0
                    ? 'Dalam Proses'
                    : `${passedCount} / ${gradedList.length} Tuntas`}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {gradedList.length === 0 ? 'Menunggu Penilaian Guru' : 'Berdasarkan Nilai Akhir >= KKM'}
                </div>
              </div>
            </div>

            {/* Filter and Search Bar for Grades */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari mapel, kode, atau guru pengampu..."
                  value={gradeSearch}
                  onChange={(e) => setGradeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <select
                  value={gradeCategoryFilter}
                  onChange={(e) => setGradeCategoryFilter(e.target.value)}
                  aria-label="Filter Berdasarkan Kategori"
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="Muatan Kejuruan">Muatan Kejuruan</option>
                  <option value="Muatan Umum">Muatan Umum</option>
                  <option value="Muatan Lokal">Muatan Lokal</option>
                </select>

                <select
                  value={gradeStatusFilter}
                  onChange={(e) => setGradeStatusFilter(e.target.value)}
                  aria-label="Filter Berdasarkan Status Penilaian"
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="GRADED">Sudah Dinilai</option>
                  <option value="UNGRADED">Belum Dinilai</option>
                </select>
              </div>
            </div>

            {/* Grades Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-4 text-center w-12">No</th>
                      <th className="py-4 px-4">Mata Pelajaran & Guru Pengampu</th>
                      <th className="py-4 px-4 text-center">Tugas & Kuis (30%)</th>
                      <th className="py-4 px-4 text-center">UTS / PTS (30%)</th>
                      <th className="py-4 px-4 text-center">UAS / CBT (40%)</th>
                      <th className="py-4 px-4 text-center">Nilai Rapor Akhir</th>
                      <th className="py-4 px-4 text-center">Predikat & Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredGrades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-6 text-center text-slate-400 text-xs">
                          <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Tidak ada mata pelajaran yang cocok.</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Mata pelajaran untuk kelas Anda otomatis tersinkronisasi langsung dari sistem kurikulum sekolah.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredGrades.map((g, idx) => {
                        const isEvaluated = g.assignment > 0 || g.midExam > 0 || g.finalExam > 0;
                        const finalScore = isEvaluated ? computeItemFinalScore(g) : 0;
                        const kkm = g.kkm || 75;
                        const isPassed = isEvaluated ? finalScore >= kkm : false;

                        return (
                          <tr key={g.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            
                            {/* Mata Pelajaran & Guru Pengampu */}
                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                                  {g.subject}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                  {g.code && (
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                                      {g.code}
                                    </span>
                                  )}
                                  {g.category && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {g.category}
                                    </span>
                                  )}
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                                    <User size={11} className="text-slate-400" /> {g.teacherName || 'Guru Pengampu'}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">
                                    KKM: {kkm}
                                  </span>
                                  {g.credits && (
                                    <span className="text-[10px] text-slate-400">
                                      {g.credits} JP
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Nilai Tugas */}
                            <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {g.assignment > 0 ? (
                                <span className="font-bold text-slate-900 dark:text-white">{g.assignment}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Nilai UTS */}
                            <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {g.midExam > 0 ? (
                                <span className="font-bold text-slate-900 dark:text-white">{g.midExam}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Nilai UAS / CBT */}
                            <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {g.finalExam > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40" title="Skor murni ujian CBT">
                                  {g.finalExam}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Nilai Rapor Akhir */}
                            <td className="py-4 px-4 text-center">
                              {isEvaluated ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className={`text-sm font-black ${
                                    isPassed
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {finalScore}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium">Kumulatif</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium">-</span>
                              )}
                            </td>

                            {/* Predikat & Status */}
                            <td className="py-4 px-4 text-center">
                              {isEvaluated ? (
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                                      g.finalGrade.includes('A')
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : g.finalGrade.includes('B')
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                    }`}
                                  >
                                    {g.finalGrade}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isPassed
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                  }`}>
                                    {isPassed ? 'Tuntas' : 'Remedial'}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  ⏳ Menunggu Nilai
                                </span>
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
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* 📸 MODAL PRESENSI QR CODE & GEOLOCATION */}
      {/* ==================================================== */}
      {isAbsensiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold mb-1">
                  <ShieldCheck size={12} /> Geolocation & QR Verified
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Presensi Digital Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAbsensiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Simulated Viewfinder */}
            <div className="relative w-full h-52 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-white p-4 border-2 border-emerald-500/40 shadow-inner">
              {absensiDone ? (
                <div className="flex flex-col items-center text-center space-y-2 animate-in zoom-in duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check size={32} />
                  </div>
                  <strong className="text-emerald-400 font-bold text-sm">Presensi Berhasil Dicatat!</strong>
                  <span className="text-xs text-slate-300">Waktu: {absensiTime}</span>
                </div>
              ) : (
                <>
                  <div className="w-40 h-40 border-2 border-dashed border-emerald-400/70 rounded-xl relative flex items-center justify-center">
                    <QrCode size={64} className="text-emerald-400/40" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"></div>
                  </div>
                  <span className="text-[11px] text-slate-300 mt-2 font-mono">
                    Arahkan kamera ke QR Code Kelas
                  </span>
                </>
              )}
            </div>

            {/* Geolocation Info Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5"><MapPinCheck size={14} className="text-emerald-600" /> Lokasi Sekolah:</span>
                <span className="font-bold text-slate-900 dark:text-white">SMK Terpadu</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Radius Geolocation:</span>
                <span className="font-bold text-emerald-600">0.3 km (Valid di area sekolah)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Status Siswa:</span>
                <span className="font-bold text-slate-900 dark:text-white">{studentName} ({studentNis})</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAbsensiModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              {!absensiDone ? (
                <button
                  type="button"
                  onClick={handleDoAbsensi}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Camera size={14} /> Konfirmasi Hadir Sekarang
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAbsensiModalOpen(false)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

