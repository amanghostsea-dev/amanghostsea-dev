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
  Award
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { createExam, updateExam, deleteExam } from './actions';

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

export default function CbtDashboard({ exams: initialExams }: { exams: ExamItem[] }) {
  const [exams, setExams] = useState(initialExams);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    classTarget: 'Semua Kelas',
    duration: 60,
    token: '',
    description: '',
    status: 'PUBLISHED',
    shuffleQuestions: true,
  });

  const handleOpenCreate = () => {
    setEditingExam(null);
    setFormData({
      title: '',
      subject: '',
      classTarget: 'Semua Kelas',
      duration: 60,
      token: '',
      description: '',
      status: 'PUBLISHED',
      shuffleQuestions: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: ExamItem) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      subject: exam.subject,
      classTarget: exam.classTarget,
      duration: exam.duration,
      token: exam.token || '',
      description: exam.description || '',
      status: exam.status,
      shuffleQuestions: exam.shuffleQuestions,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingExam) {
      const res = await updateExam(editingExam.id, formData);
      if (res.success && res.data) {
        setExams(exams.map((ex) => (ex.id === editingExam.id ? { ...ex, ...res.data } : ex)));
        setIsModalOpen(false);
      } else {
        alert(res.error || 'Gagal mengubah ujian');
      }
    } else {
      const res = await createExam(formData);
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
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
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
            <BookOpen size={14} /> Smart CBT Engine (Next.js Native)
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Ujian Online (CBT)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola jadwal ujian, bank soal pilihan ganda, acak soal, token ujian, serta rekap nilai siswa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/siswa/cbt"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <ExternalLink size={16} /> Preview Tampilan Siswa
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> Buat Ujian Baru
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

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari ujian, mapel, kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'PUBLISHED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Status'
                : st === 'ACTIVE'
                ? 'Sesi Aktif (Live)'
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
            <p className="text-slate-500 font-medium">Belum ada paket ujian ditemukan.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
            >
              Buat Ujian Sekarang
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                    {exam.subject}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      exam.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold'
                        : exam.status === 'PUBLISHED'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {exam.status === 'ACTIVE'
                      ? '🟢 Sesi Aktif'
                      : exam.status === 'PUBLISHED'
                      ? '⏳ Ruang Tunggu'
                      : 'Draft'}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors">
                  {exam.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {exam.description || 'Tidak ada deskripsi tambahan.'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
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
                    <span>{exam.token ? `Token: ${exam.token}` : 'Tanpa Token'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Mengerjakan: <strong className="text-slate-800 dark:text-slate-200">{exam._count.attempts} Siswa</strong></span>
                  {exam.shuffleQuestions && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Acak Soal ON</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/cbt/${exam.id}`}
                  className="flex-1 text-center py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                >
                  Kelola Soal & Rekap Nilai
                </Link>
                <button
                  onClick={() => handleOpenEdit(exam)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Edit Pengaturan Ujian"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => {
                    setDeleteTargetId(exam.id);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Hapus Ujian"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Buat / Edit Ujian */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingExam ? 'Edit Pengaturan Ujian' : 'Buat Paket Ujian Baru'}
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
                  Judul Ujian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Akhir Semester Ganjil"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
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
                    placeholder="Contoh: Pemrograman Web"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi (Menit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Token Masuk (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika bebas"
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Petunjuk Ujian
                </label>
                <textarea
                  rows={3}
                  placeholder="Petunjuk pengerjaan untuk siswa..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Acak Urutan Soal</div>
                  <div className="text-[11px] text-slate-500">Mencegah contek antar siswa</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Status Publikasi</div>
                  <div className="text-[11px] text-slate-500">Jika Aktif, siswa dapat melihat ujian ini</div>
                </div>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold"
                >
                  <option value="PUBLISHED">Aktif (Published)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Arsip</option>
                </select>
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/30 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : editingExam ? 'Simpan Perubahan' : 'Buat Ujian'}
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
