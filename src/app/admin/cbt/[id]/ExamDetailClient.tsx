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
  Sliders,
  FileUp,
  Layers,
  Info
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { createQuestion, deleteQuestion, deleteAttempt, toggleExamSession, createBatchQuestions, updateQuestion } from '../actions';

interface ParsedQuestion {
  questionText: string;
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

  const rawLines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Filter out Excel delimiter hints like "sep=;"
  const lines = rawLines.filter((l) => !l.toLowerCase().startsWith('sep='));

  // Detect if content is Delimited (CSV or Tab-Separated from Excel copy-paste)
  const isDelimited = lines.some((l) => {
    if (l.startsWith('#')) return false;
    return l.split(';').length >= 5 || l.split('\t').length >= 5 || (l.split(',').length >= 5 && l.includes('"'));
  });

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

      if (hasHeader && colQ !== -1 && colA !== -1) {
        qText = parts[colQ] || '';
        optA = parts[colA] || '';
        optB = parts[colB] || '';
        optC = parts[colC] || '';
        optD = parts[colD] || '';
        optE = colE !== -1 ? parts[colE] || '' : '';
        keyRaw = colKey !== -1 ? parts[colKey] || 'A' : 'A';
        pt = colPoints !== -1 && parts[colPoints] ? parseInt(parts[colPoints], 10) || defaultPoints : defaultPoints;
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
          pt = parts[offset + 7] ? parseInt(parts[offset + 7], 10) || defaultPoints : defaultPoints;
        } else {
          keyRaw = parts[offset + 5] || 'A';
          pt = parts[offset + 6] ? parseInt(parts[offset + 6], 10) || defaultPoints : defaultPoints;
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

    const optionRegex = /^(?:(?:\(?([A-Ea-e])[\.\)]|\(([A-Ea-e])\))|\b([A-Ea-e])\.\s+)\s*(.*)/;
    const keyRegex = /^(?:Kunci|Jawaban|Ans|Key|Kunci\s*Jawaban|Jawaban\s*Benar)[\s\:\=\-]+([A-Ea-e]|\d)\b/i;
    const pointsRegex = /^(?:Poin|Nilai|Bobot|Score|Points)[\s\:\=\-]+(\d+)\b/i;

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
        points = parseInt(pMatch[1], 10) || defaultPoints;
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

  // Session Dual-Key state
  const [examStatus, setExamStatus] = useState(exam.status || 'PUBLISHED');
  const [examToken, setExamToken] = useState(exam.token || '');
  const [togglingSession, setTogglingSession] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [resultSearch, setResultSearch] = useState('');

  const handleToggleSession = async (open: boolean) => {
    setTogglingSession(true);
    const res = await toggleExamSession(exam.id, open, examToken);
    if (res.success && res.data) {
      setExamStatus(res.data.status);
      if (res.data.token) setExamToken(res.data.token);
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian.');
    }
    setTogglingSession(false);
  };

  const handleCopyToken = () => {
    if (!examToken) return;
    navigator.clipboard.writeText(examToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleExportCsv = () => {
    if (attempts.length === 0) {
      alert('Belum ada data nilai siswa untuk diunduh.');
      return;
    }
    const headers = ['No', 'Nama Siswa', 'NIS', 'Kelas', 'Nilai Akhir', 'Benar', 'Total Soal', 'Pelanggaran Tab Switch', 'Status'];
    const rows = attempts.map((att, index) => [
      index + 1,
      `"${att.studentName.replace(/"/g, '""')}"`,
      `"${(att.studentNis || '').replace(/"/g, '""')}"`,
      `"${(att.studentClass || '').replace(/"/g, '""')}"`,
      att.score,
      att.totalCorrect,
      att.totalQuestions,
      att.tabSwitchCount,
      att.status === 'SUBMITTED' ? 'Selesai' : 'Sedang Ujian',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      setQuestions([...questions, ...res.data]);
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

3. Protokol jaringan yang digunakan untuk pengiriman web terenkripsi dan aman adalah...
A. HTTP
B. FTP
C. HTTPS
D. SMTP
Kunci: C
Poin: 15

4. Perangkat jaringan yang berfungsi membagi jaringan ke beberapa subnet adalah...
A. Repeater
B. Hub
C. Switch
D. Router
Kunci: D
Poin: 15`;

    setBatchRawText(example);
    setBatchError(null);
  };

  const handleDownloadCsvTemplate = (format: 'csv' | 'txt' = 'csv') => {
    if (format === 'txt') {
      const txtContent = `PANDUAN PENGISIAN SOAL CBT (FORMAT TEKS / MICROSOFT WORD):
1. Tuliskan nomor soal (1., 2., dst.) diikuti teks pertanyaan.
2. Tuliskan pilihan jawaban (A., B., C., D., opsional E.).
3. Tuliskan "Kunci: [A/B/C/D]" untuk menentukan jawaban yang benar.
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

2. Tag HTML yang digunakan untuk membuat tautan atau hyperlink ke halaman lain adalah...
A. <link>
B. <a>
C. <href>
D. <url>
Kunci: B
Poin: 10

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
      '# 4. TIPS CEPAT: Setelah selesai mengisi di Excel, Anda bisa langsung blok tabelnya (Ctrl+A), tekan Copy (Ctrl+C), lalu Paste (Ctrl+V) ke kotak teks di web CBT!',
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
      ['4', '"Perangkat jaringan komputer yang berfungsi menghubungkan dua atau lebih subnet/jaringan yang berbeda adalah..."', '"Repeater"', '"Hub"', '"Switch"', '"Router"', '""', 'D', '15', '"Perangkat Keras"'],
      ['5', '"Bahasa pemrograman web yang dieksekusi di sisi peramban (client-side) untuk membuat animasi dan interaksi adalah..."', '"PHP"', '"Python"', '"JavaScript"', '"Ruby"', '""', 'C', '10', '"Frontend"'],
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
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editOptions, setEditOptions] = useState(['', '', '', '']);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('0');
  const [editPoints, setEditPoints] = useState(10);

  const handleOpenEditModal = (q: QuestionItem) => {
    setEditingQId(q.id);
    setEditQuestionText(q.questionText);
    try {
      const parsed = JSON.parse(q.options);
      setEditOptions(Array.isArray(parsed) && parsed.length >= 4 ? parsed : ['', '', '', '']);
    } catch {
      setEditOptions(['', '', '', '']);
    }
    setEditCorrectAnswer(q.correctAnswer || '0');
    setEditPoints(q.points || 10);
    setIsEditQModal(true);
  };

  const handleSaveEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQId) return;
    if (editOptions.some(opt => !opt.trim())) {
      alert('Semua pilihan jawaban A, B, C, D harus diisi!');
      return;
    }

    setLoading(true);
    const res = await updateQuestion(editingQId, exam.id, {
      questionText: editQuestionText,
      options: editOptions,
      correctAnswer: editCorrectAnswer,
      points: editPoints,
    });

    if (res.success && res.data) {
      setQuestions(questions.map(q => q.id === editingQId ? res.data : q));
      setIsEditQModal(false);
      setEditingQId(null);
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
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30'
              }`}>
                {examStatus === 'ACTIVE' ? 'Sesi Ujian Aktif (Live)' : 'Ruang Tunggu Siswa (Standby)'}
              </span>
              <span className="text-xs text-slate-500">
                • Target: <strong>{exam.classTarget}</strong>
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {examStatus === 'ACTIVE'
                ? 'Sesi Ujian Sedang Berlangsung di Kelas'
                : 'Sesi Ujian Masih Ditutup (Siswa Berada di Ruang Tunggu)'}
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {examStatus === 'ACTIVE'
                ? 'Siswa di dalam kelas dapat memasukkan token di samping ini untuk mulai mengerjakan soal. Siswa di luar kelas atau di rumah tidak akan bisa mengerjakan jika tidak mengetahui token fisik ini.'
                : 'Siswa yang mengakses ujian saat ini berada di Ruang Tunggu dan belum bisa mengakses soal atau memasukkan token. Buka sesi ketika jam ujian dimulai di kelas.'}
            </p>
          </div>

          {/* Right Action / Token Display */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {examStatus === 'ACTIVE' ? (
              <>
                {/* Big Whiteboard Token Card */}
                <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl p-3 px-5 text-center shadow-md">
                  <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    Token Papan Tulis Kelas
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-2xl font-black font-mono tracking-widest text-slate-900 dark:text-white">
                      {examToken || 'RPL2026'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      title="Salin Token"
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                    >
                      {copiedToken ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWhiteboardModalOpen(true)}
                    className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Maximize2 size={14} />
                    <span>Mode Proyektor (Layar Penuh)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSession(false)}
                    disabled={togglingSession}
                    className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Square size={14} className="fill-white" />
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
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play size={14} className="fill-white" />
                  <span>{togglingSession ? 'Membuka Sesi...' : 'Buka Sesi Ujian & Tampilkan Token'}</span>
                </button>
              </div>
            )}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Butir Soal</h2>
              <p className="text-xs text-slate-500">Total Nilai Maksimal: {totalPoints} Poin • {questions.length} Butir Soal</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadCsvTemplate('csv')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
                title="Unduh Template Excel CSV Resmi dengan Kolom Siap Isi"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Unduh Template CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchStep('input');
                  setIsBatchModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <UploadCloud size={16} /> Input Kolektif (Batch)
              </button>
              <button
                type="button"
                onClick={() => setIsAddQuestionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} /> Tambah Soal Manual
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <HelpCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-500 font-medium">Belum ada butir soal dalam paket ujian ini.</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleDownloadCsvTemplate('csv')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" /> Unduh Template CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchStep('input');
                    setIsBatchModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer"
                >
                  <UploadCloud size={16} /> Input Soal Kolektif (Batch)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-purple-500/25 cursor-pointer"
                >
                  <Plus size={16} /> Tambah Soal Manual
                </button>
              </div>
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(q)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Edit Soal & Bobot Nilai"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteQId(q.id);
                            setIsDeleteQModal(true);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Soal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rekap Nilai Siswa</h2>
              <p className="text-xs text-slate-500">
                Memantau nilai akhir, durasi pengerjaan, dan catatan pelanggaran anti-curang (tab-switch).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Cari siswa atau NIS..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Unduh CSV / Excel
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Cetak Nilai
              </button>
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
                    {attempts
                      .filter((att) =>
                        att.studentName.toLowerCase().includes(resultSearch.toLowerCase()) ||
                        (att.studentNis && att.studentNis.toLowerCase().includes(resultSearch.toLowerCase())) ||
                        (att.studentClass && att.studentClass.toLowerCase().includes(resultSearch.toLowerCase()))
                      )
                      .map((att) => (
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
                        {parsedBatch.reduce((sum, q) => sum + q.points, 0)} Poin
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex flex-col justify-between">
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Setel Bobot Seragam</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          defaultValue={batchDefaultPoints}
                          id="bulkPointInput"
                          className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-blue-300 bg-white dark:bg-slate-900 dark:border-blue-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number((document.getElementById('bulkPointInput') as HTMLInputElement)?.value) || 10;
                            handleApplyPointsToAllParsed(val);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                        >
                          Terapkan ke Semua
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
                                min="1"
                                max="100"
                                value={item.points}
                                onChange={(e) => handleUpdateParsedItemPoints(idx, Number(e.target.value) || 1)}
                                className="w-14 px-1.5 py-0.5 text-center font-bold text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="text-[11px] text-slate-500">Poin</span>
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

                        <div className="text-sm font-medium text-slate-900 dark:text-white whitespace-pre-wrap pl-9">
                          {item.questionText}
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-1">
                          {item.options.map((opt, oIdx) => {
                            const isCorrect = String(oIdx) === item.correctAnswer;
                            const label = String.fromCharCode(65 + oIdx);
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleUpdateParsedItemKey(idx, String(oIdx))}
                                className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                                    isCorrect ? 'bg-white text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {label}
                                  </span>
                                  <span>{opt}</span>
                                </span>
                                {isCorrect && <Check size={14} className="text-white flex-shrink-0" />}
                              </button>
                            );
                          })}
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
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-100"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleParseBatch}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 transition cursor-pointer"
                  >
                    <Search size={16} /> Analisis & Pratinjau Butir Soal →
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setBatchStep('input')}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-100 cursor-pointer"
                  >
                    ← Kembali Edit Teks
                  </button>

                  <button
                    type="button"
                    disabled={batchLoading || parsedBatch.length === 0}
                    onClick={handleSaveBatchQuestions}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25 transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle size={16} />
                    {batchLoading
                      ? 'Sedang Menyimpan...'
                      : `Simpan Semua Soal (${parsedBatch.length} Butir Soal)`}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 size={18} className="text-purple-600 dark:text-purple-400" />
                Edit Butir Soal & Bobot Nilai
              </h3>
              <button
                type="button"
                onClick={() => setIsEditQModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditQuestion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pertanyaan / Isi Soal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan pertanyaan soal ujian di sini..."
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilihan Jawaban (A, B, C, D) & Tentukan Kunci Jawaban Benar <span className="text-red-500">*</span>
                </label>

                {editOptions.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isChecked = editCorrectAnswer === String(idx);

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
                        name="editCorrectAnswerOption"
                        checked={isChecked}
                        onChange={() => setEditCorrectAnswer(String(idx))}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-sm w-5">{label}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Teks pilihan jawaban ${label}...`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...editOptions];
                          updated[idx] = e.target.value;
                          setEditOptions(updated);
                        }}
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
                    Bobot Nilai / Poin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Nilai yang didapat siswa jika menjawab benar.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditQModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20"
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
                {examToken || 'RPL2026'}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedToken ? 'Token Tersalin!' : 'Salin Token'}</span>
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
    </div>
  );
}
