'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Users, 
  FileText, 
  Award, 
  AlertTriangle, 
  Clock, 
  Key, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { createQuestion, deleteQuestion, deleteAttempt } from '../actions';

interface QuestionItem {
  id: string;
  examId: string;
  questionText: string;
  options: string;
  correctAnswer: string;
  points: number;
  order: number;
}

interface AttemptItem {
  id: string;
  examId: string;
  studentName: string;
  studentNis: string | null;
  studentClass: string | null;
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  status: string;
  tabSwitchCount: number;
  startedAt: Date | string;
  submittedAt: Date | string | null;
}

interface ExamDetailProps {
  exam: {
    id: string;
    title: string;
    subject: string;
    classTarget: string;
    duration: number;
    token: string | null;
    description: string | null;
    status: string;
    shuffleQuestions: boolean;
    questions: QuestionItem[];
    attempts: AttemptItem[];
  };
}

export default function ExamDetailClient({ exam }: ExamDetailProps) {
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [questions, setQuestions] = useState(exam.questions);
  const [attempts, setAttempts] = useState(exam.attempts);

  // Modal Create Question
  const [isAddQuestionModal, setIsAddQuestionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('0');
  const [points, setPoints] = useState(10);

  // Delete Question state
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [isDeleteQModal, setIsDeleteQModal] = useState(false);

  // Delete Attempt state
  const [deleteAttemptId, setDeleteAttemptId] = useState<string | null>(null);
  const [isDeleteAttemptModal, setIsDeleteAttemptModal] = useState(false);

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (options.some((opt) => !opt.trim())) {
      alert('Semua pilihan jawaban A, B, C, D harus diisi!');
      return;
    }

    setLoading(true);
    const res = await createQuestion({
      examId: exam.id,
      questionText,
      options,
      correctAnswer,
      points,
    });

    if (res.success && res.data) {
      setQuestions([...questions, res.data]);
      setIsAddQuestionModal(false);
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('0');
    } else {
      alert(res.error || 'Gagal menambahkan soal.');
    }
    setLoading(false);
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQId) return;
    setLoading(true);
    const res = await deleteQuestion(deleteQId, exam.id);
    if (res.success) {
      setQuestions(questions.filter((q) => q.id !== deleteQId));
      setIsDeleteQModal(false);
      setDeleteQId(null);
    } else {
      alert(res.error || 'Gagal menghapus soal.');
    }
    setLoading(false);
  };

  const confirmDeleteAttempt = async () => {
    if (!deleteAttemptId) return;
    setLoading(true);
    const res = await deleteAttempt(deleteAttemptId, exam.id);
    if (res.success) {
      setAttempts(attempts.filter((a) => a.id !== deleteAttemptId));
      setIsDeleteAttemptModal(false);
      setDeleteAttemptId(null);
    } else {
      alert(res.error || 'Gagal menghapus riwayat pengerjaan siswa.');
    }
    setLoading(false);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Back button & Title */}
      <div>
        <Link
          href="/admin/cbt"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Ujian
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Kelas: {exam.classTarget}
              </span>
              {exam.token && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Token: {exam.token}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{exam.description || 'Tidak ada deskripsi khusus.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/portal/siswa/cbt/${exam.id}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              <ExternalLink size={16} /> Buka Ruang Ujian
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 pb-4 font-semibold text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'questions'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText size={18} />
          Bank Soal ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 pb-4 font-semibold text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'results'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Award size={18} />
          Hasil & Rekap Nilai Siswa ({attempts.length})
        </button>
      </div>

      {/* TAB 1: BANK SOAL */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Butir Soal</h2>
              <p className="text-xs text-slate-500">Total Nilai Maksimal: {totalPoints} Poin</p>
            </div>
            <button
              onClick={() => setIsAddQuestionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/25 transition-all"
            >
              <Plus size={16} /> Tambah Soal Pilihan Ganda
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <HelpCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-500 font-medium">Belum ada butir soal dalam paket ujian ini.</p>
              <button
                onClick={() => setIsAddQuestionModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold"
              >
                Buat Soal Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                let parsedOptions: string[] = [];
                try {
                  parsedOptions = JSON.parse(q.options);
                } catch {
                  parsedOptions = [];
                }
                const correctIdx = parseInt(q.correctAnswer, 10);

                return (
                  <div
                    key={q.id}
                    className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Bobot: {q.points} Poin
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setDeleteQId(q.id);
                          setIsDeleteQModal(true);
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Hapus Soal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 text-slate-900 dark:text-white font-medium text-base whitespace-pre-wrap">
                      {q.questionText}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {parsedOptions.map((opt, oIdx) => {
                        const isCorrect = oIdx === correctIdx;
                        const label = String.fromCharCode(65 + oIdx); // A, B, C, D
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl border text-sm flex items-start gap-3 transition-colors ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {label}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && (
                              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP HASIL & NILAI SISWA */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rekap Nilai Siswa</h2>
              <p className="text-xs text-slate-500">
                Memantau nilai akhir, durasi pengerjaan, dan catatan pelanggaran anti-curang (tab-switch).
              </p>
            </div>
          </div>

          {attempts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-500 font-medium">Belum ada siswa yang mengerjakan ujian ini.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">Nama Siswa</th>
                      <th className="py-3.5 px-6">NIS & Kelas</th>
                      <th className="py-3.5 px-6">Skor Akhir</th>
                      <th className="py-3.5 px-6">Benar / Soal</th>
                      <th className="py-3.5 px-6">Anti-Curang (Tab Switch)</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                          {att.studentName}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {att.studentNis || '-'} • {att.studentClass || '-'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-3 py-1 rounded-full font-bold text-sm ${
                            att.score >= 75
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {att.score} / 100
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                          {att.totalCorrect} dari {att.totalQuestions} soal
                        </td>
                        <td className="py-4 px-6">
                          {att.tabSwitchCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              <AlertTriangle size={12} /> {att.tabSwitchCount}x Pindah Tab
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle size={12} /> Bersih (0x)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            att.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                          }`}>
                            {att.status === 'SUBMITTED' ? 'Selesai' : 'Sedang Ujian'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setDeleteAttemptId(att.id);
                              setIsDeleteAttemptModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg"
                            title="Reset / Hapus Pengerjaan"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah Soal Pilihan Ganda */}
      {isAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Tambah Butir Soal Pilihan Ganda
              </h3>
              <button
                onClick={() => setIsAddQuestionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pertanyaan / Isi Soal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan pertanyaan soal ujian di sini..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilihan Jawaban (A, B, C, D) & Tentukan Kunci Jawaban Benar <span className="text-red-500">*</span>
                </label>

                {options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isChecked = correctAnswer === String(idx);

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctAnswerOption"
                        checked={isChecked}
                        onChange={() => setCorrectAnswer(String(idx))}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-sm w-5">{label}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Teks pilihan jawaban ${label}...`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                      {isChecked && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} /> Kunci Jawaban
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bobot Poin
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/30 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Butir Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Soal */}
      <ConfirmModal
        isOpen={isDeleteQModal}
        onClose={() => {
          setIsDeleteQModal(false);
          setDeleteQId(null);
        }}
        onConfirm={confirmDeleteQuestion}
        title="Hapus Butir Soal"
        message="Apakah Anda yakin ingin menghapus butir soal ini dari paket ujian?"
        confirmText="Ya, Hapus Soal"
        variant="danger"
        isLoading={loading}
      />

      {/* Modal Reset Attempt Siswa */}
      <ConfirmModal
        isOpen={isDeleteAttemptModal}
        onClose={() => {
          setIsDeleteAttemptModal(false);
          setDeleteAttemptId(null);
        }}
        onConfirm={confirmDeleteAttempt}
        title="Reset Pengerjaan Siswa"
        message="Apakah Anda yakin ingin menghapus riwayat ujian siswa ini? Siswa akan dapat mengerjakan ulang dari awal."
        confirmText="Ya, Reset Ujian"
        variant="warning"
        isLoading={loading}
      />
    </div>
  );
}
