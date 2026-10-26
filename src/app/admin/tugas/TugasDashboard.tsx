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
  Paperclip
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

export default function TugasDashboard({ assignments: initialAssignments }: { assignments: AssignmentItem[] }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [loading, setLoading] = useState(false);
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
    // Default deadline 7 days from now
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

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.classTarget.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((acc, curr) => acc + curr._count.submissions, 0);
  const gradedCount = assignments
    .flatMap((a) => a.submissions)
    .filter((s) => s.status === 'GRADED').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <FileText size={14} /> Modul Pengumpulan Tugas Siswa
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Tugas Siswa
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Buat instruksi tugas, tentukan batas waktu pengumpulan, periksa berkas siswa, dan berikan penilaian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/siswa/tugas"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <ExternalLink size={16} /> Preview Tampilan Siswa
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> Beri Tugas Baru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalAssignments}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Judul Tugas</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalSubmissions}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tugas Dikumpulkan</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{gradedCount} Berkas</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sudah Diperiksa & Dinilai</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari tugas, mapel, kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Aktif' : 'Ditutup'}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada tugas dibuat.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Beri Tugas Sekarang
            </button>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const deadlineDate = new Date(assignment.deadline);
            const isExpired = deadlineDate.getTime() < Date.now();

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                      {assignment.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isExpired
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      {isExpired ? 'Batas Waktu Lewat' : 'Masih Dibuka'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {assignment.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">
                    {assignment.description}
                  </p>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-500" />
                      <span>
                        Deadline: <strong>{deadlineDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" />
                      <span>Kelas: {assignment.classTarget}</span>
                    </div>
                    {assignment.fileUrl && (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        <Paperclip size={14} />
                        <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
                          Ada Lampiran Materi/Soal
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    Terkumpul: <strong className="text-slate-800 dark:text-slate-200">{assignment._count.submissions} Siswa</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/tugas/${assignment.id}`}
                    className="flex-1 text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                  >
                    Periksa Kiriman Siswa ({assignment._count.submissions})
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(assignment)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Tugas"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(assignment.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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

      {/* Modal Buat / Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingAssignment ? 'Edit Tugas Siswa' : 'Beri Tugas Baru'}
              </h3>
              <button
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
                  placeholder="Contoh: Tugas 01: Slicing Halaman Web"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
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
                    placeholder="Contoh: Basis Data"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: XI RPL 1 atau Semua Kelas"
                    value={formData.classTarget}
                    onChange={(e) => setFormData({ ...formData, classTarget: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Waktu Pengumpulan (Deadline) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi & Petunjuk Tugas <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Instruksi pengerjaan tugas dan format pengumpulan..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Lampiran Materi / Soal (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau link materi"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/30 disabled:opacity-50"
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
        title="Hapus Tugas"
        message="Apakah Anda yakin ingin menghapus tugas ini? Seluruh file dan riwayat pengumpulan tugas siswa akan ikut terhapus."
        confirmText="Ya, Hapus Tugas"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
