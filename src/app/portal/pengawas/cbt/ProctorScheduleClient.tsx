'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ChevronRight,
  Eye,
  ArrowLeft,
  CalendarX2,
  ShieldAlert,
  Play,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { formatExamScheduleRange, getExamScheduleState, formatClassTargetDisplay, isClassOverlap } from '@/lib/cbt-schedule';
import { normalizeReligion, getReligionConfig, ReligionCode, ReligionOption } from '@/lib/cbt-religion';
import ExamCountdownWidget from '@/components/cbt/ExamCountdownWidget';

export interface AssignedExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  status: string;
  targetReligion?: string | null;
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

// Helper ekstraksi target agama efektif khusus mapel agama
function getExamEffectiveReligion(exam: AssignedExamItem): ReligionCode {
  let rel = normalizeReligion(exam.targetReligion);
  if (rel === 'ALL') {
    const text = `${exam.subject || ''} ${exam.title || ''}`.toUpperCase();
    if (text.includes('ISLAM') || text.includes('PAI')) return 'ISLAM';
    if (text.includes('KRISTEN') || text.includes('PAK') || text.includes('PROTESTAN')) return 'KRISTEN';
    if (text.includes('KATOLIK')) return 'KATOLIK';
    if (text.includes('HINDU')) return 'HINDU';
    if (text.includes('BUDDHA') || text.includes('BUDHA')) return 'BUDDHA';
    if (text.includes('KHONGHUCU') || text.includes('KONGHUCU')) return 'KHONGHUCU';
  }
  return rel;
}

export interface UnifiedExamCardItem {
  id: string;
  primaryExam: AssignedExamItem & { scheduleState: any };
  partnerExams: (AssignedExamItem & { scheduleState: any })[];
  isUnifiedReligion: boolean;
  isUnifiedRoom?: boolean;
  unifiedTitle: string;
  unifiedSubject: string;
  religionBadges: ReligionOption[];
  combinedAttempts: number;
  allExamIds: string[];
}

export default function ProctorScheduleClient({
  exams,
  currentUser,
}: ProctorScheduleClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE_TODAY' | 'UPCOMING' | 'FINISHED'>('ALL');

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin Utama';

  // ⏱️ Real-time ticker to recompute overall exam status dynamically every second (precision for imminent alerts)
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Process status for each exam
  const examItemsWithState = useMemo(() => {
    const nowDate = new Date(currentTime);
    return exams.map((ex) => {
      const scheduleState = getExamScheduleState(
        ex.startTime,
        ex.endTime,
        ex.status,
        nowDate,
        undefined,
        ex.duration
      );
      return {
        ...ex,
        scheduleState,
      };
    });
  }, [exams, currentTime]);

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
        const start = ex.startTime ? new Date(ex.startTime).getTime() : 0;
        const isImminent = start > 0 && start - currentTime > 0 && start - currentTime <= 15 * 60 * 1000;
        return ex.scheduleState.state === 'ONGOING' || ex.status === 'ACTIVE' || isImminent;
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

    // 🏢 SINKRONISASI LEVEL 3: Grouping Sesi Terpadu Ruangan (Multi-Jurusan / Multi-Agama / Multi-Paket)
  // Menyatukan seluruh ujian yang berada di Ruangan & Jam yang sama ke dalam 1 Konsol Pengawas Terpadu
  const groupedExamCards = useMemo<UnifiedExamCardItem[]>(() => {
    const processedIds = new Set<string>();
    const cards: UnifiedExamCardItem[] = [];

    for (let i = 0; i < filteredExams.length; i++) {
      const current = filteredExams[i];
      if (processedIds.has(current.id)) continue;

      const currentRel = getExamEffectiveReligion(current);

      // Cari rekan ujian yang dijadwalkan di ruangan & jadwal waktu yang sama
      if (current.startTime && current.endTime && current.roomName && current.roomName.trim() !== '') {
        const partners = filteredExams.filter((other) => {
          if (other.id === current.id || processedIds.has(other.id)) return false;

          // Cek kesamaan ruangan fisik
          const sameRoom = (current.roomName || '').trim().toLowerCase() === (other.roomName || '').trim().toLowerCase();
          // Cek kesamaan waktu (tanggal, start, end)
          const sameTime =
            new Date(current.startTime!).getTime() === new Date(other.startTime!).getTime() &&
            new Date(current.endTime!).getTime() === new Date(other.endTime!).getTime();
          // Cek kesamaan pengawas (atau Super Admin yang mengawasi seluruh ruangan)
          const sameProctor = isSuperAdmin || (
            (current.proctorName || '').trim().toLowerCase() === (other.proctorName || '').trim().toLowerCase() ||
            !current.proctorName || !other.proctorName
          );

          return sameRoom && sameTime && sameProctor;
        });

        if (partners.length > 0) {
          processedIds.add(current.id);
          partners.forEach((p) => processedIds.add(p.id));

          const allGroup = [current, ...partners];
          const hasReligionVariants = allGroup.some((e) => getExamEffectiveReligion(e) !== 'ALL');
          const badges = allGroup.map((e) => getReligionConfig(getExamEffectiveReligion(e)));
          const combinedAttempts = allGroup.reduce((sum, e) => sum + (e._count?.attempts || 0), 0);
          const allIds = allGroup.map((e) => e.id);

          if (hasReligionVariants) {
            // Skenario A: Varian Agama Terpadu (PAI + PAK, dll)
            const religionLabels = badges.map((b) => b.shortLabel).join(' & ');
            const cleanSubject = current.subject
              .replace(/KRISTEN|ISLAM|KATOLIK|HINDU|BUDDHA|KHONGHUCU/gi, '')
              .trim()
              .replace(/[\/\-\s]+$/, '') || 'Pendidikan Agama';

            cards.push({
              id: current.id,
              primaryExam: current,
              partnerExams: partners,
              isUnifiedReligion: true,
              isUnifiedRoom: false,
              unifiedTitle: `${current.title.replace(/KRISTEN|ISLAM|KATOLIK|HINDU|BUDDHA|KHONGHUCU/gi, '').trim()} (${religionLabels})`,
              unifiedSubject: `${cleanSubject} (${religionLabels}) • ${current.duration} Menit Pengerjaan`,
              religionBadges: badges,
              combinedAttempts,
              allExamIds: allIds,
            });
          } else {
            // Skenario B: Sesi Gabungan Kejuruan / Multi-Prodi (DPK PPLG + DPK TJKT, dll)
            const packetTitles = allGroup.map((e) => e.title).join(' & ');
            const targetClasses = allGroup.map((e) => formatClassTargetDisplay(e.classTarget, true)).join(' + ');

            cards.push({
              id: current.id,
              primaryExam: current,
              partnerExams: partners,
              isUnifiedReligion: false,
              isUnifiedRoom: true,
              unifiedTitle: `Sesi Terpadu: ${packetTitles}`,
              unifiedSubject: `Ruang Gabungan (${targetClasses}) • ${current.duration} Menit Pengerjaan`,
              religionBadges: [],
              combinedAttempts,
              allExamIds: allIds,
            });
          }
          continue;
        }
      }

      // Skenario C: Ujian Mandiri / Non-Gabungan
      processedIds.add(current.id);
      cards.push({
        id: current.id,
        primaryExam: current,
        partnerExams: [],
        isUnifiedReligion: false,
        isUnifiedRoom: false,
        unifiedTitle: current.title,
        unifiedSubject: `${current.subject} • ${current.duration} Menit Pengerjaan`,
        religionBadges: currentRel !== 'ALL' ? [getReligionConfig(currentRel)] : [],
        combinedAttempts: current._count?.attempts || 0,
        allExamIds: [current.id],
      });
    }

    return cards;
  }, [filteredExams]);

  const ongoingCount = examItemsWithState.filter(
    (e) => e.scheduleState.state === 'ONGOING' || e.status === 'ACTIVE'
  ).length;

  const imminentCount = examItemsWithState.filter((e) => {
    const isOngoing = e.scheduleState.state === 'ONGOING' || e.status === 'ACTIVE';
    const isEnded = e.scheduleState.state === 'ENDED' || e.status === 'ARCHIVED';
    const start = e.startTime ? new Date(e.startTime).getTime() : 0;
    return !isOngoing && !isEnded && start > 0 && start - currentTime > 0 && start - currentTime <= 15 * 60 * 1000;
  }).length;

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
                Portal Pengawas Ujian CBT Resmi • Created By Abdul Rahman
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Ruang Tugas Pengawas Ujian
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
                Selamat bertugas, <strong>{currentUser.name}</strong> ({currentUser.role}). Jadwal di bawah ini diatur langsung oleh Admin Utama/Kurikulum. Silakan masuk ke konsol ruangan saat waktu ujian tiba.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/admin/cbt?tab=pengawas"
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all backdrop-blur-md shadow-sm"
                  >
                    <Users size={16} /> Plotting Pengawas (Admin)
                  </Link>
                  <Link
                    href="/admin/cbt"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/30"
                  >
                    <span>Dashboard CBT</span>
                    <ChevronRight size={16} />
                  </Link>
                </>
              ) : (
                <Link
                  href="/portal/guru"
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all backdrop-blur-md shadow-sm"
                >
                  <ArrowLeft size={16} /> Kembali ke Portal Guru
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ℹ️ DISCIPLINE NOTICE */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold">Ketentuan Pengawasan Ujian:</span> Seluruh jadwal dan penempatan ruangan di bawah ini diatur seutuhnya oleh Admin Utama demi ketertiban pelaksanaan. Guru pengawas hanya memiliki tombol <strong>Pratinjau Ruang Ujian</strong> untuk mengawasi siswa, mengumumkan token di proyektor, dan mencetak Berita Acara saat waktu ujian tiba.
          </div>
        </div>

        {/* 🔍 FILTER & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              Semua Tugas ({exams.length})
            </button>
            <button
              onClick={() => setFilterTab('ACTIVE_TODAY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${filterTab === 'ACTIVE_TODAY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Sedang Berlangsung ({ongoingCount})</span>
              {imminentCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black animate-pulse flex items-center gap-0.5">
                  <Flame size={10} className="fill-white" />
                  <span>+{imminentCount} Siap</span>
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('UPCOMING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterTab === 'UPCOMING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              Mendatang
            </button>
            <button
              onClick={() => setFilterTab('FINISHED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterTab === 'FINISHED'
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
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <CalendarX2 size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                {exams.length === 0
                  ? 'Belum Ada Jadwal Pengawasan yang Di-Plotting'
                  : 'Tidak Ada Tugas yang Sesuai Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {exams.length === 0
                  ? `Nama Anda (${currentUser.name}) belum di-plotting oleh Admin Utama ke sesi ujian CBT manapun. Seluruh penugasan ruangan dan jadwal diatur seutuhnya oleh Admin demi ketertiban. Jadwal ujian akan otomatis muncul di sini begitu Admin Utama menetapkan nama Anda sebagai pengawas.`
                  : 'Tidak ditemukan jadwal ujian yang sesuai dengan kata kunci pencarian Anda.'}
              </p>
            </div>
            {exams.length === 0 && (
              <div className="pt-2">
                <Link
                  href="/portal/guru"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Portal Guru</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {groupedExamCards.map((card) => {
              const exam = card.primaryExam;
              const sched = formatExamScheduleRange(exam.startTime, exam.endTime);
              const isOngoing = exam.scheduleState.state === 'ONGOING' || exam.status === 'ACTIVE';
              const isEnded = exam.scheduleState.state === 'ENDED' || exam.status === 'ARCHIVED';

              // ⏱️ Real-time Imminent Alert (< 15 Menit menuju waktu ujian)
              const startTimeMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
              const diffToStartMs = !isOngoing && !isEnded && startTimeMs ? startTimeMs - currentTime : null;
              const isImminent = diffToStartMs !== null && diffToStartMs > 0 && diffToStartMs <= 15 * 60 * 1000;
              const minutesToStart = isImminent ? Math.max(1, Math.ceil(diffToStartMs / 60000)) : 0;

              return (
                <div
                  key={card.id}
                  className={`rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-500 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                    isOngoing
                      ? 'border-emerald-500 ring-2 ring-emerald-400/20 shadow-emerald-500/10'
                      : isImminent
                        ? 'border-2 border-amber-500 dark:border-amber-400 ring-4 ring-amber-500/40 shadow-xl shadow-amber-500/20 animate-pulse bg-gradient-to-br from-amber-500/[0.04] via-white to-rose-500/[0.04] dark:from-amber-950/25 dark:via-slate-900 dark:to-rose-950/20'
                        : isEnded
                          ? 'border-slate-200 dark:border-slate-800 opacity-75'
                          : card.isUnifiedReligion
                            ? 'border-emerald-300 dark:border-emerald-800/80 shadow-emerald-500/5'
                            : card.isUnifiedRoom
                              ? 'border-indigo-300 dark:border-indigo-800/80 shadow-indigo-500/5'
                              : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top status line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                          {card.isUnifiedRoom
                            ? [exam, ...card.partnerExams].map((e) => formatClassTargetDisplay(e.classTarget, true)).join(' + ')
                            : formatClassTargetDisplay(exam.classTarget)}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin size={12} className="text-blue-500" />
                          <span>{exam.roomName || 'Ruang Utama'}</span>
                        </span>
                      </div>

                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>SEDANG BERLANGSUNG</span>
                        </span>
                      ) : isImminent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md shadow-amber-500/40 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          <span>🔥 SEGERA DIMULAI ({minutesToStart} MENIT LAGI)</span>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                          Plotting Resmi Admin
                        </span>
                        {card.isUnifiedReligion ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white shadow-xs flex items-center gap-1">
                            <span>🕌 Sesi Paralel Agama Terpadu</span>
                          </span>
                        ) : card.isUnifiedRoom ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs flex items-center gap-1">
                            <span>🏢 Sesi Terpadu Ruangan ({card.partnerExams.length + 1} Paket)</span>
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1">
                        {card.unifiedTitle}
                      </h3>
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                        {card.unifiedSubject}
                      </p>

                      {/* Badges Multi-Paket Ruangan */}
                      {card.isUnifiedRoom && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {[exam, ...card.partnerExams].map((ex) => (
                            <span
                              key={ex.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1"
                            >
                              <span>📋</span>
                              <span>{formatClassTargetDisplay(ex.classTarget, true)}: {ex.subject}</span>
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 font-mono">
                            (1 Token Bersama)
                          </span>
                        </div>
                      )}

                      {/* Badges Agama Terpadu */}
                      {card.isUnifiedReligion && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {card.religionBadges.map((rb) => (
                            <span
                              key={rb.code}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${rb.bgBadge} ${rb.borderBadge} ${rb.textBadge}`}
                            >
                              <span>{rb.icon}</span>
                              <span>{rb.shortLabel}</span>
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 font-mono">
                            (1 Token Bersama)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ⏱️ WIDGET HITUNG MUNDUR CANGGIH */}
                    <ExamCountdownWidget
                      startTime={exam.startTime}
                      endTime={exam.endTime}
                      duration={exam.duration}
                      roomName={exam.roomName || 'Ruang CBT'}
                    />

                    {/* ⚠️ HIGH-VISIBILITY IMMINENT WARNING BANNER (< 15 MENIT) */}
                    {isImminent && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-2 border-amber-500/60 text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md shadow-amber-500/10 animate-pulse">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm font-black text-sm">
                            <Flame size={18} className="fill-white animate-bounce" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <span>PERSIAPAN PENGAWAS ({minutesToStart} MENIT MENUJU MULAI)</span>
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-snug">
                              Ujian ini segera dimulai! Harap buka ruang pengawasan sekarang untuk persiapan rilis token & proyektor.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                      {card.combinedAttempts > 0
                        ? `${card.combinedAttempts} Siswa Mengerjakan`
                        : isImminent
                          ? '🔥 Persiapan Pengawas (< 15 Menit)'
                          : card.isUnifiedReligion
                            ? 'Siap Diawasi (Sesi Terpadu)'
                            : 'Siap Diawasi'}
                    </span>

                    <Link
                      href={`/portal/pengawas/cbt/${card.primaryExam.id}`}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                        isOngoing
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                          : isImminent
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/50 animate-pulse hover:animate-none font-black tracking-wide'
                            : card.isUnifiedReligion
                              ? 'bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-emerald-500/20'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                      }`}
                    >
                      {isOngoing ? (
                        <>
                          <Play size={15} />
                          <span>{card.isUnifiedReligion ? 'Mulai Pengawasan Terpadu (Live)' : 'Mulai Pengawasan (Live)'}</span>
                        </>
                      ) : isImminent ? (
                        <>
                          <Sparkles size={15} className="animate-spin text-amber-200" />
                          <span>Buka Ruang Ujian Sekarang</span>
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          <span>{card.isUnifiedReligion ? 'Pratinjau Ruang Terpadu' : 'Pratinjau Ruang Ujian'}</span>
                        </>
                      )}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Identitas Pengembang */}
        <footer className="pt-8 pb-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
          <span>Portal Pengawas CBT • SMK Digital Vocational Excellence</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Created By Abdul Rahman</span>
        </footer>
      </div>
    </div>
  );
}

