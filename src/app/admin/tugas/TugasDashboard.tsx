'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Paperclip,
  Award,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { createAssignment, updateAssignment, deleteAssignment } from './actions';

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  description: string;
  deadline: Date | string;
  fileUrl: string | null;
  status: string;
  authorName: string | null;
  createdAt: Date | string;
  _count: {
    submissions: number;
  };
  submissions: {
    id: string;
    status: string;
    grade: number | null;
  }[];
}

export default function TugasDashboard({
  assignments: initialAssignments,
  dynamicClassPresets = ['Semua Kelas', 'X RPL 1', 'XI RPL 1', 'XII RPL 1', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
}: {
  assignments: AssignmentItem[];
  dynamicClassPresets?: string[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    classTarget: 'Semua Kelas',
    description: '',
    deadline: '',
    fileUrl: '',
    status: 'ACTIVE',
  });

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dateStr = defaultDate.toISOString().slice(0, 16);

    setFormData({
      title: '',
      subject: '',
      classTarget: 'Semua Kelas',
      description: '',
      deadline: dateStr,
      fileUrl: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AssignmentItem) => {
    setEditingAssignment(item);
    const dateStr = new Date(item.deadline).toISOString().slice(0, 16);

    setFormData({
      title: item.title,
      subject: item.subject,
      classTarget: item.classTarget,
      description: item.description,
      deadline: dateStr,
      fileUrl: item.fileUrl || '',
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const setPresetDeadline = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({ ...prev, deadline: d.toISOString().slice(0, 16) }));
  };

  const handleToggleStatus = async (item: AssignmentItem) => {
    setStatusLoadingId(item.id);
    const nextStatus = item.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    const res = await updateAssignment(item.id, { status: nextStatus });
    if (res.success && res.data) {
      setAssignments(
        assignments.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a))
      );
    } else {
      alert(res.error || 'Gagal mengubah status tugas');
    }
    setStatusLoadingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingAssignment) {
      const res = await updateAssignment(editingAssignment.id, formData);
      if (res.success && res.data) {
        setAssignments(
          assignments.map((a) => (a.id === editingAssignment.id ? { ...a, ...res.data } : a))
        );
        setIsModalOpen(false);
      } else {
        alert(res.error || 'Gagal mengubah tugas');
      }
    } else {
      const res = await createAssignment(formData);
      if (res.success && res.data) {
        setAssignments([
          {
            ...res.data,
            _count: { submissions: 0 },
            submissions: [],
          },
          ...assignments,
        ]);
        setIsModalOpen(false);
      } else {
        alert(res.error || 'Gagal membuat tugas');
      }
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    const res = await deleteAssignment(deleteTargetId);
    if (res.success) {
      setAssignments(assignments.filter((a) => a.id !== deleteTargetId));
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    } else {
      alert(res.error || 'Gagal menghapus tugas');
    }
    setLoading(false);
  };

  // Distinct classes for filter dropdown
  const distinctClasses = Array.from(new Set(assignments.map((a) => a.classTarget))).filter(Boolean);

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.classTarget.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesClass = classFilter === 'ALL' || a.classTarget === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((acc, curr) => acc + curr._count.submissions, 0);
  const allSubmissions = assignments.flatMap((a) => a.submissions);
  const gradedCount = allSubmissions.filter((s) => s.status === 'GRADED' && s.grade !== null).length;
  const gradedWithScores = allSubmissions.filter((s) => s.grade !== null);
  const overallAvg = gradedWithScores.length > 0
    ? Math.round(gradedWithScores.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedWithScores.length)
    : null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <FileText size={14} /> Modul Pengumpulan Tugas Siswa
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manajemen Tugas Siswa
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Buat instruksi tugas terstruktur, kelola berkas kiriman siswa, lakukan evaluasi dan rekap nilai secara otomatis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/siswa/tugas"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all shadow-sm"
          >
            <ExternalLink size={15} /> Pratinjau Portal Siswa
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} /> Beri Tugas Baru
          </button>
        </div>
      </div>

      {/* 📊 HERO STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalAssignments}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Judul Tugas</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalSubmissions}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Berkas Terkumpul</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{gradedCount} Berkas</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sudah Selesai Dinilai</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {overallAvg !== null ? `${overallAvg} / 100` : '-'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rata-rata Nilai Siswa</div>
          </div>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari tugas, mapel, kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Class Filter Dropdown */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Kelas</option>
            {distinctClasses.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          {/* Status Filter Buttons */}
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {['ALL', 'ACTIVE', 'CLOSED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Aktif' : 'Ditutup'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 📚 ASSIGNMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada tugas pada kategori ini.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Beri Tugas Baru Sekarang
            </button>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const deadlineDate = new Date(assignment.deadline);
            const isExpired = deadlineDate.getTime() < Date.now();
            const isClosed = assignment.status === 'CLOSED';
            const subs = assignment.submissions || [];
            const taskGraded = subs.filter((s) => s.grade !== null).length;
            const taskAvg = taskGraded > 0
              ? Math.round(subs.filter((s) => s.grade !== null).reduce((sum, s) => sum + (s.grade || 0), 0) / taskGraded)
              : null;

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Top Subject & Status Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                      {assignment.subject}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(assignment)}
                      disabled={statusLoadingId === assignment.id}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        isClosed
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          : isExpired
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                      }`}
                      title="Klik untuk membuka / menutup penerimaan tugas"
                    >
                      {isClosed ? (
                        <>
                          <Lock size={11} /> Ditutup
                        </>
                      ) : (
                        <>
                          <Unlock size={11} /> Aktif (Buka)
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
                    {assignment.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {assignment.description}
                  </p>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-500 flex-shrink-0" />
                      <span>
                        Deadline: <strong>{deadlineDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500 flex-shrink-0" />
                      <span>Target Kelas: <strong>{assignment.classTarget}</strong></span>
                    </div>
                    {assignment.fileUrl && (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold truncate">
                        <Paperclip size={14} className="flex-shrink-0" />
                        <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
                          Lampiran Materi Guru
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Submission & Grading Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Terkumpul:</div>
                      <div className="font-black text-slate-900 dark:text-white">
                        {assignment._count.submissions} Siswa
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Rata-rata:</div>
                      <div className="font-black text-emerald-600">
                        {taskAvg !== null ? `${taskAvg} / 100` : 'Belum Dinilai'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/tugas/${assignment.id}`}
                    className="flex-1 text-center py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    Periksa Kiriman ({assignment._count.submissions}) →
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(assignment)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    title="Edit Tugas"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(assignment.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition cursor-pointer"
                    title="Hapus Tugas"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📥 MODAL BUAT / EDIT TUGAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck size={20} className="text-blue-600" />
                {editingAssignment ? 'Edit Data Tugas Siswa' : 'Beri Tugas Baru Siswa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Praktikum Pemrograman Web - Form Validasi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pemrograman Web"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kelas
                  </label>
                  <input
                    type="text"
                    list="tugas-class-presets"
                    placeholder="Contoh: XI RPL 1 atau Semua Kelas"
                    value={formData.classTarget}
                    onChange={(e) => setFormData({ ...formData, classTarget: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="tugas-class-presets">
                    {dynamicClassPresets.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Deadline with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Batas Waktu Pengumpulan (Deadline) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Pilih Cepat:</span>
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setPresetDeadline(3)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    +3 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDeadline(7)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    +1 Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDeadline(14)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    +2 Minggu
                  </button>
                </div>

                <input
                  type="datetime-local"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi & Petunjuk Pengerjaan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Instruksi pengerjaan tugas dan kriteria penilaian..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tautan Lampiran Materi / Lembar Kerja Guru (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau link materi modul"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : editingAssignment ? 'Simpan Perubahan' : 'Terbitkan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Tugas */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Tugas Siswa"
        message="Apakah Anda yakin ingin menghapus tugas ini? Seluruh file dan riwayat pengumpulan tugas siswa akan ikut terhapus."
        confirmText="Ya, Hapus Tugas"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
