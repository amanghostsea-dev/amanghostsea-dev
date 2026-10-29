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
  MessageSquare,
  Search,
  Check,
  FileCheck,
  AlertTriangle,
  FolderOpen,
  Link as LinkIcon,
  X,
  File,
  Download
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
  status: string;
  authorName: string | null;
  submissions: SubmissionItem[];
}

interface TugasSiswaClientProps {
  assignments: AssignmentItem[];
  studentName: string;
  studentNis?: string;
  studentClass?: string;
}

export default function TugasSiswaClient({
  assignments: initialAssignments,
  studentName,
  studentNis = '10293847',
  studentClass = 'XI RPL 1',
}: TugasSiswaClientProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'GRADED'>('ALL');

  // Form State
  const [submissionMode, setSubmissionMode] = useState<'FILE' | 'LINK'>('FILE');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [notes, setNotes] = useState('');
  const [formNis, setFormNis] = useState(studentNis);
  const [formClass, setFormClass] = useState(studentClass);

  const handleOpenSubmitModal = (assignment: AssignmentItem) => {
    setSelectedAssignment(assignment);
    const existing = assignment.submissions[0];
    if (existing) {
      setFileUrl(existing.fileUrl || '');
      setFileName(existing.fileName || '');
      setNotes(existing.notes || '');
      setSubmissionMode(existing.fileUrl?.startsWith('data:') ? 'FILE' : 'LINK');
    } else {
      setFileUrl('');
      setFileName('');
      setFileSizeStr('');
      setNotes('');
      setSubmissionMode('FILE');
    }
    setFormNis(studentNis);
    setFormClass(studentClass);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB limit check
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran berkas melebihi batas maksimal 10MB. Silakan pilih berkas yang lebih kecil atau gunakan mode Tautan Cloud (Google Drive).');
      return;
    }

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setFileName(file.name);
    setFileSizeStr(sizeFormatted);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSelectedFile = () => {
    setFileUrl('');
    setFileName('');
    setFileSizeStr('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!fileUrl && !notes.trim()) {
      alert('Harap lampirkan berkas dokumen atau tautan tugas Anda!');
      return;
    }

    setLoading(true);
    const res = await submitStudentAssignment({
      assignmentId: selectedAssignment.id,
      studentName,
      studentClass: formClass,
      studentNis: formNis,
      fileUrl,
      fileName: fileName || (submissionMode === 'LINK' ? 'Tautan Tugas Cloud' : 'Dokumen Tugas'),
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
      alert('Tugas Anda berhasil dikumpulkan ke bapak/ibu guru!');
    } else {
      alert(res.error || 'Gagal mengumpulkan tugas');
    }
    setLoading(false);
  };

  // Helper for Deadline Time
  const getDeadlineMeta = (deadlineDate: Date, isSubmitted: boolean) => {
    const diffMs = deadlineDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return {
        isExpired: true,
        isUrgent: false,
        text: 'Batas Waktu Terlewat',
        badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900',
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        isExpired: false,
        isUrgent: true,
        text: `Segera Berakhir (${diffHours}j ${diffMins}m lagi)`,
        badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse',
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      isExpired: false,
      isUrgent: false,
      text: `Sisa ${diffDays} hari lagi`,
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    };
  };

  // Summary Metrics
  const totalCount = assignments.length;
  const submittedCount = assignments.filter((a) => a.submissions.length > 0).length;
  const pendingCount = assignments.filter((a) => a.submissions.length === 0).length;
  const gradedAssignments = assignments
    .map((a) => a.submissions[0])
    .filter((s) => s && s.grade !== null && s.grade !== undefined);
  
  const avgGrade = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedAssignments.length)
    : null;

  // Filtered List
  const filteredAssignments = assignments.filter((assignment) => {
    const sub = assignment.submissions[0];
    const isSub = !!sub;
    const isGrd = sub && sub.grade !== null;

    // Search filter
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Tab filter
    let matchesTab = true;
    if (statusTab === 'PENDING') matchesTab = !isSub;
    else if (statusTab === 'SUBMITTED') matchesTab = isSub;
    else if (statusTab === 'GRADED') matchesTab = isGrd;

    return matchesSearch && matchesTab;
  });

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'S';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/portal/siswa"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Kembali ke Beranda Siswa
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/25">
                <FileText size={26} />
              </span>
              Modul Pengumpulan Tugas Siswa
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Pantau tugas terstruktur, tenggat pengumpulan, dan ulasan evaluasi nilai dari bapak/ibu guru.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
              {initials}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{studentName}</div>
              <div className="text-xs text-slate-500 font-mono">NIS: {studentNis} • {studentClass}</div>
            </div>
          </div>
        </div>

        {/* 📊 HERO STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Tugas Aktif</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              pendingCount > 0
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}>
              {pendingCount > 0 ? <Clock size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <div>
              <div className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                {pendingCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Perlu Dikerjakan</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{submittedCount}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sudah Dikumpulkan</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {avgGrade !== null ? avgGrade : '-'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {avgGrade !== null ? (avgGrade >= 85 ? 'Rata-rata: Sangat Baik' : 'Rata-rata Nilai') : 'Belum Ada Nilai'}
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 SEARCH & CATEGORY TABS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusTab('ALL')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setStatusTab('PENDING')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Belum Selesai</span>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusTab('SUBMITTED')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusTab === 'SUBMITTED'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sudah Kumpul ({submittedCount})
            </button>
            <button
              onClick={() => setStatusTab('GRADED')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusTab === 'GRADED'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sudah Dinilai ({gradedAssignments.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama tugas atau mapel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 📚 ASSIGNMENTS LIST */}
        <div className="space-y-6">
          {filteredAssignments.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={48} />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tidak Ada Tugas yang Sesuai</h3>
              <p className="text-slate-500 text-xs mt-1">
                {searchTerm
                  ? 'Tidak ditemukan tugas dengan kata kunci tersebut.'
                  : statusTab === 'PENDING'
                  ? 'Hebat! Semua tugas sekolah sudah Anda selesaikan.'
                  : 'Belum ada daftar tugas dalam kategori ini.'}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const submission = assignment.submissions[0];
              const isSubmitted = !!submission;
              const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
              const deadlineDate = new Date(assignment.deadline);
              const meta = getDeadlineMeta(deadlineDate, isSubmitted);

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden p-6 md:p-8 space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {assignment.subject}
                        </span>
                        <span className="text-xs text-slate-400">
                          Guru: <strong>{assignment.authorName || 'Guru Pengampu'}</strong>
                        </span>
                        <span className="text-xs text-slate-400">
                          • Target: {assignment.classTarget}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {assignment.title}
                      </h2>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm">
                          <Award size={15} /> Nilai: {submission.grade} / 100
                        </span>
                      ) : isSubmitted ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                            <CheckCircle2 size={14} /> Sudah Dikumpulkan
                          </span>
                          {submission.status === 'LATE' && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              Terlambat
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${meta.badgeClass}`}>
                          {meta.isUrgent ? <AlertTriangle size={14} /> : <Clock size={14} />}
                          <span>{meta.text}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description & Instruction */}
                  <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileCheck size={14} className="text-blue-600" /> Petunjuk & Instruksi Pengerjaan:
                    </p>
                    {assignment.description}

                    {assignment.fileUrl && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <a
                          href={assignment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition shadow-sm"
                        >
                          <Paperclip size={14} /> Unduh Berkas / Lampiran Materi dari Guru
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Submitted Info Card */}
                  {isSubmitted && (
                    <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <CheckCircle2 size={16} className="text-blue-600" />
                          Berkas Tugas Terkirim:
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Terkirim pada: {new Date(submission.submittedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-3">
                        {submission.fileUrl && (
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={submission.fileName || 'Tugas'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm hover:underline"
                          >
                            <ExternalLink size={13} /> {submission.fileName || 'Buka Berkas Tugas'}
                          </a>
                        )}
                        {submission.notes && (
                          <div className="text-slate-600 dark:text-slate-400 italic">
                            Catatan Anda: &quot;{submission.notes}&quot;
                          </div>
                        )}
                      </div>

                      {/* Teacher Evaluation & Grade Feedback */}
                      {submission.feedback && (
                        <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/30">
                          <MessageSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <strong className="text-purple-900 dark:text-purple-300 block font-bold">
                              Komentar & Evaluasi Guru:
                            </strong>
                            <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                              &quot;{submission.feedback}&quot;
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock size={15} className="text-amber-500" />
                      <span>
                        Batas Pengumpulan:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {deadlineDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSubmitModal(assignment)}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                        isSubmitted
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:scale-[1.02]'
                      }`}
                    >
                      <UploadCloud size={16} />
                      {isSubmitted ? 'Unggah Ulang / Perbarui Berkas' : 'Kumpulkan Tugas Sekarang →'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 📥 MODAL SUBMIT / UPLOAD TUGAS (DUAL-MODE: FILE & LINK) */}
      {isModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Form Pengumpulan Tugas
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{selectedAssignment.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Identity Confirmation */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Nama Siswa:</label>
                  <strong className="text-slate-800 dark:text-slate-200">{studentName}</strong>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Kelas / NIS:</label>
                  <strong className="text-slate-800 dark:text-slate-200">{formClass} • {formNis}</strong>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Metode Pengumpulan Berkas:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSubmissionMode('FILE')}
                    className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                      submissionMode === 'FILE'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FolderOpen size={15} /> Unggah File Langsung
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionMode('LINK')}
                    className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                      submissionMode === 'LINK'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LinkIcon size={15} /> Tautan Cloud (G-Drive)
                  </button>
                </div>
              </div>

              {/* MODE 1: FILE UPLOAD */}
              {submissionMode === 'FILE' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih File Tugas (PDF, DOCX, ZIP, Gambar maks 10MB) <span className="text-red-500">*</span>
                  </label>

                  {fileName && fileUrl ? (
                    <div className="p-4 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                          <File size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {fileName}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            Siap dikirim {fileSizeStr && `• ${fileSizeStr}`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveSelectedFile}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                        title="Hapus / Pilih berkas lain"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/30 group">
                      <UploadCloud size={32} className="text-slate-400 group-hover:text-blue-600 transition mb-2" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Klik untuk memilih berkas dari perangkat Anda
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Mendukung PDF, Word (.docx), Excel, ZIP, JPG, PNG (Maksimal 10MB)
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                /* MODE 2: CLOUD LINK INPUT */
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Dokumen Tugas (Google Drive / GitHub / Figma) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... atau link dokumen"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <div>
                    <input
                      type="text"
                      placeholder="Judul / Nama Dokumen (Contoh: Laporan_Praktikum.pdf)"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 <em>Tips:</em> Pastikan izin akses link Google Drive telah disetel ke <strong>&quot;Siapa saja yang memiliki link&quot; (Anyone with the link)</strong> agar Bapak/Ibu Guru dapat membukanya.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan untuk Guru (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan catatan tambahan mengenai tugas ini..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer Buttons */}
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
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  {loading ? 'Mengirim Berkas...' : 'Kirim Berkas Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
