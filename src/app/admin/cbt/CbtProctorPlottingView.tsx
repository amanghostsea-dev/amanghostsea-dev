'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  Printer, 
  Search, 
  Filter, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle,
  X, 
  Save, 
  Loader2, 
  Users, 
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { assignExamProctorAction, AssignProctorInput } from './actions';
import { formatExamScheduleRange } from '@/lib/cbt-schedule';
import { KopSuratConfig } from '@/app/admin/settings/types';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox,
  CbtPrintModalWrapper
} from '@/components/cbt/CbtOfficialPrintComponents';

export interface ProctorExamItem {
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

export interface TeacherUserItem {
  id: string;
  name: string;
  username: string;
  role: string;
  nisn?: string | null;
}

interface CbtProctorPlottingViewProps {
  exams: ProctorExamItem[];
  teachers: TeacherUserItem[];
  currentUser?: {
    name: string;
    role: string;
  };
  kopSuratConfig?: KopSuratConfig;
  onExamsUpdated?: (updatedExam: ProctorExamItem) => void;
}

export default function CbtProctorPlottingView({
  exams,
  teachers,
  currentUser,
  kopSuratConfig,
  onExamsUpdated,
}: CbtProctorPlottingViewProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Modal Assignment State
  const [selectedExamForPlotting, setSelectedExamForPlotting] = useState<ProctorExamItem | null>(null);
  const [formProctor1Id, setFormProctor1Id] = useState('');
  const [formProctor1Name, setFormProctor1Name] = useState('');
  const [formProctor1Nip, setFormProctor1Nip] = useState('');
  const [formProctor2Id, setFormProctor2Id] = useState('');
  const [formProctor2Name, setFormProctor2Name] = useState('');
  const [formRoomName, setFormRoomName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Print SK & Jadwal Resmi
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Available classes for filter
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    exams.forEach(e => {
      if (e.classTarget && e.classTarget !== 'Semua Kelas') set.add(e.classTarget);
    });
    return Array.from(set).sort();
  }, [exams]);

  // Statistics
  const visibleProctorExams = isSuperAdmin
    ? exams
    : exams.filter(e => {
        const u = currentUser?.name?.toLowerCase().trim() || '';
        const p1 = e.proctorName?.toLowerCase().trim() || '';
        const p2 = e.proctor2Name?.toLowerCase().trim() || '';
        return (p1 && (p1 === u || p1.includes(u) || u.includes(p1))) ||
               (p2 && (p2 === u || p2.includes(u) || u.includes(p2)));
      });
  const totalExams = visibleProctorExams.length;
  const assignedCount = visibleProctorExams.filter(e => Boolean(e.proctorName)).length;
  const unassignedCount = totalExams - assignedCount;

  // Filtered rows
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      // Guru / Pengawas hanya melihat ujian di mana namanya di-plotting sebagai pengawas oleh Admin
      if (!isSuperAdmin) {
        const u = currentUser?.name?.toLowerCase().trim() || '';
        const p1 = e.proctorName?.toLowerCase().trim() || '';
        const p2 = e.proctor2Name?.toLowerCase().trim() || '';
        const isMyProctoring = (p1 && (p1 === u || p1.includes(u) || u.includes(p1))) ||
                               (p2 && (p2 === u || p2.includes(u) || u.includes(p2)));
        if (!isMyProctoring) return false;
      }

      const q = searchQuery.toLowerCase();
      const matchSearch = 
        !q || 
        e.title.toLowerCase().includes(q) || 
        e.subject.toLowerCase().includes(q) || 
        e.classTarget.toLowerCase().includes(q) ||
        (e.proctorName && e.proctorName.toLowerCase().includes(q)) ||
        (e.roomName && e.roomName.toLowerCase().includes(q));

      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'ASSIGNED' && Boolean(e.proctorName)) ||
        (statusFilter === 'UNASSIGNED' && !e.proctorName);

      const matchClass = classFilter === 'ALL' || e.classTarget === classFilter;

      return matchSearch && matchStatus && matchClass;
    });
  }, [exams, searchQuery, statusFilter, classFilter]);

  // Open Assign Modal
  const handleOpenAssignModal = (exam: ProctorExamItem) => {
    setSelectedExamForPlotting(exam);
    setFormProctor1Id(exam.proctorId || '');
    setFormProctor1Name(exam.proctorName || '');
    setFormProctor1Nip(exam.proctorNip || '');
    setFormProctor2Id(exam.proctor2Id || '');
    setFormProctor2Name(exam.proctor2Name || '');
    setFormRoomName(exam.roomName || 'Lab Komputer 1');
  };

  // When Teacher 1 is selected from dropdown
  const handleSelectTeacher1 = (teacherId: string) => {
    setFormProctor1Id(teacherId);
    if (!teacherId) {
      setFormProctor1Name('');
      setFormProctor1Nip('');
      return;
    }
    const t = teachers.find(item => item.id === teacherId);
    if (t) {
      setFormProctor1Name(t.name);
      setFormProctor1Nip(t.nisn || '');
    }
  };

  // When Teacher 2 is selected
  const handleSelectTeacher2 = (teacherId: string) => {
    setFormProctor2Id(teacherId);
    if (!teacherId) {
      setFormProctor2Name('');
      return;
    }
    const t = teachers.find(item => item.id === teacherId);
    if (t) {
      setFormProctor2Name(t.name);
    }
  };

  // Detect schedule conflict for selected teacher
  const teacherConflictWarning = useMemo(() => {
    if (!selectedExamForPlotting || !selectedExamForPlotting.startTime || !selectedExamForPlotting.endTime || !formProctor1Name) {
      return null;
    }

    const currentStart = new Date(selectedExamForPlotting.startTime).getTime();
    const currentEnd = new Date(selectedExamForPlotting.endTime).getTime();

    const conflicting = exams.find(other => {
      if (other.id === selectedExamForPlotting.id) return false;
      if (other.proctorName !== formProctor1Name && other.proctor2Name !== formProctor1Name) return false;
      if (!other.startTime || !other.endTime) return false;

      const otherStart = new Date(other.startTime).getTime();
      const otherEnd = new Date(other.endTime).getTime();

      return Math.max(currentStart, otherStart) < Math.min(currentEnd, otherEnd);
    });

    if (conflicting) {
      return `⚠️ Peringatan: ${formProctor1Name} juga sudah ditugaskan di "${conflicting.title}" (${conflicting.classTarget} • ${conflicting.roomName || 'Ruangan'}) pada jam yang sama!`;
    }
    return null;
  }, [selectedExamForPlotting, formProctor1Name, exams]);

  // Submit Plotting Action
  const handleSavePlotting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForPlotting) return;

    setIsSaving(true);
    const input: AssignProctorInput = {
      proctorId: formProctor1Id || null,
      proctorName: formProctor1Name.trim() || null,
      proctorNip: formProctor1Nip.trim() || null,
      proctor2Id: formProctor2Id || null,
      proctor2Name: formProctor2Name.trim() || null,
      roomName: formRoomName.trim() || 'Ruang Utama',
    };

    const res = await assignExamProctorAction(selectedExamForPlotting.id, input);
    setIsSaving(false);

    if (res.success && res.exam) {
      if (onExamsUpdated) {
        onExamsUpdated(res.exam as any);
      }
      setSelectedExamForPlotting(null);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      setErrorMessage(res.error || 'Gagal menyimpan penugasan pengawas.');
    }
  };

  // Strict access guard: only Admin Utama / Super Admin can plot proctors!
  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-4 font-sans">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-black">
          🔒
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Wewenang Khusus Admin Utama
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Fitur Plotting Pengawas Ruangan hanya dapat dikelola langsung oleh Admin Utama / Super Admin demi ketertiban jadwal ujian. Guru dan pengawas tidak dapat memilih atau mengubah jadwal sendiri.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/portal/pengawas/cbt"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
          >
            <ShieldCheck size={16} />
            <span>Lihat Jadwal Tugas Pengawasan Saya</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-fade-in font-sans">
      {/* 🚀 HEADER BANNER (Ringkas & Elegan Selaras dengan Laporan) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white shadow-md border border-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Sisi Kiri: Judul & Konteks Role */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-[10px] sm:text-[11px] font-semibold border border-white/10 backdrop-blur-xs">
              <ShieldCheck size={13} className="text-blue-300" />
              <span>Kontrol Pengawasan CBT • Otoritas Penuh Admin Utama</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Plotting &amp; Penugasan Pengawas Ruangan
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/90 hidden sm:block max-w-2xl leading-relaxed">
              Atur dan kunci guru pengawas resmi untuk setiap paket ujian dan ruangan agar pelaksanaan ujian tertib, disiplin, dan terpantau.
            </p>
          </div>

          {/* Sisi Kanan: Tombol Aksi (Rapi, Sejajar, Animasi Modern & Micro-Interactions) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="group relative px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/25 font-bold text-xs flex items-center gap-2 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
              title="Cetak Surat Keputusan &amp; Jadwal Resmi Pengawas Ruangan"
            >
              <Printer size={14} className="text-blue-300 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
              <span>Cetak SK &amp; Jadwal</span>
            </button>
            <a
              href="/portal/pengawas/cbt"
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-right hover:shadow-lg hover:shadow-blue-500/40 active:scale-95 text-white font-bold text-xs flex items-center gap-2 border border-blue-400/30 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
              title="Masuk ke portal Ruang Pengawas Ujian"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <ExternalLink size={14} className="text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              <span>Buka Ruang Pengawas</span>
            </a>
          </div>
        </div>
      </div>

      {/* 🔔 SUCCESS TOAST */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 📊 SUMMARY METRICS STRIP (Sama dengan Laporan: Ringkas & Elegan) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1: Total Sesi */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Total Sesi Ujian</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {totalExams} <span className="text-[10px] font-semibold text-slate-400">Sesi</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Sudah Ada Pengawas */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <UserCheck size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Sudah Ada Pengawas</div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {assignedCount} <span className="text-[10px] font-semibold text-emerald-600/80">Ruangan</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Belum Di-plotting */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Belum Di-plotting</div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
              {unassignedCount} <span className="text-[10px] font-semibold text-slate-400">Ruangan</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Personel Guru */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Guru Siap Bertugas</div>
            <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 leading-tight">
              {teachers.length} <span className="text-[10px] font-semibold text-slate-400">Personel</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH BAR (Kompak & Rapi) */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari paket ujian, mapel, ruang, atau nama guru pengawas..."
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold hover:scale-110 active:scale-95 transition-all"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status Plotting Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all"
          >
            <option value="ALL">Semua Status Plotting</option>
            <option value="ASSIGNED">✅ Sudah Ada Pengawas ({assignedCount})</option>
            <option value="UNASSIGNED">⚠️ Belum Ada Pengawas ({unassignedCount})</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all"
          >
            <option value="ALL">Semua Rombel Kelas</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 📋 TABLE OF PLOTTING ASSIGNMENTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Paket Ujian & Mapel</th>
                <th className="py-3.5 px-4">Kelas & Ruang</th>
                <th className="py-3.5 px-4">Jadwal Pelaksanaan</th>
                <th className="py-3.5 px-4">Pengawas 1 (Utama)</th>
                <th className="py-3.5 px-4">Pengawas 2 (Pendamping)</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada jadwal ujian yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam, idx) => {
                  const scheduleText = formatExamScheduleRange(exam.startTime, exam.endTime);
                  const hasProctor = Boolean(exam.proctorName);

                  return (
                    <tr 
                      key={exam.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-150 group"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Title & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {exam.title}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                          {exam.subject} • {exam.duration} Menit
                        </div>
                      </td>

                      {/* Class & Room */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          {exam.classTarget}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={11} className="text-slate-400" />
                          <span>{exam.roomName || 'Ruang Utama'}</span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1">
                          <Clock size={12} className="text-blue-500" />
                          <span>{scheduleText}</span>
                        </div>
                        {exam.startTime && (
                          <div className="text-[10px] text-slate-400">
                            {new Date(exam.startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>

                      {/* Proctor 1 */}
                      <td className="py-3.5 px-4">
                        {hasProctor ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{exam.proctorName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono pl-3.5">
                              NIP: {exam.proctorNip || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40 animate-pulse">
                            <AlertCircle size={12} /> Belum Di-plot
                          </span>
                        )}
                      </td>

                      {/* Proctor 2 */}
                      <td className="py-3.5 px-4">
                        {exam.proctor2Name ? (
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {exam.proctor2Name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- (Opsional)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(exam)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-sm active:scale-95"
                            title="Tugaskan / Ganti Pengawas"
                          >
                            <Edit3 size={13} className="group-hover:rotate-6 transition-transform" /> Plotting
                          </button>
                          <a
                            href={`/portal/pengawas/cbt/${exam.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer hover:scale-110 active:scale-95"
                            title="Pratinjau Ruang Pengawas"
                          >
                            <ExternalLink size={14} />
                          </a>
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

      {/* ✍️ MODAL PENUGASAN PENGAWAS OLEH ADMIN */}
      {selectedExamForPlotting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="text-blue-600" size={22} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Penugasan Pengawas Ruang Ujian
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tentukan guru pengawas resmi untuk sesi ujian ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExamForPlotting(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlotting} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Info Ujian Terpilih */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Paket Ujian CBT:
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedExamForPlotting.title}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 pt-0.5">
                  <span className="font-bold text-purple-600 dark:text-purple-400">{selectedExamForPlotting.subject}</span>
                  <span>•</span>
                  <span>Target: <strong>{selectedExamForPlotting.classTarget}</strong></span>
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 pt-1">
                  <Clock size={12} />
                  <span>{formatExamScheduleRange(selectedExamForPlotting.startTime, selectedExamForPlotting.endTime)}</span>
                </div>
              </div>

              {/* Warning jika ada jadwal bentrok untuk pengawas terpilih */}
              {teacherConflictWarning && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>{teacherConflictWarning}</span>
                </div>
              )}

              {/* Input Ruang / Lab Ujian */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin size={13} className="text-blue-500" />
                  <span>Lokasi Ruang / Lab Ujian *</span>
                </label>
                <input
                  type="text"
                  value={formRoomName}
                  onChange={(e) => setFormRoomName(e.target.value)}
                  placeholder="Contoh: Lab Komputer 1 / Ruang 04"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Pengawas 1 (Utama) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <UserCheck size={13} className="text-emerald-500" />
                  <span>Guru Pengawas 1 (Utama) *</span>
                </label>
                <select
                  value={formProctor1Id}
                  onChange={(e) => handleSelectTeacher1(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Pilih Guru Pengawas 1 --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username}) - {t.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Pengawas 1 (Custom / Override) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500">Nama Lengkap Pengawas</label>
                  <input
                    type="text"
                    value={formProctor1Name}
                    onChange={(e) => setFormProctor1Name(e.target.value)}
                    placeholder="Nama Pengawas"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500">NIP / NUPTK (Opsional)</label>
                  <input
                    type="text"
                    value={formProctor1Nip}
                    onChange={(e) => setFormProctor1Nip(e.target.value)}
                    placeholder="1982031..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Pengawas 2 (Pendamping - Opsional) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-purple-500" />
                    <span>Guru Pengawas 2 (Pendamping)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <select
                  value={formProctor2Id}
                  onChange={(e) => handleSelectTeacher2(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Tanpa Pengawas 2 (Hanya 1 Pengawas) --</option>
                  {teachers
                    .filter(t => t.id !== formProctor1Id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.username})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedExamForPlotting(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Simpan Penugasan Pengawas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL CETAK SK & JADWAL PLOTTING RESMI */}
      <CbtPrintModalWrapper
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Pratinjau Surat Tugas & Jadwal Plotting Pengawas Ujian CBT"
        subtitle="Dokumen resmi penugasan pengawas ruang berbasis komputer"
        maxWidth="max-w-5xl"
        printButtonText="Cetak Dokumen SK (PDF / Print)"
      >
        <div id="cbt-printable-proctor-plotting" className="space-y-4 bg-white text-black cbt-printable-sheet">
          {/* 🏛️ KOP SURAT RESMI */}
          <CbtOfficialKopSurat
            config={kopSuratConfig}
            documentTitle="SURAT KEPUTUSAN & JADWAL PENUGASAN PENGAWAS RUANG UJIAN BERBASIS KOMPUTER (CBT)"
            documentNumber={`Nomor: 421.5 / SK-PENGAWAS / ${new Date().getFullYear()} / CBT-SMK`}
            subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
          />

          {/* Ringkasan SK */}
          <div className="text-xs text-justify leading-relaxed text-slate-800 border-l-2 border-black pl-3 py-1">
            Kepala Sekolah menugaskan nama-nama guru terlampir di bawah ini sebagai <strong>Pengawas Ruang Ujian Berbasis Komputer (CBT)</strong> untuk memastikan integritas, ketertiban ruangan, kedisiplinan rilis token, dan verifikasi kehadiran peserta didik sesuai dengan jadwal yang telah ditetapkan.
          </div>

          {/* Tabel Jadwal Penugasan */}
          <table className="w-full text-left border-collapse border border-black text-[10px] sm:text-xs">
            <thead>
              <tr className="bg-slate-200 border-b border-black text-black font-bold uppercase text-center tracking-tight">
                <th className="py-2 px-1 border-r border-black w-8">No</th>
                <th className="py-2 px-3 border-r border-black text-left">Mata Pelajaran & Paket Ujian</th>
                <th className="py-2 px-2 border-r border-black w-24">Kelas / Rombel</th>
                <th className="py-2 px-2 border-r border-black w-28">Lokasi Ruang</th>
                <th className="py-2 px-2 border-r border-black w-32">Jadwal Ujian</th>
                <th className="py-2 px-3 border-r border-black text-left">Pengawas 1 (Utama)</th>
                <th className="py-2 px-3 text-left">Pengawas 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                    Belum ada paket ujian yang terdaftar di sistem.
                  </td>
                </tr>
              ) : (
                exams.map((exam, idx) => {
                  const sched = formatExamScheduleRange(exam.startTime, exam.endTime);
                  return (
                    <tr key={exam.id} className="print-avoid-break">
                      <td className="py-2 px-1 border-r border-black font-bold text-center">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-black font-bold text-left">
                        <div>{exam.subject}</div>
                        <div className="text-[9px] font-normal text-slate-600">{exam.title}</div>
                      </td>
                      <td className="py-2 px-2 border-r border-black font-bold text-center">{exam.classTarget}</td>
                      <td className="py-2 px-2 border-r border-black font-semibold text-center">{exam.roomName || 'Lab Komputer 1'}</td>
                      <td className="py-2 px-2 border-r border-black text-[9.5px] text-center font-medium">{sched}</td>
                      <td className="py-2 px-3 border-r border-black text-left">
                        <div className="font-bold">{exam.proctorName || <span className="text-rose-700 italic">Belum Di-plot</span>}</div>
                        {exam.proctorNip && <div className="text-[9px] text-slate-600 font-mono">NIP: {exam.proctorNip}</div>}
                      </td>
                      <td className="py-2 px-3 text-left text-slate-700">
                        {exam.proctor2Name || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Keabsahan Sistem */}
          <CbtSecurityValidationBox
            examTitle="SK & Matriks Plotting Pengawas CBT"
          />

          {/* Tanda Tangan Resmi Kepala Sekolah & Panitia */}
          <CbtOfficialSignatures
            config={kopSuratConfig}
            mode="two-column"
          />
        </div>
      </CbtPrintModalWrapper>

      {/* 🌟 Center Alert Dialog */}
      {errorMessage && (
        <ConfirmModal
          isOpen={Boolean(errorMessage)}
          onClose={() => setErrorMessage(null)}
          title="Gagal Menyimpan"
          message={errorMessage}
          variant="danger"
          isAlert={true}
          confirmText="Mengerti"
        />
      )}
    </div>
  );
}

