'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Paperclip, 
  Download,
  Search,
  Award,
  Sparkles,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  File
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { gradeSubmission, deleteSubmission } from '../actions';

interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentName: string;
  studentNis: string | null;
  studentClass: string | null;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: Date | string;
  grade: number | null;
  feedback: string | null;
  status: string;
}

interface AssignmentReviewProps {
  assignment: {
    id: string;
    title: string;
    subject: string;
    classTarget: string;
    description: string;
    deadline: Date | string;
    fileUrl: string | null;
    status: string;
    submissions: SubmissionItem[];
  };
}

export default function SubmissionReviewClient({ assignment }: AssignmentReviewProps) {
  const [submissions, setSubmissions] = useState(assignment.submissions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNGRADED' | 'GRADED' | 'LATE'>('ALL');

  // Grade Modal State
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deadlineDate = new Date(assignment.deadline);

  const handleOpenGradeModal = (sub: SubmissionItem) => {
    setSelectedSubmission(sub);
    setGradeInput(sub.grade ?? 85);
    setFeedbackInput(sub.feedback ?? '');
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setLoading(true);
    const res = await gradeSubmission(
      selectedSubmission.id,
      assignment.id,
      gradeInput,
      feedbackInput
    );

    if (res.success && res.data) {
      setSubmissions(
        submissions.map((s) => (s.id === selectedSubmission.id ? { ...s, ...res.data } : s))
      );
      setIsGradeModalOpen(false);
      setSelectedSubmission(null);
    } else {
      alert(res.error || 'Gagal menyimpan nilai');
    }
    setLoading(false);
  };

  const confirmDeleteSubmission = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    const res = await deleteSubmission(deleteTargetId, assignment.id);
    if (res.success) {
      setSubmissions(submissions.filter((s) => s.id !== deleteTargetId));
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    } else {
      alert(res.error || 'Gagal menghapus kiriman');
    }
    setLoading(false);
  };

  // Export Rekap Nilai ke Excel (.CSV)
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      alert('Belum ada berkas tugas siswa yang terkumpul untuk diunduh.');
      return;
    }

    const headers = [
      'No',
      'Nama Siswa',
      'NIS',
      'Kelas',
      'Waktu Pengumpulan',
      'Ketepatan Waktu',
      'Nama Berkas',
      'Nilai Akhir',
      'Catatan Siswa',
      'Feedback Guru',
    ];

    const rows = submissions.map((sub, index) => {
      const submitDate = new Date(sub.submittedAt);
      const isLate = submitDate.getTime() > deadlineDate.getTime() || sub.status === 'LATE';

      return [
        index + 1,
        `"${sub.studentName.replace(/"/g, '""')}"`,
        `"${(sub.studentNis || '').replace(/"/g, '""')}"`,
        `"${(sub.studentClass || '').replace(/"/g, '""')}"`,
        `"${submitDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}"`,
        isLate ? '"Terlambat"' : '"Tepat Waktu"',
        `"${(sub.fileName || 'Berkas Tugas').replace(/"/g, '""')}"`,
        sub.grade !== null ? sub.grade : '"Belum Dinilai"',
        `"${(sub.notes || '').replace(/"/g, '""')}"`,
        `"${(sub.feedback || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFFsep=;\r\n' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_Tugas_${assignment.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.grade !== null);
  const gradedCount = gradedSubmissions.length;
  const ungradedCount = totalSubmissions - gradedCount;
  const lateCount = submissions.filter((s) => {
    const d = new Date(s.submittedAt);
    return d.getTime() > deadlineDate.getTime() || s.status === 'LATE';
  }).length;

  const avgGrade = gradedCount > 0
    ? Math.round(gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedCount)
    : null;

  const maxGrade = gradedCount > 0
    ? Math.max(...gradedSubmissions.map((s) => s.grade || 0))
    : null;

  // Filtered List
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.studentNis && sub.studentNis.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.studentClass && sub.studentClass.toLowerCase().includes(searchTerm.toLowerCase()));

    const isGraded = sub.grade !== null;
    const isLate = new Date(sub.submittedAt).getTime() > deadlineDate.getTime() || sub.status === 'LATE';

    let matchesFilter = true;
    if (statusFilter === 'UNGRADED') matchesFilter = !isGraded;
    else if (statusFilter === 'GRADED') matchesFilter = isGraded;
    else if (statusFilter === 'LATE') matchesFilter = isLate;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Back button & Header */}
      <div>
        <Link
          href="/admin/tugas"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Tugas
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {assignment.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Kelas Target: {assignment.classTarget}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Deadline: {deadlineDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{assignment.title}</h1>
            <p className="text-slate-500 text-sm mt-1 whitespace-pre-wrap max-w-3xl leading-relaxed">{assignment.description}</p>
            {assignment.fileUrl && (
              <div className="mt-3">
                <a
                  href={assignment.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition shadow-sm"
                >
                  <Paperclip size={14} /> Buka Lampiran Soal Guru
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download size={15} /> Unduh Rekap Nilai (Excel)
            </button>
          </div>
        </div>
      </div>

      {/* 📊 SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Tugas Terkumpul</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {totalSubmissions} Siswa
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 uppercase">Sudah Dinilai</div>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">
            {gradedCount} / {totalSubmissions}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-blue-600 uppercase">Rata-rata Nilai</div>
          <div className="text-2xl font-black text-blue-600 mt-0.5">
            {avgGrade !== null ? `${avgGrade} / 100` : '-'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-purple-600 uppercase">Nilai Tertinggi</div>
          <div className="text-2xl font-black text-purple-600 mt-0.5">
            {maxGrade !== null ? `${maxGrade} / 100` : '-'}
          </div>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua ({totalSubmissions})
          </button>
          <button
            onClick={() => setStatusFilter('UNGRADED')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'UNGRADED'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Belum Dinilai ({ungradedCount})
          </button>
          <button
            onClick={() => setStatusFilter('GRADED')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'GRADED'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Sudah Dinilai ({gradedCount})
          </button>
          <button
            onClick={() => setStatusFilter('LATE')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'LATE'
                ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Terlambat ({lateCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari siswa atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">
              {searchTerm ? 'Tidak ada siswa yang sesuai pencarian.' : 'Belum ada berkas tugas siswa pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Nama Siswa</th>
                    <th className="py-3.5 px-6">Waktu Kumpul</th>
                    <th className="py-3.5 px-6">Berkas Dokumen</th>
                    <th className="py-3.5 px-6">Catatan Siswa</th>
                    <th className="py-3.5 px-6">Nilai & Evaluasi</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSubmissions.map((sub) => {
                    const submitDate = new Date(sub.submittedAt);
                    const isLate = submitDate.getTime() > deadlineDate.getTime() || sub.status === 'LATE';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                          <div className="text-xs text-slate-500">{sub.studentNis || '-'} • {sub.studentClass || '-'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {submitDate.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                          {isLate ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 mt-0.5">
                              Terlambat
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 mt-0.5">
                              Tepat Waktu
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {sub.fileUrl ? (
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={sub.fileName || 'Tugas_Siswa'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition shadow-sm max-w-[200px] truncate"
                              title={sub.fileName || 'Buka Berkas'}
                            >
                              <File size={14} className="flex-shrink-0" />
                              <span className="truncate">{sub.fileName || 'Lihat Dokumen'}</span>
                              <ExternalLink size={12} className="flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Hanya Catatan Teks</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          <p className="line-clamp-2">{sub.notes || '-'}</p>
                        </td>
                        <td className="py-4 px-6">
                          {sub.grade !== null ? (
                            <div>
                              <span className="inline-flex px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm">
                                {sub.grade} / 100
                              </span>
                              {sub.feedback && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs line-clamp-1">
                                  &quot;{sub.feedback}&quot;
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              Belum Dinilai
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenGradeModal(sub)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={13} /> {sub.grade !== null ? 'Ubah Nilai' : 'Beri Nilai'}
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTargetId(sub.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition rounded-lg cursor-pointer"
                              title="Hapus Pengumpulan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ✏️ MODAL PENILAIAN CEPAT (QUICK GRADING) */}
      {isGradeModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Award size={18} className="text-blue-600" />
                  Penilaian Berkas Siswa
                </h3>
                <p className="text-xs text-slate-500">{selectedSubmission.studentName} ({selectedSubmission.studentClass})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              {/* Presets Nilai Cepat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nilai Angka (Skala 0 - 100) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Pilih Cepat:</span>
                </div>

                <div className="flex items-center gap-1.5 mb-2.5">
                  {[100, 95, 90, 85, 80, 75].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGradeInput(preset)}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        gradeInput === preset
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Presets Feedback Cepat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Komentar / Feedback untuk Siswa (Opsional)
                  </label>
                </div>

                <div className="space-y-1 mb-2">
                  {[
                    'Tugas sangat baik, lengkap dan rapi! 🌟',
                    'Tugas lengkap dan sesuai dengan instruksi yang diberikan. 👍',
                    'Sudah baik, pertahankan dan terus tingkatkan!',
                    'Mohon perbaiki bagian yang kurang lengkap sesuai petunjuk.',
                  ].map((presetText) => (
                    <button
                      key={presetText}
                      type="button"
                      onClick={() => setFeedbackInput(presetText)}
                      className="w-full text-left p-1.5 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition truncate cursor-pointer"
                    >
                      + &quot;{presetText}&quot;
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="Ketik catatan evaluasi guru di sini..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Nilai Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Kiriman Siswa */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDeleteSubmission}
        title="Hapus Kiriman Tugas Siswa"
        message="Apakah Anda yakin ingin menghapus berkas tugas siswa ini? Siswa bersangkutan akan dapat mengunggah ulang tugasnya."
        confirmText="Ya, Hapus"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
