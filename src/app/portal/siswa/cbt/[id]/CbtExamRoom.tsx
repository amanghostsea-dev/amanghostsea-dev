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
  ShieldCheck,
  ShieldX,
  Award,
  BookOpen,
  Key,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  Wifi,
  Calendar,
  Radio,
  Activity,
  AlertCircle
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { startOrResumeAttempt, saveProgress, submitExam, getExamSessionStatus, checkStudentExamLockStatus, checkAttemptStatusAction } from '../actions';
import { formatExamScheduleRange, getExamScheduleState, isExamTokenActive, formatClassTargetDisplay } from '@/lib/cbt-schedule';
import CbtRichText from '@/components/cbt/CbtRichText';
import CbtQuestionImageViewer from '@/components/cbt/CbtQuestionImageViewer';
import CbtQuestionContent from '@/components/cbt/CbtQuestionContent';
import { normalizeOptions } from '@/lib/cbt-bank-soal';

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
  isBlocked?: boolean;
  proctorNotes?: string | null;
  extraTimeMinutes?: number;
  startedAt: Date | string;
  submittedAt: Date | string | null;
}

// 🔊 Audio Synth Feedback untuk Notifikasi Cyber Anti-Curang (Pure Web Audio API, Zero Asset)
function playCyberAlertSound(type: 'warning' | 'lock' | 'suspend') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'warning') {
      // High-tech Dual Tone Warning Pulse (587Hz -> 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'lock' || type === 'suspend') {
      // Security Lockdown Alarm Synth (Sawtooth Drop 440Hz -> 293Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {}
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
    updatedAt?: Date | string | null;
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
  const initialTokenStatus = isExamTokenActive(exam);
  const [sessionStatus, setSessionStatus] = useState<string>(exam.status || 'PUBLISHED');
  const [isSessionOpen, setIsSessionOpen] = useState<boolean>(initialTokenStatus.isActive);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(initialTokenStatus.isExpired && !initialTokenStatus.isActive);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Status unblock check for Strike 3
  const [checkingUnblock, setCheckingUnblock] = useState(false);
  const [unblockMessage, setUnblockMessage] = useState<string | null>(null);

  const refreshSessionStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await getExamSessionStatus(exam.id);
      if (res && res.status) {
        setSessionStatus(res.status);
        if (typeof res.isSessionOpen === 'boolean') {
          setIsSessionOpen(res.isSessionOpen);
        }
        if (res.tokenStatus) {
          setIsTokenExpired(res.tokenStatus.isExpired && !res.tokenStatus.isActive);
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

  // 🔄 Auto-Resume Sesi Ujian Aktif (Bebas Token Ulang jika siswa sudah punya attempt di server)
  useEffect(() => {
    if (attempt) return;
    let isMounted = true;
    startOrResumeAttempt({
      examId: exam.id,
      studentName,
      studentNis: studentNis || undefined,
      studentClass: studentClass || exam.classTarget || undefined,
    }).then((res) => {
      if (isMounted && res && res.success && res.attempt) {
        setAttempt(res.attempt);
        const hasPermission =
          res.attempt.proctorNotes?.includes('[IZIN_LANJUT_P2]') ||
          res.attempt.proctorNotes?.includes('[RESET_PENGAWAS]');
        const isS2Locked = res.attempt.tabSwitchCount === 2 && !hasPermission && !res.attempt.isBlocked;
        setIsStrike2Locked(isS2Locked);
        setTabSwitchCount(res.attempt.tabSwitchCount || 0);

        // 🛡️ SINKRONISASI JAWABAN REALTIME PASCA RESUME:
        if (res.attempt.answers) {
          try {
            const serverAnswers = JSON.parse(res.attempt.answers);
            if (serverAnswers && typeof serverAnswers === 'object') {
              setAnswers((prev) => ({ ...serverAnswers, ...prev }));
            }
          } catch {}
        }

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
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [attempt, exam.id, exam.shuffleQuestions, exam.classTarget, studentName, studentNis, studentClass]);

  // Exam engine state (Acak urutan butir soal per siswa jika fitur shuffle diaktifkan guru)
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (exam.shuffleQuestions && exam.questions?.length > 1) {
      return seededShuffle(exam.questions, `${studentName}_${studentNis || ''}_${exam.id}`);
    }
    return exam.questions;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // 🛡️ ZERO-FLICKER HYDRATION:
    // 1. Ambil dari database server jika existingAttempt tersedia
    if (existingAttempt?.answers) {
      try {
        const parsed = JSON.parse(existingAttempt.answers);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    // 2. Ambil dari localStorage client jika tersedia
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cbt_exam_${exam.id}_${studentName}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers && typeof parsed.answers === 'object') return parsed.answers;
        }
      } catch {}
    }
    return {};
  });
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cbt_exam_${exam.id}_${studentName}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.doubtful && typeof parsed.doubtful === 'object') return parsed.doubtful;
        }
      } catch {}
    }
    return {};
  });
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(existingAttempt?.tabSwitchCount || 0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [lastViolationTimeStr, setLastViolationTimeStr] = useState<string>('');
  const [isStrike2Locked, setIsStrike2Locked] = useState<boolean>(() => {
    const att = existingAttempt;
    if (!att) return false;
    const hasPermission = 
      (att as any).proctorNotes?.includes('[IZIN_LANJUT_P2]') || 
      (att as any).proctorNotes?.includes('[RESET_PENGAWAS]');
    return ((att as any).tabSwitchCount === 2) && !hasPermission && !(att as any).isBlocked;
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

  // Restore local storage progress on mount (only once per attempt initialization)
  const isRestoredRef = useRef(false);

  useEffect(() => {
    if (isRestoredRef.current) return;
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    isRestoredRef.current = true;

    try {
      const saved = localStorage.getItem(storageKey);
      const dbCount = attempt.tabSwitchCount || 0;
      const hasPermission = 
        (attempt as any).proctorNotes?.includes('[IZIN_LANJUT_P2]') || 
        (attempt as any).proctorNotes?.includes('[RESET_PENGAWAS]');

      const isUnblockedByAdmin = 
        !(attempt as any).isBlocked && 
        Boolean((attempt as any).proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || (attempt as any).proctorNotes?.includes('[ADMIN_UNBLOCK]')) && 
        dbCount < 3;

      let dbAnswers: Record<string, string> = {};
      if (attempt.answers) {
        try {
          const parsed = JSON.parse(attempt.answers);
          if (parsed && typeof parsed === 'object') {
            dbAnswers = parsed;
          }
        } catch {}
      }

      let localAnswers: Record<string, string> = {};
      let restoredDoubtful: Record<string, boolean> = {};
      let restoredCount = dbCount;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.answers && typeof parsed.answers === 'object') {
            localAnswers = parsed.answers;
          }
          if (parsed.doubtful && typeof parsed.doubtful === 'object') {
            restoredDoubtful = parsed.doubtful;
          }
          const localCount = typeof parsed.tabSwitchCount === 'number' ? parsed.tabSwitchCount : 0;
          if (isUnblockedByAdmin) {
            // 🛡️ Otoritas penuh Server: Jika admin sudah membuka suspend, jangan biarkan local storage lama mereset kembali ke 3/4
            restoredCount = dbCount;
          } else {
            restoredCount = Math.max(dbCount, localCount);
          }
        } catch {}
      }

      // 🛡️ HYBRID STATE MERGE (DB Server + LocalStorage):
      // Jawaban dari database server digabungkan dengan cache lokal, keduanya saling mengamankan.
      const restoredAnswers: Record<string, string> = { ...dbAnswers, ...localAnswers };

      setAnswers((prev) => ({ ...restoredAnswers, ...prev }));
      setDoubtful((prev) => ({ ...restoredDoubtful, ...prev }));
      setTabSwitchCount(restoredCount);

      // Evaluasi kunci Strike 2 & Strike 3 secara deterministik
      if (isUnblockedByAdmin) {
        setIsStrike2Locked(false);
        setShowCheatWarning(false);
        setAttempt((prev) => prev ? { ...prev, isBlocked: false, tabSwitchCount: restoredCount } : prev);
      } else if (restoredCount >= 3) {
        setAttempt((prev) => prev ? { ...prev, isBlocked: true, tabSwitchCount: restoredCount } : prev);
        setIsStrike2Locked(false);
        setShowCheatWarning(false);
      } else if (restoredCount === 2) {
        if (!hasPermission && !(attempt as any).isBlocked) {
          setIsStrike2Locked(true);
          setShowCheatWarning(false);
        } else {
          setIsStrike2Locked(false);
        }
      } else {
        setIsStrike2Locked(false);
      }

      // Simpan kembali status yang sudah dinormalisasi ke localStorage
      try {
        const currentSaved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        localStorage.setItem(storageKey, JSON.stringify({
          ...currentSaved,
          answers: Object.keys(restoredAnswers).length > 0 ? restoredAnswers : currentSaved.answers || {},
          doubtful: restoredDoubtful,
          tabSwitchCount: restoredCount,
        }));
      } catch {}
    } catch (err) {
      console.error('Failed to restore CBT progress', err);
    }
  }, [attempt?.id, storageKey]);

  // Anti-Cheat: Progressive 3-Strike Visibility & Window Blur Detection with 3.5s Smart Grace Period
  const lastViolationTimeRef = useRef<number>(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const violationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isWindowBlurredRef = useRef<boolean>(false);
  const isPageUnloadingRef = useRef<boolean>(false);

  // 🛡️ Live References untuk mencegah closure stale & kebocoran strike saat layar terkunci
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const tabSwitchCountRef = useRef(tabSwitchCount);
  tabSwitchCountRef.current = tabSwitchCount;
  const isStrike2LockedRef = useRef(isStrike2Locked);
  isStrike2LockedRef.current = isStrike2Locked;

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || finalResult) return;

    const handleBeforeUnload = () => {
      // 🛡️ ZERO-VIOLATION REFRESH & RELOG SHIELD:
      // Siswa sedang me-refresh halaman (F5 / tombol reload) atau menutup tab untuk relog.
      // Batalkan seluruh timer pelanggaran seketika agar tidak tercatat sebagai pelanggaran!
      isPageUnloadingRef.current = true;
      isWindowBlurredRef.current = false;
      if (violationTimerRef.current) {
        clearTimeout(violationTimerRef.current);
        violationTimerRef.current = null;
      }
      // 💾 Amankan jawaban in-memory ke LocalStorage seketika sebelum unload
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...saved,
            answers: answersRef.current,
            tabSwitchCount: tabSwitchCountRef.current,
          })
        );
      } catch {}
    };

    const executeViolation = () => {
      if (isPageUnloadingRef.current) return;

      const currentAtt = attemptRef.current;
      const currentTab = tabSwitchCountRef.current;
      const notes = currentAtt?.proctorNotes || '';
      const isBlocked = Boolean(currentAtt?.isBlocked);

      // 🛡️ ZERO-LEAK SAFETY SHIELD:
      // JANGAN tambah pelanggaran jika saat ini siswa sedang dalam kondisi TERKUNCI / TERSUSPEND / DISKUALIFIKASI:
      // 1. Sedang Strike 2 Terkunci (menunggu pengawas buka kunci P2)
      // 2. Sedang Strike 3 Suspend (menunggu admin utama buka suspend)
      // 3. Sedang Strike 4 Terkunci Fatal (menunggu pengawas buka kunci fatal BAP)
      // 4. Sedang Diskualifikasi / Blocked (isBlocked: true atau currentTab >= 5)
      const isCurrentlyStrike2Locked = isStrike2LockedRef.current || (currentTab === 2 && !notes.includes('[IZIN_LANJUT_P2]'));
      const isCurrentlyStrike3Suspended = (currentTab === 3 || notes.includes('[STRIKE_3_BLOKIR]')) && !notes.includes('[ADMIN_UNBLOCK_ACTIVE]');
      const isCurrentlyStrike4FatalLocked = (currentTab === 4 || notes.includes('[STRIKE_4_FATAL]')) && !notes.includes('[FATAL_PROCTOR_UNBLOCKED]');
      const isCurrentlyDisqualified = currentTab >= 5 || notes.includes('[DISKUALIFIKASI_FINAL]');

      if (isBlocked || isCurrentlyStrike2Locked || isCurrentlyStrike3Suspended || isCurrentlyStrike4FatalLocked || isCurrentlyDisqualified) {
        return;
      }

      const now = Date.now();
      // 🛡️ Cooldown 3000ms: Menghindari double-increment akibat browser menembakkan event beruntun
      if (now - lastViolationTimeRef.current < 3000) {
        return;
      }
      lastViolationTimeRef.current = now;

      const incidentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      setLastViolationTimeStr(incidentTime);

      setTabSwitchCount((prev) => {
        const next = prev + 1;

        if (next === 1) {
          // ⚠️ PELANGGARAN KE-1: Tampilkan notifikasi peringatan tegas di layar, ujian masih berlanjut
          setShowCheatWarning(true);
          setIsStrike2Locked(false);
          playCyberAlertSound('warning');
        } else if (next === 2) {
          // 🚫 PELANGGARAN KE-2: Layar ujian DIBLOKIR / DIKUNCI, wajib lapor ke Pengawas Ruangan
          setIsStrike2Locked(true);
          setShowCheatWarning(false);
          playCyberAlertSound('lock');
        } else if (next === 3) {
          // ⛔ PELANGGARAN KE-3: Akun ujian DI-SUSPEND PERMANEN, wajib lapor ke Admin Utama
          setIsStrike2Locked(false);
          setShowCheatWarning(false);
          playCyberAlertSound('suspend');
        } else if (next === 4) {
          // 🚨 PELANGGARAN KE-4 (FATAL): Pasca Dispensasi Admin Utama, wajib lapor ke Pengawas Ruangan
          setIsStrike2Locked(false);
          setShowCheatWarning(false);
          playCyberAlertSound('suspend');
        } else if (next >= 5) {
          // 🛑 PELANGGARAN KE-5 (FINAL): Diskualifikasi total & auto-submit
          setIsStrike2Locked(false);
          setShowCheatWarning(false);
        }

        // Sinkronkan state attempt di memori agar tabSwitchCount konsisten
        setAttempt((prevAtt) => prevAtt ? {
          ...prevAtt,
          tabSwitchCount: next,
          isBlocked: next >= 3 ? true : prevAtt.isBlocked,
        } : prevAtt);

        // Update local storage
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
          localStorage.setItem(
            storageKey,
            JSON.stringify({ ...saved, tabSwitchCount: next })
          );
        } catch { }

        // Background sync to server with progressive 5-tier handling
        saveProgress(attempt.id, answersRef.current, next).then((res) => {
          if (res && res.success) {
            setAttempt((prevAtt) => prevAtt ? {
              ...prevAtt,
              isBlocked: res.isBlocked ?? (next >= 3 ? true : prevAtt.isBlocked),
              proctorNotes: res.proctorNotes ?? prevAtt.proctorNotes,
              tabSwitchCount: res.tabSwitchCount ?? next,
            } : prevAtt);

            if (res.isStrike2Locked !== undefined) {
              if (next < 3) {
                setIsStrike2Locked(res.isStrike2Locked);
              }
            }
            if (res.status === 'SUBMITTED') {
              setFinalResult({
                score: res.score || 0,
                totalCorrect: res.totalCorrect || 0,
                totalQuestions: res.totalQuestions || questions.length,
                tabSwitchCount: next,
              });
              localStorage.removeItem(storageKey);
            }
          }
        }).catch(console.error);

        return next;
      });
    };

    const handleWindowLeave = () => {
      if (isPageUnloadingRef.current) return;
      // 📱 SMART GRACE PERIOD (3.5 Detik Toleransi Notifikasi HP & Gesture):
      // Jika siswa di HP tidak sengaja menyentuh notifikasi WA, modal baterai lemah (20%),
      // atau gesture swipe, sistem TIDAK langsung menghitung pelanggaran!
      // Hanya jika siswa meninggalkan layar > 3.5 detik (terbukti membuka browser/aplikasi lain),
      // pelanggaran baru sah dieksekusi.
      if (violationTimerRef.current) return;
      isWindowBlurredRef.current = true;

      violationTimerRef.current = setTimeout(() => {
        violationTimerRef.current = null;
        if (isWindowBlurredRef.current && !isPageUnloadingRef.current) {
          executeViolation();
        }
      }, 3500);
    };

    const handleWindowReturn = () => {
      // Siswa kembali ke lembar ujian dalam batas waktu toleransi
      isWindowBlurredRef.current = false;
      if (violationTimerRef.current) {
        clearTimeout(violationTimerRef.current);
        violationTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (isPageUnloadingRef.current) return;
      if (document.hidden) {
        handleWindowLeave();
      } else {
        handleWindowReturn();
      }
    };

    const handleBlur = () => {
      if (isPageUnloadingRef.current) return;
      handleWindowLeave();
    };

    const handleFocus = () => {
      handleWindowReturn();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (violationTimerRef.current) {
        clearTimeout(violationTimerRef.current);
        violationTimerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [attempt?.id, finalResult, storageKey]);

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

    // Polling interval: 3 detik jika sedang terkunci Strike 2 atau suspend Strike 3 agar siswa langsung melanjutkan saat dibuka
    const intervalMs = (isStrike2Locked || (attempt as any)?.isBlocked || tabSwitchCount >= 3) ? 3000 : 15000;

    const interval = setInterval(async () => {
      // Jangan poll jika tab diminimalkan, KECUALI jika sedang menunggu buka kunci Strike 2 atau Strike 3
      if (typeof document !== 'undefined' && document.hidden && !isStrike2Locked && !(attempt as any)?.isBlocked && tabSwitchCount < 3) return;

      try {
        const res = await saveProgress(attempt.id, answersRef.current, tabSwitchCountRef.current);
        if (res && res.success) {
          // 🛡️ SINKRONISASI JAWABAN TERKINI DARI DATABASE:
          if (res.answers) {
            try {
              const serverAns = JSON.parse(res.answers);
              if (serverAns && typeof serverAns === 'object') {
                setAnswers((prev) => ({ ...serverAns, ...prev }));
              }
            } catch {}
          }

          setAttempt((prev) => prev ? {
            ...prev,
            isBlocked: res.isBlocked !== undefined ? res.isBlocked : prev.isBlocked,
            proctorNotes: res.proctorNotes !== undefined ? res.proctorNotes : prev.proctorNotes,
            tabSwitchCount: res.tabSwitchCount !== undefined ? res.tabSwitchCount : prev.tabSwitchCount,
            extraTimeMinutes: typeof res.extraTimeMinutes === 'number' ? res.extraTimeMinutes : prev.extraTimeMinutes,
          } : prev);

          // 🛡️ BUKA SUSPEND OLEH ADMIN UTAMA (STRIKE 3 DICABUT):
          const isStrike3Unblocked = 
            !res.isBlocked && 
            res.tabSwitchCount !== undefined && 
            res.tabSwitchCount < 3 && 
            Boolean(res.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || res.proctorNotes?.includes('[ADMIN_UNBLOCK]'));

          if (isStrike3Unblocked && ((attempt as any)?.isBlocked || tabSwitchCount >= 3)) {
            const serverCount = typeof res.tabSwitchCount === 'number' ? res.tabSwitchCount : 1;
            setTabSwitchCount(serverCount);
            setIsStrike2Locked(false);
            setShowCheatWarning(false);
            try {
              const saved = localStorage.getItem(storageKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                localStorage.setItem(storageKey, JSON.stringify({ ...parsed, tabSwitchCount: serverCount }));
              }
            } catch {}
          }

          if (res.isStrike2Locked !== undefined) {
            if (isStrike2Locked && !res.isStrike2Locked) {
              // 🔓 PENGAWAS TELAH MERESET / MEMBUKA KUNCI STRIKE 2!
              setIsStrike2Locked(false);
              setShowCheatWarning(false);
              const serverCount = res.tabSwitchCount || 2;
              setTabSwitchCount((prev) => Math.max(prev, serverCount));
              try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  localStorage.setItem(storageKey, JSON.stringify({ ...parsed, tabSwitchCount: serverCount }));
                }
              } catch {}
            } else if (!isStrike2Locked && res.isStrike2Locked && tabSwitchCount < 3) {
              setIsStrike2Locked(true);
            }
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
      const hasPermission = 
        res.attempt.proctorNotes?.includes('[IZIN_LANJUT_P2]') || 
        res.attempt.proctorNotes?.includes('[RESET_PENGAWAS]');
      const isS2Locked = res.attempt.tabSwitchCount === 2 && !hasPermission && !res.attempt.isBlocked;
      setIsStrike2Locked(isS2Locked);
      setTabSwitchCount(res.attempt.tabSwitchCount || 0);

      // 🛡️ SINKRONISASI JAWABAN REALTIME PASCA MEMULAI / RESUME:
      if (res.attempt.answers) {
        try {
          const serverAnswers = JSON.parse(res.attempt.answers);
          if (serverAnswers && typeof serverAnswers === 'object') {
            setAnswers((prev) => ({ ...serverAnswers, ...prev }));
          }
        } catch {}
      }

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

  // 🛡️ Auto-healing & normalisasi opsi (memisahkan pilihan yang tidak sengaja tergabung secara otomatis)
  const parsedOptions: string[] = currentQ ? normalizeOptions(currentQ.options) : [];

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

  // ----------------------------------------------------
  // SCREEN 2: BLOCKED / SUSPEND SCREEN (Strike 3, Strike 4 Fatal, Strike 5 Disqualified)
  // ----------------------------------------------------
  const isStrike5Disqualified = 
    tabSwitchCount >= 5 || 
    Boolean((attempt as any)?.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]'));

  const isStrike4Fatal = 
    !isStrike5Disqualified &&
    (tabSwitchCount === 4 || Boolean((attempt as any)?.proctorNotes?.includes('[STRIKE_4_FATAL]'))) &&
    !Boolean((attempt as any)?.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]'));

  const isStrike3 = 
    !isStrike5Disqualified &&
    !isStrike4Fatal &&
    (tabSwitchCount === 3 || Boolean((attempt as any)?.isBlocked) || ((attempt as any)?.tabSwitchCount === 3 && (attempt as any)?.isBlocked)) &&
    !Boolean((attempt as any)?.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]'));

  const isActuallyBlocked = isStrike5Disqualified || isStrike4Fatal || isStrike3;

  // Handle manual unblock check by student
  const handleManualCheckUnblock = async () => {
    if (!attempt?.id) return;
    setCheckingUnblock(true);
    setUnblockMessage(null);
    try {
      const res = await checkAttemptStatusAction(attempt.id);
      if (res && res.success && res.isUnblocked) {
        const count = res.tabSwitchCount ?? tabSwitchCount;
        setTabSwitchCount(count);
        setIsStrike2Locked(false);
        setShowCheatWarning(false);
        setAttempt((prev) => prev ? {
          ...prev,
          isBlocked: false,
          tabSwitchCount: count,
          proctorNotes: res.proctorNotes || prev.proctorNotes,
        } : prev);

        // 🛡️ SINKRONISASI JAWABAN REALTIME PASCA BUKA SUSPEND:
        const incomingAnswers = res.answers || res.attempt?.answers;
        if (incomingAnswers) {
          try {
            const dbAns = JSON.parse(incomingAnswers);
            if (dbAns && typeof dbAns === 'object') {
              setAnswers((prev) => ({ ...dbAns, ...prev }));
            }
          } catch {}
        }
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem(storageKey, JSON.stringify({ ...parsed, tabSwitchCount: count }));
          }
        } catch {}
        setUnblockMessage('✅ Kunci/Suspend Anda telah resmi dibuka! Melanjutkan ujian...');
      } else {
        setUnblockMessage(
          isStrike4Fatal 
            ? 'Akun Anda saat ini masih dalam status Terkunci Kritis di server. Pastikan Pengawas Ruangan di kelas sudah menekan tombol "Buka Kunci Fatal".'
            : 'Akun Anda saat ini masih dalam status Suspend di server. Pastikan Admin Utama sudah menekan tombol "Buka Suspend".'
        );
      }
    } catch {
      setUnblockMessage('Gagal memeriksa status ke server. Silakan coba lagi beberapa saat.');
    }
    setCheckingUnblock(false);
  };

  if (isActuallyBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden">
        {/* Hologram Red/Amber Halo */}
        <div className={`absolute w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${isStrike4Fatal ? 'bg-amber-600/15' : 'bg-rose-600/15'}`} />

        <div className={`relative max-w-lg w-full bg-slate-950/95 border-2 rounded-3xl p-5 sm:p-8 text-center space-y-4 sm:space-y-5 backdrop-blur-2xl animate-in zoom-in-95 duration-200 ${
          isStrike4Fatal 
            ? 'border-amber-500/70 shadow-[0_0_80px_-10px_rgba(245,158,11,0.35)]' 
            : 'border-rose-500/60 shadow-[0_0_80px_-10px_rgba(244,63,94,0.4)]'
        }`}>
          {/* Top Glowing Laser Accent */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isStrike4Fatal 
              ? 'from-transparent via-amber-400 to-transparent' 
              : 'from-transparent via-rose-500 to-transparent'
          }`} />

          {/* Futuristic Quarantine Beacon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-30 ${isStrike4Fatal ? 'border-amber-400/50' : 'border-rose-500/50'}`} />
            <div className={`absolute inset-1 rounded-full border shadow-[0_0_30px_rgba(244,63,94,0.35)] ${isStrike4Fatal ? 'border-amber-500/40 bg-amber-500/15' : 'border-rose-500/40 bg-rose-500/15'}`} />
            <div className={`relative z-10 w-16 h-16 rounded-2xl border flex items-center justify-center shadow-inner ${
              isStrike4Fatal 
                ? 'bg-gradient-to-br from-amber-500/40 via-amber-600/20 to-transparent border-amber-400/60 text-amber-300' 
                : 'bg-gradient-to-br from-rose-500/40 via-rose-600/20 to-transparent border-rose-400/60 text-rose-300'
            }`}>
              {isStrike4Fatal ? (
                <ShieldAlert size={38} className="text-amber-400 animate-pulse drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
              ) : (
                <ShieldX size={38} className="text-rose-400 animate-pulse drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
              )}
            </div>
          </div>

          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-black uppercase tracking-wider mb-2 shadow-sm border ${
              isStrike5Disqualified
                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                : isStrike4Fatal
                ? 'bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-ping ${isStrike4Fatal ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <span>
                {isStrike5Disqualified 
                  ? '🛑 DISKUALIFIKASI TOTAL SISTEM' 
                  : isStrike4Fatal 
                  ? '🚨 PERINGATAN FATAL • PELANGGARAN PASCA-DISPENSASI' 
                  : isStrike3 
                  ? 'SYSTEM QUARANTINE • PELANGGARAN KE-3' 
                  : 'SESI UJIAN DITANGGUHKAN'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-rose-200 tracking-tight">
              {isStrike5Disqualified
                ? 'Ujian Anda Telah Diakhiri Sistem'
                : isStrike4Fatal
                ? 'Akun Terkunci Kritis (Pelanggaran ke-4)'
                : isStrike3
                ? 'Akun CBT Anda Di-Suspend Total'
                : 'Ujian Ditangguhkan Pengawas'}
            </h2>
          </div>

          {/* Stepper Progresif Pelanggaran */}
          {isStrike4Fatal ? (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-left font-mono">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-400" /> STATUS ESKALASI PELANGGARAN:
                </span>
                <span className="text-amber-400 font-black">4 / 4 (FATAL STRIKE)</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[9px] pt-1">
                <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400">
                  <div className="font-bold">THP 1</div>
                  <div className="text-[8.5px] text-slate-500">Teguran</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400">
                  <div className="font-bold">THP 2</div>
                  <div className="text-[8.5px] text-slate-500">Kunci P2</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400">
                  <div className="font-bold text-emerald-400">THP 3</div>
                  <div className="text-[8.5px] text-emerald-500">Dispensasi</div>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-500/25 border-2 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)] space-y-0.5">
                  <div className="font-black text-amber-300 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>THP 4</span>
                  </div>
                  <div className="text-[8.5px] font-bold text-white">FATAL RUANG</div>
                </div>
              </div>
            </div>
          ) : isStrike3 ? (
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-left font-mono">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-rose-400" /> STATUS ESKALASI PELANGGARAN:
                </span>
                <span className="text-rose-400 font-black">3 / 3 (SUSPEND TOTAL)</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400">
                  <div className="font-bold text-slate-400">TAHAP 1</div>
                  <div className="text-[9.5px] text-slate-500">Teguran (Lewat)</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400">
                  <div className="font-bold text-slate-400">TAHAP 2</div>
                  <div className="text-[9.5px] text-slate-500">Kunci (Lewat)</div>
                </div>

                <div className="p-2 rounded-xl bg-rose-500/25 border-2 border-rose-500 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.3)] space-y-0.5">
                  <div className="font-black text-rose-300 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    <span>TAHAP 3</span>
                  </div>
                  <div className="text-[9.5px] font-bold text-white">SUSPEND TOTAL</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed text-left space-y-2.5">
            {isStrike5Disqualified ? (
              <div className="p-4 rounded-2xl bg-red-950/70 border border-red-600/60 text-red-200 text-xs space-y-2 shadow-inner">
                <div className="font-bold text-red-300 flex items-center gap-1.5">
                  <ShieldAlert size={16} /> DISKUALIFIKASI SISTEM:
                </div>
                <p>
                  Anda telah melakukan <strong>pelanggaran ke-5 berturut-turut</strong> setelah sebelumnya mendapatkan 2x dispensasi (Admin Utama dan Pengawas Ruang).
                </p>
                <p className="font-bold text-white">
                  Pengerjaan ujian Anda telah diakhiri secara otomatis dan nilai Anda telah dibekukan.
                </p>
              </div>
            ) : isStrike4Fatal ? (
              <>
                <p>
                  Perhatian Kritis: Anda sebelumnya <strong>sudah mendapatkan dispensasi resmi dari Admin CBT</strong> untuk melanjutkan ujian. Namun sistem mendeteksi Anda <strong>kembali melanggar tata tertib (4x Pindah Tab/Layar/Aplikasi)</strong>!
                </p>
                <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs space-y-2 shadow-inner">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={16} /> PERINGATAN FATAL (TOLERANSI TERAKHIR):
                  </div>
                  <p>
                    Pelanggaran berulang ini telah dicatat sebagai <strong>CATATAN FATAL</strong> di Berita Acara Pelaksanaan (BAP) Pengawas.
                  </p>
                  <p className="font-bold text-white">
                    🏛️ Silakan segera melapor langsung ke PENGAWAS RUANGAN di depan kelas untuk permohonan kesempatan darurat terakhir!
                  </p>
                </div>
              </>
            ) : isStrike3 ? (
              <>
                <p>
                  Pengerjaan ujian Anda telah <strong>dihentikan permanen dan akun Anda di-suspend oleh sistem</strong> karena telah melakukan <strong>pelanggaran tata tertib sebanyak 3 kali berturut-turut</strong> (berpindah tab / jendela layar / aplikasi).
                </p>
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-600/60 text-rose-200 text-xs space-y-2 shadow-inner">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert size={16} /> PERHATIAN KHUSUS (KEWENANGAN PENGAWAS DIKUNCI):
                  </div>
                  <p>
                    Sesuai SOP Ujian Terpusat, <strong>Pengawas Ruangan di kelas TIDAK DAPAT membuka suspend ini</strong>.
                  </p>
                  <p className="font-bold text-white">
                    🏛️ Anda diwajibkan segera melapor langsung ke ADMIN UTAMA SEKOLAH (SUPER ADMIN) di ruang server CBT / sekretariat ujian untuk verifikasi berita acara (BAP).
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
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-900/60 text-left text-xs space-y-1.5 font-mono">
            <div className="text-rose-400 font-bold flex items-center justify-between">
              <span>Status Pelanggaran:</span>
              <span className="text-rose-300 font-black">{Math.max(tabSwitchCount, (attempt as any).tabSwitchCount || 0)}x Pindah Tab (Tingkat Maksimal)</span>
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

          {unblockMessage && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-sans text-left">
              {unblockMessage}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleManualCheckUnblock}
              disabled={checkingUnblock}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={checkingUnblock ? 'animate-spin' : ''} />
              <span>
                {checkingUnblock 
                  ? 'Memeriksa Server...' 
                  : isStrike4Fatal 
                  ? 'Cek Izin Pengawas & Lanjut Ujian' 
                  : 'Cek Status Buka Suspend & Lanjut Ujian'}
              </span>
            </button>
            <Link
              href="/portal/siswa/cbt"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-3 sm:p-6 md:p-12 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 sm:space-y-6 animate-in fade-in">
          <div>
            <Link
              href="/portal/siswa/cbt"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
            >
              <ArrowLeft size={14} /> Kembali
            </Link>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5fa08d]/15 text-[#4d8675] dark:text-[#8bb79e] border border-[#5fa08d]/30">
                {exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#caa55d]/15 text-[#b6a86e] dark:text-[#f5d076] border border-[#caa55d]/30">
                Target: {formatClassTargetDisplay(exam.classTarget)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="text-slate-500 text-xs mt-1">{exam.description || 'Petunjuk ujian standar SMK.'}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-500 block text-[11px]">Durasi Pengerjaan</span>
              <strong className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold">
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
          {!isSessionOpen ? (
            isTokenExpired ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-800 dark:text-rose-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle size={18} className="text-rose-500 shrink-0" />
                      Waktu Ujian Telah Berakhir
                    </span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-800 dark:text-rose-200 font-mono px-2 py-0.5 rounded-full font-bold uppercase border border-rose-500/30">
                      Token Nonaktif
                    </span>
                  </div>

                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    Waktu pelaksanaan ujian resmi telah selesai dan token ujian telah <strong>otomatis dinonaktifkan</strong> oleh sistem. Jika Anda adalah peserta <strong>Ujian Susulan</strong>, silakan minta guru pengawas di ruangan untuk mengaktifkan sesi susulan.
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-500/20">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Wifi size={13} className="text-rose-500" />
                      Menunggu pengawas mengaktifkan sesi susulan...
                    </span>
                    <button
                      type="button"
                      onClick={refreshSessionStatus}
                      disabled={checkingStatus}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={checkingStatus ? 'animate-spin' : ''} />
                      <span>{checkingStatus ? 'Memeriksa...' : 'Cek Status Sesi'}</span>
                    </button>
                  </div>
                </div>

                {/* Locked Token Placeholder */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1.5 opacity-60">
                  <Lock className="mx-auto text-slate-400" size={20} />
                  <div className="text-xs font-semibold text-slate-500">
                    Token ditutup otomatis karena waktu pengerjaan telah berakhir
                  </div>
                </div>
              </div>
            ) : (
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
            )
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
                  className="group relative overflow-hidden w-full py-3.5 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#5aa08c] hover:to-[#dfba6f] text-white rounded-xl font-black text-sm shadow-lg shadow-[#5fa08d]/25 hover:shadow-xl hover:shadow-[#5fa08d]/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <span>{startLoading ? 'Menyiapkan Lembar Ujian...' : 'Mulai Kerjakan Ujian Sekarang'}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </form>
            </div>
          )}

          {/* Engine Branding Footer inside card */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
            Smart CBT Engine &bull; Created By <span className="font-semibold text-slate-600 dark:text-slate-300">Abdul Rahman</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 4: STRIKE 2 LOCKED SCREEN (CYBER PROCTORING LOCKDOWN)
  // ----------------------------------------------------
  if (isStrike2Locked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden">
        {/* Hologram Orange Halo */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-600/15 blur-[140px] pointer-events-none" />

        <div className="relative max-w-lg w-full bg-slate-950/95 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-8 text-center space-y-4 sm:space-y-5 shadow-[0_0_80px_-10px_rgba(245,158,11,0.4)] backdrop-blur-2xl max-h-[94vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          {/* Top Glowing Laser Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          {/* Futuristic Padlock Radar */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/50 animate-ping opacity-30" />
            <div className="absolute inset-1 rounded-full border border-amber-500/40 bg-amber-500/15 shadow-[0_0_30px_rgba(245,158,11,0.35)]" />
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/40 via-amber-600/20 to-transparent border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner">
              <Lock size={36} className="text-amber-300 animate-pulse drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[11px] sm:text-xs font-mono font-black uppercase tracking-wider mb-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>SECURITY LOCKDOWN &bull; PELANGGARAN KE-2</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Layar Ujian Terkunci Sementara
            </h2>
            <p className="text-xs text-amber-200/90 mt-1 max-w-sm mx-auto leading-relaxed">
              Anda terdeteksi melakukan pelanggaran tata tertib sebanyak <strong>2 kali</strong>. Seluruh akses lembar soal dinonaktifkan sementara.
            </p>
          </div>

          {/* 3-Strike Stepper with Stage 2 Highlighted */}
          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-left font-mono">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Activity size={13} className="text-amber-400" /> STATUS ESKALASI:
              </span>
              <span className="text-amber-400 font-black">2 / 3 MAKSIMAL (TERKUNCI)</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400">
                <div className="font-bold text-slate-400">TAHAP 1</div>
                <div className="text-[9.5px] text-slate-500">Teguran (Selesai)</div>
              </div>

              <div className="p-2 rounded-xl bg-amber-500/25 border-2 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)] space-y-0.5">
                <div className="font-black text-amber-300 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                  <span>TAHAP 2</span>
                </div>
                <div className="text-[9.5px] font-bold text-white">TERKUNCI (SEKARANG)</div>
              </div>

              <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-400/80">
                <div className="font-bold text-rose-400">TAHAP 3</div>
                <div className="text-[9.5px] text-rose-500">Suspend Admin</div>
              </div>
            </div>
          </div>

          {/* Steps & SOP Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 text-left text-xs space-y-2.5">
            <div className="font-bold text-white uppercase text-[11px] tracking-wide flex items-center gap-1.5 text-amber-300">
              <Radio size={14} className="animate-pulse" /> SOP Wajib Peserta Ujian:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs">
              <li>Segera temui <strong>Pengawas Ruangan</strong> di meja depan kelas sekarang.</li>
              <li>Pengawas akan memverifikasi kejadian dan menekan tombol <strong>&quot;Buka Kunci P2 / Reset&quot;</strong> di Konsol Pengawas.</li>
              <li>Setelah Pengawas menyetujui, layar ini akan <strong>otomatis melanjutkan ujian</strong> (diperiksa tiap 3 detik).</li>
            </ol>
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-[11px] leading-relaxed">
              <strong className="text-rose-300 block mb-0.5">⚠️ PERINGATAN TERAKHIR (STRIKE 3):</strong>
              Jika Anda melanggar 1 kali lagi (Pelanggaran ke-3), akun CBT Anda akan <strong>DI-SUSPEND TOTAL</strong> secara permanen. Pengawas Ruangan <strong>TIDAK BISA</strong> membukanya, Anda wajib melapor ke <strong>Admin Utama Sekolah</strong>!
            </div>
          </div>

          {/* Realtime Telemetry Heartbeat Indicator */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 text-xs text-slate-300 flex items-center justify-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px]">SINKRONISASI PENGAWAS AKTIF &bull; MEMERIKSA TIAP 3 DETIK...</span>
          </div>

          {/* Action Button */}
          <div className="pt-1">
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
                      if (!res.isStrike2Locked) {
                        setShowCheatWarning(false);
                        const sCount = res.tabSwitchCount || 2;
                        setTabSwitchCount((prev) => Math.max(prev, sCount));
                        try {
                          const saved = localStorage.getItem(storageKey);
                          if (saved) {
                            const parsed = JSON.parse(saved);
                            localStorage.setItem(storageKey, JSON.stringify({ ...parsed, tabSwitchCount: sCount }));
                          }
                        } catch {}
                      }
                    }
                    setAttempt((prev) => prev ? {
                      ...prev,
                      isBlocked: res.isBlocked ?? prev.isBlocked,
                      proctorNotes: res.proctorNotes ?? prev.proctorNotes,
                      tabSwitchCount: res.tabSwitchCount ?? prev.tabSwitchCount,
                      extraTimeMinutes: typeof res.extraTimeMinutes === 'number' ? res.extraTimeMinutes : prev.extraTimeMinutes,
                    } : prev);
                  }
                } finally {
                  setIsCheckingLock(false);
                }
              }}
              disabled={isCheckingLock}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.35)] border border-amber-300/40"
            >
              <RefreshCw size={16} className={isCheckingLock ? 'animate-spin' : ''} />
              <span>{isCheckingLock ? 'MEMERIKSA SINYAL PENGAWAS...' : 'PERIKSA IZIN PENGAWAS SEKARANG'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 5: LIVE CBT EXAM ROOM
  // ----------------------------------------------------
  const selectedOption = answers[currentQ?.id];
  const isCurrentDoubtful = doubtful[currentQ?.id];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans flex flex-col select-none">
      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-6 md:px-8 py-2 sm:py-3 flex items-center justify-between shadow-sm gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-md shadow-[#5fa08d]/25 shrink-0">
            {currentIndex + 1}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[90px] xs:max-w-[140px] sm:max-w-xs" title={exam.title}>
              {exam.title}
            </h2>
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[100px] xs:max-w-[160px] sm:max-w-xs">
              No. {currentIndex + 1}/{questions.length} • {studentName}
            </div>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full font-mono font-bold text-xs sm:text-sm transition-all ${timeLeft < 300
                ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse border border-red-300'
                : 'bg-[#5fa08d]/10 dark:bg-[#5fa08d]/20 text-[#4d8675] dark:text-[#8bb79e] border border-[#5fa08d]/30'
              }`}
          >
            <Clock size={14} className="sm:w-4 sm:h-4 shrink-0" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {tabSwitchCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert size={12} /> {tabSwitchCount}x Pindah
            </span>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="group relative overflow-hidden px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
            <Send size={13} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span className="hidden xs:inline">Selesai Ujian</span>
            <span className="xs:hidden">Selesai</span>
          </button>
        </div>
      </header>

      {/* Main Examination Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Left Column: Current Question & Options */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 md:p-8">
          <div>
            {/* Question Header & Points */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <span className="text-xs font-bold text-[#4d8675] dark:text-[#8bb79e] bg-[#5fa08d]/15 dark:bg-[#5fa08d]/25 px-3 py-1 rounded-full border border-[#5fa08d]/30">
                Bobot Soal: {currentQ?.points} Poin
              </span>
              <button
                onClick={toggleDoubtful}
                className={`group flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                  isCurrentDoubtful
                    ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 shadow-amber-500/20'
                    : 'bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border-slate-200 hover:border-amber-300 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span>{isCurrentDoubtful ? '★ Status: Ragu-Ragu' : 'Tandai Ragu-Ragu'}</span>
              </button>
            </div>

            {/* Question Text, Middle Image (if any) & Math Formulas */}
            <CbtQuestionContent
              questionText={currentQ?.questionText || ''}
              imageUrl={currentQ?.imageUrl}
              imageAlt={`Visualisasi Gambar Soal No. ${currentIndex + 1}`}
              className="text-base md:text-lg font-medium mb-4"
            />

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
                    className={`group relative w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'border-[#5fa08d] bg-[#5fa08d]/10 dark:bg-[#14231e]/70 ring-2 ring-[#5fa08d]/30 text-[#1b332c] dark:text-[#c4ded4] font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white shadow-md shadow-[#5fa08d]/30 scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="flex-1 pt-1 text-sm md:text-base leading-snug">
                      <CbtRichText text={opt} />
                    </span>
                    {isSelected && (
                      <Check className="text-[#caa55d] flex-shrink-0 mt-1 animate-in zoom-in-75 duration-200" size={18} />
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
              className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-2xs hover:shadow-md hover:-translate-x-0.5 active:translate-x-0 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
              <span>Soal Sebelumnya</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#5aa08c] hover:to-[#dfba6f] text-white font-black text-xs shadow-md shadow-[#5fa08d]/25 hover:shadow-lg hover:shadow-[#5fa08d]/35 hover:translate-x-0.5 active:translate-x-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                <span>Soal Berikutnya</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                <span>Kumpulkan Ujian</span>
                <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
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
                    className={`relative h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 hover:shadow-md ${bgClass} ${
                      isCurrent
                        ? 'ring-2 ring-[#5fa08d] ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-md font-black'
                        : 'hover:opacity-90'
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

      {/* ⚠️ STRIKE 1: MODAL PERINGATAN PELANGGARAN PERTAMA (CYBER PROCTORING HUD) */}
      {showCheatWarning && tabSwitchCount === 1 && !isStrike2Locked && !(attempt as any)?.isBlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-300">
          {/* Hologram Radial Glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />

          <div className="relative max-w-lg w-full bg-slate-950/95 border border-amber-500/40 rounded-3xl p-5 sm:p-7 text-center shadow-[0_0_60px_-10px_rgba(245,158,11,0.35)] backdrop-blur-2xl space-y-4 max-h-[94vh] overflow-y-auto text-slate-100 animate-in zoom-in-95 duration-200">
            {/* Top Glowing Laser Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {/* Futuristic Radar Scanner Badge */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              {/* Concentric Pulse Rings */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping opacity-40" />
              <div className="absolute inset-1 rounded-full border border-amber-500/30 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.25)]" />
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
                <ShieldAlert size={32} className="animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>
            </div>

            {/* Header Telemetry Pill */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>AI PROCTOR SENSOR • PELANGGARAN KE-1</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Terdeteksi Keluar Layar Ujian!
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Sistem keamanan mendeteksi bahwa fokus jendela ujian terputus (berpindah tab, meminimalkan browser, atau membuka aplikasi lain).
              </p>
            </div>

            {/* Incident Telemetry HUD */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs bg-slate-900/90 p-3 sm:p-3.5 rounded-2xl border border-white/10 font-mono">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">Waktu Kejadian:</span>
                <span className="text-amber-300 font-bold text-xs">{lastViolationTimeStr || 'Baru Saja'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">Sensor Deteksi:</span>
                <span className="text-slate-200 font-bold text-xs truncate block" title="WINDOW_BLUR_EVENT">WINDOW_BLUR</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">Node Peserta:</span>
                <span className="text-white font-bold text-xs truncate block" title={studentName}>{studentName}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">Tingkat Resiko:</span>
                <span className="text-amber-400 font-bold text-xs">TAHAP 1 (TEGURAN)</span>
              </div>
            </div>

            {/* 3-Strike Visual Pipeline Stepper */}
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/25 space-y-2 text-left">
              <div className="flex items-center justify-between text-[10.5px] font-mono font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-400" /> STATUS ESKALASI PELANGGARAN:
                </span>
                <span className="text-amber-400">1 / 3 MAKSIMAL</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                {/* Step 1 */}
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 space-y-1 ring-1 ring-amber-400/30">
                  <div className="font-black text-amber-300 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>TAHAP 1</span>
                  </div>
                  <div className="text-[9.5px] font-semibold text-slate-200">Teguran Layar (Aktif)</div>
                </div>

                {/* Step 2 */}
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300 flex items-center justify-center gap-1">
                    <Lock size={10} />
                    <span>TAHAP 2</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400">Kunci Pengawas</div>
                </div>

                {/* Step 3 */}
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 space-y-1">
                  <div className="font-bold text-slate-400 flex items-center justify-center gap-1">
                    <ShieldX size={10} />
                    <span>TAHAP 3</span>
                  </div>
                  <div className="text-[9.5px] text-slate-500">Suspend Admin</div>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200/90 leading-relaxed space-y-1">
                <p className="font-medium">
                  Ini adalah <strong className="text-amber-300">Peringatan Pertama</strong>. Anda masih diizinkan melanjutkan pengerjaan soal.
                </p>
                <p className="text-[11px] text-rose-300 font-bold flex items-center gap-1 pt-0.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>PERINGATAN: Keluar layar 1x lagi akan LANGSUNG MENGUNCI lembar ujian Anda!</span>
                </p>
              </div>
            </div>

            {/* High-tech Action Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCheatWarning(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 cursor-pointer border border-amber-300/40"
              >
                <ShieldCheck size={18} />
                <span>SAYA MENGERTI &bull; LANJUTKAN UJIAN</span>
                <ArrowRight size={16} />
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
