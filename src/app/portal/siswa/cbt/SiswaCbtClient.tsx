'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  RefreshCw
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleState, ScheduleState } from '@/lib/cbt-schedule';

interface ExamItem {
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
  attempts: {
    id: string;
    score: number;
    status: string;
  }[];
}

interface SiswaCbtClientProps {
  exams: ExamItem[];
  studentName: string;
  studentClass: string;
  initials: string;
}

export default function SiswaCbtClient({
  exams,
  studentName,
  studentClass,
  initials,
}: SiswaCbtClientProps) {
  const [filterTab, setFilterTab] = useState<'ALL' | 'ONGOING' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every 30 seconds for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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

  // Calculate statistics
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Navigation & Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/portal/siswa"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Portal Siswa
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25">
                <MonitorPlay size={24} />
              </span>
              Ruang Ujian Online (Smart CBT)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Jadwal pelaksanaan ujian terpadu untuk Anda (<strong className="text-purple-600 dark:text-purple-400">{studentName}</strong>).
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs">
              {initials}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</div>
              <div className="text-[10px] text-slate-500 font-medium">{studentClass}</div>
            </div>
          </div>
        </div>

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
            onClick={() => setFilterTab('COMPLETED')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterTab === 'COMPLETED'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Ujian Telah Selesai
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">{completedCount}</span>
            </div>
            <p className="text-[11px] text-slate-500">Lihat skor dan histori pengerjaan Anda</p>
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
                        <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                          Skor Ujian Anda:
                        </span>
                        <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                          {attempt.score} / 100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action CTA with Smart Time-Locking */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    {isSubmitted ? (
                      <Link
                        href={`/portal/siswa/cbt/${exam.id}`}
                        className="w-full block text-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors shadow-sm"
                      >
                        Lihat Rincian Hasil Ujian
                      </Link>
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
    </div>
  );
}

