'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Key, 
  ExternalLink, 
  AlertCircle,
  FileCheck2,
  Award,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { createExam, updateExam, deleteExam, toggleExamSession, checkExamScheduleConflict, ScheduleConflictExam } from './actions';
import { 
  formatExamScheduleRange, 
  getExamScheduleState, 
  toDateTimeLocalInput 
} from '@/lib/cbt-schedule';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status: string;
  shuffleQuestions: boolean;
  authorName: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  createdAt: Date | string;
  _count: {
    questions: number;
    attempts: number;
  };
  attempts: {
    score: number;
    status: string;
  }[];
}

interface CbtDashboardProps {
  exams: ExamItem[];
  currentUser?: {
    name: string;
    role: string;
  };
}

export default function CbtDashboard({ exams: initialExams, currentUser }: CbtDashboardProps) {
  const [exams, setExams] = useState(initialExams);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mineOnlyFilter, setMineOnlyFilter] = useState(false);
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const teacherName = currentUser?.name || 'Bpk. Ahmad ST';

  // Filter States
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'ONGOING' | 'ENDED'>('ALL');

  // Conflict Checking State
  const [conflicts, setConflicts] = useState<ScheduleConflictExam[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Pemrograman Web',
    classTarget: 'XI RPL 1',
    duration: 60,
    token: '',
    description: '',
    status: 'PUBLISHED',
    shuffleQuestions: true,
    authorName: teacherName,
    startTime: '',
    endTime: '',
    enableSchedule: true,
    allowConflict: false,
  });

  const subjectPresets = [
    'Pemrograman Web',
    'Basis Data',
    'Pemrograman Berorientasi Objek',
    'Administrasi Sistem Jaringan',
    'Teknologi Layanan Jaringan',
    'Desain Media Interaktif',
    'Dasar-dasar Kejuruan',
    'Matematika',
    'Bahasa Inggris',
    'Bahasa Indonesia',
    'Pendidikan Agama',
  ];

  const classPresets = [
    'Semua Kelas',
    'X RPL 1',
    'XI RPL 1',
    'XI RPL 2',
    'XII RPL 1',
    'X TKJ 1',
    'XI TKJ 1',
    'XII TKJ 1',
    'X DKV 1',
    'XI DKV 1',
    'XII DKV 1',
    'X MPLB 1',
    'XI MPLB 1',
  ];

  const runConflictCheck = async (startTime: string, endTime: string, classTarget: string) => {
    if (!startTime || !endTime) {
      setConflicts([]);
      setConflictWarning(null);
      return;
    }
    setCheckingConflict(true);
    try {
      const res = await checkExamScheduleConflict({
        examId: editingExam?.id,
        classTarget,
        startTime,
        endTime,
      });
      if (res.hasConflict && res.conflicts && res.conflicts.length > 0) {
        setConflicts(res.conflicts);
        setConflictWarning(res.message || 'Jadwal bertabrakan!');
      } else {
        setConflicts([]);
        setConflictWarning(null);
      }
    } catch {}
    setCheckingConflict(false);
  };

  const handleOpenCreate = () => {
    setEditingExam(null);
    const randomToken = 'CBT' + Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const startStr = toDateTimeLocalInput(now);
    const endStr = toDateTimeLocalInput(new Date(now.getTime() + 60 * 60000));

    setFormData({
      title: '',
      subject: 'Pemrograman Web',
      classTarget: 'XI RPL 1',
      duration: 60,
      token: randomToken,
      description: '',
      status: 'PUBLISHED',
      shuffleQuestions: true,
      authorName: teacherName,
      startTime: startStr,
      endTime: endStr,
      enableSchedule: true,
      allowConflict: false,
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: ExamItem) => {
    setEditingExam(exam);
    const startStr = toDateTimeLocalInput(exam.startTime);
    const endStr = toDateTimeLocalInput(exam.endTime);

    setFormData({
      title: exam.title,
      subject: exam.subject,
      classTarget: exam.classTarget,
      duration: exam.duration,
      token: exam.token || '',
      description: exam.description || '',
      status: exam.status,
      shuffleQuestions: exam.shuffleQuestions,
      authorName: exam.authorName || teacherName,
      startTime: startStr,
      endTime: endStr,
      enableSchedule: Boolean(exam.startTime || exam.endTime),
      allowConflict: false,
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleQuickToggleSession = async (exam: ExamItem) => {
    setSessionLoadingId(exam.id);
    const isCurrentlyActive = exam.status === 'ACTIVE';
    const nextOpen = !isCurrentlyActive;
    const res = await toggleExamSession(exam.id, nextOpen, exam.token || undefined);

    if (res.success && res.data) {
      setExams(exams.map((e) => (e.id === exam.id ? { ...e, status: res.data.status, token: res.data.token } : e)));
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian');
    }
    setSessionLoadingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.enableSchedule && formData.startTime && formData.endTime) {
      if (new Date(formData.startTime) >= new Date(formData.endTime)) {
        alert('Jadwal Mulai harus lebih awal daripada Jadwal Selesai.');
        setLoading(false);
        return;
      }
    }

    const payload = {
      title: formData.title,
      subject: formData.subject,
      classTarget: formData.classTarget,
      duration: Number(formData.duration),
      token: formData.token,
      description: formData.description,
      status: formData.status,
      shuffleQuestions: formData.shuffleQuestions,
      authorName: formData.authorName || teacherName,
      startTime: formData.enableSchedule && formData.startTime ? formData.startTime : null,
      endTime: formData.enableSchedule && formData.endTime ? formData.endTime : null,
      allowConflict: formData.allowConflict,
    };

    if (editingExam) {
      const res = await updateExam(editingExam.id, payload);
      if (res.success && res.data) {
        setExams(exams.map((ex) => (ex.id === editingExam.id ? { ...ex, ...res.data } : ex)));
        setIsModalOpen(false);
      } else if ((res as any).conflict) {
        setConflicts((res as any).conflicts || []);
        alert(res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.');
      } else {
        alert(res.error || 'Gagal mengubah ujian');
      }
    } else {
      const res = await createExam(payload);
      if (res.success && res.data) {
        setExams([
          {
            ...res.data,
            _count: { questions: 0, attempts: 0 },
            attempts: [],
          },
          ...exams,
        ]);
        setIsModalOpen(false);
      } else if ((res as any).conflict) {
        setConflicts((res as any).conflicts || []);
        alert(res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.');
      } else {
        alert(res.error || 'Gagal membuat ujian');
      }
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    const res = await deleteExam(deleteTargetId);
    if (res.success) {
      setExams(exams.filter((ex) => ex.id !== deleteTargetId));
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    } else {
      alert(res.error || 'Gagal menghapus ujian');
    }
    setLoading(false);
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.authorName && exam.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
    const matchesMine = !mineOnlyFilter || (exam.authorName && exam.authorName.toLowerCase() === teacherName.toLowerCase());
    
    const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
    const matchesSchedule =
      scheduleFilter === 'ALL' ||
      (scheduleFilter === 'TODAY' && schedState.isOngoingToday) ||
      (scheduleFilter === 'ONGOING' && schedState.state === 'ONGOING') ||
      (scheduleFilter === 'UPCOMING' && schedState.state === 'UPCOMING') ||
      (scheduleFilter === 'ENDED' && schedState.state === 'ENDED');

    return matchesSearch && matchesStatus && matchesMine && matchesSchedule;
  });

  // Calculate stats
  const totalExams = exams.length;
  const totalQuestions = exams.reduce((acc, curr) => acc + curr._count.questions, 0);
  const totalAttempts = exams.reduce((acc, curr) => acc + curr._count.attempts, 0);
  const totalSubmitted = exams.flatMap((e) => e.attempts).filter((a) => a.status === 'SUBMITTED');
  const avgScore = totalSubmitted.length > 0
    ? Math.round(totalSubmitted.reduce((acc, a) => acc + a.score, 0) / totalSubmitted.length)
    : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-2">
            <BookOpen size={14} /> Smart CBT Guru • Rilis Token & Kontrol Ruang Ujian
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Ujian Online (CBT)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Login sebagai: <strong className="text-purple-600 dark:text-purple-400">{teacherName}</strong>. Susun bank soal, kontrol sesi ujian, rilis token langsung ke kelas, dan pantau nilai siswa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/siswa/cbt"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm"
          >
            <ExternalLink size={16} /> Tampilan Siswa
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> Buat Paket Ujian Baru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalExams}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Paket Ujian</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalQuestions}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Butir Soal</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalAttempts}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Siswa Mengerjakan</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore} / 100</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rata-Rata Nilai</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari ujian, mapel, kelas, guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Ujian Saya Filter Toggle */}
          <button
            onClick={() => setMineOnlyFilter(!mineOnlyFilter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              mineOnlyFilter
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <UserCheck size={14} /> Ujian Saya
          </button>

          {/* Schedule Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Semua Jadwal' },
              { id: 'TODAY', label: '📅 Hari Ini' },
              { id: 'UPCOMING', label: '⏳ Akan Datang' },
              { id: 'ONGOING', label: '🟢 Berlangsung' },
              { id: 'ENDED', label: '🏁 Selesai' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setScheduleFilter(s.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  scheduleFilter === s.id
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {['ALL', 'ACTIVE', 'PUBLISHED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Ruang'
                : st === 'ACTIVE'
                ? '🟢 Sesi Aktif'
                : st === 'PUBLISHED'
                ? 'Ruang Tunggu'
                : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Exam List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <BookOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada paket ujian yang sesuai.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
            >
              Buat Ujian Baru
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const isLive = exam.status === 'ACTIVE';
            const isSessionLoading = sessionLoadingId === exam.id;
            const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Top Status & Subject Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                      {exam.subject}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isLive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse'
                          : exam.status === 'PUBLISHED'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isLive ? '🟢 Sesi Live' : exam.status === 'PUBLISHED' ? '⏳ Ruang Tunggu' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-1.5 group-hover:text-purple-600 transition-colors">
                    {exam.title}
                  </h3>

                  {/* Author / Teacher Badge */}
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                    <span>Guru Pengampu:</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{exam.authorName || 'Bpk. Ahmad ST'}</strong>
                  </div>

                  {/* 📅 Exam Schedule Badge */}
                  <div className="p-2.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 mb-3 space-y-1">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Calendar size={13} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="line-clamp-1">{formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${schedState.badgeClass}`}>
                        {schedState.label}
                      </span>
                    </div>
                    {schedState.countdown && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                        <span>Waktu Pengerjaan:</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">{schedState.countdown}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {exam.description || 'Tidak ada deskripsi tambahan.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-purple-500" />
                      <span>{exam.duration} Menit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" />
                      <span>{exam.classTarget}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-emerald-500" />
                      <span>{exam._count.questions} Butir Soal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Key size={14} className="text-amber-500" />
                      <span className="font-mono font-bold">{(exam.token || '').split('|')[0] || 'Tanpa Token'}</span>
                    </div>
                  </div>

                  {/* 🚀 QUICK TOKEN CONTROL BANNER */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    isLive 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div>
                      <div className="font-extrabold uppercase text-[10px] tracking-wider text-slate-400">
                        {isLive ? 'Token Live Kelas:' : 'Status Token:'}
                      </div>
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5">
                        {(exam.token || '').split('|')[0] || 'BELUM AKTIF'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickToggleSession(exam)}
                      disabled={isSessionLoading}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                        isLive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isSessionLoading ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : isLive ? (
                        <>
                          <Square size={12} className="fill-white" /> Tutup Sesi
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-white" /> Rilis Token
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/cbt/${exam.id}`}
                    className="flex-1 text-center py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    Buka Bank Soal & Nilai
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Edit Pengaturan Ujian"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(exam.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Ujian"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Buat / Edit Ujian */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingExam ? 'Edit Paket Ujian' : 'Buat Paket Ujian Baru (CBT Guru)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Ujian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Akhir Semester (PAS) Pemrograman Web"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="subject-presets"
                    placeholder="Pilih atau ketik mapel"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <datalist id="subject-presets">
                    {subjectPresets.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="class-presets"
                    placeholder="Pilih atau ketik kelas"
                    value={formData.classTarget}
                    onChange={(e) => setFormData({ ...formData, classTarget: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <datalist id="class-presets">
                    {classPresets.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi Pengerjaan (Menit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Token Masuk Ujian
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, token: 'CBT' + Math.floor(100 + Math.random() * 900) }))}
                      className="text-[10px] text-purple-600 font-bold hover:underline"
                    >
                      Acak Token
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: CBT889"
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                  />
                </div>
              </div>

              {/* 📅 PENGATURAN JADWAL UJIAN & ANTI-BENTROK */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Jadwal Pelaksanaan Ujian (CBT)</div>
                      <div className="text-[11px] text-slate-500">Atur tanggal & waktu ujian agar tidak bertabrakan</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enableSchedule}
                      onChange={(e) => setFormData({ ...formData, enableSchedule: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {formData.enableSchedule && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Mulai Ujian (WIB) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.startTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const updated = { ...prev, startTime: val };
                              if (val && prev.duration) {
                                const end = new Date(new Date(val).getTime() + prev.duration * 60000);
                                updated.endTime = toDateTimeLocalInput(end);
                              }
                              return updated;
                            });
                            if (val) {
                              const end = new Date(new Date(val).getTime() + formData.duration * 60000);
                              runConflictCheck(val, toDateTimeLocalInput(end), formData.classTarget);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Selesai / Tutup (WIB) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.endTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, endTime: val });
                            runConflictCheck(formData.startTime, val, formData.classTarget);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Preset Shortcuts */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-400">Pilihan Cepat:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.startTime) {
                            const now = new Date();
                            const startStr = toDateTimeLocalInput(now);
                            const endStr = toDateTimeLocalInput(new Date(now.getTime() + formData.duration * 60000));
                            setFormData({ ...formData, startTime: startStr, endTime: endStr });
                            runConflictCheck(startStr, endStr, formData.classTarget);
                          } else {
                            const end = new Date(new Date(formData.startTime).getTime() + formData.duration * 60000);
                            const endStr = toDateTimeLocalInput(end);
                            setFormData({ ...formData, endTime: endStr });
                            runConflictCheck(formData.startTime, endStr, formData.classTarget);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50"
                      >
                        + {formData.duration} Menit (Durasi)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          today.setHours(8, 0, 0, 0);
                          const startStr = toDateTimeLocalInput(today);
                          today.setHours(10, 0, 0, 0);
                          const endStr = toDateTimeLocalInput(today);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Hari Ini 08:00 - 10:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(8, 0, 0, 0);
                          const startStr = toDateTimeLocalInput(tomorrow);
                          tomorrow.setHours(10, 0, 0, 0);
                          const endStr = toDateTimeLocalInput(tomorrow);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Besok 08:00 - 10:00
                      </button>
                    </div>

                    {/* Conflict Indicator */}
                    {checkingConflict && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 animate-pulse pt-1">
                        <RefreshCw size={12} className="animate-spin text-purple-600" />
                        <span>Memeriksa tabrakan jadwal kelas {formData.classTarget}...</span>
                      </div>
                    )}

                    {conflicts.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                          <span>Peringatan: Jadwal Bentrok Terdeteksi! ({conflicts.length} Ujian)</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                          Target kelas <strong>{formData.classTarget}</strong> telah memiliki jadwal ujian lain pada rentang waktu ini:
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {conflicts.map((c) => (
                            <div key={c.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-[11px]">
                              <div className="font-bold text-slate-900 dark:text-white">{c.title}</div>
                              <div className="text-slate-500 flex items-center gap-2 mt-0.5 text-[10px]">
                                <span>Mapel: <strong>{c.subject}</strong></span>
                                <span>•</span>
                                <span>Kelas: <strong>{c.classTarget}</strong></span>
                                <span>•</span>
                                <span>{formatExamScheduleRange(c.startTime, c.endTime)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          <input
                            type="checkbox"
                            checked={formData.allowConflict}
                            onChange={(e) => setFormData({ ...formData, allowConflict: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span>Tetap jadwalkan bersamaan (Bypass peringatan bentrok)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guru Pembuat / Pengampu
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Petunjuk & Catatan Ujian
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruksi untuk siswa sebelum mulai..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Acak Urutan Soal (Anti-Contek)</div>
                  <div className="text-[11px] text-slate-500">Urutan butir soal akan berbeda pada tiap siswa</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : editingExam ? 'Simpan Perubahan' : 'Buat Paket Ujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Ujian */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Paket Ujian"
        message="Apakah Anda yakin ingin menghapus paket ujian ini? Semua butir soal dan riwayat nilai siswa yang telah mengerjakan akan ikut terhapus permanen."
        confirmText="Ya, Hapus Ujian"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
