'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  Clock, 
  Key, 
  Lock,
  Unlock,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Play,
  Square,
  Wifi,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download,
  Printer,
  Search,
  Sparkles,
  MonitorPlay,
  UploadCloud,
  FileSpreadsheet,
  Edit3,
  ShieldCheck,
  Sliders,
  FileUp,
  Layers,
  Info,
  Calendar,
  Calculator,
  Filter,
  FolderDown,
  FileDown,
  Image as ImageIcon,
  Upload,
  Eye,
  EyeOff,
  Zap,
  X,
  Table,
  ArrowUpDown,
  AlignLeft,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  createQuestion, 
  deleteQuestion, 
  deleteBulkQuestions,
  deleteAllQuestions,
  deleteAttempt, 
  toggleExamSession, 
  createBatchQuestions, 
  updateQuestion, 
  rotateExamToken,
  autoDistributeExamPointsAction,
  reorderExamQuestions,
  moveQuestionOrder,
  adminUnblockStrike3Action,
  adminUnblockAllStrike3Action,
  proctorUnlockStrike2Action
} from '../actions';
import { 
  formatExamScheduleRange, 
  getExamScheduleState, 
  checkScheduleDiscrepancy,
  ScheduleDiscrepancyResult,
  extractJurusanCode, 
  getJurusanFullName, 
  formatClassTargetDisplay 
} from '@/lib/cbt-schedule';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox, 
  CbtDigitalStamp 
} from '@/components/cbt/CbtOfficialPrintComponents';
import { KopSuratConfig } from '@/app/admin/settings/types';
import CbtRichText from '@/components/cbt/CbtRichText';
import CbtQuestionImageViewer from '@/components/cbt/CbtQuestionImageViewer';
import CbtQuestionContent, { parseQuestionContent } from '@/components/cbt/CbtQuestionContent';
import CbtMathToolbar from '@/components/cbt/CbtMathToolbar';
import CbtOptionInputItem from '@/components/cbt/CbtOptionInputItem';
import CbtTableBuilderModal from '@/components/cbt/CbtTableBuilderModal';
import CbtFormatToolbar from '@/components/cbt/CbtFormatToolbar';
import {
  generateExamQuestionsCsv,
  generateExamQuestionsTxt,
  generateExamQuestionsJson,
  triggerBrowserDownload,
  splitCsvRows,
  keyToLetter,
} from '@/lib/cbt-bank-soal';

interface ParsedQuestion {
  questionText: string;
  imageUrl?: string | null;
  options: string[];
  correctAnswer: string;
  points: number;
}

function splitCsvLine(line: string, delimiter: string = ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBulkQuestions(rawText: string, defaultPoints: number = 10): ParsedQuestion[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Detect if content is Delimited (CSV or Tab-Separated from Excel copy-paste)
  const isDelimited = trimmed.includes('sep=;') || trimmed.includes(';') || trimmed.includes('\t') || (trimmed.includes(',') && trimmed.includes('"'));

  // Gunakan splitCsvRows agar baris baru di dalam tanda petik ganda tetap utuh
  const lines = isDelimited
    ? splitCsvRows(trimmed).filter((l) => !l.toLowerCase().startsWith('sep='))
    : trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !l.toLowerCase().startsWith('sep='));

  if (isDelimited) {
    const results: ParsedQuestion[] = [];
    let detectedDelimiter = ';';
    const sampleLine = lines.find((l) => !l.startsWith('#')) || '';
    if (sampleLine.split('\t').length >= 5) detectedDelimiter = '\t';
    else if (sampleLine.split(';').length >= 5) detectedDelimiter = ';';
    else if (sampleLine.split(',').length >= 5) detectedDelimiter = ',';

    // Header column mapping
    let colQ = -1;
    let colA = -1;
    let colB = -1;
    let colC = -1;
    let colD = -1;
    let colE = -1;
    let colKey = -1;
    let colPoints = -1;
    let colImg = -1;
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#')) continue;

      const parts = splitCsvLine(line, detectedDelimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());
      if (parts.length < 5) continue;

      // Check if this line is header row
      const lower = parts.map((p) => p.toLowerCase());
      const looksLikeHeader = lower.some(
        (p) => p.includes('soal') || p.includes('tanya') || p.includes('kunci') || p.includes('pilihan')
      );

      if (!hasHeader && looksLikeHeader) {
        hasHeader = true;
        parts.forEach((p, idx) => {
          const s = p.toLowerCase();
          if (s.includes('soal') || s.includes('tanya') || s.includes('pertanyaan')) colQ = idx;
          else if (s === 'a' || s.includes('pilihan a') || s.includes('opsi a')) colA = idx;
          else if (s === 'b' || s.includes('pilihan b') || s.includes('opsi b')) colB = idx;
          else if (s === 'c' || s.includes('pilihan c') || s.includes('opsi c')) colC = idx;
          else if (s === 'd' || s.includes('pilihan d') || s.includes('opsi d')) colD = idx;
          else if (s === 'e' || s.includes('pilihan e') || s.includes('opsi e')) colE = idx;
          else if (s.includes('kunci') || s.includes('jawaban') || s.includes('ans') || s.includes('key')) colKey = idx;
          else if (s.includes('poin') || s.includes('nilai') || s.includes('bobot') || s.includes('skor')) colPoints = idx;
          else if (s.includes('gambar') || s.includes('image') || s.includes('foto') || s.includes('url')) colImg = idx;
        });
        continue;
      }

      let qText = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let optE = '';
      let keyRaw = 'A';
      let pt = defaultPoints;
      let imgUrl = colImg !== -1 && parts[colImg] ? parts[colImg].trim() : undefined;

      const parsePt = (val: any) => {
        if (!val) return defaultPoints;
        const p = parseFloat(String(val).replace(',', '.'));
        return !isNaN(p) && p > 0 ? p : defaultPoints;
      };

      if (hasHeader && colQ !== -1 && colA !== -1) {
        qText = parts[colQ] || '';
        optA = parts[colA] || '';
        optB = parts[colB] || '';
        optC = parts[colC] || '';
        optD = parts[colD] || '';
        optE = colE !== -1 ? parts[colE] || '' : '';
        keyRaw = colKey !== -1 ? parts[colKey] || 'A' : 'A';
        pt = colPoints !== -1 && parts[colPoints] ? parsePt(parts[colPoints]) : defaultPoints;
      } else {
        const isFirstColNumber = /^\d+$/.test(parts[0]);
        const offset = isFirstColNumber ? 1 : 0;
        qText = parts[offset] || '';
        optA = parts[offset + 1] || '';
        optB = parts[offset + 2] || '';
        optC = parts[offset + 3] || '';
        optD = parts[offset + 4] || '';

        if (parts.length >= offset + 7 && !['A', 'B', 'C', 'D', 'E', '0', '1', '2', '3', '4'].includes(parts[offset + 5].toUpperCase())) {
          optE = parts[offset + 5];
          keyRaw = parts[offset + 6] || 'A';
          pt = parts[offset + 7] ? parsePt(parts[offset + 7]) : defaultPoints;
        } else {
          keyRaw = parts[offset + 5] || 'A';
          pt = parts[offset + 6] ? parsePt(parts[offset + 6]) : defaultPoints;
        }
      }

      qText = qText.replace(/^(?:Soal\s*)?\d+[\.\:\)]\s*/i, '').trim();
      if (!qText) continue;

      const opts = [optA, optB, optC, optD].filter(Boolean);
      if (optE) opts.push(optE);
      while (opts.length < 4) {
        opts.push(`Pilihan ${String.fromCharCode(65 + opts.length)}`);
      }

      const k = keyRaw.toUpperCase().trim();
      let kIdx = 0;
      if (k === 'B' || k === '1') kIdx = 1;
      else if (k === 'C' || k === '2') kIdx = 2;
      else if (k === 'D' || k === '3') kIdx = 3;
      else if (k === 'E' || k === '4') kIdx = 4;

      results.push({
        questionText: qText,
        imageUrl: imgUrl || null,
        options: opts,
        correctAnswer: String(kIdx),
        points: pt,
      });
    }

    if (results.length > 0) return results;
  }

  // Block-based parsing
  const normalized = trimmed.replace(/\r\n/g, '\n');
  const rawBlocks = normalized
    .split(/\n\s*\n+|(?<=\n)(?=(?:Soal\s*)?\d+[\.\)]\s+)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const parsedResults: ParsedQuestion[] = [];

  for (const block of rawBlocks) {
    const bLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (bLines.length === 0) continue;

    let qTextParts: string[] = [];
    let options: string[] = [];
    let correctAnswer = '0';
    let points = defaultPoints;
    let imageUrl: string | null = null;

    const optionRegex = /^(?:(?:\(?([A-Ea-e])[\.\)]|\(([A-Ea-e])\))|\b([A-Ea-e])\.\s+)\s*(.*)/;
    const keyRegex = /^(?:Kunci|Jawaban|Ans|Key|Kunci\s*Jawaban|Jawaban\s*Benar)[\s\:\=\-]+([A-Ea-e]|\d)\b/i;
    const pointsRegex = /^(?:Poin|Nilai|Bobot|Score|Points)[\s\:\=\-]+([\d\.,]+)\b/i;
    const imageRegex = /^(?:Gambar|Image|Foto|Pic|Picture)[\s\:\=\-]+(.*)/i;

    for (const bLine of bLines) {
      const kMatch = bLine.match(keyRegex);
      if (kMatch) {
        const k = kMatch[1].toUpperCase();
        let kIdx = 0;
        if (k === 'B' || k === '1') kIdx = 1;
        else if (k === 'C' || k === '2') kIdx = 2;
        else if (k === 'D' || k === '3') kIdx = 3;
        else if (k === 'E' || k === '4') kIdx = 4;
        correctAnswer = String(kIdx);
        continue;
      }

      const pMatch = bLine.match(pointsRegex);
      if (pMatch) {
        const parsedVal = parseFloat(pMatch[1].replace(',', '.'));
        points = !isNaN(parsedVal) && parsedVal > 0 ? parsedVal : defaultPoints;
        continue;
      }

      const imgMatch = bLine.match(imageRegex);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        qTextParts.push('[GAMBAR]');
        continue;
      }

      const oMatch = bLine.match(optionRegex);
      if (oMatch) {
        const optText = oMatch[4] || '';
        options.push(optText.trim());
        continue;
      }

      if (options.length === 0) {
        qTextParts.push(bLine);
      } else {
        const lastIdx = options.length - 1;
        options[lastIdx] += ' ' + bLine;
      }
    }

    if (qTextParts.length > 0) {
      let rawQ = qTextParts.join('\n').trim();
      rawQ = rawQ.replace(/^(?:Soal\s*)?\d+[\.\:\)]\s*/i, '').trim();

      if (options.length < 4) {
        while (options.length < 4) {
          options.push(`Pilihan ${String.fromCharCode(65 + options.length)}`);
        }
      }

      if (rawQ) {
        parsedResults.push({
          questionText: rawQ,
          imageUrl,
          options,
          correctAnswer,
          points,
        });
      }
    }
  }

  return parsedResults;
}

interface QuestionItem {
  id: string;
  examId: string;
  questionText: string;
  imageUrl?: string | null;
  options: string;
  correctAnswer: string;
  points: number;
  order: number;
  createdAt?: Date | string;
}

const sortQuestions = (items: QuestionItem[] = []) => {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });
};

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
  isBlocked?: boolean;
  proctorNotes?: string | null;
  startedAt: Date | string;
  submittedAt: Date | string | null;
}

interface JurusanOption {
  code: string;
  name: string;
  count: number;
}

interface ClassOption {
  className: string;
  count: number;
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
    authorName?: string | null;
    proctorName?: string | null;
    proctor2Name?: string | null;
    roomName?: string | null;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    updatedAt?: Date | string;
    questions: QuestionItem[];
    attempts: AttemptItem[];
  };
  kopSuratConfig?: KopSuratConfig;
  currentUser?: {
    name: string;
    role: string;
  };
  isProctorMode?: boolean;
}

export default function ExamDetailClient({ 
  exam, 
  kopSuratConfig, 
  currentUser,
  isProctorMode: propIsProctorMode,
}: ExamDetailProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';
  const cleanCurrentName = (currentUser?.name || '').trim().toLowerCase();
  const authorName = (exam.authorName || '').trim().toLowerCase();
  const isAuthor = !!cleanCurrentName && (authorName === cleanCurrentName || authorName.includes(cleanCurrentName) || cleanCurrentName.includes(authorName));
  const isOwner = isSuperAdmin || isAuthor;

  const p1 = (exam.proctorName || '').trim().toLowerCase();
  const p2 = (exam.proctor2Name || '').trim().toLowerCase();
  const isProctor = !!cleanCurrentName && (
    (p1 && (p1 === cleanCurrentName || p1.includes(cleanCurrentName) || cleanCurrentName.includes(p1))) ||
    (p2 && (p2 === cleanCurrentName || p2.includes(cleanCurrentName) || cleanCurrentName.includes(p2)))
  );

  const isProctorOnly = propIsProctorMode ?? (!isOwner && isProctor);

  const [activeTab, setActiveTab] = useState<'questions' | 'results'>(isProctorOnly ? 'results' : 'questions');
  const [questions, setQuestions] = useState<QuestionItem[]>(() => sortQuestions(exam.questions || []));
  const [attempts, setAttempts] = useState(exam.attempts);

  // Selalu pastikan susunan soal guru di bank soal tersinkronisasi dan tidak teracak
  useEffect(() => {
    if (exam.questions) {
      setQuestions(sortQuestions(exam.questions));
    }
  }, [exam.questions]);

  // Session Dual-Key state & 5-minute rolling token
  const [examStatus, setExamStatus] = useState(exam.status || 'PUBLISHED');
  const [examToken, setExamToken] = useState((exam.token || '').split('|')[0]);
  const [togglingSession, setTogglingSession] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [resultSearch, setResultSearch] = useState('');
  const [isPrintExamModalOpen, setIsPrintExamModalOpen] = useState(false);
  const [resultJurusanFilter, setResultJurusanFilter] = useState<'ALL' | string>('ALL');
  const [resultClassFilter, setResultClassFilter] = useState<'ALL' | string>('ALL');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // ⚡ Auto-Distribute Points state (Bagi Rata Nilai Soal Otomatis)
  const [isAutoDistributeModalOpen, setIsAutoDistributeModalOpen] = useState(false);
  const [targetTotalPointsInput, setTargetTotalPointsInput] = useState<number>(100);
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [distributeToast, setDistributeToast] = useState<string | null>(null);

  const handleAutoDistributePoints = async (targetTotal: number = targetTotalPointsInput) => {
    if (questions.length === 0) {
      alert('Belum ada butir soal dalam paket ujian ini.');
      return;
    }
    if (!targetTotal || targetTotal <= 0) {
      alert('Target nilai total harus lebih besar dari 0.');
      return;
    }

    setDistributeLoading(true);
    const res = await autoDistributeExamPointsAction(exam.id, targetTotal);
    if (res.success && res.pointsPerQuestion !== undefined) {
      setQuestions(prev => sortQuestions(prev.map((q, idx) => ({ ...q, points: res.pointsPerQuestion!, order: idx }))));
      setIsAutoDistributeModalOpen(false);
      setDistributeToast(res.message || `Nilai berhasil dibagi rata: ${res.pointsPerQuestion} Poin per butir soal.`);
      setTimeout(() => setDistributeToast(null), 5000);
    } else {
      alert(res.error || 'Gagal membagikan nilai soal secara otomatis.');
    }
    setDistributeLoading(false);
  };

  // ⬆️⬇️ Pindahkan Urutan Soal Manual oleh Guru (Move Up / Down)
  const handleMoveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    // Optimistic reorder
    const updated = [...questions];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, moved);
    const reindexed = updated.map((q, idx) => ({ ...q, order: idx }));
    setQuestions(reindexed);

    try {
      const res = await moveQuestionOrder(exam.id, questionId, direction);
      if (res?.error) {
        alert(res.error);
        setQuestions(questions); // revert
      }
    } catch (e: any) {
      console.error(e);
      setQuestions(questions); // revert
    }
  };

  // 🛡️ Buka Suspend & Kunci Dialog States (Pengganti confirm & alert browser)
  const [unblockingAll, setUnblockingAll] = useState(false);
  const [isUnblockAllModalOpen, setIsUnblockAllModalOpen] = useState(false);
  const [unblockStrike3Target, setUnblockStrike3Target] = useState<typeof exam.attempts[0] | null>(null);
  const [unlockStrike2Target, setUnlockStrike2Target] = useState<typeof exam.attempts[0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cbtToast, setCbtToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!cbtToast) return;
    const timer = setTimeout(() => setCbtToast(null), 5000);
    return () => clearTimeout(timer);
  }, [cbtToast]);

  const handleExecuteUnblockAll = async () => {
    setUnblockingAll(true);
    try {
      const res = await adminUnblockAllStrike3Action(exam.id, currentUser?.name);
      if (res.success) {
        setAttempts(prev => prev.map(a => {
          if (a.isBlocked || a.tabSwitchCount >= 3 || a.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) {
            return {
              ...a,
              isBlocked: false,
              tabSwitchCount: 1,
              proctorNotes: `${(a.proctorNotes || '').replace(/\[STRIKE_3_BLOKIR\][^|]*/g, '').trim()} | [ADMIN_UNBLOCK] | [ADMIN_UNBLOCK_ACTIVE]`,
            };
          }
          return a;
        }));
        setIsUnblockAllModalOpen(false);
        setCbtToast({ type: 'success', text: res.message || 'Semua suspend berhasil dibuka!' });
      } else {
        setCbtToast({ type: 'error', text: res.error || 'Gagal membuka suspend massal' });
      }
    } catch (e: any) {
      setCbtToast({ type: 'error', text: e.message || 'Terjadi kesalahan sistem' });
    }
    setUnblockingAll(false);
  };

  const handleExecuteUnblockSingle = async () => {
    if (!unblockStrike3Target) return;
    setActionLoading(true);
    try {
      const res = await adminUnblockStrike3Action(unblockStrike3Target.id, currentUser?.name);
      if (res.success) {
        setAttempts(prev => prev.map(a => a.id === unblockStrike3Target.id ? {
          ...a,
          isBlocked: false,
          tabSwitchCount: 1,
          proctorNotes: `${(a.proctorNotes || '').replace(/\[STRIKE_3_BLOKIR\][^|]*/g, '').trim()} | [ADMIN_UNBLOCK] | [ADMIN_UNBLOCK_ACTIVE]`,
        } : a));
        setCbtToast({ type: 'success', text: res.message || `Suspend untuk "${unblockStrike3Target.studentName}" berhasil dibuka!` });
        setUnblockStrike3Target(null);
      } else {
        setCbtToast({ type: 'error', text: res.error || 'Gagal membuka suspend' });
      }
    } catch (e: any) {
      setCbtToast({ type: 'error', text: e.message || 'Terjadi kesalahan sistem' });
    }
    setActionLoading(false);
  };

  const handleExecuteUnlockStrike2 = async () => {
    if (!unlockStrike2Target) return;
    setActionLoading(true);
    try {
      const res = await proctorUnlockStrike2Action(unlockStrike2Target.id, currentUser?.name);
      if (res.success) {
        setAttempts(prev => prev.map(a => a.id === unlockStrike2Target.id ? {
          ...a,
          proctorNotes: `${a.proctorNotes || ''} | [IZIN_LANJUT_P2] Dispensasi Pengawas`,
        } : a));
        setCbtToast({ type: 'success', text: res.message || `Kunci layar untuk "${unlockStrike2Target.studentName}" berhasil dibuka!` });
        setUnlockStrike2Target(null);
      } else {
        setCbtToast({ type: 'error', text: res.error || 'Gagal membuka kunci' });
      }
    } catch (e: any) {
      setCbtToast({ type: 'error', text: e.message || 'Terjadi kesalahan sistem' });
    }
    setActionLoading(false);
  };

  // 🔄 Dynamic 10-minute Rolling Token System (600 seconds)
  const calculateRemainingTokenTime = () => {
    if (!exam.updatedAt) return 600;
    const elapsed = Math.floor((Date.now() - new Date(exam.updatedAt).getTime()) / 1000);
    const remaining = 600 - (elapsed % 600);
    return remaining > 0 ? remaining : 600;
  };

  const [tokenTimer, setTokenTimer] = useState<number>(() => calculateRemainingTokenTime());
  const [isRotatingToken, setIsRotatingToken] = useState(false);

  const handleRotateToken = async (manualToken?: string) => {
    setIsRotatingToken(true);
    const res = await rotateExamToken(exam.id, manualToken);
    if (res.success && res.displayToken) {
      setExamToken(res.displayToken);
      setTokenTimer(600);
    } else if (res.error) {
      console.error('Gagal memperbarui token:', res.error);
    }
    setIsRotatingToken(false);
  };

  // ⏱️ Auto-countdown & rotation effect for 10-minute token cycle
  useEffect(() => {
    if (examStatus !== 'ACTIVE') return;

    setTokenTimer(calculateRemainingTokenTime());

    const interval = setInterval(() => {
      setTokenTimer((prev) => {
        if (prev <= 1) {
          handleRotateToken();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examStatus, exam.id]);

  // 🔄 Sinkronisasi live token & status dengan pengawas ruangan (tiap 5 detik)
  useEffect(() => {
    if (examStatus !== 'ACTIVE') return;

    const syncWithProctor = async () => {
      // Hemat koneksi DB: Jangan request jika tab sedang di latar belakang (hidden)
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const res = await fetch(`/api/cbt/attempts?examId=${exam.id}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.exam) {
            if (data.exam.displayToken && data.exam.displayToken !== examToken) {
              setExamToken(data.exam.displayToken);
            }
            if (data.exam.status && data.exam.status !== examStatus) {
              setExamStatus(data.exam.status);
            }
            if (typeof data.exam.remainingSeconds === 'number') {
              setTokenTimer(data.exam.remainingSeconds);
            }
          }
        }
      } catch {}
    };

    const pollInterval = setInterval(syncWithProctor, 15000);
    return () => clearInterval(pollInterval);
  }, [exam.id, examStatus, examToken]);

  const [scheduleNoticeModal, setScheduleNoticeModal] = useState<ScheduleDiscrepancyResult | null>(null);
  const schedState = getExamScheduleState(exam.startTime, exam.endTime, examStatus, new Date(), exam.updatedAt, exam.duration);

  const handleToggleSession = async (open: boolean, forceAllowOutsideSchedule: boolean = false) => {
    // ⏰ Verifikasi Jadwal Resmi Ujian saat pengawas membuka sesi / merilis token
    if (open && !forceAllowOutsideSchedule) {
      const discrepancy = checkScheduleDiscrepancy(exam.startTime, exam.endTime);
      if (discrepancy.isOutside) {
        setScheduleNoticeModal(discrepancy);
        return;
      }
    }

    setTogglingSession(true);
    const res = await toggleExamSession(exam.id, open, examToken);
    if (res.success && res.data) {
      setExamStatus(res.data.status);
      if (res.data.token) {
        setExamToken(res.data.token.split('|')[0]);
      }
      if (open) {
        setTokenTimer(600);
      }
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian.');
    }
    setTogglingSession(false);
  };

  const handleCopyToken = () => {
    const activeToken = examToken.split('|')[0];
    if (!activeToken) return;
    navigator.clipboard.writeText(activeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // 🎓 Filter Cerdas Nilai Per Jurusan & Per Rombel
  const availableJurusans = useMemo(() => {
    const map = new Map<string, number>();
    attempts.forEach((a: AttemptItem) => {
      const code = extractJurusanCode(a.studentClass) || 'LAINNYA';
      map.set(code, (map.get(code) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([code, count]): JurusanOption => ({
        code,
        name: getJurusanFullName(code === 'LAINNYA' ? null : code),
        count,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [attempts]);

  const availableClasses = useMemo(() => {
    const map = new Map<string, number>();
    attempts.forEach((a: AttemptItem) => {
      const cls = a.studentClass || 'Tanpa Kelas';
      map.set(cls, (map.get(cls) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([className, count]): ClassOption => ({
        className,
        count,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((att: AttemptItem) => {
      if (resultJurusanFilter !== 'ALL') {
        const jur = extractJurusanCode(att.studentClass) || 'LAINNYA';
        if (jur !== resultJurusanFilter) return false;
      }

      if (resultClassFilter !== 'ALL') {
        const cls = att.studentClass || 'Tanpa Kelas';
        if (cls !== resultClassFilter) return false;
      }

      if (resultSearch.trim()) {
        const q = resultSearch.toLowerCase().trim();
        const matchName = att.studentName.toLowerCase().includes(q);
        const matchNis = (att.studentNis || '').toLowerCase().includes(q);
        const matchClass = (att.studentClass || '').toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchClass) return false;
      }

      return true;
    });
  }, [attempts, resultJurusanFilter, resultClassFilter, resultSearch]);

  const resultStats = useMemo(() => {
    const total = filteredAttempts.length;
    if (total === 0) {
      return { total: 0, avg: 0, passed: 0, remedial: 0, tabSwitchTotal: 0 };
    }
    let scoreSum = 0;
    let passed = 0;
    let tabSwitchTotal = 0;

    filteredAttempts.forEach((a: AttemptItem) => {
      scoreSum += a.score;
      if (a.score >= 75) passed++;
      tabSwitchTotal += a.tabSwitchCount || 0;
    });

    return {
      total,
      avg: Math.round((scoreSum / total) * 10) / 10,
      passed,
      remedial: total - passed,
      tabSwitchTotal,
    };
  }, [filteredAttempts]);

  // Export to CSV / Excel: Mendukung export seluruh siswa, per jurusan, atau per rombel
  const handleExportCsv = (customAttempts?: AttemptItem[], customLabel?: string) => {
    const dataToExport = customAttempts || filteredAttempts;
    if (dataToExport.length === 0) {
      alert('Tidak ada data nilai siswa untuk diunduh.');
      return;
    }

    const headers = [
      'No',
      'Nama Siswa',
      'NIS / NISN',
      'Kelas / Rombel',
      'Jurusan',
      'Mata Pelajaran',
      'Paket Ujian',
      'Nilai Akhir',
      'Status Ketuntasan',
      'Jawaban Benar',
      'Total Soal',
      'Pelanggaran Tab Switch',
      'Status Pengerjaan',
      'Tanggal Selesai'
    ];

    const rows = dataToExport.map((att: AttemptItem, index: number) => {
      const jur = extractJurusanCode(att.studentClass) || '-';
      const statusKetuntasan = att.status === 'SUBMITTED' 
        ? (att.score >= 75 ? 'TUNTAS' : 'REMEDIAL') 
        : 'SEDANG UJIAN';

      return [
        index + 1,
        `"${att.studentName.replace(/"/g, '""')}"`,
        `"${(att.studentNis || '').replace(/"/g, '""')}"`,
        `"${(att.studentClass || '').replace(/"/g, '""')}"`,
        `"${jur}"`,
        `"${exam.subject.replace(/"/g, '""')}"`,
        `"${exam.title.replace(/"/g, '""')}"`,
        att.score,
        `"${statusKetuntasan}"`,
        att.totalCorrect,
        att.totalQuestions,
        att.tabSwitchCount,
        att.status === 'SUBMITTED' ? 'Selesai' : 'Sedang Mengerjakan',
        att.submittedAt ? new Date(att.submittedAt).toLocaleString('id-ID') : '-'
      ];
    });

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel membuka karakter & koma dengan tepat
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let fileSuffix = customLabel || '';
    if (!fileSuffix) {
      if (resultJurusanFilter !== 'ALL') {
        fileSuffix = `_Jurusan_${resultJurusanFilter}`;
      } else if (resultClassFilter !== 'ALL') {
        fileSuffix = `_Kelas_${resultClassFilter.replace(/\s+/g, '_')}`;
      } else {
        fileSuffix = '_Semua_Siswa';
      }
    }

    const cleanTitle = exam.title.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Rekap_Nilai_${cleanTitle}${fileSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Unduh Terpisah Semua Jurusan Sekaligus (Multi-File otomatis)
  const handleBatchDownloadAllJurusans = () => {
    if (availableJurusans.length === 0) {
      alert('Tidak ada jurusan yang terdeteksi pada daftar nilai.');
      return;
    }

    let downloadCount = 0;
    availableJurusans.forEach((j: JurusanOption, index: number) => {
      const jurAttempts = attempts.filter((a: AttemptItem) => {
        const code = extractJurusanCode(a.studentClass) || 'LAINNYA';
        return code === j.code;
      });

      if (jurAttempts.length > 0) {
        downloadCount++;
        setTimeout(() => {
          handleExportCsv(jurAttempts, `_Jurusan_${j.code}`);
        }, index * 350);
      }
    });

    if (downloadCount > 0) {
      setIsDownloadModalOpen(false);
    }
  };

  // Modal Create Question
  const [isAddQuestionModal, setIsAddQuestionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const createQuestionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const createQuestionBeforeRef = useRef<HTMLTextAreaElement>(null);
  const [activeCreateField, setActiveCreateField] = useState<'before' | 'after'>('after');
  const [questionTextBefore, setQuestionTextBefore] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [showCreateImageDrawer, setShowCreateImageDrawer] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('0');
  const [points, setPoints] = useState(10);

  // Upload handler for question visual images
  const handleUploadQuestionImage = async (file: File, isEdit: boolean = false) => {
    if (!file) return;
    if (isEdit) {
      setEditUploadingImage(true);
    } else {
      setUploadingImage(true);
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (isEdit) {
          setEditImageUrl(data.url);
        } else {
          setQuestionImageUrl(data.url);
        }
      } else {
        alert(data.error || 'Gagal mengunggah gambar soal.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan jaringan saat mengunggah gambar.');
    } finally {
      if (isEdit) {
        setEditUploadingImage(false);
      } else {
        setUploadingImage(false);
      }
    }
  };

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

  const handleAddOption = () => {
    if (options.length >= 6) {
      alert('Maksimal 6 pilihan jawaban (A sampai F).');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) {
      alert('Minimal harus memiliki 2 pilihan jawaban.');
      return;
    }
    const updated = options.filter((_, idx) => idx !== indexToRemove);
    setOptions(updated);

    const curKey = parseInt(correctAnswer, 10);
    if (curKey === indexToRemove) {
      setCorrectAnswer('0');
    } else if (curKey > indexToRemove) {
      setCorrectAnswer(String(curKey - 1));
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (options.length < 2) {
      alert('Minimal harus ada 2 pilihan jawaban!');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      alert('Semua pilihan jawaban yang aktif harus diisi!');
      return;
    }

    let finalQuestionText = questionText.trim();
    if (questionImageUrl.trim()) {
      const before = questionTextBefore.trim();
      const after = questionText.trim();
      if (before && after) {
        finalQuestionText = `${before}\n\n[GAMBAR]\n\n${after}`;
      } else if (before && !after) {
        finalQuestionText = `${before}\n\n[GAMBAR]`;
      } else if (!before && after) {
        finalQuestionText = `[GAMBAR]\n\n${after}`;
      } else {
        finalQuestionText = '[GAMBAR]';
      }
    } else {
      const before = questionTextBefore.trim();
      const after = questionText.trim();
      finalQuestionText = before && after ? `${before}\n\n${after}` : (after || before);
    }

    if (!finalQuestionText.trim() && !questionImageUrl.trim()) {
      alert('Pertanyaan atau gambar visualisasi soal harus diisi!');
      return;
    }

    setLoading(true);
    const res = await createQuestion({
      examId: exam.id,
      questionText: finalQuestionText,
      imageUrl: questionImageUrl.trim() || null,
      options,
      correctAnswer,
      points,
    });

    if (res.success && res.data) {
      setQuestions(sortQuestions([...questions, res.data as any]));
      setIsAddQuestionModal(false);
      setQuestionTextBefore('');
      setQuestionText('');
      setQuestionImageUrl('');
      setShowCreateImageDrawer(false);
      setActiveCreateField('after');
      setOptions(['', '', '', '']);
      setCorrectAnswer('0');
      setPoints(10);
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
      setSelectedQIds((prev) => prev.filter((id) => id !== deleteQId));
      setIsDeleteQModal(false);
      setDeleteQId(null);
    } else {
      alert(res.error || 'Gagal menghapus soal.');
    }
    setLoading(false);
  };

  // 🗑️ Bulk Selection & Collective Delete Handlers
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleToggleSelectQ = (id: string) => {
    setSelectedQIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllQ = () => {
    if (selectedQIds.length === questions.length) {
      setSelectedQIds([]);
    } else {
      setSelectedQIds(questions.map((q) => q.id));
    }
  };

  const handleClearSelectedQ = () => {
    setSelectedQIds([]);
  };

  const confirmDeleteBulkQuestions = async () => {
    if (selectedQIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await deleteBulkQuestions(selectedQIds, exam.id);
      if (res.success) {
        setQuestions((prev) => prev.filter((q) => !selectedQIds.includes(q.id)));
        setSelectedQIds([]);
        setIsBulkDeleteModalOpen(false);
      } else {
        alert(res.error || 'Gagal menghapus butir soal terpilih.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus butir soal terpilih.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const confirmDeleteAllQuestions = async () => {
    if (questions.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await deleteAllQuestions(exam.id);
      if (res.success) {
        setQuestions([]);
        setSelectedQIds([]);
        setIsDeleteAllModalOpen(false);
      } else {
        alert(res.error || 'Gagal mengosongkan semua butir soal.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengosongkan semua butir soal.');
    } finally {
      setBulkDeleting(false);
    }
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

  // Batch Question Modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchRawText, setBatchRawText] = useState('');
  const [batchDefaultPoints, setBatchDefaultPoints] = useState(10);
  const [batchStep, setBatchStep] = useState<'input' | 'preview'>('input');
  const [parsedBatch, setParsedBatch] = useState<ParsedQuestion[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleParseBatch = () => {
    setBatchError(null);
    if (!batchRawText.trim()) {
      setBatchError('Teks soal masih kosong. Silakan tempel daftar soal terlebih dahulu.');
      return;
    }
    const results = parseBulkQuestions(batchRawText, batchDefaultPoints);
    if (results.length === 0) {
      setBatchError('Format soal tidak terdeteksi. Pastikan penomoran soal (1.), pilihan jawaban (A, B, C, D), dan Kunci Jawaban (Kunci: A) sudah sesuai.');
      return;
    }
    setParsedBatch(results);
    setBatchStep('preview');
  };

  const handleApplyPointsToAllParsed = (newPoints: number) => {
    setParsedBatch(parsedBatch.map(q => ({ ...q, points: newPoints })));
  };

  const handleUpdateParsedItemPoints = (index: number, pointsVal: number) => {
    const updated = [...parsedBatch];
    updated[index].points = pointsVal;
    setParsedBatch(updated);
  };

  const handleUpdateParsedItemKey = (index: number, keyVal: string) => {
    const updated = [...parsedBatch];
    updated[index].correctAnswer = keyVal;
    setParsedBatch(updated);
  };

  const handleAddParsedOption = (qIdx: number) => {
    const updated = [...parsedBatch];
    if (updated[qIdx].options.length >= 6) return;
    const nextChar = String.fromCharCode(65 + updated[qIdx].options.length);
    updated[qIdx].options = [...updated[qIdx].options, `Pilihan ${nextChar}`];
    setParsedBatch(updated);
  };

  const handleRemoveParsedOption = (qIdx: number, optIdx: number) => {
    const updated = [...parsedBatch];
    if (updated[qIdx].options.length <= 2) return;
    updated[qIdx].options = updated[qIdx].options.filter((_, idx) => idx !== optIdx);

    const curKey = parseInt(updated[qIdx].correctAnswer, 10);
    if (curKey === optIdx) {
      updated[qIdx].correctAnswer = '0';
    } else if (curKey > optIdx) {
      updated[qIdx].correctAnswer = String(curKey - 1);
    }
    setParsedBatch(updated);
  };

  const handleUpdateParsedOptionText = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...parsedBatch];
    const newOptions = [...updated[qIdx].options];
    newOptions[optIdx] = val;
    updated[qIdx].options = newOptions;
    setParsedBatch(updated);
  };

  const handleDeleteParsedItem = (index: number) => {
    const updated = parsedBatch.filter((_, idx) => idx !== index);
    setParsedBatch(updated);
    if (updated.length === 0) {
      setBatchStep('input');
    }
  };

  const handleSaveBatchQuestions = async () => {
    if (parsedBatch.length === 0) return;
    setBatchLoading(true);
    const res = await createBatchQuestions(exam.id, parsedBatch);
    if (res.success && res.data) {
      setQuestions(sortQuestions([...questions, ...res.data as any]));
      setIsBatchModalOpen(false);
      setBatchRawText('');
      setParsedBatch([]);
      setBatchStep('input');
      alert(`Berhasil menambahkan ${res.count} butir soal ke dalam ujian!`);
    } else {
      alert(res.error || 'Gagal menyimpan butir soal kolektif.');
    }
    setBatchLoading(false);
  };

  const handleInsertExampleFormat = () => {
    const example = `1. Apa kepanjangan dari HTML?
A. Hyper Text Markup Language
B. High Tech Modern Language
C. Hyperlink Text Making Link
D. Home Tool Multi Language
Kunci: A
Poin: 10

2. Tag HTML yang digunakan untuk membuat tautan atau hyperlink halaman web adalah...
A. <link>
B. <a>
C. <href>
D. <url>
Kunci: B
Poin: 10

3. Manakah dari protokol berikut yang digunakan untuk komunikasi data terenkripsi dan aman di internet?
A. HTTP
B. FTP
C. HTTPS
D. SMTP
E. Telnet
Kunci: C
Poin: 15

4. Perangkat jaringan yang berfungsi membagi jaringan ke beberapa subnet atau rute berbeda adalah...
A. Repeater
B. Hub
C. Switch
D. Router
E. Modem
Kunci: D
Poin: 15

5. Perhatikan tabel perbandingan jenis memori komputer berikut:
| No | Jenis Memori | Karakteristik | Sifat Simpan |
| :---: | :--- | :--- | :---: |
| 1 | RAM | Kecepatan sangat tinggi | Volatile |
| 2 | ROM | Menyimpan BIOS / Firmware | Non-Volatile |
| 3 | Harddisk / SSD | Kapasitas besar untuk file | Non-Volatile |
Berdasarkan tabel di atas, jenis memori yang datanya hilang saat daya listrik dimatikan (Volatile) adalah...
A. RAM
B. ROM
C. Harddisk
D. SSD
Kunci: A
Poin: 20`;

    setBatchRawText(example);
    setBatchError(null);
  };

  const handleDownloadCsvTemplate = (format: 'csv' | 'txt' = 'csv') => {
    if (format === 'txt') {
      const txtContent = `PANDUAN PENGISIAN SOAL CBT (FORMAT TEKS / MICROSOFT WORD):
1. Tuliskan nomor soal (1., 2., dst.) diikuti teks pertanyaan.
2. Tuliskan pilihan jawaban (A., B., C., D., dan opsional E.).
   Sistem mendukung 2 hingga 5 pilihan jawaban (A-D atau A-E) secara fleksibel.
3. Tuliskan "Kunci: [A/B/C/D/E]" untuk menentukan jawaban yang benar.
4. Tuliskan "Poin: [angka]" untuk bobot nilai (contoh: Poin: 10).
5. Setelah selesai, blok semua teks di dokumen (Ctrl+A), salin (Ctrl+C), lalu tempelkan (Ctrl+V) ke form Input Kolektif di aplikasi CBT.

======================================================================
CONTOH SOAL (${exam.subject}):

1. Apa kepanjangan dari HTML dalam pemrograman web?
A. Hyper Text Markup Language
B. High Tech Modern Language
C. Hyperlink Text Making Link
D. Home Tool Multi Language
Kunci: A
Poin: 10

2. Manakah dari protokol berikut yang digunakan untuk komunikasi data web terenkripsi secara aman?
A. HTTP
B. FTP
C. HTTPS
D. SMTP
E. Telnet
Kunci: C
Poin: 15

3. Protokol jaringan yang digunakan untuk pengiriman web terenkripsi dan aman adalah...
A. HTTP
B. FTP
C. HTTPS
D. SMTP
Kunci: C
Poin: 15

4. Perangkat jaringan komputer yang berfungsi menghubungkan dua atau lebih subnet/jaringan yang berbeda adalah...
A. Repeater
B. Hub
C. Switch
D. Router
Kunci: D
Poin: 15

5. Bahasa pemrograman web yang dieksekusi di sisi peramban (client-side) untuk membuat animasi dan interaksi adalah...
A. PHP
B. Python
C. JavaScript
D. Ruby
Kunci: C
Poin: 10

======================================================================
TEMPAT MENULISKAN SOAL BAPAK/IBU GURU DI BAWAH INI (Ganti teks di bawah):

6. Tuliskan pertanyaan soal nomor 6 di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: A
Poin: 10

7. Tuliskan pertanyaan soal nomor 7 di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: B
Poin: 10

8. Tuliskan pertanyaan soal nomor 8 di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: C
Poin: 10

9. Tuliskan pertanyaan soal nomor 9 di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: D
Poin: 10

10. Tuliskan pertanyaan soal nomor 10 di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: A
Poin: 10
`;
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Soal_CBT_${exam.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Word.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Format CSV untuk Microsoft Excel (Dilengkapi UTF-8 BOM dan pemisah ';')
    const instructions = [
      '# PETUNJUK PENGISIAN TEMPLATE SOAL CBT (SMK GARUDA MAHADHIKA)',
      '# 1. Buka file ini menggunakan Microsoft Excel, WPS Office, atau Google Sheets.',
      '# 2. Kolom "Kunci Jawaban" WAJIB diisi salah satu huruf kapital: A, B, C, D, atau E.',
      '# 3. Kolom "Bobot Poin" diisi angka nilai (contoh: 10, 15, 20). Total skor siswa dihitung proporsional skala 100.',
      '# 4. RUMUS & FOTO DI OPSI JAWABAN: Pilihan jawaban mendukung rumus matematika KaTeX (diapit tanda $, misal "$2a^8$") dan foto/grafik.',
      '# 5. TIPS CEPAT: Setelah selesai mengisi di Excel, Anda bisa langsung blok tabelnya (Ctrl+A), tekan Copy (Ctrl+C), lalu Paste (Ctrl+V) ke kotak teks di web CBT!',
    ];

    const headers = [
      'No',
      'Pertanyaan Soal',
      'Pilihan A',
      'Pilihan B',
      'Pilihan C',
      'Pilihan D',
      'Pilihan E (Opsional)',
      'Kunci Jawaban (A/B/C/D/E)',
      'Bobot Poin',
      'Topik / Catatan Guru',
    ];

    const sampleRows = [
      ['1', '"Apa kepanjangan dari HTML dalam pemrograman web?"', '"Hyper Text Markup Language"', '"High Tech Modern Language"', '"Hyperlink Text Making Link"', '"Home Tool Multi Language"', '""', 'A', '10', '"Dasar HTML"'],
      ['2', '"Tag HTML yang digunakan untuk membuat tautan atau hyperlink ke halaman lain adalah..."', '"<link>"', '"<a>"', '"<href>"', '"<url>"', '""', 'B', '10', '"Struktur HTML"'],
      ['3', '"Protokol jaringan yang digunakan untuk pengiriman web terenkripsi dan aman adalah..."', '"HTTP"', '"FTP"', '"HTTPS"', '"SMTP"', '""', 'C', '15', '"Keamanan Jaringan"'],
      ['4', '"Perangkat jaringan komputer yang berfungsi menghubungkan dua atau lebih subnet/jaringan yang berbeda adalah..."', '"Repeater"', '"Hub"', '"Switch"', '"Router"', '"Modem"', 'D', '15', '"Perangkat Keras (5 Opsi A-E)"'],
      ['5', '"Bahasa pemrograman web yang dieksekusi di sisi peramban (client-side) untuk membuat animasi dan interaksi adalah..."', '"PHP"', '"Python"', '"JavaScript"', '"Ruby"', '"Bash"', 'C', '10', '"Frontend (5 Opsi A-E)"'],
      // 10 Baris kosong siap isi bagi guru:
      ['6', '"Tuliskan pertanyaan soal nomor 6 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'A', '10', '"Materi Ujian"'],
      ['7', '"Tuliskan pertanyaan soal nomor 7 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'B', '10', '"Materi Ujian"'],
      ['8', '"Tuliskan pertanyaan soal nomor 8 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'C', '10', '"Materi Ujian"'],
      ['9', '"Tuliskan pertanyaan soal nomor 9 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'D', '10', '"Materi Ujian"'],
      ['10', '"Tuliskan pertanyaan soal nomor 10 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'A', '10', '"Materi Ujian"'],
      ['11', '"Tuliskan pertanyaan soal nomor 11 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'B', '10', '"Materi Ujian"'],
      ['12', '"Tuliskan pertanyaan soal nomor 12 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'C', '10', '"Materi Ujian"'],
      ['13', '"Tuliskan pertanyaan soal nomor 13 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'D', '10', '"Materi Ujian"'],
      ['14', '"Tuliskan pertanyaan soal nomor 14 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'A', '10', '"Materi Ujian"'],
      ['15', '"Tuliskan pertanyaan soal nomor 15 di sini..."', '"Pilihan jawaban A"', '"Pilihan jawaban B"', '"Pilihan jawaban C"', '"Pilihan jawaban D"', '""', 'B', '10', '"Materi Ujian"'],
    ];

    const csvLines = [
      'sep=;',
      ...instructions,
      headers.join(';'),
      ...sampleRows.map((r) => r.join(';')),
    ];

    // Karakter \uFEFF adalah UTF-8 BOM agar Microsoft Excel di Windows langsung membaca kolom dengan rapi
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Template_Soal_CBT_${exam.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Excel.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isDownloadBankSoalModalOpen, setIsDownloadBankSoalModalOpen] = useState(false);

  const handleDownloadExamQuestions = (
    format: 'csv' | 'txt' | 'json' = 'csv',
    onlySelected: boolean = false
  ) => {
    const targetQuestions = onlySelected && selectedQIds.length > 0
      ? questions.filter((q) => selectedQIds.includes(q.id))
      : questions;

    if (targetQuestions.length === 0) {
      alert('Belum ada butir soal yang dapat diunduh.');
      return;
    }

    const cleanExamTitle = (exam.title || 'Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanSubject = (exam.subject || 'Mapel').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const suffix = onlySelected ? `_Terpilih_${targetQuestions.length}Soal` : `_${targetQuestions.length}Soal`;

    if (format === 'csv') {
      const csv = generateExamQuestionsCsv(exam.title, exam.subject, targetQuestions);
      triggerBrowserDownload(
        csv,
        `Bank_Soal_CBT_${cleanSubject}_${cleanExamTitle}${suffix}.csv`,
        'text/csv;charset=utf-8;'
      );
    } else if (format === 'txt') {
      const txt = generateExamQuestionsTxt(exam.title, exam.subject, targetQuestions);
      triggerBrowserDownload(
        txt,
        `Bank_Soal_CBT_${cleanSubject}_${cleanExamTitle}${suffix}.txt`,
        'text/plain;charset=utf-8;'
      );
    } else if (format === 'json') {
      const json = generateExamQuestionsJson(exam.title, exam.subject, targetQuestions);
      triggerBrowserDownload(
        json,
        `Bank_Soal_CBT_${cleanSubject}_${cleanExamTitle}${suffix}.json`,
        'application/json;charset=utf-8;'
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBatchRawText(content);
        const parsed = parseBulkQuestions(content, batchDefaultPoints);
        if (parsed.length > 0) {
          setParsedBatch(parsed);
          setBatchStep('preview');
          setBatchError(null);
        }
      }
    };
    reader.readAsText(file);
  };

  // Edit Question Modal state
  const [isEditQModal, setIsEditQModal] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const editQuestionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editQuestionBeforeRef = useRef<HTMLTextAreaElement>(null);
  const [activeEditField, setActiveEditField] = useState<'before' | 'after'>('after');
  const [editQuestionTextBefore, setEditQuestionTextBefore] = useState('');
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [showEditImageDrawer, setShowEditImageDrawer] = useState(false);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [showEditPreview, setShowEditPreview] = useState(true);
  const [editOptions, setEditOptions] = useState(['', '', '', '']);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('0');
  const [editPoints, setEditPoints] = useState(10);

  // Modal Table Builder for Questions (Fleksibel)
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableTarget, setTableTarget] = useState<'create' | 'edit' | 'bulk'>('create');

  const handleInsertTable = (tableMarkdown: string) => {
    if (tableTarget === 'create') {
      if (activeCreateField === 'before' && questionImageUrl) {
        setQuestionTextBefore((prev) => (prev ? `${prev.trim()}\n\n${tableMarkdown.trim()}\n` : `${tableMarkdown.trim()}\n`));
      } else {
        setQuestionText((prev) => (prev ? `${prev.trim()}\n\n${tableMarkdown.trim()}\n` : `${tableMarkdown.trim()}\n`));
      }
    } else if (tableTarget === 'edit') {
      if (activeEditField === 'before' && editImageUrl) {
        setEditQuestionTextBefore((prev) => (prev ? `${prev.trim()}\n\n${tableMarkdown.trim()}\n` : `${tableMarkdown.trim()}\n`));
      } else {
        setEditQuestionText((prev) => (prev ? `${prev.trim()}\n\n${tableMarkdown.trim()}\n` : `${tableMarkdown.trim()}\n`));
      }
    } else if (tableTarget === 'bulk') {
      setBatchRawText((prev) => (prev ? `${prev.trim()}\n\n${tableMarkdown.trim()}\n` : `${tableMarkdown.trim()}\n`));
    }
  };

  const handleOpenEditModal = (q: QuestionItem) => {
    setEditingQId(q.id);
    const hasImage = Boolean(q.imageUrl && q.imageUrl.trim());
    const parsed = parseQuestionContent(q.questionText, q.imageUrl);
    if (hasImage) {
      if (parsed.hasImageTag) {
        setEditQuestionTextBefore(parsed.textBefore);
        setEditQuestionText(parsed.textAfter);
        setActiveEditField(parsed.textAfter ? 'after' : 'before');
      } else {
        setEditQuestionTextBefore(parsed.textBefore);
        setEditQuestionText('');
        setActiveEditField(parsed.textBefore ? 'before' : 'after');
      }
    } else {
      // Tidak ada gambar: masukkan seluruh teks soal ke textarea utama (editQuestionText)
      const fullText = parsed.hasImageTag
        ? [parsed.textBefore, parsed.textAfter].filter(Boolean).join('\n\n')
        : (q.questionText || '');
      setEditQuestionTextBefore('');
      setEditQuestionText(fullText);
      setActiveEditField('after');
    }
    setEditImageUrl(q.imageUrl || '');
    setShowEditImageDrawer(Boolean(q.imageUrl && q.imageUrl.trim()));
    try {
      const parsedOpts = JSON.parse(q.options);
      setEditOptions(Array.isArray(parsedOpts) && parsedOpts.length >= 2 ? parsedOpts : ['', '', '', '']);
    } catch {
      setEditOptions(['', '', '', '']);
    }
    setEditCorrectAnswer(q.correctAnswer || '0');
    setEditPoints(q.points || 10);
    setIsEditQModal(true);
  };

  const handleAddEditOption = () => {
    if (editOptions.length >= 6) {
      alert('Maksimal 6 pilihan jawaban (A sampai F).');
      return;
    }
    setEditOptions([...editOptions, '']);
  };

  const handleRemoveEditOption = (indexToRemove: number) => {
    if (editOptions.length <= 2) {
      alert('Minimal harus memiliki 2 pilihan jawaban.');
      return;
    }
    const updated = editOptions.filter((_, idx) => idx !== indexToRemove);
    setEditOptions(updated);

    const curKey = parseInt(editCorrectAnswer, 10);
    if (curKey === indexToRemove) {
      setEditCorrectAnswer('0');
    } else if (curKey > indexToRemove) {
      setEditCorrectAnswer(String(curKey - 1));
    }
  };

  const handleSaveEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQId) return;
    if (editOptions.length < 2) {
      alert('Minimal harus ada 2 pilihan jawaban!');
      return;
    }
    if (editOptions.some(opt => !opt.trim())) {
      alert('Semua pilihan jawaban yang aktif harus diisi!');
      return;
    }

    let finalEditQuestionText = editQuestionText.trim();
    if (editImageUrl.trim()) {
      const before = editQuestionTextBefore.trim();
      const after = editQuestionText.trim();
      if (before && after) {
        finalEditQuestionText = `${before}\n\n[GAMBAR]\n\n${after}`;
      } else if (before && !after) {
        finalEditQuestionText = `${before}\n\n[GAMBAR]`;
      } else if (!before && after) {
        finalEditQuestionText = `[GAMBAR]\n\n${after}`;
      } else {
        finalEditQuestionText = '[GAMBAR]';
      }
    } else {
      const before = editQuestionTextBefore.trim();
      const after = editQuestionText.trim();
      finalEditQuestionText = before && after ? `${before}\n\n${after}` : (after || before);
    }

    if (!finalEditQuestionText.trim() && !editImageUrl.trim()) {
      alert('Pertanyaan atau gambar visualisasi soal harus diisi!');
      return;
    }

    setLoading(true);
    const res = await updateQuestion(editingQId, exam.id, {
      questionText: finalEditQuestionText,
      imageUrl: editImageUrl.trim() || null,
      options: editOptions,
      correctAnswer: editCorrectAnswer,
      points: editPoints,
    });

    if (res.success && res.data) {
      const updated = questions.map(q => q.id === editingQId ? (res.data as any) : q);
      setQuestions(sortQuestions(updated));
      setIsEditQModal(false);
      setEditingQId(null);
      setEditQuestionTextBefore('');
      setEditQuestionText('');
      setEditImageUrl('');
      setShowEditImageDrawer(false);
      setActiveEditField('after');
    } else {
      alert(res.error || 'Gagal memperbarui butir soal.');
    }
    setLoading(false);
  };

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
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Kelas: {exam.classTarget}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Jadwal: {formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
              </span>
              {exam.token && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Token: {exam.token}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Created By Abdul Rahman
              </span>
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

      {/* 🛡️ BANNER KHUSUS ROLE PENGAWAS RUANG */}
      {isProctorOnly && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-400/40 dark:border-amber-600/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-amber-950 dark:text-amber-100">
                  Mode Pengawas Ruang Ujian Aktif
                </span>
                {exam.roomName && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] tracking-wide uppercase shadow-xs">
                    Ruang {exam.roomName}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                  Pengawas Terverifikasi
                </span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1 max-w-3xl leading-relaxed">
                Anda bertugas sebagai <strong>Pengawas Ujian</strong>. Wewenang Anda difokuskan pada pengawasan operasional: <strong>merilis token ruang kelas</strong>, <strong>mode proyektor layar penuh</strong>, <strong>pemantauan presensi & integritas siswa</strong>, serta <strong>mencetak berita acara (BAP) dan daftar hadir</strong>. Pengaturan naskah dan butir soal dikunci oleh guru pengampu ({exam.authorName || 'Kurikulum'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsWhiteboardModalOpen(true)}
              className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2 cursor-pointer transition-all duration-300"
            >
              <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <Maximize2 size={15} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200" />
              <span>Buka Papan Tulis Proyektor</span>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 PROCTOR SESSION CONTROL CONSOLE (DUAL-KEY EXAM RELEASE) */}
      <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
        examStatus === 'ACTIVE'
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-emerald-500/30 dark:border-emerald-500/20'
          : 'bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  examStatus === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  examStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                examStatus === 'ACTIVE'
                  ? schedState.isOutsideSchedule
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-emerald-500 text-white'
                  : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30'
              }`}>
                {examStatus === 'ACTIVE' 
                  ? schedState.isOutsideSchedule
                    ? '⚠️ Sesi Live (Susulan / Di Luar Jadwal)'
                    : 'Sesi Ujian Aktif (Live)' 
                  : 'Ruang Tunggu Siswa (Standby)'}
              </span>
              <span className="text-xs text-slate-500">
                • Target: <strong>{exam.classTarget}</strong>
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {examStatus === 'ACTIVE'
                ? schedState.isOutsideSchedule
                  ? 'Sesi Ujian Aktif di Luar Jadwal Resmi (Ujian Susulan)'
                  : 'Sesi Ujian Sedang Berlangsung di Kelas'
                : 'Sesi Ujian Masih Ditutup (Siswa Berada di Ruang Tunggu)'}
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {examStatus === 'ACTIVE'
                ? 'Siswa di dalam kelas dapat memasukkan token di samping ini untuk mulai mengerjakan soal. Siswa di luar kelas atau di rumah tidak akan bisa mengerjakan jika tidak mengetahui token fisik ini.'
                : 'Siswa yang mengakses ujian saat ini berada di Ruang Tunggu dan belum bisa mengakses soal atau memasukkan token. Buka sesi ketika jam ujian dimulai di kelas.'}
            </p>

            {/* Notice informatif jika sesi aktif di luar jadwal resmi (Susulan) */}
            {examStatus === 'ACTIVE' && schedState.isOutsideSchedule && (
              <div className="mt-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <strong className="font-bold">Info Sesi Susulan:</strong> Sesi ujian ini dibuka di luar jadwal resmi ({schedState.countdown}). Siswa yang memasukkan token tetap dapat login & mengerjakan ujian tanpa kendala.
                </div>
              </div>
            )}
          </div>

          {/* Right Action / Token Display */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {examStatus === 'ACTIVE' ? (
              <>
                {/* Big Whiteboard Token Card with 5-Minute Auto-Reset Countdown */}
                <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl p-3.5 px-5 text-center shadow-md min-w-[240px]">
                  <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <span>Token Papan Tulis Kelas</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-2xl font-black font-mono tracking-widest text-slate-900 dark:text-white">
                      {examToken || 'SMK2026'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      title="Salin Token"
                      className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-slate-500 hover:text-emerald-600 hover:scale-115 active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                      {copiedToken ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* 🔄 Dynamic Rolling Timer (10 Menit) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <RefreshCw size={11} className={isRotatingToken ? 'animate-spin text-emerald-600' : ''} />
                        Reset Tiap 10 Menit:
                      </span>
                      <span className={`font-mono font-black px-1.5 py-0.5 rounded text-[11px] ${
                        tokenTimer <= 60
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        {Math.floor(tokenTimer / 60).toString().padStart(2, '0')}:{(tokenTimer % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 rounded-full ${
                          tokenTimer <= 60 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${(tokenTimer / 600) * 100}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRotateToken()}
                      disabled={isRotatingToken}
                      className="group w-full mt-1 py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      title="Generate token acak baru sekarang (Siklus 10 menit singkron dengan pengawas)"
                    >
                      <RefreshCw size={10} className={isRotatingToken ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                      <span>{isRotatingToken ? 'Memperbarui...' : 'Perbarui Token Sekarang'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWhiteboardModalOpen(true)}
                    className="group relative overflow-hidden px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <Maximize2 size={14} className="group-hover:scale-115 transition-transform duration-200" />
                    <span>Mode Proyektor (Layar Penuh)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSession(false)}
                    disabled={togglingSession}
                    className="group relative overflow-hidden px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <Square size={14} className="fill-white group-hover:scale-110 transition-transform duration-200" />
                    <span>{togglingSession ? 'Menutup...' : 'Tutup Sesi'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Token Ujian (Opsional)"
                    value={examToken}
                    onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                    className="w-full sm:w-44 pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase tracking-wider text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSession(true)}
                  disabled={togglingSession}
                  className="group relative overflow-hidden px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <Play size={14} className="fill-white group-hover:scale-115 group-hover:translate-x-0.5 transition-transform duration-200" />
                  <span>{togglingSession ? 'Membuka Sesi...' : schedState.state === 'ENDED' ? 'Buka Sesi Susulan & Rilis Token' : 'Buka Sesi Ujian & Tampilkan Token'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        {isProctorOnly ? (
          <>
            <button
              onClick={() => setActiveTab('results')}
              className={`group flex items-center gap-2 pb-4 font-bold text-sm transition-all duration-200 border-b-2 -mb-px hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'results'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Users size={18} className="group-hover:scale-115 transition-transform duration-200" />
              <span>Monitoring & Presensi Peserta ({attempts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`group flex items-center gap-2 pb-4 font-bold text-sm transition-all duration-200 border-b-2 -mb-px hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'questions'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileText size={18} className="group-hover:scale-115 transition-transform duration-200" />
              <span>Pratinjau Soal (Hanya Lihat) ({questions.length})</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('questions')}
              className={`group flex items-center gap-2 pb-4 font-bold text-sm transition-all duration-200 border-b-2 -mb-px hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'questions'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileText size={18} className="group-hover:scale-115 transition-transform duration-200" />
              <span>Bank Soal ({questions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`group flex items-center gap-2 pb-4 font-bold text-sm transition-all duration-200 border-b-2 -mb-px hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'results'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Award size={18} className="group-hover:scale-115 transition-transform duration-200" />
              <span>Hasil & Rekap Nilai Siswa ({attempts.length})</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: BANK SOAL */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Toast Notifikasi Distribusi Nilai */}
          {distributeToast && (
            <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                <span>{distributeToast}</span>
              </div>
              <button onClick={() => setDistributeToast(null)} className="text-white/80 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
          )}

          {/* 🌟 Panel Header Daftar Soal & Pusat Aksi Tombol (Ultra Modern, Rapi, Simetris & Beranimasi) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden transition-all duration-300">
            {/* Ambient Background Glow Halus */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* ── BARIS 1 (ATAS): Judul, Badge Jumlah Soal & Ringkasan Skor (Satu Baris Rapi) ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                {/* Kiri: Judul Soal & Badge */}
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isProctorOnly ? 'Pratinjau Naskah Soal Ujian' : 'Daftar Butir Soal'}
                  </h2>
                  
                  {/* Badge Jumlah Soal dengan Indikator Pulsa Halus */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100/90 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                    </span>
                    <span>{questions.length} Butir Soal</span>
                  </div>

                  {isProctorOnly && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-amber-600" />
                      <span>Mode Hanya Lihat</span>
                    </span>
                  )}
                </div>

                {/* Kanan: Ringkasan Nilai & Rata-rata Horisontal */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                    <span className="text-slate-400 font-medium">Total Skor:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                      {Math.round(totalPoints * 100) / 100} Poin
                    </strong>
                  </div>

                  {questions.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                      <span className="text-slate-400 font-medium">Rata-rata:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-bold">
                        {Math.round((totalPoints / questions.length) * 100) / 100} Poin/Soal
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* ── BARIS 2 (BAWAH): Pusat Tombol Aksi (Grid 4 Tombol Simetris & Sempurna) ── */}
              {!isProctorOnly ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* 1. TOMBOL UTAMA: Tambah Soal Manual (Hero Action) */}
                  <button
                    type="button"
                    onClick={() => setIsAddQuestionModal(true)}
                    className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                  >
                    {/* Shimmer sweep effect */}
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                    <span className="truncate">Tambah Soal Manual</span>
                  </button>

                  {/* 2. TOMBOL KOLEKTIF: Input Batch Soal */}
                  <button
                    type="button"
                    onClick={() => {
                      setBatchStep('input');
                      setIsBatchModalOpen(true);
                    }}
                    className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                    title="Upload soal secara banyak sekaligus via teks atau tabel"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <UploadCloud size={16} className="group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-300 shrink-0" />
                    <span className="truncate">Input Kolektif (Batch)</span>
                  </button>

                  {/* 3. TOMBOL UNDUH BANK SOAL: Format Siap Upload */}
                  {questions.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsDownloadBankSoalModalOpen(true)}
                      className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                      title="Unduh butir soal yang sudah diunggah dalam format Excel/CSV resmi (format cocok untuk langsung di-upload saat membuat paket baru)"
                    >
                      <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                      <Download size={16} className="group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-300 shrink-0" />
                      <span className="truncate">Unduh Bank Soal ({questions.length})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownloadCsvTemplate('csv')}
                      className="group flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-200 rounded-2xl text-xs sm:text-sm font-bold shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                      title="Unduh Template Excel CSV Resmi dengan Kolom Siap Isi"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-115 transition-transform duration-200 shrink-0" />
                      <span className="truncate">Unduh Template CSV</span>
                    </button>
                  )}

                  {/* 4. TOMBOL DISTRIBUSI: Bagi Rata Nilai Otomatis */}
                  <button
                    type="button"
                    onClick={() => setIsAutoDistributeModalOpen(true)}
                    className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                    title="Bagi rata nilai otomatis ke seluruh butir soal (contoh: 40 soal dengan total 100 = 2.5 poin/soal)"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <Calculator size={16} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                    <span className="truncate">Bagi Rata Nilai (Otomatis)</span>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 border border-amber-200 dark:border-amber-800 shadow-2xs">
                  <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                  <span>Naskah soal dikunci. Pengawas tidak diizinkan menambah atau mengubah soal.</span>
                </div>
              )}
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <HelpCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-500 font-medium">Belum ada butir soal dalam paket ujian ini.</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModal(true)}
                  className="group relative overflow-hidden flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-600 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Tambah Soal Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchStep('input');
                    setIsBatchModalOpen(true);
                  }}
                  className="group relative overflow-hidden flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <UploadCloud size={16} className="group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-300" />
                  <span>Input Kolektif (Batch)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCsvTemplate('csv')}
                  className="group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-115 transition-transform duration-200" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 🎛️ Bilah Aksi Kolektif / Bulk Selection Bar */}
              {!isProctorOnly && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={questions.length > 0 && selectedQIds.length === questions.length}
                        onChange={handleSelectAllQ}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span>Pilih Semua ({questions.length} Butir Soal)</span>
                    </label>

                    {selectedQIds.length > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {selectedQIds.length} Terpilih
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedQIds.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadExamQuestions('csv', true)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          title="Unduh hanya butir soal yang dicentang dalam format Excel/CSV siap upload"
                        >
                          <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Unduh ({selectedQIds.length}) Soal Terpilih</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBulkDeleteModalOpen(true)}
                          className="group relative overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 hover:shadow-lg hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
                        >
                          <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                          <Trash2 size={14} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200" />
                          <span>Hapus ({selectedQIds.length}) Soal Terpilih</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelectedQ}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteAllModalOpen(true)}
                        className="group px-3.5 py-2 rounded-xl text-red-600 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-red-300 dark:border-red-900/60 shadow-2xs hover:shadow-md hover:shadow-red-500/20"
                        title="Kosongkan seluruh butir soal dalam paket ujian ini"
                      >
                        <Trash2 size={13} className="group-hover:rotate-12 transition-transform duration-200" />
                        <span>Kosongkan Semua Soal</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {questions.map((q, idx) => {
                let parsedOptions: string[] = [];
                try {
                  parsedOptions = JSON.parse(q.options);
                } catch {
                  parsedOptions = [];
                }
                const correctIdx = parseInt(q.correctAnswer, 10);
                const isSelected = selectedQIds.includes(q.id);

                return (
                  <div
                    key={q.id}
                    className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm relative group transition-all duration-200 ${
                      isSelected 
                        ? 'border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/15 dark:bg-purple-950/15'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {!isProctorOnly && (
                          <label 
                            className="flex items-center justify-center cursor-pointer select-none"
                            onClick={(e) => e.stopPropagation()}
                            title={isSelected ? 'Batalkan pilihan' : 'Pilih butir soal ini'}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectQ(q.id)}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </label>
                        )}
                        <span className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Bobot: {q.points} Poin
                        </span>
                      </div>
                      {!isProctorOnly && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(q.id, 'up')}
                            disabled={idx === 0}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Pindahkan urutan soal ke atas (Soal nomor sebelumnya)"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(q.id, 'down')}
                            disabled={idx === questions.length - 1}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Pindahkan urutan soal ke bawah (Soal nomor berikutnya)"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(q)}
                            className="group p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Edit Soal & Bobot Nilai"
                          >
                            <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteQId(q.id);
                              setIsDeleteQModal(true);
                            }}
                            className="group p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Hapus Soal"
                          >
                            <Trash2 size={16} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Visualisasi Konten Soal (Teks Atas, Gambar, & Teks Bawah) */}
                    <div className="mt-4 text-slate-900 dark:text-white font-medium text-base">
                      <CbtQuestionContent
                        questionText={q.questionText}
                        imageUrl={q.imageUrl}
                        compactImage
                        imageAlt={`Visualisasi Gambar Soal No. ${idx + 1}`}
                      />
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
                            <span className="flex-1">
                              <CbtRichText text={opt} />
                            </span>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rekap Nilai Siswa</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {formatClassTargetDisplay(exam.classTarget)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai otomatis dikelompokkan per jurusan & rombel untuk ujian 1 angkatan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              >
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                <Download size={15} className="group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-200" />
                <span>Unduh Nilai Excel / CSV</span>
                {resultJurusanFilter !== 'ALL' && (
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
                    {resultJurusanFilter}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPrintExamModalOpen(true)}
                className="group px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              >
                <Printer size={15} className="group-hover:scale-110 transition-transform duration-200" />
                <span>Cetak Lembar Nilai</span>
              </button>
            </div>
          </div>

          {/* 🔍 FILTER BAR PER JURUSAN & ROMBEL */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Cari siswa atau NIS..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Filter Jurusan */}
              <div className="relative">
                <select
                  value={resultJurusanFilter}
                  onChange={(e) => {
                    setResultJurusanFilter(e.target.value);
                    setResultClassFilter('ALL');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="ALL">🏢 Semua Jurusan ({attempts.length} Siswa)</option>
                  {availableJurusans.map((j: JurusanOption) => (
                    <option key={j.code} value={j.code}>
                      🎯 Jurusan {j.code} ({j.count} Siswa)
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Rombel / Kelas */}
              <div className="relative">
                <select
                  value={resultClassFilter}
                  onChange={(e) => setResultClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="ALL">📚 Semua Rombel ({attempts.length})</option>
                  {availableClasses.map((c: ClassOption) => (
                    <option key={c.className} value={c.className}>
                      {c.className} ({c.count} Siswa)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Reset / Filter Summary */}
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                {(resultJurusanFilter !== 'ALL' || resultClassFilter !== 'ALL' || resultSearch) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResultJurusanFilter('ALL');
                      setResultClassFilter('ALL');
                      setResultSearch('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold transition-all duration-200 text-xs hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                  >
                    Reset Filter
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Menampilkan seluruh peserta
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-400 block text-[10px]">Total Siswa</span>
                <strong className="text-slate-900 dark:text-white font-black text-sm">{resultStats.total}</strong>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30">
                <span className="text-indigo-600 dark:text-indigo-400 block text-[10px]">Rata-Rata</span>
                <strong className="text-indigo-700 dark:text-indigo-300 font-black text-sm">{resultStats.avg}</strong>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
                <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Tuntas (≥75)</span>
                <strong className="text-emerald-700 dark:text-emerald-300 font-black text-sm">{resultStats.passed}</strong>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30">
                <span className="text-amber-600 dark:text-amber-400 block text-[10px]">Remedial</span>
                <strong className="text-amber-700 dark:text-amber-300 font-black text-sm">{resultStats.remedial}</strong>
              </div>
              <div className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 col-span-2 sm:col-span-1">
                <span className="text-rose-600 dark:text-rose-400 block text-[10px]">Tab Switch</span>
                <strong className="text-rose-700 dark:text-rose-300 font-black text-sm">{resultStats.tabSwitchTotal}x</strong>
              </div>
            </div>
          </div>

          {/* 🛡️ Banner Admin Utama: Buka Suspend Massal jika ada siswa terkena Strike 3 */}
          {isSuperAdmin && attempts.some(a => (a.isBlocked || a.tabSwitchCount >= 3 || a.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) && !a.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]')) && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 flex items-center justify-between flex-wrap gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 flex-shrink-0 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
                  Terdapat <strong>{attempts.filter(a => (a.isBlocked || a.tabSwitchCount >= 3 || a.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) && !a.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]')).length} siswa</strong> yang terkena Suspend Total (Strike 3).
                </span>
              </div>
              <button
                onClick={() => setIsUnblockAllModalOpen(true)}
                disabled={unblockingAll}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck size={14} />
                <span>{unblockingAll ? 'Membuka Suspend...' : 'Buka Suspend Semua Siswa Sekaligus'}</span>
              </button>
            </div>
          )}

          {filteredAttempts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-500 font-medium">
                {attempts.length === 0 
                  ? 'Belum ada siswa yang mengerjakan ujian ini.' 
                  : 'Tidak ada siswa yang sesuai dengan filter yang dipilih.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">Nama Siswa</th>
                      <th className="py-3.5 px-4">Jurusan</th>
                      <th className="py-3.5 px-6">NIS & Rombel</th>
                      <th className="py-3.5 px-6">Skor Akhir</th>
                      <th className="py-3.5 px-6">Benar / Soal</th>
                      <th className="py-3.5 px-6">Anti-Curang (Tab Switch)</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAttempts.map((att: AttemptItem) => {
                      const jur = extractJurusanCode(att.studentClass) || '-';
                      return (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                          {att.studentName}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            {jur}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {att.studentNis || '-'} • <strong className="text-slate-700 dark:text-slate-300">{att.studentClass || '-'}</strong>
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
                          {att.tabSwitchCount === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle size={12} /> Bersih (0x)
                            </span>
                          ) : att.tabSwitchCount === 1 ? (
                            att.proctorNotes?.includes('[ADMIN_UNBLOCK]') ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300">
                                <ShieldCheck size={12} /> 1x (Dispensasi Admin)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                                <AlertTriangle size={12} /> 1x (Peringatan Layar)
                              </span>
                            )
                          ) : att.tabSwitchCount === 2 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                              <Lock size={12} /> 2x (Terkunci Pengawas)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertTriangle size={12} /> {att.tabSwitchCount}x (SUSPEND TOTAL)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {att.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm animate-pulse">
                              {att.tabSwitchCount >= 5 || att.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]')
                                ? 'DISKUALIFIKASI (5x)'
                                : att.tabSwitchCount === 4 || att.proctorNotes?.includes('[STRIKE_4_FATAL]')
                                ? 'SUSPEND FATAL (4x)'
                                : 'SUSPEND (STRIKE 3)'}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              att.status === 'SUBMITTED'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                            }`}>
                              {att.status === 'SUBMITTED' ? 'Selesai' : 'Sedang Ujian'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Buka Kunci Layar Ujian untuk Pengawas Ruangan (Pelanggaran ke-2 / Strike 2) */}
                            {att.tabSwitchCount === 2 && !att.isBlocked && !att.proctorNotes?.includes('[IZIN_LANJUT_P2]') && (
                              <button
                                onClick={() => setUnlockStrike2Target(att)}
                                className="group px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
                                title="Buka Kunci Layar Ujian (Pelanggaran ke-2) - Siswa Langsung Melanjutkan"
                              >
                                <Unlock size={13} className="group-hover:rotate-12 transition-transform duration-200" />
                                <span>Buka Kunci P2</span>
                              </button>
                            )}

                            {att.tabSwitchCount === 2 && !att.isBlocked && att.proctorNotes?.includes('[IZIN_LANJUT_P2]') && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                ✓ Kunci Telah Dibuka
                              </span>
                            )}

                            {isSuperAdmin && (att.isBlocked || (att.tabSwitchCount >= 3 && !att.proctorNotes?.includes('[ADMIN_UNBLOCK]')) || (att.proctorNotes?.includes('[STRIKE_3_BLOKIR]') && !att.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]'))) && (
                              <button
                                onClick={() => setUnblockStrike3Target(att)}
                                className="group px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer"
                                title="Buka Suspend Siswa (Wewenang Khusus Admin Utama)"
                              >
                                <ShieldCheck size={13} className="group-hover:scale-110 transition-transform duration-200" />
                                <span>Buka Suspend</span>
                              </button>
                            )}

                            {att.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') && !att.isBlocked && !att.proctorNotes?.includes('[STRIKE_4_FATAL]') && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                ✓ Suspend Telah Dibuka
                              </span>
                            )}

                            {(att.tabSwitchCount === 4 || att.proctorNotes?.includes('[STRIKE_4_FATAL]')) && (
                              att.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]') ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                  ✓ Izin Fatal Pengawas
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                                  🚨 Kunci Fatal Pasca-Dispensasi
                                </span>
                              )
                            )}

                            {!isProctorOnly ? (
                              <button
                                onClick={() => {
                                  setDeleteAttemptId(att.id);
                                  setIsDeleteAttemptModal(true);
                                }}
                                className="group p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                                title="⚠️ Hapus Riwayat & Ulang Ujian dari Nol"
                              >
                                <Trash2 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                Terkunci
                              </span>
                            )}
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
      )}

      {/* Modal Tambah Soal Pilihan Ganda */}
      {isAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-purple-600 dark:text-purple-400" />
                Tambah Butir Soal (Teks, Rumus MTK & Gambar)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddQuestionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* 🎨 Studio Toolbar Terpadu: Format Teks, Font, Warna, AKM, Tabel & Rumus (Auto-Hide Canggih) */}
              <CbtFormatToolbar
                textareaRef={activeCreateField === 'before' && questionImageUrl ? createQuestionBeforeRef : createQuestionTextareaRef}
                value={activeCreateField === 'before' && questionImageUrl ? questionTextBefore : questionText}
                onChange={activeCreateField === 'before' && questionImageUrl ? setQuestionTextBefore : setQuestionText}
                targetLabel={activeCreateField === 'before' && questionImageUrl ? "teks sebelum gambar" : (questionImageUrl ? "pertanyaan di bawah gambar" : "soal baru")}
                onOpenTable={() => {
                  setTableTarget('create');
                  setIsTableModalOpen(true);
                }}
                onInsertMath={(snippet) => {
                  if (activeCreateField === 'before' && questionImageUrl) {
                    setQuestionTextBefore((prev) => prev ? `${prev} ${snippet}` : snippet);
                  } else {
                    setQuestionText((prev) => prev ? `${prev} ${snippet}` : snippet);
                  }
                }}
              />

              {/* 📝 BAGIAN 1: TEKS PENGANTAR / STIMULUS (DI ATAS GAMBAR) */}
              {questionImageUrl ? (
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <AlignLeft size={14} className="text-purple-600 dark:text-purple-400" />
                      <span>1. Teks Pengantar / Stimulus (Di Atas Gambar - Opsional)</span>
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Muncul di Atas Gambar
                    </span>
                  </div>
                  <textarea
                    ref={createQuestionBeforeRef}
                    rows={2}
                    placeholder="Contoh: Perhatikan gambar diagram / topologi jaringan di bawah ini dengan saksama:"
                    value={questionTextBefore}
                    onFocus={() => setActiveCreateField('before')}
                    onChange={(e) => setQuestionTextBefore(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition font-sans ${
                      activeCreateField === 'before'
                        ? 'border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  />
                </div>
              ) : null}

              {/* 🖼️ BAGIAN 2: GAMBAR / VISUALISASI SOAL (Smart Collapsible Drawer) */}
              {!showCreateImageDrawer && !questionImageUrl ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <ImageIcon size={15} className="text-purple-600 dark:text-purple-400" />
                      <span>Gambar / Visualisasi Soal (Opsional)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateImageDrawer(true)}
                      className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                    >
                      <Plus size={13} />
                      <span>+ Lampirkan Gambar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-800/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-purple-600 dark:text-purple-400" />
                      <span>{questionImageUrl ? '2. Gambar / Visualisasi Soal' : 'Lampirkan Gambar / Visualisasi Soal'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {questionImageUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const temp = questionTextBefore;
                              setQuestionTextBefore(questionText);
                              setQuestionText(temp);
                            }}
                            className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Tukar posisi teks atas dan bawah gambar"
                          >
                            <ArrowUpDown size={12} />
                            <span>Tukar Teks Atas & Bawah</span>
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuestionImageUrl('');
                              setShowCreateImageDrawer(false);
                              if (questionTextBefore) {
                                setQuestionText((prev) => questionTextBefore + (prev ? `\n\n${prev}` : ''));
                                setQuestionTextBefore('');
                                setActiveCreateField('after');
                              }
                            }}
                            className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Hapus Gambar
                          </button>
                        </>
                      )}
                      {!questionImageUrl && (
                        <button
                          type="button"
                          onClick={() => setShowCreateImageDrawer(false)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline cursor-pointer flex items-center gap-0.5"
                          title="Tutup panel gambar"
                        >
                          <ChevronUp size={12} />
                          <span>Tutup Panel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0">
                      <Upload size={14} />
                      <span>{uploadingImage ? 'Mengunggah...' : 'Pilih / Unggah Gambar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadQuestionImage(f, false);
                        }}
                        className="hidden"
                      />
                    </label>

                    <span className="text-xs text-slate-400 text-center sm:text-left">atau</span>

                    <input
                      type="text"
                      placeholder="Tempel tautan URL gambar (https://...)"
                      value={questionImageUrl}
                      onChange={(e) => setQuestionImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {questionImageUrl ? (
                    <div className="mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={questionImageUrl}
                        alt="Pratinjau Gambar Soal"
                        className="h-16 w-24 object-contain rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                          Gambar Siap Ditampilkan
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate font-mono">
                          {questionImageUrl}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      💡 Tips: Jika soal memiliki gambar diagram/skema, unggah di sini agar Anda bisa menulis teks pengantar di atas gambar dan kalimat pertanyaan di bawah gambar.
                    </div>
                  )}
                </div>
              )}

              {/* ❓ BAGIAN 3: PERTANYAAN / PERINTAH SOAL (DI BAWAH GAMBAR) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {questionImageUrl ? (
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <HelpCircle size={14} className="text-purple-600 dark:text-purple-400" />
                        <span>3. Pertanyaan / Perintah Soal (Di Bawah Gambar)</span> <span className="text-red-500">*</span>
                      </span>
                    ) : (
                      <span>Pertanyaan / Isi Soal (Mendukung Format Teks, Blok Terminal & KaTeX $...$) <span className="text-red-500">*</span></span>
                    )}
                  </label>
                  {questionImageUrl && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Muncul di Bawah Gambar
                    </span>
                  )}
                </div>
                <textarea
                  ref={createQuestionTextareaRef}
                  rows={questionImageUrl ? 3 : 4}
                  required={!questionImageUrl && !questionTextBefore}
                  placeholder={
                    questionImageUrl
                      ? "Tuliskan pertanyaan inti atau perintah soal di sini (misal: Berdasarkan gambar di atas, fungsi perangkat tersebut adalah...)"
                      : "Tuliskan pertanyaan soal ujian di sini... Anda bisa blok kata untuk mengganti font, ukuran, warna, atau klik tombol Kotak Terminal di atas."
                  }
                  value={questionText}
                  onFocus={() => setActiveCreateField('after')}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm outline-none transition font-sans ${
                    activeCreateField === 'after'
                      ? 'border-purple-500 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>

              {/* Live Preview Realtime Tampilan Siswa */}
              <div className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    <span>Pratinjau Tampilan Siswa (Realtime):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="text-[11px] font-semibold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showLivePreview ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showLivePreview ? 'Sembunyikan' : 'Tampilkan'}</span>
                  </button>
                </div>

                {showLivePreview && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    {(questionTextBefore || questionText || questionImageUrl) ? (
                      <CbtQuestionContent
                        questionText={
                          questionImageUrl
                            ? (questionTextBefore && questionText
                                ? `${questionTextBefore}\n\n[GAMBAR]\n\n${questionText}`
                                : questionTextBefore
                                  ? `${questionTextBefore}\n\n[GAMBAR]`
                                  : `[GAMBAR]\n\n${questionText}`)
                            : (questionText || questionTextBefore)
                        }
                        imageUrl={questionImageUrl}
                        compactImage
                        imageAlt="Pratinjau Gambar Soal Baru"
                      />
                    ) : (
                      <span className="text-slate-400 italic">Ketikkan pertanyaan di atas untuk melihat preview rumus matematika & gambar...</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilihan Jawaban (A - {String.fromCharCode(64 + options.length)}) & Tentukan Kunci Jawaban Benar <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {options.length} Pilihan Aktif
                  </span>
                </div>

                {options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isChecked = correctAnswer === String(idx);

                  return (
                    <CbtOptionInputItem
                      key={idx}
                      index={idx}
                      label={label}
                      value={opt}
                      isChecked={isChecked}
                      canDelete={options.length > 2}
                      radioName="correctAnswerOption"
                      placeholder={`Pilihan ${label} (teks biasa, rumus KaTeX $...$, atau lampirkan foto)`}
                      onSelectCorrect={() => setCorrectAnswer(String(idx))}
                      onChangeText={(text) => handleOptionChange(idx, text)}
                      onDelete={() => handleRemoveOption(idx)}
                    />
                  );
                })}

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="w-full py-2.5 border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={15} /> Tambah Pilihan Jawaban ({String.fromCharCode(65 + options.length)})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bobot Poin Soal <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      Otomatis / Manual
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max="1000"
                    required
                    value={points}
                    onChange={(e) => setPoints(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Rekomendasi Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setPoints(Math.round((100 / (questions.length + 1)) * 100) / 100)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Bagi Rata Total 100 ({Math.round((100 / (questions.length + 1)) * 100) / 100} Poin)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Butir Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 MODAL UNDUH & EKSPOR BANK SOAL CBT */}
      {isDownloadBankSoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                  <Download size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                      Unduh Bank Soal CBT
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      100% Siap Upload
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih format unduhan naskah soal yang Anda perlukan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadBankSoalModalOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Info Ringkas Paket */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Judul Paket Ujian</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{exam.title}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-semibold">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Mata Pelajaran</span>
                    <span>{exam.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Jumlah Soal</span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">{questions.length} Butir</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Total Skor</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalPoints} Poin</span>
                  </div>
                </div>
              </div>

              {/* Pilihan Format */}
              <div className="space-y-3">
                {/* 1. Format Excel / CSV Siap Upload */}
                <div className="p-4 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                          Format Tabel Excel / Spreadsheet (.CSV)
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                          Sangat Direkomendasikan
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Format resmi bank soal CBT (pemisah <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono font-bold text-emerald-600">;</code> & UTF-8 BOM). 
                        Saat Anda membuat paket ujian baru, file ini <strong>bisa langsung di-upload</strong> tanpa harus diedit lagi!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadExamQuestions('csv');
                      setIsDownloadBankSoalModalOpen(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                  >
                    <Download size={14} /> Unduh CSV (Excel)
                  </button>
                </div>

                {/* 2. Format Word / Teks */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Format Naskah Word / Dokumen Teks (.TXT)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Naskah bernomor rapi (<code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">1. Soal</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">A. Opsi</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600">Kunci: A</code>). Cocok untuk dibuka di Microsoft Word, disunting, dicetak untuk arsip fisik guru, atau di-copy-paste langsung.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadExamQuestions('txt');
                      setIsDownloadBankSoalModalOpen(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                  >
                    <Download size={14} /> Unduh Teks (.TXT)
                  </button>
                </div>

                {/* 3. Format Master Cadangan Data (.JSON) */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Master Cadangan Data Digital (.JSON)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Salinan digital lengkap struktur bank soal untuk cadangan (backup) data teknis dan pemulihan sistem.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadExamQuestions('json');
                      setIsDownloadBankSoalModalOpen(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
                  >
                    <Download size={14} /> Unduh JSON
                  </button>
                </div>

                {/* 4. Unduh Template Kosong Baru */}
                <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                    <FileDown size={16} className="text-slate-400" />
                    <span>Perlu template Excel kosong siap isi untuk membuat soal baru dari nol?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadCsvTemplate('csv');
                      setIsDownloadBankSoalModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer shrink-0"
                  >
                    Unduh Template Kosong
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsDownloadBankSoalModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 MODAL INPUT SOAL KOLEKTIF (BULK IMPORT) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    Input Soal Kolektif (Bulk Import)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Input puluhan soal sekaligus dari Word, Excel (CSV), atau Notepad beserta kunci dan bobot nilainya.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBatchStep('input')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      batchStep === 'input'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    1. Editor Teks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (parsedBatch.length > 0) setBatchStep('preview');
                      else handleParseBatch();
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      batchStep === 'preview'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    2. Pratinjau ({parsedBatch.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {batchError && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              {batchStep === 'input' ? (
                <>
                  {/* Action helpers bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Bobot Nilai Default:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={batchDefaultPoints}
                        onChange={(e) => setBatchDefaultPoints(Number(e.target.value) || 10)}
                        className="w-16 px-2.5 py-1 text-center font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-500">Poin/Soal</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleInsertExampleFormat}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
                        title="Isi editor dengan contoh format teks soal"
                      >
                        <Sparkles size={14} className="text-purple-600 dark:text-purple-400" /> Contoh Soal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTableTarget('bulk');
                          setIsTableModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        title="Buka generator pembuat tabel fleksibel untuk disisipkan ke naskah soal kolektif"
                      >
                        <Table size={14} className="text-purple-600 dark:text-purple-400" /> Sisipkan Format Tabel
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCsvTemplate('csv')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        title="Unduh template Excel resmi (.csv) dengan kolom siap isi"
                      >
                        <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> Unduh Template Excel (.CSV)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCsvTemplate('txt')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
                        title="Unduh format daftar nomor untuk Word (.txt)"
                      >
                        <FileText size={14} className="text-blue-600 dark:text-blue-400" /> Format Word (.TXT)
                      </button>

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer">
                        <FileUp size={14} className="text-indigo-600 dark:text-indigo-400" /> Unggah File (.csv/.txt)
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Main Input Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tempelkan Teks Soal / Tabel Excel di Bawah Ini:
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Mendukung format Microsoft Word / Google Docs & CSV / Tabel Excel
                      </span>
                    </div>

                    <textarea
                      rows={12}
                      value={batchRawText}
                      onChange={(e) => setBatchRawText(e.target.value)}
                      placeholder={`1. Pertanyaan soal di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: A
Poin: 10

2. Pertanyaan kedua...
A. Pilihan A
B. Pilihan B
C. Pilihan C
D. Pilihan D
Kunci: B
Poin: 15`}
                      className="w-full p-4 font-mono text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-inner resize-y"
                    />
                  </div>

                  {/* Format Guidance Hint */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-blue-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" /> Cara Paling Canggih & Praktis untuk Guru:
                      </span>
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                        Auto-Detect Cerdas
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-1">
                        <strong className="text-emerald-700 dark:text-emerald-400 block font-bold text-xs">📊 Metode 1: Dari Microsoft Excel</strong>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                          Unduh Template CSV di atas, buka di Excel. Setelah selesai mengisi, <strong>blok tabelnya di Excel (Ctrl+A), tekan Copy (Ctrl+C), lalu langsung Paste (Ctrl+V) ke kotak teks di atas!</strong> Sistem otomatis mendeteksi kolom Excel tanpa perlu repot menyimpan file.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-1">
                        <strong className="text-purple-700 dark:text-purple-400 block font-bold text-xs">📄 Metode 2: Dari Dokumen Word / Teks</strong>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                          Ketik naskah soal biasa dengan nomor (<code>1.</code>), opsi (<code>A.</code>, <code>B.</code>, <code>C.</code>, <code>D.</code>), baris <code>Kunci: A</code>, dan <code>Poin: 10</code>. Cukup copy-paste seluruh dokumen ke kotak di atas.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Step 2: Live Preview & Inline Point Adjuster */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40">
                      <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase">Total Soal Terdeteksi</div>
                      <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-0.5">
                        {parsedBatch.length} Butir Soal
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Total Akumulasi Poin</div>
                      <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                        {Math.round(parsedBatch.reduce((sum, q) => sum + q.points, 0) * 100) / 100} Poin
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
                          <Calculator size={13} />
                          <span>Bagi Rata Otomatis</span>
                        </div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                          {parsedBatch.length > 0 ? `${Math.round((100 / parsedBatch.length) * 100) / 100} Poin/Soal` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Total:</span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            defaultValue={100}
                            id="batchTargetTotalInput"
                            className="w-full pl-11 pr-2 py-1 font-bold text-xs rounded-lg border border-amber-300 bg-white dark:bg-slate-900 dark:border-amber-800 text-slate-900 dark:text-white"
                            placeholder="100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const totalVal = Number((document.getElementById('batchTargetTotalInput') as HTMLInputElement)?.value) || 100;
                            if (parsedBatch.length > 0) {
                              const autoPt = Math.round((totalVal / parsedBatch.length) * 100) / 100;
                              handleApplyPointsToAllParsed(autoPt);
                            }
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
                          title="Bagi rata target nilai total ke seluruh butir soal"
                        >
                          ⚡ Bagi Rata
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex flex-col justify-between">
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Setel Bobot Manual</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          max="100"
                          defaultValue={batchDefaultPoints}
                          id="bulkPointInput"
                          className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-blue-300 bg-white dark:bg-slate-900 dark:border-blue-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat((document.getElementById('bulkPointInput') as HTMLInputElement)?.value) || 10;
                            handleApplyPointsToAllParsed(val);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Terapkan Manual
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of Parsed Items */}
                  <div className="space-y-3">
                    {parsedBatch.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Soal Nomor {idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Bobot Nilai:
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                max="1000"
                                value={item.points}
                                onChange={(e) => handleUpdateParsedItemPoints(idx, parseFloat(e.target.value) || 0)}
                                className="w-16 px-1.5 py-0.5 text-center font-bold text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="text-[11px] text-slate-500 font-medium">Poin</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteParsedItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              title="Hapus soal ini dari daftar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="text-sm font-medium text-slate-900 dark:text-white pl-9">
                          <CbtQuestionContent
                            questionText={item.questionText}
                            imageUrl={item.imageUrl}
                            compactImage
                          />
                        </div>

                        {/* Options */}
                        <div className="space-y-2 pl-9 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.options.map((opt, oIdx) => {
                              const isCorrect = String(oIdx) === item.correctAnswer;
                              const label = String.fromCharCode(65 + oIdx);
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 font-semibold text-emerald-900 dark:text-emerald-200 shadow-sm'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParsedItemKey(idx, String(oIdx))}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                    title={`Klik untuk jadikan Opsi ${label} sebagai Kunci Jawaban`}
                                  >
                                    {label}
                                  </button>

                                  <div className="flex-1 flex flex-col min-w-0">
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdateParsedOptionText(idx, oIdx, e.target.value)}
                                      className="bg-transparent text-xs focus:outline-none min-w-0 font-sans"
                                      placeholder={`Pilihan ${label}...`}
                                    />
                                    {(opt.includes('$') || opt.includes('![')) && (
                                      <div className="text-[11px] pt-1 text-purple-700 dark:text-purple-300 font-medium">
                                        <CbtRichText text={opt} />
                                      </div>
                                    )}
                                  </div>

                                  {isCorrect && (
                                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                                      <Check size={11} /> Kunci
                                    </span>
                                  )}

                                  {item.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveParsedOption(idx, oIdx)}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded transition flex-shrink-0 cursor-pointer"
                                      title={`Hapus opsi ${label}`}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {item.options.length < 6 && (
                            <button
                              type="button"
                              onClick={() => handleAddParsedOption(idx)}
                              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer pt-0.5"
                            >
                              <Plus size={13} /> + Tambah Pilihan {String.fromCharCode(65 + item.options.length)} (misal Opsi E)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              {batchStep === 'input' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleParseBatch}
                    className="group relative overflow-hidden flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <Search size={16} className="group-hover:scale-115 transition-transform duration-200" />
                    <span>Analisis & Pratinjau Butir Soal →</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setBatchStep('input')}
                    className="group flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:-translate-x-0.5 active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <span>← Kembali Edit Teks</span>
                  </button>

                  <button
                    type="button"
                    disabled={batchLoading || parsedBatch.length === 0}
                    onClick={handleSaveBatchQuestions}
                    className="group relative overflow-hidden flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                    <CheckCircle size={16} className="group-hover:scale-115 transition-transform duration-200" />
                    <span>
                      {batchLoading
                        ? 'Sedang Menyimpan...'
                        : `Simpan Semua Soal (${parsedBatch.length} Butir Soal)`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDIT BUTIR SOAL & BOBOT NILAI */}
      {isEditQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 size={18} className="text-purple-600 dark:text-purple-400" />
                Edit Butir Soal (Teks, Rumus MTK & Gambar)
              </h3>
              <button
                type="button"
                onClick={() => setIsEditQModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditQuestion} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* 🎨 Studio Toolbar Terpadu: Format Teks, Font, Warna, AKM, Tabel & Rumus (Auto-Hide Canggih) */}
              <CbtFormatToolbar
                textareaRef={activeEditField === 'before' && editImageUrl ? editQuestionBeforeRef : editQuestionTextareaRef}
                value={activeEditField === 'before' && editImageUrl ? editQuestionTextBefore : editQuestionText}
                onChange={activeEditField === 'before' && editImageUrl ? setEditQuestionTextBefore : setEditQuestionText}
                targetLabel={activeEditField === 'before' && editImageUrl ? "teks sebelum gambar" : (editImageUrl ? "pertanyaan di bawah gambar" : "edit soal")}
                onOpenTable={() => {
                  setTableTarget('edit');
                  setIsTableModalOpen(true);
                }}
                onInsertMath={(snippet) => {
                  if (activeEditField === 'before' && editImageUrl) {
                    setEditQuestionTextBefore((prev) => prev ? `${prev} ${snippet}` : snippet);
                  } else {
                    setEditQuestionText((prev) => prev ? `${prev} ${snippet}` : snippet);
                  }
                }}
              />

              {/* 📝 BAGIAN 1: TEKS PENGANTAR / STIMULUS (DI ATAS GAMBAR) */}
              {editImageUrl ? (
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <AlignLeft size={14} className="text-purple-600 dark:text-purple-400" />
                      <span>1. Teks Pengantar / Stimulus (Di Atas Gambar - Opsional)</span>
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Muncul di Atas Gambar
                    </span>
                  </div>
                  <textarea
                    ref={editQuestionBeforeRef}
                    rows={2}
                    placeholder="Contoh: Perhatikan gambar diagram / topologi jaringan di bawah ini dengan saksama:"
                    value={editQuestionTextBefore}
                    onFocus={() => setActiveEditField('before')}
                    onChange={(e) => setEditQuestionTextBefore(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition font-sans ${
                      activeEditField === 'before'
                        ? 'border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  />
                </div>
              ) : null}

              {/* 🖼️ BAGIAN 2: GAMBAR / VISUALISASI SOAL (Smart Collapsible Drawer) */}
              {!showEditImageDrawer && !editImageUrl ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <ImageIcon size={15} className="text-purple-600 dark:text-purple-400" />
                      <span>Gambar / Visualisasi Soal (Opsional)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEditImageDrawer(true)}
                      className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                    >
                      <Plus size={13} />
                      <span>+ Lampirkan Gambar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-800/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-purple-600 dark:text-purple-400" />
                      <span>{editImageUrl ? '2. Gambar / Visualisasi Soal' : 'Lampirkan Gambar / Visualisasi Soal'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {editImageUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const temp = editQuestionTextBefore;
                              setEditQuestionTextBefore(editQuestionText);
                              setEditQuestionText(temp);
                            }}
                            className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Tukar posisi teks atas dan bawah gambar"
                          >
                            <ArrowUpDown size={12} />
                            <span>Tukar Teks Atas & Bawah</span>
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditImageUrl('');
                              setShowEditImageDrawer(false);
                              if (editQuestionTextBefore) {
                                setEditQuestionText((prev) => editQuestionTextBefore + (prev ? `\n\n${prev}` : ''));
                                setEditQuestionTextBefore('');
                                setActiveEditField('after');
                              }
                            }}
                            className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Hapus Gambar
                          </button>
                        </>
                      )}
                      {!editImageUrl && (
                        <button
                          type="button"
                          onClick={() => setShowEditImageDrawer(false)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline cursor-pointer flex items-center gap-0.5"
                          title="Tutup panel gambar"
                        >
                          <ChevronUp size={12} />
                          <span>Tutup Panel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0">
                      <Upload size={14} />
                      <span>{editUploadingImage ? 'Mengunggah...' : 'Pilih / Unggah Gambar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={editUploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadQuestionImage(f, true);
                        }}
                        className="hidden"
                      />
                    </label>

                    <span className="text-xs text-slate-400 text-center sm:text-left">atau</span>

                    <input
                      type="text"
                      placeholder="Tempel tautan URL gambar (https://...)"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {editImageUrl ? (
                    <div className="mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editImageUrl}
                        alt="Pratinjau Gambar Soal"
                        className="h-16 w-24 object-contain rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                          Gambar Siap Ditampilkan
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate font-mono">
                          {editImageUrl}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      💡 Tips: Jika soal memiliki gambar diagram/skema, unggah di sini agar Anda bisa menulis teks pengantar di atas gambar dan kalimat pertanyaan di bawah gambar.
                    </div>
                  )}
                </div>
              )}

              {/* ❓ BAGIAN 3: PERTANYAAN / PERINTAH SOAL (DI BAWAH GAMBAR) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {editImageUrl ? (
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <HelpCircle size={14} className="text-purple-600 dark:text-purple-400" />
                        <span>3. Pertanyaan / Perintah Soal (Di Bawah Gambar)</span> <span className="text-red-500">*</span>
                      </span>
                    ) : (
                      <span>Pertanyaan / Isi Soal (Mendukung Format Teks, Blok Terminal & KaTeX $...$) <span className="text-red-500">*</span></span>
                    )}
                  </label>
                  {editImageUrl && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Muncul di Bawah Gambar
                    </span>
                  )}
                </div>
                <textarea
                  ref={editQuestionTextareaRef}
                  rows={editImageUrl ? 3 : 4}
                  required={!editImageUrl && !editQuestionTextBefore}
                  placeholder={
                    editImageUrl
                      ? "Tuliskan pertanyaan inti atau perintah soal di sini (misal: Berdasarkan gambar di atas, fungsi perangkat tersebut adalah...)"
                      : "Tuliskan pertanyaan soal ujian di sini... Anda bisa blok kata untuk mengganti font, ukuran, warna, atau klik tombol Kotak Terminal di atas."
                  }
                  value={editQuestionText}
                  onFocus={() => setActiveEditField('after')}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm outline-none transition font-sans ${
                    activeEditField === 'after'
                      ? 'border-purple-500 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>

              {/* Live Preview Realtime Tampilan Siswa */}
              <div className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    <span>Pratinjau Tampilan Siswa (Realtime):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEditPreview(!showEditPreview)}
                    className="text-[11px] font-semibold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showEditPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showEditPreview ? 'Sembunyikan' : 'Tampilkan'}</span>
                  </button>
                </div>

                {showEditPreview && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    {(editQuestionTextBefore || editQuestionText || editImageUrl) ? (
                      <CbtQuestionContent
                        questionText={
                          editImageUrl
                            ? (editQuestionTextBefore && editQuestionText
                                ? `${editQuestionTextBefore}\n\n[GAMBAR]\n\n${editQuestionText}`
                                : editQuestionTextBefore
                                  ? `${editQuestionTextBefore}\n\n[GAMBAR]`
                                  : `[GAMBAR]\n\n${editQuestionText}`)
                            : (editQuestionText || editQuestionTextBefore)
                        }
                        imageUrl={editImageUrl}
                        compactImage
                        imageAlt="Pratinjau Gambar Edit Soal"
                      />
                    ) : (
                      <span className="text-slate-400 italic">Ketikkan pertanyaan di atas untuk melihat preview rumus matematika & gambar...</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilihan Jawaban (A - {String.fromCharCode(64 + editOptions.length)}) & Tentukan Kunci Jawaban Benar <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {editOptions.length} Pilihan Aktif
                  </span>
                </div>

                {editOptions.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isChecked = editCorrectAnswer === String(idx);

                  return (
                    <CbtOptionInputItem
                      key={idx}
                      index={idx}
                      label={label}
                      value={opt}
                      isChecked={isChecked}
                      canDelete={editOptions.length > 2}
                      radioName="editCorrectAnswerOption"
                      placeholder={`Pilihan ${label} (teks biasa, rumus KaTeX $...$, atau lampirkan foto)`}
                      onSelectCorrect={() => setEditCorrectAnswer(String(idx))}
                      onChangeText={(text) => {
                        const updated = [...editOptions];
                        updated[idx] = text;
                        setEditOptions(updated);
                      }}
                      onDelete={() => handleRemoveEditOption(idx)}
                    />
                  );
                })}

                {editOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddEditOption}
                    className="w-full py-2.5 border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={15} /> Tambah Pilihan Jawaban ({String.fromCharCode(65 + editOptions.length)})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bobot Nilai / Poin <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      Bisa Manual / Desimal
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max="1000"
                    required
                    value={editPoints}
                    onChange={(e) => setEditPoints(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Rekomendasi Rata:</span>
                    <button
                      type="button"
                      onClick={() => setEditPoints(Math.round((100 / (questions.length || 1)) * 100) / 100)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Bagi Rata ({Math.round((100 / (questions.length || 1)) * 100) / 100} Poin)
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Nilai yang didapat siswa jika menjawab benar pada butir soal ini.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditQModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚡ MODAL BAGI RATA NILAI SOAL OTOMATIS */}
      {isAutoDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-auto">
            {/* Header (Sticky / Flex-Shrink-0) */}
            <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 flex-shrink-0">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                    Bagi Rata Nilai Soal Otomatis
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem otomatis membagi total nilai sama rata ke semua butir soal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoDistributeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Body (Scrollable with overflow-y-auto) */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Notifikasi jika soal masih 0 */}
              {questions.length === 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertCircle size={15} /> Belum Ada Butir Soal
                  </div>
                  <p>
                    Paket ujian ini belum memiliki butir soal. Silakan tambahkan soal terlebih dahulu melalui <strong>Input Kolektif (Batch)</strong> atau <strong>Tambah Soal Manual</strong> agar sistem dapat menghitung dan membagi nilai secara otomatis.
                  </p>
                </div>
              )}

              {/* Info Statistik Soal Saat Ini */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Jumlah Butir Soal:</span>
                  <strong className="text-sm sm:text-base text-slate-900 dark:text-white font-black">{questions.length} Soal</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Nilai Saat Ini:</span>
                  <strong className="text-sm sm:text-base text-purple-600 dark:text-purple-400 font-black">{Math.round(totalPoints * 100) / 100} Poin</strong>
                </div>
              </div>

              {/* Input Target Total Nilai */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Total Nilai Ujian:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="1000"
                    value={targetTotalPointsInput}
                    onChange={(e) => setTargetTotalPointsInput(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-400/80 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-lg font-black focus:outline-none focus:ring-3 focus:ring-amber-500/20 shadow-inner"
                    placeholder="100"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Poin Maksimal
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">Preset Nilai:</span>
                  {[100, 50, 75, 80].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetTotalPointsInput(preset)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        targetTotalPointsInput === preset
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {preset} {preset === 100 ? '(Standar)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hasil Kalkulasi Otomatis */}
              {questions.length > 0 && targetTotalPointsInput > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-slate-900 border border-amber-300/80 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" /> Hasil Pembagian Nilai:
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {targetTotalPointsInput} ÷ {questions.length} Soal
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/50 shadow-sm">
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">Nilai per Butir Soal</div>
                      <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {Math.round((targetTotalPointsInput / questions.length) * 100) / 100}
                        <span className="text-xs font-bold text-slate-500 ml-1">Poin / Soal</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-medium">Total Akumulasi</div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round((Math.round((targetTotalPointsInput / questions.length) * 100) / 100) * questions.length * 100) / 100} Poin
                      </div>
                    </div>
                  </div>

                  {/* Simulasi Ringkas */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center text-slate-600 dark:text-slate-400">
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60">
                      <div>Benar 100% ({questions.length})</div>
                      <strong className="text-emerald-600 text-xs">{targetTotalPointsInput} Poin</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60">
                      <div>Benar 75% ({Math.round(questions.length * 0.75)})</div>
                      <strong className="text-blue-600 text-xs">{(targetTotalPointsInput * 0.75).toFixed(1)} Poin</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60">
                      <div>Benar 50% ({Math.round(questions.length * 0.5)})</div>
                      <strong className="text-purple-600 text-xs">{(targetTotalPointsInput * 0.5).toFixed(1)} Poin</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Note Guru */}
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2 leading-relaxed">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Fleksibilitas Penuh:</strong> Setelah nilai dibagi rata secara otomatis, Anda tetap bisa mengedit atau menaikkan bobot butir soal tertentu secara manual (misal soal esai/sulit) lewat tombol edit pada masing-masing butir soal.
                </span>
              </div>
            </div>

            {/* Footer (Sticky / Flex-Shrink-0) */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-slate-950/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoDistributeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={distributeLoading || questions.length === 0 || targetTotalPointsInput <= 0}
                onClick={() => handleAutoDistributePoints(targetTotalPointsInput)}
                className="group relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                <Calculator size={16} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200" />
                <span>
                  {distributeLoading
                    ? 'Menerapkan...'
                    : questions.length === 0
                      ? 'Tambahkan Soal Dulu'
                      : `Terapkan ke Semua (${questions.length}) Soal`}
                </span>
              </button>
            </div>
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

      {/* Modal Hapus Soal Terpilih Secara Kolektif */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={confirmDeleteBulkQuestions}
        title="Hapus Butir Soal Terpilih"
        message={`Apakah Anda yakin ingin menghapus ${selectedQIds.length} butir soal yang dipilih? Tindakan ini akan menghapus soal-soal tersebut secara permanen dari server.`}
        confirmText={`Ya, Hapus (${selectedQIds.length}) Soal`}
        variant="danger"
        isLoading={bulkDeleting}
      />

      {/* Modal Kosongkan Seluruh Butir Soal */}
      <ConfirmModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={confirmDeleteAllQuestions}
        title="Kosongkan Semua Butir Soal"
        message={`PERINGATAN KRUSIAL: Anda akan menghapus SELURUH ${questions.length} butir soal dalam paket ujian ini. Seluruh butir soal dan opsi jawabannya akan dikosongkan secara permanen. Apakah Anda yakin ingin melanjutkan?`}
        confirmText="Ya, Kosongkan Semua Soal"
        variant="danger"
        isLoading={bulkDeleting}
      />

      {/* Modal Reset Attempt Siswa */}
      <ConfirmModal
        isOpen={isDeleteAttemptModal}
        onClose={() => {
          setIsDeleteAttemptModal(false);
          setDeleteAttemptId(null);
        }}
        onConfirm={confirmDeleteAttempt}
        title="⚠️ Hapus Riwayat & Ulang Ujian dari Awal"
        message="PERINGATAN: Seluruh jawaban siswa ini akan dihapus permanen dari server dan siswa harus memasukkan token baru dari awal. Catatan: Jika siswa hanya terkunci pelanggaran tata tertib (Strike 2), gunakan tombol 'Buka Kunci P2' agar siswa bisa melanjutkan ujian tanpa kehilangan jawaban."
        confirmText="Ya, Hapus dan Mulai dari Awal"
        variant="danger"
        isLoading={loading}
      />

      {/* Modal Buka Suspend Siswa (Strike 3) */}
      <ConfirmModal
        isOpen={!!unblockStrike3Target}
        onClose={() => setUnblockStrike3Target(null)}
        onConfirm={handleExecuteUnblockSingle}
        title="Buka Suspend Siswa?"
        message={
          unblockStrike3Target ? (
            <div className="space-y-2 text-left">
              <p>Buka suspend akun CBT untuk siswa <strong>&quot;{unblockStrike3Target.studentName}&quot;</strong>?</p>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <div>✓ Status blokir langsung dicabut di server.</div>
                <div>✓ Layar ujian siswa otomatis terbuka seketika.</div>
                <div>✓ Jawaban siswa dijamin 100% aman dan tidak hilang.</div>
              </div>
            </div>
          ) : ''
        }
        confirmText="Ya, Buka Suspend"
        variant="success"
        isLoading={actionLoading}
      />

      {/* Modal Buka Suspend SEMUA Siswa Sekaligus */}
      <ConfirmModal
        isOpen={isUnblockAllModalOpen}
        onClose={() => setIsUnblockAllModalOpen(false)}
        onConfirm={handleExecuteUnblockAll}
        title="Buka Suspend Semua Siswa Sekaligus?"
        message="PERINGATAN: Seluruh siswa yang saat ini tersuspend (Strike 3) dalam paket ujian ini akan langsung dibuka aksesnya secara bersamaan. Siswa dapat langsung melanjutkan ujian tanpa kehilangan jawaban."
        confirmText="Ya, Buka Semua Sekarang"
        variant="success"
        isLoading={unblockingAll}
      />

      {/* Modal Buka Kunci P2 (Strike 2) */}
      <ConfirmModal
        isOpen={!!unlockStrike2Target}
        onClose={() => setUnlockStrike2Target(null)}
        onConfirm={handleExecuteUnlockStrike2}
        title="Buka Kunci Layar Siswa (Strike 2)?"
        message={
          unlockStrike2Target ? (
            <p>Buka kunci layar ujian untuk siswa <strong>&quot;{unlockStrike2Target.studentName}&quot;</strong>? Layar ujian siswa akan langsung terbuka kembali untuk melanjutkan pengerjaan soal.</p>
          ) : ''
        }
        confirmText="Ya, Buka Kunci Layar"
        variant="warning"
        isLoading={actionLoading}
      />

      {/* 🚀 Floating Cyber Toast Notification */}
      {cbtToast && (
        <div className="fixed top-6 right-6 z-50 w-full max-w-md px-3 animate-in slide-in-from-top-3 fade-in duration-300">
          <div
            className={`p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all relative overflow-hidden ${
              cbtToast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-500/25'
                : 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-500/25'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                cbtToast.type === 'success'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-500/20'
                  : 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-500/20'
              }`}
            >
              {cbtToast.type === 'success' ? (
                <ShieldCheck size={22} className="animate-pulse" />
              ) : (
                <AlertTriangle size={22} className="animate-pulse" />
              )}
            </div>
            <div className="flex-1 pr-2 pt-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black tracking-tight">
                  {cbtToast.type === 'success' ? 'Dispensasi Diberikan! 🎉' : 'Pemberitahuan Sistem'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    cbtToast.type === 'success'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {cbtToast.type === 'success' ? 'SUKSES' : 'PERHATIAN'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {cbtToast.text}
              </p>
            </div>
            <button
              onClick={() => setCbtToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Tutup notifikasi"
            >
              <X size={16} />
            </button>
            <div
              className={`absolute bottom-0 left-0 h-1 w-full ${
                cbtToast.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                  : 'bg-gradient-to-r from-rose-500 to-amber-300'
              }`}
            />
          </div>
        </div>
      )}

      {/* 📺 WHITEBOARD PROJEKTOR LAYAR PENUH (PAPAN TULIS KELAS) */}
      {isWhiteboardModalOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col justify-between p-8 sm:p-14 text-white overflow-y-auto animate-fade-in font-sans">
          
          {/* Top Bar Proyektor */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-emerald-500 animate-ping"></span>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  SMART CBT • SESI UJIAN AKTIF (LIVE)
                </span>
                <h2 className="text-2xl font-black tracking-tight">{exam.title}</h2>
              </div>
            </div>

            <button
              onClick={() => setIsWhiteboardModalOpen(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer border border-white/20 shadow-xs"
            >
              <Minimize2 size={16} /> Keluar Layar Penuh (ESC)
            </button>
          </div>

          {/* Central Whiteboard Giant Token */}
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <MonitorPlay size={16} /> Token Resmi Ujian
            </div>

            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border-4 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 max-w-xl w-full text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 pointer-events-none"></div>
              
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                Masukkan Kode Token Ini di Portal Siswa
              </div>

              <div className="text-6xl sm:text-7xl font-black font-mono tracking-widest text-white selection:bg-emerald-500">
                {examToken || 'SMK2026'}
              </div>

              {/* 🔄 Dynamic 10-Minute Timer on Projector Screen */}
              <div className="mt-6 max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <RefreshCw size={13} className={isRotatingToken ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
                    Token diperbarui otomatis dalam:
                  </span>
                  <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                    tokenTimer <= 60
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {Math.floor(tokenTimer / 60).toString().padStart(2, '0')}:{(tokenTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 rounded-full ${
                      tokenTimer <= 60 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${(tokenTimer / 600) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="group px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 shadow-sm cursor-pointer"
                >
                  {copiedToken ? <Check size={16} /> : <Copy size={16} className="group-hover:scale-115 transition-transform duration-200" />}
                  <span>{copiedToken ? 'Token Tersalin!' : 'Salin Token'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRotateToken()}
                  disabled={isRotatingToken}
                  className="group px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20 cursor-pointer disabled:opacity-50"
                  title="Generate token baru sekarang"
                >
                  <RefreshCw size={14} className={isRotatingToken ? 'animate-spin text-emerald-400' : 'group-hover:rotate-180 transition-transform duration-500'} />
                  <span>{isRotatingToken ? 'Memperbarui...' : 'Perbarui Token Sekarang'}</span>
                </button>
              </div>
            </div>

            {/* Exam Meta Info for Students */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mata Pelajaran</div>
                <div className="text-base font-bold text-white mt-1">{exam.subject}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Target Kelas</div>
                <div className="text-base font-bold text-white mt-1">{exam.classTarget}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Alokasi Waktu</div>
                <div className="text-base font-bold text-white mt-1">{exam.duration} Menit</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Siswa Mengerjakan</div>
                <div className="text-base font-bold text-emerald-400 mt-1">{attempts.length} Siswa</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md text-center leading-relaxed">
              ⚠️ Peringatan: Sistem mengaktifkan sensor anti-curang. Pindah tab atau keluar dari halaman ujian akan tercatat otomatis pada monitor guru.
            </p>
          </div>

          {/* Bottom Bar Proyektor */}
          <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-500 font-medium">
            <span>SMK Garuda Mahadhika CBT Live Console</span>
            <span>Tekan tombol di kanan atas untuk kembali ke kontrol guru</span>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL CETAK REKAPITULASI NILAI RESMI UJIAN INI */}
      {isPrintExamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <Printer className="text-purple-600" size={20} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Pratinjau Lembar Rekap Nilai Resmi Ujian CBT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Format cetak resmi standar Dinas Pendidikan & SMK TI GAMA 1 BEKASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintExamModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-black font-serif">
              <div id="cbt-printable-exam-detail-report" className="space-y-4 bg-white text-black">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="DAFTAR NILAI & REKAPITULASI HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / CBT-NILAI / ${new Date().getFullYear()} / ${exam.id.slice(0, 8).toUpperCase()}`}
                  subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
                />

                {/* 📋 METADATA LAPORAN */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Mata Pelajaran</span>
                    <span>: <strong>{exam.subject}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Target / Rombel</span>
                    <span>: <strong>{resultJurusanFilter !== 'ALL' ? `${getJurusanFullName(resultJurusanFilter)} (${resultJurusanFilter})` : formatClassTargetDisplay(exam.classTarget)}{resultClassFilter !== 'ALL' ? ` • Kelas: ${resultClassFilter}` : ''}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Paket Ujian CBT</span>
                    <span>: {exam.title}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Standar KKM Sekolah</span>
                    <span>: <strong>75.00</strong> (Kriteria Ketuntasan Minimal)</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Guru / Pengampu</span>
                    <span>: <strong>{exam.authorName || 'Guru Mata Pelajaran'}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Alokasi Soal & Waktu</span>
                    <span>: {exam.questions.length} Butir Soal • {exam.duration} Menit</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Waktu Cetak</span>
                    <span>: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* 📊 TABEL NILAI RESMI */}
                <table className="w-full text-left border-collapse border border-black text-[10px] sm:text-xs">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black text-black font-bold uppercase text-center tracking-tight">
                      <th className="py-2 px-1 border-r border-black w-8">No</th>
                      <th className="py-2 px-2 border-r border-black w-24">NIS / NISN</th>
                      <th className="py-2 px-3 border-r border-black text-left">Nama Lengkap Siswa</th>
                      <th className="py-2 px-2 border-r border-black w-20">Kelas</th>
                      <th className="py-2 px-2 border-r border-black w-16">Benar</th>
                      <th className="py-2 px-2 border-r border-black w-16">Nilai</th>
                      <th className="py-2 px-2 border-r border-black w-14">Grade</th>
                      <th className="py-2 px-2 border-r border-black w-20">Status</th>
                      <th className="py-2 px-2">Integritas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/40">
                    {filteredAttempts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                          Belum ada data pengerjaan siswa yang sesuai dengan filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredAttempts.map((att: AttemptItem, idx: number) => {
                        const isTuntas = att.score >= 75;
                        let grade = 'C';
                        if (att.score >= 90) grade = 'A';
                        else if (att.score >= 80) grade = 'B';
                        else if (att.score >= 75) grade = 'C+';
                        else if (att.score >= 60) grade = 'C';
                        else grade = 'D';

                        return (
                          <tr key={att.id} className="text-center print-avoid-break">
                            <td className="py-1.5 px-1 border-r border-black font-bold">{idx + 1}</td>
                            <td className="py-1.5 px-2 border-r border-black font-mono font-medium text-[10px]">{att.studentNis || '-'}</td>
                            <td className="py-1.5 px-3 border-r border-black text-left font-semibold uppercase">{att.studentName}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{att.studentClass || exam.classTarget}</td>
                            <td className="py-1.5 px-2 border-r border-black font-semibold">{att.totalCorrect} / {att.totalQuestions}</td>
                            <td className="py-1.5 px-2 border-r border-black font-black text-sm">{Math.round(att.score)}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{grade}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold text-[10px]">
                              {isTuntas ? (
                                <span className="text-emerald-800">TUNTAS</span>
                              ) : (
                                <span className="text-rose-800">REMEDIAL</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-[9px]">
                              {att.tabSwitchCount === 0 ? 'Tertib' : `⚠️ ${att.tabSwitchCount}x Tab`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredAttempts.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-black text-[10px] sm:text-xs">
                        <td colSpan={4} className="py-2 px-3 text-right border-r border-black">
                          Statistik Nilai ({filteredAttempts.length} Siswa):
                        </td>
                        <td className="py-2 px-2 text-center border-r border-black">
                          Rata-rata:
                        </td>
                        <td className="py-2 px-2 text-center border-r border-black font-black text-sm text-purple-900">
                          {Math.round((filteredAttempts.reduce((a: number, b: AttemptItem) => a + b.score, 0) / filteredAttempts.length) * 10) / 10}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-black font-black">
                          {Math.round((filteredAttempts.reduce((a: number, b: AttemptItem) => a + b.score, 0) / filteredAttempts.length)) >= 75 ? 'TUNTAS' : 'REMED'}
                        </td>
                        <td colSpan={2} className="py-2 px-2 text-center font-bold">
                          {Math.round((filteredAttempts.filter((a: AttemptItem) => a.score >= 75).length / filteredAttempts.length) * 100)}% Kelulusan ({filteredAttempts.filter((a: AttemptItem) => a.score >= 75).length} Tuntas / {filteredAttempts.filter((a: AttemptItem) => a.score < 75).length} Remedial)
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* 🔒 KEABSAHAN SISTEM CBT */}
                <CbtSecurityValidationBox
                  examTitle={exam.title}
                />

                {/* 🖋️ TANDA TANGAN 3 PIHAK */}
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={exam.authorName || 'Guru Mata Pelajaran'}
                  subjectName={exam.subject}
                  classNameTarget={exam.classTarget}
                  mode="three-column"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintExamModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/25 cursor-pointer"
              >
                <Printer size={15} /> Cetak Rekap Nilai Resmi (PDF / Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 MODAL OPSI UNDUH NILAI EXCEL / CSV PER JURUSAN & ROMBEL */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Unduh Rekap Nilai Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih format pengunduhan nilai per jurusan atau per rombel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Opsi 1: Unduh Tampilan Aktif Saat Ini */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Unduh Sesuai Filter Layar
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                    {filteredAttempts.length} Siswa
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {resultJurusanFilter !== 'ALL' ? (
                    <>Jurusan terpilih: <strong>{getJurusanFullName(resultJurusanFilter)} ({resultJurusanFilter})</strong></>
                  ) : (
                    <>Mencakup <strong>Semua Jurusan</strong></>
                  )}
                  {resultClassFilter !== 'ALL' && <> • Rombel: <strong>{resultClassFilter}</strong></>}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCsv();
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileDown size={14} /> Unduh CSV Sesuai Filter ({filteredAttempts.length} Siswa)
                </button>
              </div>

              {/* Opsi 2: Batch Download Semua Jurusan Terpisah */}
              {availableJurusans.length > 1 && (
                <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderDown className="text-purple-600 dark:text-purple-400" size={16} />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        ⚡ Unduh Terpisah Semua Jurusan Sekaligus
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-600 text-white">
                      {availableJurusans.length} Jurusan
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Sistem akan otomatis mengunduh <strong>{availableJurusans.length} file CSV terpisah</strong> (masing-masing jurusan 1 file) secara berurutan. Cocok untuk laporan per program keahlian.
                  </p>
                  <button
                    type="button"
                    onClick={handleBatchDownloadAllJurusans}
                    className="w-full mt-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderDown size={14} /> Unduh Terpisah ({availableJurusans.length} File Sekaligus)
                  </button>
                </div>
              )}

              {/* Opsi 3: Unduh Cepat 1-Klik Khusus Jurusan Tertentu */}
              {availableJurusans.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Unduh Satuan Per Jurusan (1-Klik):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableJurusans.map((jur: JurusanOption) => {
                      const jurAttempts = attempts.filter((a: AttemptItem) => {
                        const code = extractJurusanCode(a.studentClass) || 'LAINNYA';
                        return code === jur.code;
                      });

                      return (
                        <button
                          key={jur.code}
                          type="button"
                          onClick={() => {
                            handleExportCsv(jurAttempts, `_Jurusan_${jur.code}`);
                            setIsDownloadModalOpen(false);
                          }}
                          className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block group-hover:text-purple-600 transition">
                              {jur.code}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-[170px]">
                              {jur.name}
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-purple-100 group-hover:text-purple-700 transition">
                            {jurAttempts.length} Siswa
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Opsi 4: Unduh Seluruh 1 Angkatan Penuh */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleExportCsv(attempts, '_Semua_Siswa_Satu_Angkatan');
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Unduh Gabungan Seluruh 1 Angkatan ({attempts.length} Siswa)
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL PERINGATAN / NOTIFIKASI KETIDAKSESUAIAN JADWAL RILIS TOKEN */}
      {scheduleNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Pemberitahuan Waktu Ujian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rilis token / sesi dilakukan di luar jadwal resmi paket ujian
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Paket Ujian:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[240px]">
                  {exam.title}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {exam.subject} ({formatClassTargetDisplay(exam.classTarget, true)})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Jadwal Resmi:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {scheduleNoticeModal.scheduledRangeText}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Sekarang:</span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                  {scheduleNoticeModal.formattedCurrentTime}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium text-[11px] leading-relaxed">
                {scheduleNoticeModal.message}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Zap size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Ujian Tetap Bisa Dilakukan:</strong> Notifikasi ini bertujuan untuk memastikan pengawas mengetahui kesesuaian waktu ujian. Ujian tetap dapat dikerjakan siswa (misalnya untuk ujian susulan, remedial, atau penyesuaian waktu oleh pengawas).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal / Cek Jadwal
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduleNoticeModal(null);
                  handleToggleSession(true, true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Tetap Buka Sesi Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 MODAL GENERATOR & PEMBUAT TABEL SOAL FLEKSIBEL */}
      <CbtTableBuilderModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsertTable={handleInsertTable}
      />

      {/* Global Print Styles for Exam Detail */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cbt-printable-exam-detail-report, #cbt-printable-exam-detail-report * {
            visibility: visible !important;
          }
          #cbt-printable-exam-detail-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10mm 12mm !important;
            font-size: 10.5pt !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
