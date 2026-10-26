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
  Download
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

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Back button & Header */}
      <div>
        <Link
          href="/admin/tugas"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Tugas
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {assignment.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Kelas: {assignment.classTarget}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Deadline: {deadlineDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
            <p className="text-slate-500 text-sm mt-1 whitespace-pre-wrap">{assignment.description}</p>
            {assignment.fileUrl && (
              <div className="mt-3">
                <a
                  href={assignment.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline"
                >
                  <Paperclip size={14} /> Buka Lampiran Soal Guru
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> Berkas Tugas Terkumpul ({submissions.length})
          </h2>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada siswa yang mengumpulkan tugas ini.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Nama Siswa</th>
                    <th className="py-3.5 px-6">Waktu Kumpul</th>
                    <th className="py-3.5 px-6">Berkas / Link Tugas</th>
                    <th className="py-3.5 px-6">Catatan Siswa</th>
                    <th className="py-3.5 px-6">Nilai & Feedback</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submissions.map((sub) => {
                    const submitDate = new Date(sub.submittedAt);
                    const isLate = submitDate.getTime() > deadlineDate.getTime();

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                          <div className="text-xs text-slate-500">{sub.studentNis || '-'} • {sub.studentClass || '-'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {submitDate.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                          {isLate ? (
                            <span className="text-[10px] text-red-600 font-semibold">Terlambat</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold">Tepat Waktu</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {sub.fileUrl ? (
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-xs hover:bg-blue-100 transition-colors"
                            >
                              <Download size={14} /> {sub.fileName || 'Lihat Dokumen'}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada file</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {sub.notes || '-'}
                        </td>
                        <td className="py-4 px-6">
                          {sub.grade !== null ? (
                            <div>
                              <span className="inline-flex px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Nilai: {sub.grade} / 100
                              </span>
                              {sub.feedback && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs truncate">
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
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                            >
                              <Edit3 size={12} /> {sub.grade !== null ? 'Ubah Nilai' : 'Beri Nilai'}
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTargetId(sub.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg"
                              title="Hapus Pengumpulan"
                            >
                              <Trash2 size={16} />
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

      {/* Modal Beri Nilai */}
      {isGradeModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Penilaian Tugas Siswa
              </h3>
              <button
                onClick={() => setIsGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Siswa:</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedSubmission.studentName} ({selectedSubmission.studentClass})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nilai Skor (0 - 100) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Masukan Guru (Feedback)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bagus, pemahamannya sudah tepat..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/30 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Submission */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDeleteSubmission}
        title="Hapus Pengumpulan Tugas"
        message="Apakah Anda yakin ingin menghapus pengumpulan tugas siswa ini?"
        confirmText="Ya, Hapus"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
