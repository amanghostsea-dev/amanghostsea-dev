'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  ExternalLink, 
  UploadCloud,
  Send,
  Award,
  MessageSquare
} from 'lucide-react';
import { submitStudentAssignment } from './actions';

interface SubmissionItem {
  id: string;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: Date | string;
  grade: number | null;
  feedback: string | null;
  status: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  description: string;
  deadline: Date | string;
  fileUrl: string | null;
  authorName: string | null;
  submissions: SubmissionItem[];
}

export default function TugasSiswaClient({
  assignments: initialAssignments,
  studentName,
}: {
  assignments: AssignmentItem[];
  studentName: string;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenSubmitModal = (assignment: AssignmentItem) => {
    setSelectedAssignment(assignment);
    const existing = assignment.submissions[0];
    setFileUrl(existing?.fileUrl || '');
    setFileName(existing?.fileName || '');
    setNotes(existing?.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setLoading(true);
    const res = await submitStudentAssignment({
      assignmentId: selectedAssignment.id,
      studentName,
      studentClass: 'XI RPL 1',
      studentNis: '10293847',
      fileUrl,
      fileName: fileName || 'Link Berkas Tugas',
      notes,
    });

    if (res.success && res.data) {
      setAssignments(
        assignments.map((a) =>
          a.id === selectedAssignment.id ? { ...a, submissions: [res.data] } : a
        )
      );
      setIsModalOpen(false);
      setSelectedAssignment(null);
    } else {
      alert(res.error || 'Gagal mengumpulkan tugas');
    }
    setLoading(false);
  };

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'S';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/portal/siswa"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Portal Siswa
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/25">
                <FileText size={24} />
              </span>
              Pengumpulan Tugas Siswa
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Daftar instruksi dan tugas mandiri dari bapak/ibu guru untuk {studentName}.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
              {initials}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</div>
              <div className="text-[10px] text-slate-500">XI - RPL 1</div>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-6">
          {assignments.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={48} />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tidak Ada Tugas Tertunda!</h3>
              <p className="text-slate-500 text-sm mt-1">Semua tugas sekolah sudah diselesaikan atau belum ada tugas baru.</p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const submission = assignment.submissions[0];
              const isSubmitted = !!submission;
              const isGraded = submission?.status === 'GRADED' && submission?.grade !== null;

              const deadlineDate = new Date(assignment.deadline);
              const isLate = deadlineDate.getTime() < Date.now() && !isSubmitted;

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 md:p-8 space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {assignment.subject}
                        </span>
                        <span className="text-xs text-slate-400">
                          Guru: {assignment.authorName || 'Guru Pengampu'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {assignment.title}
                      </h2>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <Award size={14} /> Nilai: {submission.grade} / 100
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                          <CheckCircle2 size={14} /> Sudah Dikumpulkan
                        </span>
                      ) : isLate ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          <AlertCircle size={14} /> Batas Waktu Terlewat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock size={14} /> Belum Dikumpulkan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description / Instructions */}
                  <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
                      Petunjuk & Instruksi Guru:
                    </p>
                    {assignment.description}

                    {assignment.fileUrl && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <a
                          href={assignment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Paperclip size={14} /> Unduh / Buka Lampiran Materi Guru
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Submission Info / Feedback */}
                  {isSubmitted && (
                    <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <CheckCircle2 size={16} className="text-blue-600" /> Berkas Tugas yang Anda Kirim:
                        </span>
                        <span className="text-slate-500">
                          Dikirim pada: {new Date(submission.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {submission.fileUrl && (
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            <ExternalLink size={14} /> {submission.fileName || submission.fileUrl}
                          </a>
                        )}
                        {submission.notes && (
                          <p className="mt-1 text-slate-600 dark:text-slate-400 italic">
                            Catatan Anda: &quot;{submission.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Teacher Feedback */}
                      {submission.feedback && (
                        <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5">
                          <MessageSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <strong className="text-purple-900 dark:text-purple-300 block">Feedback / Komentar Guru:</strong>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5">&quot;{submission.feedback}&quot;</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom Footer Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" />
                      <span>
                        Batas Waktu:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {deadlineDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </strong>
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenSubmitModal(assignment)}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                        isSubmitted
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:scale-[1.02]'
                      }`}
                    >
                      <UploadCloud size={16} />
                      {isSubmitted ? 'Perbarui / Unggah Ulang Berkas' : 'Kumpulkan Tugas Sekarang'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Kumpulkan Tugas */}
      {isModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Kumpulkan Berkas Tugas
                </h3>
                <p className="text-xs text-slate-500">{selectedAssignment.title}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Berkas Tugas (Google Drive / GitHub / PDF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... atau link repository"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Pastikan link Google Drive sudah diatur agar bisa diakses guru (Akses Publik / Anyone with link).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Dokumen / File (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tugas_ERD_BudiSantoso_XI-RPL1.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan untuk Guru (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Keterangan tambahan jika ada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {loading ? 'Mengirim...' : 'Kirim Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
