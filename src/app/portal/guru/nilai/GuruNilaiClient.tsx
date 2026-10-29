'use client';

import { useState } from 'react';
import { 
  Award, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  Clock, 
  UserCheck, 
  Check, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateSingleGrade, batchSaveGrades } from './actions';
import { computeFinalScore, computeGradePredicate } from '@/lib/subject-seed';

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  category: string;
  classTarget: string;
  teacherName: string | null;
  day: string | null;
  time: string | null;
  room: string | null;
  kkm: number;
  credits: number;
}

interface GradeRecord {
  id: string;
  subjectId: string;
  studentName: string;
  studentNis: string | null;
  studentClass: string;
  assignment: number;
  midExam: number;
  finalExam: number;
  finalGrade: string;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: Date | string;
}

interface GuruNilaiClientProps {
  subjects: SubjectItem[];
  activeSubject: SubjectItem | null;
  initialGrades: GradeRecord[];
  teacherName: string;
}

export default function GuruNilaiClient({
  subjects,
  activeSubject,
  initialGrades,
  teacherName,
}: GuruNilaiClientProps) {
  const router = useRouter();

  const [grades, setGrades] = useState<GradeRecord[]>(initialGrades);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(activeSubject?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || activeSubject;
  const kkm = currentSubject?.kkm || 75;

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    router.push(`/portal/guru/nilai?subjectId=${newSubjectId}`);
  };

  const handleInputChange = (
    gradeId: string,
    field: 'assignment' | 'midExam' | 'finalExam' | 'notes',
    value: string | number
  ) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.id !== gradeId) return g;

        const updated = { ...g, [field]: value };
        if (field !== 'notes') {
          const numValue = Math.min(100, Math.max(0, Number(value) || 0));
          updated[field] = numValue;

          const fScore = computeFinalScore(
            field === 'assignment' ? numValue : g.assignment,
            field === 'midExam' ? numValue : g.midExam,
            field === 'finalExam' ? numValue : g.finalExam
          );
          updated.finalGrade = computeGradePredicate(fScore);
        }
        return updated;
      })
    );
  };

  const handleSaveRow = async (g: GradeRecord) => {
    setRowSavingId(g.id);
    try {
      const res = await updateSingleGrade(g.id, {
        assignment: g.assignment,
        midExam: g.midExam,
        finalExam: g.finalExam,
        notes: g.notes || '',
      });

      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Nilai ${g.studentName} berhasil disimpan!`);
      }
    } catch {
      showNotify('error', 'Gagal menyimpan nilai');
    } finally {
      setRowSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!currentSubject) return;
    setIsSaving(true);
    try {
      const payload = grades.map((g) => ({
        id: g.id,
        assignment: g.assignment,
        midExam: g.midExam,
        finalExam: g.finalExam,
        notes: g.notes || '',
      }));

      const res = await batchSaveGrades(currentSubject.id, payload);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Semua nilai (${res.count} siswa) berhasil disimpan dan disinkronkan!`);
      }
    } catch {
      showNotify('error', 'Gagal menyimpan semua nilai');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered grades by search
  const filteredGrades = grades.filter(
    (g) =>
      g.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.studentNis && g.studentNis.includes(searchTerm))
  );

  // Statistics
  const totalStudents = grades.length;
  const avgFinalScore =
    totalStudents > 0
      ? Math.round(
          grades.reduce(
            (acc, g) => acc + computeFinalScore(g.assignment, g.midExam, g.finalExam),
            0
          ) / totalStudents
        )
      : 0;

  const passedCount = grades.filter(
    (g) => computeFinalScore(g.assignment, g.midExam, g.finalExam) >= kkm
  ).length;

  const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 100;

  if (subjects.length === 0 || !currentSubject) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10 font-sans">
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Award size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Belum Ada Mata Pelajaran yang Di-Plotting
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Akun Guru <strong className="text-slate-900 dark:text-white">{teacherName}</strong> belum ditetapkan ke mata pelajaran atau kelas mengajar apapun oleh Super Admin.
          </p>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 max-w-lg mx-auto text-xs text-slate-600 dark:text-slate-300 text-left space-y-2.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={15} className="text-amber-500" />
              Langkah Untuk Mengaktifkan:
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Hubungi Super Admin / Bagian Kurikulum sekolah.</li>
              <li>Minta Super Admin membuka menu <strong>Plotting & Mapel</strong> di dashboard admin.</li>
              <li>Pilih mata pelajaran & target kelas, lalu plot nama Anda sebagai Guru Pengampu.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner Alert / Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
            <Award size={14} /> Buku Nilai Siswa (Leger Nilai Akademik)
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Penanganan & Input Nilai Siswa
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Guru Pengampu: <strong className="text-gray-900 dark:text-white">{currentSubject?.teacherName || teacherName}</strong> • Nilai tersinkronisasi otomatis ke transkrip siswa.
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} /> Cetak Leger Nilai
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan Semua...' : 'Simpan Semua Nilai'}
          </button>
        </div>
      </div>

      {/* Subject Selector & Quick Filter */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
            Pilih Mata Pelajaran Yang Diampu
          </label>
          <div className="relative">
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name} — Kelas {s.classTarget} (Guru: {s.teacherName || 'Belum diplot'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
            Cari Nama / NISN Siswa
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Ketik nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {currentSubject && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{totalStudents} Siswa</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kelas {currentSubject.classTarget}</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{avgFinalScore} / 100</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rata-rata Kelas</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Award size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{kkm} Poin</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Standar KKM Mapel</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{passRate}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Ketuntasan ({passedCount}/{totalStudents})</div>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Matrix Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
              <GraduationCap className="text-emerald-600" size={22} />
              Daftar Nilai Siswa — {currentSubject?.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bobot perhitungan otomatis: <strong>30% Tugas & Kuis</strong> + <strong>30% UTS</strong> + <strong>40% UAS</strong>
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {filteredGrades.length} Siswa Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-12">No</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider min-w-[200px]">Nama Siswa & NISN</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-28">Tugas (30%)</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-28">UTS (30%)</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-28">UAS (40%)</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-28">Nilai Akhir</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-24">Mutu</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center w-28">Status</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider min-w-[200px]">Catatan Guru</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-right w-24 print:hidden">Simpan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredGrades.map((g, index) => {
                const finalScore = computeFinalScore(g.assignment, g.midExam, g.finalExam);
                const isPassed = finalScore >= kkm;
                const isRowSaving = rowSavingId === g.id;

                return (
                  <tr key={g.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-xs text-gray-400">
                      {index + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block text-sm">
                          {g.studentName}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          NIS: {g.studentNis || '10293847'}
                        </span>
                      </div>
                    </td>

                    {/* Input: Assignment */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={g.assignment}
                        onChange={(e) => handleInputChange(g.id, 'assignment', e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-center font-bold text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                      />
                    </td>

                    {/* Input: Mid Exam */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={g.midExam}
                        onChange={(e) => handleInputChange(g.id, 'midExam', e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-center font-bold text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                      />
                    </td>

                    {/* Input: Final Exam */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={g.finalExam}
                        onChange={(e) => handleInputChange(g.id, 'finalExam', e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-center font-bold text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                      />
                    </td>

                    {/* Final Score (Auto-computed) */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-sm text-gray-900 dark:text-white">
                        {finalScore}
                      </span>
                    </td>

                    {/* Predikat */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex w-8 h-8 items-center justify-center rounded-xl font-black text-xs ${
                          g.finalGrade.includes('A')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : g.finalGrade.includes('B')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}
                      >
                        {g.finalGrade}
                      </span>
                    </td>

                    {/* Status KKM */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isPassed
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200'
                        }`}
                      >
                        {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                      </span>
                    </td>

                    {/* Input: Catatan Guru */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={g.notes || ''}
                        placeholder="Catatan kemajuan siswa..."
                        onChange={(e) => handleInputChange(g.id, 'notes', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Action: Save Row */}
                    <td className="py-3 px-4 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => handleSaveRow(g)}
                        disabled={isRowSaving}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white dark:bg-gray-800 dark:hover:bg-emerald-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isRowSaving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

