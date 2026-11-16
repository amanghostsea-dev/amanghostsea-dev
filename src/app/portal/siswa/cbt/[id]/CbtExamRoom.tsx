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
  Check,
  RefreshCw,
  Lock,
  Unlock,
  Wifi,
  Calendar
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { startOrResumeAttempt, saveProgress, submitExam, getExamSessionStatus, checkStudentExamLockStatus } from '../actions';
import { formatExamScheduleRange, getExamScheduleState, formatClassTargetDisplay } from '@/lib/cbt-schedule';
import CbtRichText from '@/components/cbt/CbtRichText';
import CbtQuestionImageViewer from '@/components/cbt/CbtQuestionImageViewer';

interface QuestionItem {
  id: string;
  examId: string;
  questionText: string;
  imageUrl?: string | null;
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
    status?: string;
    shuffleQuestions: boolean;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    questions: QuestionItem[];
  };
  studentName: string;
  studentClass?: string;
  studentNis?: string;
  existingAttempt: AttemptItem | null;
}

// Acak soal secara deterministik per siswa (konsisten saat refresh, berbeda antar teman sebangku)
function seededShuffle<T>(array: T[], seedStr: string): T[] {
  if (array.length <= 1) return array;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const seededRandom = () => {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.abs(hash) / 233280;
  };
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function CbtExamRoom({
  exam,
  studentName,
  studentClass,
  studentNis,
  existingAttempt,
}: CbtExamRoomProps) {
  // Attempt & Mode state
  const [attempt, setAttempt] = useState<AttemptItem | null>(existingAttempt);
  const [tokenInput, setTokenInput] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Dual-Key Session State (Waiting Room vs Active)
  const initialSchedule = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
  const [sessionStatus, setSessionStatus] = useState<string>(exam.status || 'PUBLISHED');
  const [isSessionOpen, setIsSessionOpen] = useState<boolean>(
    exam.status === 'ACTIVE' || (exam.status === 'PUBLISHED' && initialSchedule.isAccessible)
  );
  const [checkingStatus, setCheckingStatus] = useState(false);

  const refreshSessionStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await getExamSessionStatus(exam.id);
      if (res && res.status) {
        setSessionStatus(res.status);
        if (typeof res.isSessionOpen === 'boolean') {
          setIsSessionOpen(res.isSessionOpen);
        }
      }
    } catch { }
    setCheckingStatus(false);
  }, [exam.id]);

  useEffect(() => {
    if (attempt || isSessionOpen) return;
    const interval = setInterval(() => {
      refreshSessionStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [attempt, isSessionOpen, refreshSessionStatus]);

  // Exam engine state (Acak urutan butir soal per siswa jika fitur shuffle diaktifkan guru)
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (exam.shuffleQuestions && exam.questions?.length > 1) {
      return seededShuffle(exam.questions, `${studentName}_${studentNis || ''}_${exam.id}`);
    }
    return exam.questions;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(existingAttempt?.tabSwitchCount || 0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [isStrike2Locked, setIsStrike2Locked] = useState<boolean>(() => {
    const att = existingAttempt;
    if (!att) return false;
    return ((att as any).tabSwitchCount === 2) && !((att as any).proctorNotes?.includes('[IZIN_LANJUT_P2]'));
  });
  const [isCheckingLock, setIsCheckingLock] = useState(false);
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
        const dbCount = attempt.tabSwitchCount || 0;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.doubtful) setDoubtful(parsed.doubtful);

          // Jika di database attempt masih 0 (baru/direset), sinkronkan reset ke localStorage
          if (dbCount === 0) {
            setTabSwitchCount(0);
            setIsStrike2Locked(false);
            try {
              localStorage.setItem(storageKey, JSON.stringify({ ...parsed, tabSwitchCount: 0 }));
            } catch {}
          } else {
            const count = Math.max(dbCount, parsed.tabSwitchCount || 0);
            setTabSwitchCount(count);
            if (count === 2 && !(attempt as any).proctorNotes?.includes('[IZIN_LANJUT_P2]')) {
              setIsStrike2Locked(true);
            }
          }
        } else if (attempt.answers) {
          const dbAnswers = JSON.parse(attempt.answers);
          setAnswers(dbAnswers);
          setTabSwitchCount(dbCount);
        }
      } catch (err) {
        console.error('Failed to parse saved answers', err);
      }
    }
  }, [attempt, storageKey]);

  // Anti-Cheat: Progressive 3-Strike Visibility and Window Blur Detection
  const lastViolationTimeRef = useRef<number>(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || finalResult) return;

    const handleViolation = () => {
      const now = Date.now();
      // 🛡️ Cooldown 3000ms: Menghindari double-increment akibat browser menembakkan
      // window.blur dan document.visibilitychange secara bersamaan saat user alt-tab / pindah tab
      if (now - lastViolationTimeRef.current < 3000) {
        return;
      }
      lastViolationTimeRef.current = now;

      setTabSwitchCount((prev) => {
        const next = prev + 1;

        if (next === 1) {
          // ⚠️ PELANGGARAN KE-1: Tampilkan notifikasi peringatan tegas di layar, ujian masih berlanjut
          setShowCheatWarning(true);
          setIsStrike2Locked(false);
        } else if (next === 2) {
          // 🚫 PELANGGARAN KE-2: Layar ujian DIBLOKIR / DIKUNCI, wajib lapor ke Pengawas Ruangan
          setIsStrike2Locked(true);
          setShowCheatWarning(false);
        } else if (next >= 3) {
          // ⛔ PELANGGARAN KE-3: Akun ujian DI-SUSPEND PERMANEN, wajib lapor ke Admin Utama
          setAttempt((prevAtt) => prevAtt ? { ...prevAtt, isBlocked: true } : prevAtt);
          setIsStrike2Locked(false);
          setShowCheatWarning(false);
        }

        // Update local storage
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
          localStorage.setItem(
            storageKey,
            JSON.stringify({ ...saved, tabSwitchCount: next })
          );
        } catch { }

        // Background sync to server with progressive 3-strike handling
        saveProgress(attempt.id, answersRef.current, next).then((res) => {
          if (res && res.success) {
            if (res.isBlocked) {
              setAttempt((prevAtt) => prevAtt ? { ...prevAtt, isBlocked: true, proctorNotes: res.proctorNotes } : prevAtt);
            }
            if (res.isStrike2Locked !== undefined) {
              setIsStrike2Locked(res.isStrike2Locked);
            }
          }
        }).catch(console.error);

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
  }, [attempt, finalResult, storageKey]);

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

    // Calculate remaining time based on attempt startedAt + proctor extra time
    const startTime = new Date(attempt.startedAt).getTime();
    const extraMinutes = (attempt as any)?.extraTimeMinutes || 0;
    const totalDurationMs = (exam.duration + extraMinutes) * 60 * 1000;
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

  // Periodic background heartbeat to sync answers & check proctor directives (extra time, block, strike 2 unlock, force submit)
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || finalResult) return;

    // Polling interval: 4 seconds if Strike 2 locked so student instantly resumes when proctor unlocks, otherwise 15 seconds
    const intervalMs = isStrike2Locked ? 4000 : 15000;

    const interval = setInterval(async () => {
      try {
        const res = await saveProgress(attempt.id, answers, tabSwitchCount);
        if (res && res.success) {
          if (res.isBlocked) {
            setAttempt((prev) => prev ? { ...prev, isBlocked: true, proctorNotes: res.proctorNotes } : prev);
          }
          if (res.isStrike2Locked !== undefined) {
            setIsStrike2Locked(res.isStrike2Locked);
          }
          if (typeof res.extraTimeMinutes === 'number' && res.extraTimeMinutes !== (attempt as any).extraTimeMinutes) {
            setAttempt((prev) => prev ? { ...prev, extraTimeMinutes: res.extraTimeMinutes } : prev);
          }
          if (res.status === 'SUBMITTED') {
            setFinalResult({
              score: res.score || 0,
              totalCorrect: res.totalCorrect || 0,
              totalQuestions: res.totalQuestions || questions.length,
              tabSwitchCount,
            });
            localStorage.removeItem(storageKey);
          }
        }
      } catch (err) {
        // silent fail for heartbeat
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [attempt, answers, tabSwitchCount, finalResult, questions.length, storageKey, isStrike2Locked]);

  // Handle Start Attempt
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setStartLoading(true);
    setStartError(null);

    const res = await startOrResumeAttempt({
      examId: exam.id,
      studentName,
      studentClass: studentClass || exam.classTarget || 'XI TJKT 1',
      studentNis: studentNis || undefined,
      token: tokenInput,
    });

    if (res.success && res.attempt) {
      setAttempt(res.attempt);
      const isS2Locked = res.attempt.tabSwitchCount === 2 && !res.attempt.proctorNotes?.includes('[IZIN_LANJUT_P2]');
      setIsStrike2Locked(isS2Locked);
      setTabSwitchCount(res.attempt.tabSwitchCount || 0);

      if (res.questions) {
        const processedQ =
          exam.shuffleQuestions && res.questions.length > 1
            ? seededShuffle(res.questions, `${studentName}_${studentNis || ''}_${exam.id}`)
            : res.questions;
        setQuestions(processedQ);
      }
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
    } catch { }

    // Background sync to DB
    if (attempt) {
      saveProgress(attempt.id, newAnswers, tabSwitchCount).then((res) => {
        if (res && res.success) {
          if (res.isBlocked) {
            setAttempt((prev) => (prev ? { ...prev, isBlocked: true } : prev));
          }
          if (typeof res.extraTimeMinutes === 'number' && res.extraTimeMinutes !== (attempt as any).extraTimeMinutes) {
            setAttempt((prev) => (prev ? { ...prev, extraTimeMinutes: res.extraTimeMinutes } : prev));
          }
        }
      }).catch(console.error);
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
    } catch { }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
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
          <div className="w-20 h-20 rounded-full bg-[#5fa08d]/15 text-[#5fa08d] dark:text-[#8bb79e] mx-auto flex items-center justify-center shadow-lg shadow-[#5fa08d]/20 border border-[#5fa08d]/30">
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

          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#5fa08d]/10 via-[#8bb79e]/5 to-[#caa55d]/10 border border-[#5fa08d]/30">
            <div className="text-xs font-semibold text-[#4d8675] dark:text-[#caa55d] uppercase tracking-wider">
              Skor Perolehan Anda
            </div>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] my-2">
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
            className="w-full block py-3.5 px-4 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#5aa08c] hover:to-[#dfba6f] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5fa08d]/25 transition-all text-center"
          >
            Kembali ke Daftar Ujian
          </Link>
          <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium pt-1">
            Smart CBT Examination System • Created By Abdul Rahman
          </div>
        </div>
      </div>
    );
  }

  if (attempt && (attempt as any).isBlocked) {
    const isStrike3 = tabSwitchCount >= 3 || (attempt as any).tabSwitchCount >= 3 || (attempt as any).proctorNotes?.includes('[STRIKE_3_BLOKIR]');

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-4xl font-black shadow-lg shadow-rose-500/30">
            🚫
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/30 text-rose-300 border border-rose-500/50 uppercase tracking-wider">
              {isStrike3 ? 'Pelanggaran ke-3 • Akun di-Suspend Sistem' : 'Sesi Ujian Ditangguhkan'}
            </span>
            <h2 className="text-2xl font-black text-rose-300 mt-3">
              {isStrike3 ? 'Akun CBT Anda Di-Suspend Total' : 'Ujian Ditangguhkan Pengawas'}
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed text-left space-y-2">
            {isStrike3 ? (
              <>
                <p>
                  Pengerjaan ujian Anda telah <strong>dihentikan secara permanen dan akun Anda di-suspend oleh sistem</strong> karena telah melakukan <strong>pelanggaran tata tertib sebanyak 3 kali berturut-turut</strong> (berpindah tab / jendela layar / aplikasi).
                </p>
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/60 text-rose-200 text-xs space-y-2">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert size={16} /> PERHATIAN KHUSUS (KEWENANGAN PENGAWAS DITUTUP):
                  </div>
                  <p>
                    Sesuai SOP Ujian Terpusat, <strong>Pengawas Ruangan di kelas TIDAK DAPAT membuka suspend ini</strong>.
                  </p>
                  <p className="font-bold text-white">
                    🏛️ Anda diwajibkan segera melapor langsung ke ADMIN UTAMA SEKOLAH (SUPER ADMIN) di ruang panitia ujian / server CBT untuk verifikasi kejadian dan pertimbangan pembukaan suspend.
                  </p>
                </div>
              </>
            ) : (
              <p>
                Sesi ujian Anda dihentikan sementara oleh Pengawas Ruangan karena pelanggaran tata tertib ujian. Silakan melapor ke meja Pengawas di depan kelas.
              </p>
            )}
          </div>

          {/* Rincian Identitas Pelanggaran */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/60 text-left text-xs space-y-1.5 font-mono">
            <div className="text-rose-400 font-bold flex items-center justify-between">
              <span>Status Pelanggaran:</span>
              <span className="text-rose-300 font-black">{Math.max(tabSwitchCount, (attempt as any).tabSwitchCount || 0)}x Pindah Tab</span>
            </div>
            <div className="text-slate-300">Nama Peserta: <strong className="text-white">{studentName}</strong></div>
            <div className="text-slate-300">NISN / No Induk: <strong className="text-white">{studentNis || '-'}</strong></div>
            <div className="text-slate-300">Kelas Terdaftar: <strong className="text-white">{studentClass || '-'}</strong></div>
            <div className="text-slate-300">Paket Ujian: <strong className="text-white">{exam.title}</strong></div>
            {(attempt as any).proctorNotes && (
              <div className="pt-2 border-t border-rose-900/60 text-amber-300 text-[11px] font-sans italic">
                Catatan Sistem: {(attempt as any).proctorNotes}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/portal/siswa/cbt"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} /> Kembali ke Beranda Ujian
            </Link>
          </div>
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5fa08d]/15 text-[#4d8675] dark:text-[#8bb79e] border border-[#5fa08d]/30">
                {exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#caa55d]/15 text-[#b6a86e] dark:text-[#f5d076] border border-[#caa55d]/30">
                Target: {formatClassTargetDisplay(exam.classTarget)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="text-slate-500 text-xs mt-1">{exam.description || 'Petunjuk ujian standar SMK.'}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-500 block">Durasi Pengerjaan</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold">
                {exam.duration} Menit
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Jumlah Butir Soal</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold">
                {questions.length} Butir Soal
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Nama Peserta</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm font-bold truncate block">{studentName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Kelas Terdaftar</span>
              <strong className="text-[#caa55d] text-sm font-bold">{studentClass || 'Siswa'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Target Paket</span>
              <strong className="text-[#4d8675] dark:text-[#8bb79e] text-sm font-bold truncate block" title={exam.classTarget}>
                {formatClassTargetDisplay(exam.classTarget, true)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Mode Keamanan</span>
              <strong className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                <ShieldAlert size={14} /> Anti-Curang Aktif
              </strong>
            </div>
          </div>

          {/* 📅 EXAM SCHEDULE TIMETABLE BANNER */}
          <div className="p-4 rounded-2xl bg-[#5fa08d]/10 dark:bg-[#5fa08d]/15 border border-[#5fa08d]/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Calendar size={15} className="text-[#caa55d]" />
                <span>Jadwal Ujian: {formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
              </span>
            </div>
            {exam.startTime && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-[#5fa08d]/20">
                <span>Status Waktu Resmi:</span>
                <span className="font-semibold text-[#4d8675] dark:text-[#caa55d]">
                  {getExamScheduleState(exam.startTime, exam.endTime, sessionStatus).countdown}
                </span>
              </div>
            )}
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

          {/* DUAL-KEY GATEWAY: WAITING ROOM vs ACTIVE WITH TOKEN */}
          {!isSessionOpen && sessionStatus !== 'ACTIVE' ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-amber-800 dark:text-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold text-sm">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    Ruang Tunggu Ujian (Waiting Room)
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 font-mono px-2 py-0.5 rounded-full font-bold uppercase border border-amber-500/30">
                    Standby
                  </span>
                </div>

                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Sesi ujian untuk kelas ini <strong>belum dibuka oleh guru pengawas</strong> atau belum memasuki jam jadwal resmi. Silakan duduk dengan tertib. Layar ini akan <strong>otomatis terbuka</strong> begitu pengawas mengaktifkan sesi atau saat jadwal ujian dimulai.
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Wifi size={13} className="text-emerald-500" />
                    Mengecek sinyal pengawas & jadwal...
                  </span>
                  <button
                    type="button"
                    onClick={refreshSessionStatus}
                    disabled={checkingStatus}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={checkingStatus ? 'animate-spin' : ''} />
                    <span>{checkingStatus ? 'Memeriksa...' : 'Cek Status Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Locked Token Placeholder */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1.5 opacity-60">
                <Lock className="mx-auto text-slate-400" size={20} />
                <div className="text-xs font-semibold text-slate-500">
                  Kolom token terkunci hingga pengawas mengaktifkan sesi atau jam jadwal resmi tiba
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {sessionStatus === 'ACTIVE' ? 'Sesi Ujian Telah Diaktifkan Pengawas!' : 'Sesi Ujian Sesuai Jadwal Resmi Dibuka!'}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {sessionStatus === 'ACTIVE'
                    ? 'Pengawas telah membuka sesi ujian kelas ini. Silakan lihat kode token di papan tulis ruangan dan masukkan di bawah ini:'
                    : 'Ujian telah memasuki waktu pelaksanaan resmi. Silakan masukkan token ujian dari guru pengawas untuk mulai mengerjakan:'}
                </p>
              </div>

              <form onSubmit={handleStartExam} className="space-y-4">
                {exam.token && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Key size={14} className="text-amber-500" /> Masukkan Token dari Papan Tulis Kelas:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Contoh: SMK2026"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-bold uppercase tracking-widest text-center focus:ring-2 focus:ring-[#caa55d] focus:border-[#caa55d] font-mono shadow-inner"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={startLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#5aa08c] hover:to-[#dfba6f] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#5fa08d]/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {startLoading ? 'Menyiapkan Lembar Ujian...' : 'Mulai Kerjakan Ujian Sekarang →'}
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="text-center text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
          Smart CBT Engine • Created By Abdul Rahman
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white font-bold flex items-center justify-center text-sm shadow-md shadow-[#5fa08d]/25">
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
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-sm transition-all ${timeLeft < 300
                ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse border border-red-300'
                : 'bg-[#5fa08d]/10 dark:bg-[#5fa08d]/20 text-[#4d8675] dark:text-[#8bb79e] border border-[#5fa08d]/30'
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
              <span className="text-xs font-bold text-[#4d8675] dark:text-[#8bb79e] bg-[#5fa08d]/15 dark:bg-[#5fa08d]/25 px-3 py-1 rounded-full border border-[#5fa08d]/30">
                Bobot Soal: {currentQ?.points} Poin
              </span>
              <button
                onClick={toggleDoubtful}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${isCurrentDoubtful
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
              >
                {isCurrentDoubtful ? '★ Status: Ragu-Ragu' : 'Tandai Ragu-Ragu'}
              </button>
            </div>

            {/* Question Text & Math Formulas */}
            <div className="text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed mb-4">
              <CbtRichText text={currentQ?.questionText || ''} />
            </div>

            {/* Dedicated Question Image Visualizer (with Zoom Lightbox) */}
            {currentQ?.imageUrl && (
              <CbtQuestionImageViewer 
                imageUrl={currentQ.imageUrl} 
                alt={`Visualisasi Gambar Soal No. ${currentIndex + 1}`} 
              />
            )}

            {/* Multiple Choice Options */}
            <div className="space-y-3 mt-6">
              {parsedOptions.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = selectedOption === String(idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${isSelected
                        ? 'border-[#5fa08d] bg-[#5fa08d]/10 dark:bg-[#14231e]/60 ring-2 ring-[#5fa08d]/25 text-[#1b332c] dark:text-[#c4ded4] font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                          ? 'bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white shadow-md shadow-[#5fa08d]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                      {label}
                    </span>
                    <span className="flex-1 pt-1 text-sm md:text-base leading-snug">
                      <CbtRichText text={opt} />
                    </span>
                    {isSelected && (
                      <Check className="text-[#caa55d] flex-shrink-0 mt-1" size={18} />
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
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#5aa08c] hover:to-[#dfba6f] text-white font-bold text-xs shadow-md shadow-[#5fa08d]/25 transition-all hover:scale-[1.02]"
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
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${bgClass} ${isCurrent ? 'ring-2 ring-[#5fa08d] ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'hover:opacity-80'
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

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center space-y-1">
            <div>Jawaban tersimpan otomatis secara real-time.</div>
            <div className="text-[10px] text-slate-400/80 font-medium">
              Smart CBT Secure • Created By <span className="font-semibold text-slate-600 dark:text-slate-300">Abdul Rahman</span>
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ STRIKE 1: MODAL PERINGATAN PELANGGARAN PERTAMA (TATA TERTIB CBT) */}
      {showCheatWarning && tabSwitchCount === 1 && !isStrike2Locked && !(attempt as any)?.isBlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-7 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
              <AlertTriangle size={34} className="text-amber-400 animate-bounce" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                Pelanggaran Ke-1 • Peringatan Teguran Sistem
              </span>
              <h3 className="text-xl font-black text-white mt-2.5">
                Terdeteksi Berpindah Tab / Layar!
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-left text-xs text-amber-200/90 space-y-2 leading-relaxed">
              <p>
                Sistem mendeteksi bahwa Anda telah berpindah tab, meminimalkan jendela ujian, atau membuka aplikasi lain di luar lembar ujian.
              </p>
              <div className="p-3 rounded-xl bg-amber-900/40 border border-amber-500/40 text-amber-100 text-[11px] space-y-1">
                <strong className="text-amber-300 font-bold block">⚠️ KETENTUAN TATA TERTIB CBT:</strong>
                <p>
                  Ini adalah <strong>Peringatan Pertama</strong>. Anda <strong>masih diizinkan melanjutkan pengerjaan soal</strong>.
                </p>
                <p className="text-rose-300 font-semibold">
                  Jika Anda terdeteksi keluar layar 1 kali lagi (Pelanggaran ke-2), lembar ujian Anda akan LANGSUNG DIBLOKIR/DIKUNCI dan Anda wajib melapor ke Pengawas Ruangan!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCheatWarning(false)}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              Saya Mengerti &amp; Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* 🔒 STRIKE 2: MODAL BESAR MENUTUPI PENGERJAAN SOAL (KUNCI SEMENTARA) */}
      {isStrike2Locked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-4xl shadow-lg shadow-amber-500/20">
              <Lock size={40} className="text-amber-400 animate-pulse" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/30 text-amber-300 border border-amber-500/50 uppercase tracking-wider">
                Pelanggaran Ke-2 • Ujian Diblokir Sementara
              </span>
              <h2 className="text-2xl font-black text-white mt-3">
                Layar Ujian Terkunci Sementara
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-left text-xs text-amber-200/90 space-y-2 leading-relaxed">
              <p className="font-semibold text-amber-300">
                ⚠️ Anda terdeteksi melakukan pelanggaran tata tertib sebanyak 2 kali (berpindah tab / aplikasi / minimize layar).
              </p>
              <p>
                Sesuai tata tertib ujian, <strong>seluruh lembar pengerjaan soal telah dikunci dan diblokir sementara</strong>.
              </p>
              <div className="pt-2 border-t border-amber-500/30 space-y-1.5">
                <div className="font-bold text-white uppercase text-[11px] tracking-wide">
                  👉 Langkah Wajib Peserta:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Segera temui <strong>Pengawas Ruangan</strong> di meja depan kelas sekarang.</li>
                  <li>Pengawas akan memverifikasi pelanggaran dan menekan tombol <strong>&quot;Buka Kunci Pelanggaran ke-2&quot;</strong> di Konsol Pengawas.</li>
                  <li>Setelah Pengawas mengizinkan, klik tombol <strong>Periksa Izin Pengawas</strong> di bawah.</li>
                </ol>
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 text-[11px]">
                  <strong>⚠️ PERINGATAN TERAKHIR:</strong> Jika Anda melanggar 1 kali lagi (Pelanggaran ke-3), akun CBT Anda akan <strong>DI-SUSPEND TOTAL</strong> dan hanya bisa dibuka oleh <strong>Admin Utama Sekolah</strong>!
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Menunggu konfirmasi buka kunci dari Pengawas Ruangan...</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!attempt) return;
                  setIsCheckingLock(true);
                  try {
                    const res = await checkStudentExamLockStatus(attempt.id);
                    if (res && res.success) {
                      if (res.isStrike2Locked !== undefined) {
                        setIsStrike2Locked(res.isStrike2Locked);
                      }
                      if (res.isBlocked) {
                        setAttempt((prev) => prev ? { ...prev, isBlocked: true, proctorNotes: res.proctorNotes } : prev);
                      }
                    }
                  } finally {
                    setIsCheckingLock(false);
                  }
                }}
                disabled={isCheckingLock}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
              >
                <RefreshCw size={14} className={isCheckingLock ? 'animate-spin' : ''} />
                <span>{isCheckingLock ? 'Memeriksa...' : 'Periksa Izin Pengawas'}</span>
              </button>
            </div>
          </div>
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
