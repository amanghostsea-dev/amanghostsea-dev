'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  HelpCircle, 
  ShieldAlert,
  Award,
  BookOpen,
  Key,
  Check
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { startOrResumeAttempt, saveProgress, submitExam } from '../actions';

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
  answers: string;
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  status: string;
  tabSwitchCount: number;
  startedAt: Date | string;
  submittedAt: Date | string | null;
}

interface CbtExamRoomProps {
  exam: {
    id: string;
    title: string;
    subject: string;
    classTarget: string;
    duration: number; // in minutes
    token: string | null;
    description: string | null;
    shuffleQuestions: boolean;
    questions: QuestionItem[];
  };
  studentName: string;
  existingAttempt: AttemptItem | null;
}

export default function CbtExamRoom({
  exam,
  studentName,
  existingAttempt,
}: CbtExamRoomProps) {
  // Attempt & Mode state
  const [attempt, setAttempt] = useState<AttemptItem | null>(existingAttempt);
  const [tokenInput, setTokenInput] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Exam engine state
  const [questions, setQuestions] = useState<QuestionItem[]>(exam.questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(existingAttempt?.tabSwitchCount || 0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(exam.duration * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Result state
  const [finalResult, setFinalResult] = useState<{
    score: number;
    totalCorrect: number;
    totalQuestions: number;
    tabSwitchCount: number;
  } | null>(
    existingAttempt?.status === 'SUBMITTED'
      ? {
          score: existingAttempt.score,
          totalCorrect: existingAttempt.totalCorrect,
          totalQuestions: existingAttempt.totalQuestions,
          tabSwitchCount: existingAttempt.tabSwitchCount,
        }
      : null
  );

  const storageKey = `cbt_exam_${exam.id}_${studentName}`;

  // Restore local storage progress on mount
  useEffect(() => {
    if (attempt && attempt.status === 'IN_PROGRESS') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.doubtful) setDoubtful(parsed.doubtful);
          if (parsed.tabSwitchCount) setTabSwitchCount(parsed.tabSwitchCount);
        } else if (attempt.answers) {
          const dbAnswers = JSON.parse(attempt.answers);
          setAnswers(dbAnswers);
        }
      } catch (err) {
        console.error('Failed to parse saved answers', err);
      }
    }
  }, [attempt, storageKey]);

  // Anti-Cheat: Visibility and Window Blur Detection
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || finalResult) return;

    const handleViolation = () => {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setShowCheatWarning(true);

        // Update local storage
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
          localStorage.setItem(
            storageKey,
            JSON.stringify({ ...saved, tabSwitchCount: next })
          );
        } catch {}

        // Background sync to server
        saveProgress(attempt.id, answers, next).catch(console.error);

        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attempt, finalResult, answers, storageKey]);

  // Handle final submit function (defined before timer effect to satisfy dependency rules)
  const handleFinalSubmit = useCallback(async () => {
    if (!attempt) return;
    setIsSubmitting(true);

    const res = await submitExam(attempt.id, answers, tabSwitchCount);
    if (res.success && res.result) {
      setFinalResult(res.result);
      localStorage.removeItem(storageKey);
      setIsSubmitModalOpen(false);
    } else {
      alert(res.error || 'Gagal mengirim ujian');
    }
    setIsSubmitting(false);
  }, [attempt, answers, tabSwitchCount, storageKey]);

  // Timer countdown
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || finalResult) return;

    // Calculate remaining time based on attempt startedAt
    const startTime = new Date(attempt.startedAt).getTime();
    const totalDurationMs = exam.duration * 60 * 1000;
    const elapsedMs = Date.now() - startTime;
    const remainingSeconds = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
    setTimeLeft(remainingSeconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(); // Auto-submit when time is up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, finalResult, exam.duration, handleFinalSubmit]);

  // Handle Start Attempt
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setStartLoading(true);
    setStartError(null);

    const res = await startOrResumeAttempt({
      examId: exam.id,
      studentName,
      studentClass: 'XI RPL 1',
      studentNis: '10293847',
      token: tokenInput,
    });

    if (res.success && res.attempt) {
      setAttempt(res.attempt);
      if (res.questions) setQuestions(res.questions);
      if (res.attempt.status === 'SUBMITTED') {
        setFinalResult({
          score: res.attempt.score,
          totalCorrect: res.attempt.totalCorrect,
          totalQuestions: res.attempt.totalQuestions,
          tabSwitchCount: res.attempt.tabSwitchCount,
        });
      }
    } else {
      setStartError(res.error || 'Gagal memulai ujian.');
    }
    setStartLoading(false);
  };

  // Select Option
  const handleSelectOption = (optionIndex: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = {
      ...answers,
      [currentQ.id]: String(optionIndex),
    };
    setAnswers(newAnswers);

    // Save to LocalStorage immediately
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers: newAnswers,
          doubtful,
          tabSwitchCount,
        })
      );
    } catch {}

    // Background sync to DB
    if (attempt) {
      saveProgress(attempt.id, newAnswers, tabSwitchCount).catch(console.error);
    }
  };

  // Toggle doubtful (Ragu-ragu)
  const toggleDoubtful = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newDoubtful = {
      ...doubtful,
      [currentQ.id]: !doubtful[currentQ.id],
    };
    setDoubtful(newDoubtful);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          doubtful: newDoubtful,
          tabSwitchCount,
        })
      );
    } catch {}
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const currentQ = questions[currentIndex];

  let parsedOptions: string[] = [];
  if (currentQ) {
    try {
      parsedOptions = JSON.parse(currentQ.options);
    } catch {
      parsedOptions = [];
    }
  }

  // Format Timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // SCREEN 1: RESULT SCREEN (If already submitted)
  // ----------------------------------------------------
  if (finalResult) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-12 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Award size={40} />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Ujian Berhasil Diselesaikan
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
              {exam.title}
            </h2>
            <p className="text-slate-500 text-sm mt-1">{exam.subject}</p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/50 dark:border-purple-800/50">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Skor Perolehan Anda
            </div>
            <div className="text-5xl font-black text-purple-600 dark:text-purple-400 my-2">
              {finalResult.score}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Skala Penilaian 0 - 100
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Jawaban Benar</span>
              <strong className="text-sm font-bold text-emerald-600">
                {finalResult.totalCorrect} / {finalResult.totalQuestions} Soal
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Catatan Anti-Curang</span>
              <strong className={`text-sm font-bold ${finalResult.tabSwitchCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {finalResult.tabSwitchCount}x Pindah Tab
              </strong>
            </div>
          </div>

          <Link
            href="/portal/siswa/cbt"
            className="w-full block py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-purple-500/25 transition-all"
          >
            Kembali ke Daftar Ujian
          </Link>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 2: PRE-EXAM TOKEN & INSTRUCTIONS (If not started)
  // ----------------------------------------------------
  if (!attempt || attempt.status !== 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-12 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in">
          <div>
            <Link
              href="/portal/siswa/cbt"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
            >
              <ArrowLeft size={14} /> Kembali
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Kelas: {exam.classTarget}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="text-slate-500 text-xs mt-1">{exam.description || 'Petunjuk ujian standar SMK.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-500 block">Durasi Pengerjaan</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold">
                {exam.duration} Menit
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Jumlah Butir Soal</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold">
                {questions.length} Butir Soal Pilihan Ganda
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Nama Peserta</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold">{studentName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Mode Keamanan</span>
              <strong className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                <ShieldAlert size={14} /> Anti-Curang Aktif
              </strong>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> Aturan Pengerjaan Ujian CBT:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
              <li>Dilarang membuka tab lain, browser lain, atau aplikasi chat.</li>
              <li>Sistem secara otomatis mencatat setiap Anda berpindah layar (*Alt+Tab*).</li>
              <li>Jawaban Anda otomatis tersimpan tiap kali Anda memilih opsi.</li>
            </ul>
          </div>

          {startError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold">
              {startError}
            </div>
          )}

          <form onSubmit={handleStartExam} className="space-y-4">
            {exam.token && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan Token Ujian dari Pengawas:
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: RPL2026"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={startLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {startLoading ? 'Menyiapkan Lembar Ujian...' : 'Mulai Kerjakan Ujian Sekarang'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 3: LIVE CBT EXAM ROOM
  // ----------------------------------------------------
  const selectedOption = answers[currentQ?.id];
  const isCurrentDoubtful = doubtful[currentQ?.id];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans flex flex-col select-none">
      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-purple-500/20">
            {currentIndex + 1}
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
              {exam.title}
            </h2>
            <div className="text-[11px] text-slate-500">
              Soal No. {currentIndex + 1} dari {questions.length} • {studentName}
            </div>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-sm transition-all ${
              timeLeft < 300
                ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse border border-red-300'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            }`}
          >
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {tabSwitchCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert size={12} /> {tabSwitchCount}x Pindah
            </span>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
          >
            <Send size={14} /> Selesai Ujian
          </button>
        </div>
      </header>

      {/* Main Examination Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Current Question & Options */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
          <div>
            {/* Question Header & Points */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                Bobot Soal: {currentQ?.points} Poin
              </span>
              <button
                onClick={toggleDoubtful}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  isCurrentDoubtful
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isCurrentDoubtful ? '★ Status: Ragu-Ragu' : 'Tandai Ragu-Ragu'}
              </button>
            </div>

            {/* Question Text */}
            <div className="text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap mb-8">
              {currentQ?.questionText}
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {parsedOptions.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = selectedOption === String(idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 ring-2 ring-purple-500/20 text-purple-950 dark:text-purple-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="flex-1 pt-1 text-sm md:text-base leading-snug">{opt}</span>
                    {isSelected && (
                      <Check className="text-purple-600 flex-shrink-0 mt-1" size={18} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Bottom Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800 mt-8 gap-4">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ArrowLeft size={16} /> Soal Sebelumnya
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02]"
              >
                Soal Berikutnya <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                Kumpulkan Ujian <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Palette Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              Navigasi Butir Soal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Terjawab: <strong className="text-emerald-600">{answeredCount}</strong> / {questions.length} Soal
            </p>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = answers[q.id] !== undefined;
                const isRagu = doubtful[q.id];

                let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                if (isAnswered) {
                  bgClass = 'bg-emerald-600 text-white shadow-sm';
                }
                if (isRagu) {
                  bgClass = 'bg-amber-500 text-white shadow-sm';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${bgClass} ${
                      isCurrent ? 'ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'hover:opacity-80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500"></span>
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700"></span>
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Jawaban tersimpan otomatis secara real-time.
          </div>
        </div>
      </div>

      {/* Anti-Cheat Toast / Warning Modal */}
      {showCheatWarning && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-red-600 text-white p-4 rounded-2xl shadow-2xl border border-red-700 animate-in slide-in-from-bottom flex items-start gap-3">
          <AlertTriangle size={24} className="flex-shrink-0 mt-0.5 text-amber-300" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm mb-0.5">Peringatan Anti-Curang!</h4>
            <p className="text-red-100 leading-snug">
              Anda terdeteksi membuka tab atau aplikasi lain. Pelanggaran ini ({tabSwitchCount}x) telah dicatat ke sistem pengawas.
            </p>
          </div>
          <button
            onClick={() => setShowCheatWarning(false)}
            className="text-red-200 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <ConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Konfirmasi Selesai Ujian"
        message={
          <div>
            <p>
              Anda telah menjawab <strong>{answeredCount}</strong> dari{' '}
              <strong>{questions.length}</strong> butir soal.
            </p>
            {answeredCount < questions.length && (
              <p className="mt-2 text-amber-600 font-semibold text-xs">
                Perhatian: Masih ada {questions.length - answeredCount} butir soal yang belum Anda jawab!
              </p>
            )}
            <p className="mt-2 text-slate-500 text-xs">
              Setelah dikumpulkan, lembar ujian akan langsung dikunci dan nilai skor Anda akan dihitung otomatis.
            </p>
          </div>
        }
        confirmText="Ya, Kumpulkan Ujian"
        variant="warning"
        isLoading={isSubmitting}
      />
    </div>
  );
}
