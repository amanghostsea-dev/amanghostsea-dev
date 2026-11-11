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
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox 
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
      alert(res.error || 'Gagal menyimpan penugasan pengawas.');
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
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 🚀 HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold">
              <ShieldCheck size={14} className="text-blue-300" />
              Kontrol Pengawasan CBT • Otoritas Penuh Admin Utama
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Plotting & Penugasan Pengawas Ruangan
            </h2>
            <p className="text-xs md:text-sm text-blue-200 max-w-2xl leading-relaxed">
              Atur dan kunci guru pengawas resmi untuk setiap paket ujian dan ruangan. Pengawas tidak dapat memilih jadwal sesukanya agar pelaksanaan ujian di seluruh ruang kelas tetap tertib, disiplin, dan terpantau.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm"
            >
              <Printer size={16} /> Cetak SK & Jadwal Resmi
            </button>
            <a
              href="/portal/pengawas/cbt"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/30 cursor-pointer"
            >
              <ExternalLink size={16} /> Buka Ruang Pengawas
            </a>
          </div>
        </div>
      </div>

      {/* 🔔 SUCCESS TOAST */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 📊 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <BookOpen size={14} className="text-blue-500" /> Total Paket Sesi Ujian
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalExams} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <UserCheck size={14} className="text-emerald-500" /> Sudah Memiliki Pengawas
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {assignedCount} <span className="text-xs font-normal text-slate-400">Ruangan</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-500" /> Belum Di-plotting
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {unassignedCount} <span className="text-xs font-normal text-slate-400">Ruangan</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Users size={14} className="text-purple-500" /> Guru Siap Bertugas
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {teachers.length} <span className="text-xs font-normal text-slate-400">Personel Guru</span>
          </div>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ujian, pengawas, atau ruang..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Plotting Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status Plotting</option>
            <option value="ASSIGNED">✅ Sudah Ada Pengawas ({assignedCount})</option>
            <option value="UNASSIGNED">⚠️ Belum Ada Pengawas ({unassignedCount})</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Rombel Kelas</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 📋 TABLE OF PLOTTING ASSIGNMENTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
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
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Title & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
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
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{exam.proctorName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono pl-3.5">
                              NIP: {exam.proctorNip || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
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
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Tugaskan / Ganti Pengawas"
                          >
                            <Edit3 size={13} /> Plotting
                          </button>
                          <a
                            href={`/portal/pengawas/cbt/${exam.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
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
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <Printer className="text-blue-600" size={20} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Pratinjau Surat Tugas & Jadwal Plotting Pengawas Ujian CBT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dokumen resmi penugasan pengawas ruang berbasis komputer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="cbt-printable-proctor-plotting" className="space-y-4 bg-white text-black">
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
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/25"
              >
                <Printer size={15} /> Cetak Dokumen SK (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

