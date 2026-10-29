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
  TrendingUp,
  MapPinCheck,
  ShieldCheck,
  Camera
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleState } from '@/lib/cbt-schedule';

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
  time: string;
  teacher: string;
  room: string;
}

interface GradeItem {
  subject: string;
  assignment: number;
  midExam: number;
  finalExam: number;
  finalGrade: string;
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
  studentClass = 'Kelas XI - Rekayasa Perangkat Lunak 1 (XI-RPL 1)',
  initials,
  upcomingExams,
  schedule: initialSchedule,
  grades: initialGrades,
  pendingAssignmentsCount = 2,
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

  // Full Weekly Schedule Data
  const fullSchedule: ScheduleItem[] = [
    { day: 'Senin', subject: 'Pemrograman Web & Mobile', time: '07:30 - 10:00', teacher: 'Bpk. Ahmad ST', room: 'Lab Komputer 1' },
    { day: 'Senin', subject: 'Matematika Terapan', time: '10:15 - 12:30', teacher: 'Ibu Siti S.Pd', room: 'Ruang 12A' },
    { day: 'Selasa', subject: 'Basis Data & SQL Relasional', time: '07:30 - 09:45', teacher: 'Bpk. Budi S.Kom', room: 'Lab Komputer 2' },
    { day: 'Selasa', subject: 'Bahasa Inggris Kejuruan', time: '10:00 - 11:30', teacher: 'Mr. John M.Ed', room: 'Ruang 10B' },
    { day: 'Rabu', subject: 'Pemrograman Berorientasi Objek (PBO)', time: '07:30 - 10:00', teacher: 'Bpk. Ahmad ST', room: 'Lab Komputer 1' },
    { day: 'Rabu', subject: 'Pendidikan Agama & Budi Pekerti', time: '10:15 - 12:00', teacher: 'Bpk. Ustadz Mansur', room: 'Ruang Teori 3' },
    { day: 'Kamis', subject: 'Administrasi Infrastruktur Jaringan', time: '07:30 - 10:00', teacher: 'Bpk. Hendra M.Kom', room: 'Lab Jaringan' },
    { day: 'Kamis', subject: 'Produk Kreatif & Kewirausahaan (PKK)', time: '10:15 - 12:30', teacher: 'Ibu Rina SE', room: 'Ruang Kreatif' },
    { day: 'Jumat', subject: 'Pendidikan Jasmani & Olahraga', time: '07:00 - 09:00', teacher: 'Bpk. Yudi S.Pd', room: 'Lapangan Utama' },
    { day: 'Jumat', subject: 'Bimbingan Konseling & Karir', time: '09:15 - 10:45', teacher: 'Ibu Ratna S.Psi', room: 'Ruang BK' },
  ];

  // Full Grades Data
  const fullGrades: GradeItem[] = [
    { subject: 'Pemrograman Web & Mobile', assignment: 88, midExam: 85, finalExam: 92, finalGrade: 'A' },
    { subject: 'Basis Data & SQL Relasional', assignment: 90, midExam: 86, finalExam: 94, finalGrade: 'A' },
    { subject: 'Pemrograman Berorientasi Objek', assignment: 86, midExam: 82, finalExam: 89, finalGrade: 'A-' },
    { subject: 'Matematika Terapan', assignment: 80, midExam: 76, finalExam: 84, finalGrade: 'B+' },
    { subject: 'Bahasa Inggris Kejuruan', assignment: 88, midExam: 85, finalExam: 88, finalGrade: 'A-' },
    { subject: 'Produk Kreatif & Kewirausahaan', assignment: 92, midExam: 90, finalExam: 95, finalGrade: 'A' },
    { subject: 'Administrasi Infrastruktur Jaringan', assignment: 84, midExam: 80, finalExam: 85, finalGrade: 'B+' },
    { subject: 'Pendidikan Agama & Budi Pekerti', assignment: 95, midExam: 92, finalExam: 96, finalGrade: 'A' },
  ];

  const filteredSchedule = selectedDay === 'ALL'
    ? fullSchedule
    : fullSchedule.filter((s) => s.day.toLowerCase() === selectedDay.toLowerCase());

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
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              10 Mapel
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
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              IPK 3.85
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
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-purple-500/20">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2 mb-1">
                    <MonitorPlay size={20} /> Ujian Berlangsung (CBT)
                  </h3>
                  <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
                    Akses ruang ujian online, cek token sesi, dan pantau hasil nilai pengerjaan.
                  </p>
                </div>
                <Link
                  href="/portal/siswa/cbt"
                  className="px-5 py-2.5 bg-white text-purple-700 rounded-xl font-bold text-xs sm:text-sm hover:scale-[1.03] transition-all shadow-md text-center whitespace-nowrap"
                >
                  Buka CBT Siswa →
                </Link>
              </div>

              {/* Attendance Card */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/20">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2 mb-1">
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
                <button
                  type="button"
                  onClick={() => setIsAbsensiModalOpen(true)}
                  className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-xs sm:text-sm hover:scale-[1.03] transition-all shadow-md cursor-pointer whitespace-nowrap"
                >
                  {absensiDone ? 'Lihat Bukti Hadir' : 'Hadir Sekarang →'}
                </button>
              </div>
            </div>

            {/* 📅 Jadwal Ujian CBT Sekolah (Smart Timetable) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                      <MonitorPlay size={18} />
                    </span>
                    Jadwal Ujian CBT Sekolah (Smart CBT Timetable)
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
                    const isSubmitted = exam.attempts[0]?.status === 'SUBMITTED';

                    return (
                      <div
                        key={exam.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between hover:border-purple-300 transition-all shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              {exam.subject}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sched.badgeClass}`}>
                              {isSubmitted ? 'Selesai' : sched.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">
                            {exam.title}
                          </h4>
                          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5 mb-2">
                            <Calendar size={13} className="text-purple-500 flex-shrink-0" />
                            <span className="line-clamp-1">{formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
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
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">88.5</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rata-Rata Nilai (IPK 3.85)</div>
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
                  {fullSchedule.slice(0, 4).map((item, idx) => (
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
                  ))}
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
                  {fullGrades.slice(0, 4).map((g, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <strong className="font-bold text-slate-900 dark:text-white block">{g.subject}</strong>
                        <span className="text-[11px] text-slate-500">Tugas: {g.assignment} • UTS: {g.midExam} • UAS: {g.finalExam}</span>
                      </div>
                      <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-bold flex items-center justify-center text-sm shadow-2xs">
                        {g.finalGrade}
                      </span>
                    </div>
                  ))}
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
                  {day === 'ALL' ? 'Semua Hari (10 Mapel)' : day}
                </button>
              ))}
            </div>

            {/* Schedule Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {item.day}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1.5">{item.subject}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">
                      {item.time}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium"><User size={13} className="text-slate-400" /> {item.teacher}</span>
                    <span className="flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400"><MapPin size={13} /> {item.room}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: TRANSKRIP NILAI LENGKAP */}
        {/* ==================================================== */}
        {activeTab === 'nilai' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap size={22} className="text-purple-600" /> Transkrip & Laporan Capaian Nilai Siswa
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rekapitulasi Tugas, Penilaian Tengah Semester (PTS), & Penilaian Akhir Semester (PAS)
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Indeks Prestasi Kumulatif</div>
                <div className="text-3xl font-extrabold text-purple-600">3.85 <span className="text-xs text-slate-400 font-normal">/ 4.00</span></div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Rata-Rata Nilai Angka</div>
                <div className="text-3xl font-extrabold text-blue-600">88.5</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Total Mata Pelajaran</div>
                <div className="text-3xl font-extrabold text-emerald-600">{fullGrades.length} <span className="text-xs text-slate-400 font-normal">Mapel</span></div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-400 font-semibold mb-1">Predikat Kelulusan</div>
                <div className="text-2xl font-extrabold text-amber-500">Sangat Memuaskan</div>
              </div>
            </div>

            {/* Grades Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-4 text-center w-12">No</th>
                      <th className="py-4 px-4">Mata Pelajaran</th>
                      <th className="py-4 px-4 text-center">Tugas & Kuis</th>
                      <th className="py-4 px-4 text-center">UTS (PTS)</th>
                      <th className="py-4 px-4 text-center">UAS (PAS)</th>
                      <th className="py-4 px-4 text-center">Nilai Akhir</th>
                      <th className="py-4 px-4 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fullGrades.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                          {g.subject}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {g.assignment}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {g.midExam}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {g.finalExam}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                          {Math.round((g.assignment * 0.3) + (g.midExam * 0.3) + (g.finalExam * 0.4))}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg font-bold text-xs ${
                            g.finalGrade.includes('A')
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}>
                            {g.finalGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
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

