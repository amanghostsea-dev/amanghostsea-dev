'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Users, 
  ArrowRight, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  BookOpen,
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleState } from '@/lib/cbt-schedule';

export interface AssignedExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  status: string;
  authorName?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  proctorId?: string | null;
  proctorName?: string | null;
  proctorNip?: string | null;
  proctor2Id?: string | null;
  proctor2Name?: string | null;
  roomName?: string | null;
  _count?: {
    questions?: number;
    attempts?: number;
  };
}

interface ProctorScheduleClientProps {
  exams: AssignedExamItem[];
  currentUser: {
    name: string;
    username: string;
    role: string;
  };
}

export default function ProctorScheduleClient({
  exams,
  currentUser,
}: ProctorScheduleClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE_TODAY' | 'UPCOMING' | 'FINISHED'>('ALL');

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin Utama';

  // Process status for each exam
  const examItemsWithState = useMemo(() => {
    return exams.map((ex) => {
      const scheduleState = getExamScheduleState(ex.startTime, ex.endTime, ex.status);
      return {
        ...ex,
        scheduleState,
      };
    });
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return examItemsWithState.filter((ex) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.subject.toLowerCase().includes(q) ||
        ex.classTarget.toLowerCase().includes(q) ||
        (ex.roomName && ex.roomName.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTab === 'ACTIVE_TODAY') {
        return ex.scheduleState.state === 'ONGOING' || ex.status === 'ACTIVE';
      }
      if (filterTab === 'UPCOMING') {
        return ex.scheduleState.state === 'UPCOMING';
      }
      if (filterTab === 'FINISHED') {
        return ex.scheduleState.state === 'ENDED' || ex.status === 'ARCHIVED';
      }

      return true;
    });
  }, [examItemsWithState, searchQuery, filterTab]);

  const ongoingCount = examItemsWithState.filter(
    (e) => e.scheduleState.state === 'ONGOING' || e.status === 'ACTIVE'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 🌟 HEADER BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold">
                <ShieldCheck size={14} className="text-blue-300" />
                Portal Pengawas Ujian CBT Resmi • SMK TI GAMA 1 BEKASI
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Ruang Tugas Pengawas Ujian
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
                Selamat bertugas, <strong>{currentUser.name}</strong> ({currentUser.role}). Jadwal di bawah ini diatur langsung oleh Admin Utama/Kurikulum. Silakan masuk ke konsol ruangan saat waktu ujian tiba.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/cbt?tab=pengawas"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all backdrop-blur-md shadow-sm"
              >
                <Users size={16} /> Plotting Admin
              </Link>
              <Link
                href="/admin/cbt"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/30"
              >
                <span>Dashboard CBT</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* ℹ️ DISCIPLINE NOTICE */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-3">
          <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold">Keamanan & Ketertiban Pengawasan:</span> Anda hanya dapat mengendalikan token dan memantau siswa pada paket ujian dan ruang kelas yang telah di-plotting oleh Admin Utama. Pastikan Anda berada di ruang ujian sebelum membuka sesi token di layar proyektor kelas.
          </div>
        </div>

        {/* 🔍 FILTER & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Semua Tugas ({exams.length})
            </button>
            <button
              onClick={() => setFilterTab('ACTIVE_TODAY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'ACTIVE_TODAY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Sedang Berlangsung ({ongoingCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('UPCOMING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'UPCOMING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Mendatang
            </button>
            <button
              onClick={() => setFilterTab('FINISHED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'FINISHED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Selesai
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mapel, kelas, atau ruang..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 📋 LIST OF ASSIGNED EXAMS */}
        {filteredExams.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={28} />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Tidak Ada Jadwal Tugas Pengawas
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {exams.length === 0
                ? 'Anda belum memiliki jadwal tugas pengawasan ujian CBT yang di-plotting oleh Admin Utama. Silakan hubungi Panitia Ujian / Admin Kurikulum.'
                : 'Tidak ada tugas yang sesuai dengan filter pencarian Anda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredExams.map((exam) => {
              const sched = formatExamScheduleRange(exam.startTime, exam.endTime);
              const isOngoing = exam.scheduleState.state === 'ONGOING' || exam.status === 'ACTIVE';
              const isEnded = exam.scheduleState.state === 'ENDED' || exam.status === 'ARCHIVED';

              return (
                <div
                  key={exam.id}
                  className={`rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                    isOngoing
                      ? 'border-emerald-500 ring-2 ring-emerald-400/20 shadow-emerald-500/10'
                      : isEnded
                      ? 'border-slate-200 dark:border-slate-800 opacity-75'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top status line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                          {exam.classTarget}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin size={12} className="text-blue-500" />
                          <span>{exam.roomName || 'Lab Komputer 1'}</span>
                        </span>
                      </div>

                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>SEDANG BERLANGSUNG</span>
                        </span>
                      ) : isEnded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          SELESAI
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          MENDATANG
                        </span>
                      )}
                    </div>

                    {/* Title & Subject */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1">
                        {exam.title}
                      </h3>
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                        {exam.subject} • {exam.duration} Menit Pengerjaan
                      </p>
                    </div>

                    {/* Schedule detail */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock size={14} className="text-blue-500 flex-shrink-0" />
                        <span className="font-semibold">{sched}</span>
                      </div>
                      {exam.startTime && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                          <Calendar size={12} />
                          <span>{new Date(exam.startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Proctor Badge */}
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Pengawas 1: <strong className="text-slate-800 dark:text-slate-200">{exam.proctorName || currentUser.name}</strong></span>
                      {exam.proctor2Name && <span>Pengawas 2: <strong className="text-slate-700">{exam.proctor2Name}</strong></span>}
                    </div>
                  </div>

                  {/* CTA BUTTON */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {exam._count?.attempts ? `${exam._count.attempts} Siswa Mengerjakan` : 'Siap Diawasi'}
                    </span>

                    <Link
                      href={`/portal/pengawas/cbt/${exam.id}`}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                        isOngoing
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                      }`}
                    >
                      <ShieldCheck size={15} />
                      <span>Masuk Konsol Pengawas</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

