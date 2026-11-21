'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle,
  CheckCircle2, 
  Key, 
  ExternalLink, 
  AlertCircle,
  FileCheck2,
  Award,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  Calendar,
  AlertTriangle,
  Layers,
  Download,
  Upload,
  CheckSquare,
  Settings2,
  ArrowRight,
  Save,
  X,
  FileSpreadsheet,
  CheckCheck,
  Zap,
  RotateCcw,
  CreditCard,
  Globe,
  Activity,
  MapPin,
  Printer,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox,
  CbtPrintModalWrapper 
} from '@/components/cbt/CbtOfficialPrintComponents';
import ConfirmModal from '@/components/ConfirmModal';
import CbtParticipantCardModal from '@/components/cbt/CbtParticipantCardModal';
import CbtDownloadBankSoalModal from '@/components/cbt/CbtDownloadBankSoalModal';
import { 
  createExam, 
  updateExam, 
  deleteExam, 
  toggleExamSession, 
  checkExamScheduleConflict, 
  ScheduleConflictExam,
  batchUpdateExamSchedules,
  batchCreateExamsWithSchedule,
  saveCbtTimezone,
  exportExamQuestionsAction
} from './actions';
import { 
  generateExamQuestionsCsv,
  triggerBrowserDownload,
  ExportableQuestionItem
} from '@/lib/cbt-bank-soal';
import { 
  formatExamScheduleRange, 
  getExamScheduleDetails,
  getExamScheduleState, 
  isExamTokenActive,
  ExamTokenStatus,
  checkScheduleDiscrepancy,
  ScheduleDiscrepancyResult,
  toDateTimeLocalInput,
  parseDateTimeInputToIso,
  addDurationToDateTimeInput,
  getPresetDateTimeInTimezone,
  formatScheduleTime,
  formatScheduleDate,
  formatClassTargetDisplay,
  isClassOverlap,
  parseClassTargets,
  CbtTimezone,
  DEFAULT_CBT_TIMEZONE
} from '@/lib/cbt-schedule';
import { RELIGION_OPTIONS, getReligionConfig, isReligiousVariantParallel, normalizeReligion, ReligionCode } from '@/lib/cbt-religion';
import CbtReportView from './CbtReportView';
import CbtProctorPlottingView, { TeacherUserItem } from './CbtProctorPlottingView';
import CbtSuspendCenterView from './CbtSuspendCenterView';
import CbtStudentLoginMonitorView from './CbtStudentLoginMonitorView';
import { KopSuratConfig } from '@/app/admin/settings/types';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { SuspendedStudentItem } from './actions';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status: string;
  targetReligion?: string | null;
  shuffleQuestions: boolean;
  authorName: string | null;
  proctorId?: string | null;
  proctorName?: string | null;
  proctorNip?: string | null;
  proctor2Id?: string | null;
  proctor2Name?: string | null;
  roomName?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  _count: {
    questions: number;
    attempts: number;
  };
  attempts: {
    id?: string;
    studentName?: string;
    studentNis?: string | null;
    studentClass?: string | null;
    score: number;
    totalQuestions?: number;
    totalCorrect?: number;
    status: string;
    tabSwitchCount?: number;
    extraTimeMinutes?: number;
    isBlocked?: boolean;
    startedAt?: Date | string;
    submittedAt?: Date | string | null;
  }[];
}

interface CbtDashboardProps {
  exams: ExamItem[];
  currentUser?: {
    name: string;
    role: string;
  };
  initialTab?: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend' | 'logins';
  dynamicClassPresets?: string[];
  dynamicSubjectPresets?: string[];
  kopSuratConfig?: KopSuratConfig;
  teachers?: TeacherUserItem[];
  initialTimezone?: CbtTimezone;
  initialSuspendedStudents?: SuspendedStudentItem[];
}

export default function CbtDashboard({
  exams: initialExams,
  currentUser,
  initialTab = 'exams',
  dynamicClassPresets,
  dynamicSubjectPresets,
  kopSuratConfig,
  teachers = [],
  initialTimezone,
  initialSuspendedStudents = [],
}: CbtDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exams, setExams] = useState(initialExams);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [mineOnlyFilter, setMineOnlyFilter] = useState(false);
  const [adminTeacherFilter, setAdminTeacherFilter] = useState('ALL');
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);

  const teacherName = currentUser?.name || 'Guru Pengampu';
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';

  // Timezone State (WIB, WITA, WIT)
  const [cbtTimezone, setCbtTimezone] = useState<CbtTimezone>(initialTimezone || DEFAULT_CBT_TIMEZONE);

  // 📚 Daftar Mata Pelajaran unik dari seluruh paket ujian
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.subject && e.subject.trim() !== '') {
        set.add(e.subject.trim());
      }
    });
    return Array.from(set).sort();
  }, [exams]);

  const handleTimezoneChange = async (newTz: CbtTimezone) => {
    if (newTz === cbtTimezone) return;
    setCbtTimezone(newTz);
    // Hanya Super Admin yang dapat menyimpan zona waktu default sekolah secara global ke database
    if (isSuperAdmin) {
      try {
        await saveCbtTimezone(newTz);
      } catch (err) {
        console.error('Gagal menyimpan zona waktu CBT:', err);
      }
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [isCustomClassTarget, setIsCustomClassTarget] = useState(false);
  const [classTargetMode, setClassTargetMode] = useState<'preset' | 'multi' | 'custom'>('preset');
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isParticipantCardModalOpen, setIsParticipantCardModalOpen] = useState(false);

  const unassignedProctorsCount = exams.filter(e => !e.proctorName).length;

  // Helper pencocokan kepemilikan author / guru pengampu
  const isAuthorMatch = (author?: string | null) => {
    if (!author || !currentUser?.name) return false;
    const a = author.trim().toLowerCase();
    const c = currentUser.name.trim().toLowerCase();
    return a === c || a.includes(c) || c.includes(a);
  };

  // Helper kepemilikan paket ujian & peran pengawas
  const isExamOwner = (exam: ExamItem) => {
    if (isSuperAdmin) return true;
    return isAuthorMatch(exam.authorName);
  };

  const isExamProctor = (exam: ExamItem) => {
    if (isSuperAdmin) return false;
    if (isAuthorMatch(exam.authorName)) return false; // Jika guru adalah pembuat paketnya, dia adalah owner
    return isAuthorMatch(exam.proctorName) || isAuthorMatch(exam.proctor2Name);
  };

  // 📥 Studio Unduh & Cadangan Bank Soal (Format Siap Upload & Backup)
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    examTitle: string;
    examSubject: string;
    questions: ExportableQuestionItem[];
    totalPoints: number;
  } | null>(null);

  // 🌟 Universal Modern Center Dialog (Alert & Confirm Canggih & Elegan)
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    isAlert?: boolean;
  } | null>(null);

  const showAlert = (
    title: string, 
    message: React.ReactNode, 
    variant: 'danger' | 'warning' | 'info' | 'success' = 'info',
    confirmText: string = 'Mengerti'
  ) => {
    setFeedbackModal({
      isOpen: true,
      title,
      message,
      variant,
      isAlert: true,
      confirmText,
    });
  };

  const showConfirm = ({
    title,
    message,
    variant = 'warning',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    onConfirm,
  }: {
    title: string;
    message: React.ReactNode;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setFeedbackModal({
      isOpen: true,
      title,
      message,
      variant,
      confirmText,
      cancelText,
      onConfirm,
      isAlert: false,
    });
  };

  const handleQuickDownloadExamQuestions = async (examItem: ExamItem) => {
    setDownloadingExamId(examItem.id);
    try {
      const res = await exportExamQuestionsAction(examItem.id);
      if (res.success && res.exam && res.questions) {
        if (res.questions.length === 0) {
          showAlert('Bank Soal Kosong', `Paket ujian "${examItem.title}" belum memiliki butir soal yang diunggah.`, 'warning');
          return;
        }
        setDownloadModalData({
          isOpen: true,
          examTitle: res.exam.title,
          examSubject: res.exam.subject,
          questions: res.questions,
          totalPoints: res.questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0),
        });
      } else {
        showAlert('Gagal Mengunduh', res.error || 'Gagal mengunduh bank soal.', 'danger');
      }
    } catch (err: any) {
      showAlert('Kesalahan Sistem', err?.message || 'Terjadi kesalahan saat mengunduh bank soal.', 'danger');
    } finally {
      setDownloadingExamId(null);
    }
  };

  // Main View Tab: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend' | 'logins'
  const [activeMainTab, setActiveMainTab] = useState<'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend' | 'logins'>(initialTab as any);
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('ALL');

  // 🗂️ Mode Tampilan Matriks Jadwal: 'roster' (Agenda Harian & Sesi) | 'table' (Matriks Tabel Lengkap)
  const [scheduleViewMode, setScheduleViewMode] = useState<'roster' | 'table'>('roster');
  const [isSchedulePrintModalOpen, setIsSchedulePrintModalOpen] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // 👨‍🏫 Filter daftar user Guru khusus untuk kandidat Ketua Panitia Ujian CBT
  const teacherCandidates = useMemo(() => {
    const onlyGuru = teachers.filter((t) => t.role?.toLowerCase() === 'guru');
    if (onlyGuru.length > 0) return onlyGuru;
    const nonAdmin = teachers.filter((t) => t.role !== 'Super Admin' && t.role !== 'Admin Utama');
    return nonAdmin.length > 0 ? nonAdmin : teachers;
  }, [teachers]);

  const [selectedCommitteeTeacherId, setSelectedCommitteeTeacherId] = useState<string>('');
  const [isDownloadingSchedulePdf, setIsDownloadingSchedulePdf] = useState(false);

  useEffect(() => {
    try {
      const savedTeacherId = localStorage.getItem('cbt_committee_head_teacher_id');
      if (savedTeacherId && teachers.some((t) => t.id === savedTeacherId)) {
        setSelectedCommitteeTeacherId(savedTeacherId);
      } else if (teacherCandidates.length > 0) {
        setSelectedCommitteeTeacherId(teacherCandidates[0].id);
      }
    } catch {
      // ignore local storage errors
    }
  }, [teachers, teacherCandidates]);

  const handleSelectCommitteeTeacher = (teacherId: string) => {
    if (!isSuperAdmin) return;
    setSelectedCommitteeTeacherId(teacherId);
    try {
      localStorage.setItem('cbt_committee_head_teacher_id', teacherId);
    } catch {
      // ignore local storage errors
    }
  };

  // 📥 Handler Download File Dokumen Resmi Jadwal Ujian (Standalone Dokumen Siap Kirim & Cetak)
  const handleDownloadScheduleDocument = () => {
    setIsDownloadingSchedulePdf(true);
    try {
      const printableElement = document.getElementById('cbt-printable-official-schedule');
      if (!printableElement) {
        window.print();
        return;
      }

      const cleanSchool = (kopSuratConfig?.schoolName || 'SMK').replace(/[^a-zA-Z0-9]/g, '_');
      const dateStamp = new Date().toISOString().split('T')[0];
      const filename = `Jadwal_Resmi_CBT_${cleanSchool}_${dateStamp}.html`;

      const innerContent = printableElement.innerHTML;

      // Ambil stylesheet aktif dari web app untuk styling sempurna
      const activeStyles = Array.from(document.querySelectorAll('style'))
        .map((el) => `<style>${el.innerHTML}</style>`)
        .join('\n');

      const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jadwal Resmi Pelaksanaan CBT - ${kopSuratConfig?.schoolName || 'SMK'}</title>
  
  <!-- Mesin Tailwind CSS untuk rendering instan -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Stylesheet internal aplikasi -->
  ${activeStyles}

  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0;
      padding: 24px 12px;
      background-color: #f1f5f9;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .cbt-container {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 36px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }
    
    /* 🛑 ATURAN WAJIB GAMBAR & LOGO (AGAR TIDAK PERNAH MEMBESAR / RUSAK) */
    img, svg {
      max-width: 84px !important;
      max-height: 84px !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: inline-block;
    }
    
    /* Action Bar (Hanya tampil di layar, otomatis tersembunyi saat dicetak) */
    .cbt-action-bar {
      max-width: 920px;
      margin: 0 auto 16px auto;
      background: #1e293b;
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .cbt-action-bar button {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
      transition: all 0.2s;
    }
    .cbt-action-bar button:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    /* 🛡️ ATURAN CSS FAIL-SAFE (AGAR SELALU RAPI MESKIPUN OFFLINE) */
    .flex { display: flex !important; }
    .inline-flex { display: inline-flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-row { flex-direction: row !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .justify-center { justify-content: center !important; }
    .justify-between { justify-content: space-between !important; }
    .gap-1 { gap: 4px !important; }
    .gap-1\.5 { gap: 6px !important; }
    .gap-2 { gap: 8px !important; }
    .gap-2\.5 { gap: 10px !important; }
    .gap-3 { gap: 12px !important; }
    .gap-4 { gap: 16px !important; }
    .shrink-0, .flex-shrink-0 { flex-shrink: 0 !important; }

    .grid { display: grid !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    @media (min-width: 640px) {
      .sm\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    }

    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-serif { font-family: 'Times New Roman', Times, serif !important; }
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important; }
    .uppercase { text-transform: uppercase !important; }
    .underline { text-decoration: underline !important; }

    .w-full { width: 100% !important; }
    .w-7 { width: 28px !important; }
    .w-8 { width: 32px !important; }
    .w-14 { width: 56px !important; }
    .w-16 { width: 64px !important; }
    .w-20 { width: 80px !important; }
    .w-24 { width: 96px !important; }
    .w-28 { width: 112px !important; }
    .w-32 { width: 128px !important; }
    .w-36 { width: 144px !important; }
    .w-\[88px\] { width: 88px !important; }
    .h-\[88px\] { height: 88px !important; }
    .max-w-\[82px\] { max-width: 82px !important; }
    .max-h-\[82px\] { max-height: 82px !important; }
    .max-w-\[200px\] { max-width: 200px !important; }
    .max-w-\[220px\] { max-width: 220px !important; }
    .h-20 { height: 80px !important; }

    .space-y-1 > * + * { margin-top: 4px !important; }
    .space-y-1\.5 > * + * { margin-top: 6px !important; }
    .space-y-2 > * + * { margin-top: 8px !important; }
    .space-y-2\.5 > * + * { margin-top: 10px !important; }
    .space-y-3 > * + * { margin-top: 12px !important; }
    .space-y-4 > * + * { margin-top: 16px !important; }
    
    .p-2 { padding: 8px !important; }
    .p-2\.5 { padding: 10px !important; }
    .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
    .px-2\.5 { padding-left: 10px !important; padding-right: 10px !important; }
    .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
    .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
    .py-1\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
    .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
    .pb-3 { padding-bottom: 12px !important; }
    .pt-2 { padding-top: 8px !important; }
    .pt-6 { padding-top: 24px !important; }

    .border { border: 1px solid #cbd5e1 !important; }
    .border-b { border-bottom: 1px solid #e2e8f0 !important; }
    .border-b-2 { border-bottom: 2px solid #000000 !important; }
    .border-b-4 { border-bottom: 4px double #000000 !important; }
    .border-l-4 { border-left: 4px solid #0f172a !important; }
    .border-slate-200 { border-color: #e2e8f0 !important; }
    .border-slate-300 { border-color: #cbd5e1 !important; }
    .border-slate-800 { border-color: #1e293b !important; }
    .rounded-lg { border-radius: 8px !important; }
    .rounded-xl { border-radius: 12px !important; }

    .bg-white { background-color: #ffffff !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .bg-slate-50\/60 { background-color: rgba(248, 250, 252, 0.6) !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-blue-50\/70 { background-color: rgba(239, 246, 255, 0.7) !important; }
    .bg-amber-100 { background-color: #fef3c7 !important; }
    .text-slate-900 { color: #0f172a !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-500 { color: #64748b !important; }
    .text-blue-900 { color: #1e3a8a !important; }
    .text-amber-600 { color: #d97706 !important; }
    .text-amber-900 { color: #78350f !important; }
    .italic { font-style: italic !important; }
    .block { display: block !important; }
    .whitespace-nowrap { white-space: nowrap !important; }
    .relative { position: relative !important; }
    .absolute { position: absolute !important; }

    /* Table & Print Styling */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 8px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: middle;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .print-avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      .cbt-action-bar {
        display: none !important;
      }
      .cbt-container {
        max-width: 100% !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }
      .print\\:hidden, .cbt-ignore-pdf {
        display: none !important;
      }
      th, td {
        border-color: #94a3b8 !important;
      }
    }
  </style>
</head>
<body>
  <div class="cbt-action-bar">
    <div>
      <div style="font-weight: 800; font-size: 14px;">📄 Dokumen Resmi Jadwal Pelaksanaan CBT</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${kopSuratConfig?.schoolName || 'SMK'} • Siap dicetak langsung atau disimpan ke PDF</div>
    </div>
    <button onclick="window.print()">
      <span>🖨️</span>
      <span>Cetak / Simpan ke PDF Sekarang</span>
    </button>
  </div>

  <div class="cbt-container">
    ${innerContent}
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download document error:', err);
      window.print();
    } finally {
      setIsDownloadingSchedulePdf(false);
    }
  };

  const effectiveCommitteeHead = useMemo(() => {
    const found = teachers.find((t) => t.id === selectedCommitteeTeacherId);
    if (found) {
      return {
        name: found.name,
        nip: found.nisn || '',
      };
    }
    if (teacherCandidates.length > 0) {
      return {
        name: teacherCandidates[0].name,
        nip: teacherCandidates[0].nisn || '',
      };
    }
    return {
      name: currentUser?.name || 'Panitia Ujian',
      nip: '',
    };
  }, [teachers, selectedCommitteeTeacherId, teacherCandidates, currentUser?.name]);

  const toggleDayCollapse = (dateKey: string) => {
    setCollapsedDays((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const handleCopyExamToken = (examId: string, token: string | null | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedTokenId(examId);
    setTimeout(() => {
      setCopiedTokenId((prev) => (prev === examId ? null : prev));
    }, 2000);
  };

  // Reactively sync active tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'jadwal') {
      setActiveMainTab('schedule');
    } else if (tabParam === 'laporan' || tabParam === 'reports') {
      setActiveMainTab('reports');
    } else if (tabParam === 'pengawas' || tabParam === 'proctors') {
      setActiveMainTab('proctors');
    } else if (tabParam === 'suspend' || tabParam === 'suspensi') {
      setActiveMainTab('suspend');
    } else if (tabParam === 'logins' || tabParam === 'login' || tabParam === 'presensi') {
      setActiveMainTab('logins');
    } else if (tabParam === 'ujian' || !tabParam) {
      setActiveMainTab('exams');
    }
  }, [searchParams]);

  // ⚡ 0ms Fast Client-Side Navigation: sinkronkan browser history saat tombol Back/Forward ditekan
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'jadwal') {
        setActiveMainTab('schedule');
      } else if (tabParam === 'laporan' || tabParam === 'reports') {
        setActiveMainTab('reports');
      } else if (tabParam === 'pengawas' || tabParam === 'proctors') {
        setActiveMainTab('proctors');
      } else if (tabParam === 'suspend' || tabParam === 'suspensi') {
        setActiveMainTab('suspend');
      } else if (tabParam === 'logins' || tabParam === 'login' || tabParam === 'presensi') {
        setActiveMainTab('logins');
      } else {
        setActiveMainTab('exams');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ⚡ Fast Response Tab Switch (0ms):
  // Menghindari server component re-fetch (router.replace) yang membuat jeda 2-3 detik.
  // Tab langsung berpindah instan di UI dan URL address bar tetap terupdate rapi!
  const handleTabSwitch = (tab: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend' | 'logins') => {
    setActiveMainTab(tab);
    let targetUrl = '/admin/cbt';
    if (tab === 'schedule') {
      targetUrl = '/admin/cbt?tab=jadwal';
    } else if (tab === 'reports') {
      targetUrl = '/admin/cbt?tab=laporan';
    } else if (tab === 'proctors') {
      targetUrl = '/admin/cbt?tab=pengawas';
    } else if (tab === 'suspend') {
      targetUrl = '/admin/cbt?tab=suspend';
    } else if (tab === 'logins') {
      targetUrl = '/admin/cbt?tab=logins';
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', targetUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 🟢 State jumlah siswa login/sedang ujian realtime untuk badge tab
  const [activeLoginsCount, setActiveLoginsCount] = useState<number>(() => {
    let count = 0;
    for (const e of exams) {
      if (e.attempts) {
        for (const a of e.attempts) {
          if (a.status === 'IN_PROGRESS') count++;
        }
      }
    }
    return count;
  });

  // 🛡️ State jumlah siswa tersuspend realtime yang sinkron 100% dengan Pusat Suspend
  const [liveSuspendedCount, setLiveSuspendedCount] = useState<number>(() => {
    if (initialSuspendedStudents && initialSuspendedStudents.length > 0) {
      return initialSuspendedStudents.length;
    }
    let count = 0;
    for (const e of exams) {
      if (e.attempts) {
        for (const a of e.attempts) {
          const isDisqualified = (a.tabSwitchCount ?? 0) >= 5 || (a as any).proctorNotes?.includes('[DISKUALIFIKASI_FINAL]');
          const isStrike3Suspended = 
            (a.isBlocked || (a.tabSwitchCount ?? 0) >= 3 || (a as any).proctorNotes?.includes('[STRIKE_3_BLOKIR]')) &&
            !(a as any).proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]');
          if (isDisqualified || isStrike3Suspended) count++;
        }
      }
    }
    return count;
  });

  // Sinkronkan kembali jika initialSuspendedStudents dari server berubah
  useEffect(() => {
    if (initialSuspendedStudents) {
      setLiveSuspendedCount(initialSuspendedStudents.length);
    }
  }, [initialSuspendedStudents]);

  const dynamicSuspendedCount = liveSuspendedCount;

  // Filter States
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'ONGOING' | 'ENDED'>('ALL');

  // Conflict Checking State
  const [conflicts, setConflicts] = useState<ScheduleConflictExam[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // 📦 Batch / Collective Scheduling State
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'PARALLEL' | 'SEQUENTIAL'>('PARALLEL');
  const [batchDate, setBatchDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchEndTime, setBatchEndTime] = useState('09:30');
  const [batchSeqStart, setBatchSeqStart] = useState('07:30');
  const [batchDurationType, setBatchDurationType] = useState<'DEFAULT' | 'CUSTOM'>('DEFAULT');
  const [batchUniformDuration, setBatchUniformDuration] = useState(60);
  const [batchBreakMinutes, setBatchBreakMinutes] = useState(15);
  const [batchAllowConflict, setBatchAllowConflict] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // ✏️ Inline Quick-Edit Matrix State
  const [isInlineEditMode, setIsInlineEditMode] = useState(false);
  const [inlineSchedules, setInlineSchedules] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const [modifiedInlineIds, setModifiedInlineIds] = useState<Set<string>>(new Set());

  // ⚡ Schedule Manual Override Tracking (Mencegah auto-overwrite saat guru set jam selesai kustom)
  const [isEndTimeManuallyEdited, setIsEndTimeManuallyEdited] = useState(false);

  // 📊 CSV Import / Export State
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvParsedRows, setCsvParsedRows] = useState<
    Array<{ id: string; title: string; subject: string; classTarget: string; startTime: string; endTime: string }>
  >([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSaving, setCsvSaving] = useState(false);

  // ⚠️ Schedule Discrepancy Notice Modal State (Token Release outside scheduled window)
  const [scheduleNoticeModal, setScheduleNoticeModal] = useState<{
    exam: ExamItem;
    discrepancy: ScheduleDiscrepancyResult;
  } | null>(null);

  const classPresets: string[] = useMemo(() => {
    const list = dynamicClassPresets && dynamicClassPresets.length > 0 ? dynamicClassPresets : [
      'Semua Kelas',
      'X TJKT 1',
      'XI TJKT 1',
      'XII TJKT 1',
      'X DKV 1',
      'XI DKV 1',
      'XII DKV 1',
      'X MPLB 1',
      'XI MPLB 1',
      'XII MPLB 1',
    ];
    return Array.from(new Set(list));
  }, [dynamicClassPresets]);

  const subjectPresets: string[] = useMemo(() => {
    // 1. Ambil mapel riil yang sudah terdaftar di Master Mata Pelajaran (prisma.subject)
    const fromDb = (dynamicSubjectPresets || []).map((s: string) => s?.trim()).filter(Boolean);
    // 2. Ambil mapel dari seluruh paket ujian yang aktif di sistem
    const fromExams = exams.map((e) => e.subject?.trim()).filter(Boolean) as string[];
    
    const combined = Array.from(new Set([...fromDb, ...fromExams]));
    if (combined.length > 0) {
      return combined.sort((a, b) => a.localeCompare(b, 'id'));
    }
    // Fallback bersih jika database kurikulum belum terisi
    return [
      'Pendidikan Agama Islam',
      'Pendidikan Agama Kristen',
      'Bahasa Indonesia',
      'Matematika',
      'Bahasa Inggris',
    ];
  }, [dynamicSubjectPresets, exams]);

  const groupedClassOptions = useMemo(() => {
    const onlyClasses = classPresets.filter(
      (c: string) =>
        c !== 'Semua Kelas' &&
        !c.toLowerCase().includes('semua jurusan') &&
        !c.toLowerCase().includes('semua kelas')
    );
    const xClasses = onlyClasses.filter((c: string) => c.startsWith('X ') || c.startsWith('X-') || c === 'X');
    const xiClasses = onlyClasses.filter((c: string) => c.startsWith('XI ') || c.startsWith('XI-') || c === 'XI');
    const xiiClasses = onlyClasses.filter((c: string) => c.startsWith('XII ') || c.startsWith('XII-') || c === 'XII');
    const others = onlyClasses.filter((c: string) => !xClasses.includes(c) && !xiClasses.includes(c) && !xiiClasses.includes(c));

    return { xClasses, xiClasses, xiiClasses, others };
  }, [classPresets]);

  // 📅 Daftar Hari & Tanggal Pelaksanaan Ujian (Dinamis dari jadwal input guru & sistem)
  const availableScheduleDates = useMemo(() => {
    const dateMap = new Map<string, { fullLabel: string; count: number; timestamp: number }>();
    let unscheduledCount = 0;

    exams.forEach((exam) => {
      if (!exam.startTime) {
        unscheduledCount++;
        return;
      }
      const d = new Date(exam.startTime);
      if (isNaN(d.getTime())) {
        unscheduledCount++;
        return;
      }
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const fullLabel = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (dateMap.has(dateKey)) {
        dateMap.get(dateKey)!.count += 1;
      } else {
        dateMap.set(dateKey, {
          fullLabel,
          count: 1,
          timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
        });
      }
    });

    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([dateKey, val]) => ({
        dateKey,
        fullLabel: val.fullLabel,
        count: val.count,
      }));

    return { sortedDates, unscheduledCount };
  }, [exams]);

  // 🏫 Daftar Ruangan Ujian (Dinamis dari input exam.roomName)
  const availableRooms = useMemo(() => {
    const roomMap = new Map<string, number>();
    exams.forEach((exam) => {
      const r = exam.roomName?.trim() || 'Ruang Utama';
      roomMap.set(r, (roomMap.get(r) || 0) + 1);
    });
    return Array.from(roomMap.entries())
      .sort(([a], [b]) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
      .map(([name, count]) => ({ name, count }));
  }, [exams]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: dynamicSubjectPresets?.[0] || exams?.[0]?.subject || '',
    classTarget: 'Semua Kelas',
    duration: 60,
    token: '',
    description: '',
    status: 'PUBLISHED',
    shuffleQuestions: true,
    authorName: teacherName,
    startTime: '',
    endTime: '',
    enableSchedule: true,
    allowConflict: false,
    targetReligion: 'ALL',
  });

  const runConflictCheck = async (startTime: string, endTime: string, classTarget: string, targetReligion?: string) => {
    if (!startTime || !endTime) {
      setConflicts([]);
      setConflictWarning(null);
      return;
    }
    setCheckingConflict(true);
    try {
      const res = await checkExamScheduleConflict({
        examId: editingExam?.id,
        classTarget,
        startTime: parseDateTimeInputToIso(startTime, cbtTimezone),
        endTime: parseDateTimeInputToIso(endTime, cbtTimezone),
        targetReligion: targetReligion !== undefined ? targetReligion : formData.targetReligion,
      });
      if (res.hasConflict && res.conflicts && res.conflicts.length > 0) {
        setConflicts(res.conflicts);
        setConflictWarning(res.message || 'Jadwal bertabrakan!');
      } else {
        setConflicts([]);
        setConflictWarning(null);
      }
    } catch {}
    setCheckingConflict(false);
  };

  // Multi-select toggle helper for class targeting
  const handleToggleMultiClass = (className: string) => {
    const currentList = parseClassTargets(formData.classTarget).filter(
      (c) => c !== 'Semua Kelas' && !c.toLowerCase().includes('semua jurusan')
    );
    let nextList: string[];
    if (currentList.includes(className)) {
      nextList = currentList.filter((c) => c !== className);
    } else {
      nextList = [...currentList, className];
    }
    const nextVal = nextList.length > 0 ? nextList.join(', ') : 'Semua Kelas';
    setFormData((prev) => ({ ...prev, classTarget: nextVal }));
    if (formData.startTime && formData.endTime) {
      runConflictCheck(formData.startTime, formData.endTime, nextVal);
    }
  };

  const handleSelectAllLevel = (levelClasses: string[]) => {
    const currentList = parseClassTargets(formData.classTarget).filter(
      (c) => c !== 'Semua Kelas' && !c.toLowerCase().includes('semua jurusan')
    );
    const nextSet = new Set([...currentList, ...levelClasses]);
    const nextVal = Array.from(nextSet).join(', ');
    setFormData((prev) => ({ ...prev, classTarget: nextVal }));
    if (formData.startTime && formData.endTime) {
      runConflictCheck(formData.startTime, formData.endTime, nextVal);
    }
  };

  // ==========================================
  // 📦 COLLECTIVE SCHEDULING & BATCH ACTIONS
  // ==========================================

  const toggleSelectExam = (id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (visibleExams: ExamItem[]) => {
    const allVisibleSelected =
      visibleExams.length > 0 && visibleExams.every((e) => selectedExamIds.includes(e.id));
    if (allVisibleSelected) {
      setSelectedExamIds((prev) => prev.filter((id) => !visibleExams.some((e) => e.id === id)));
    } else {
      const merged = Array.from(new Set([...selectedExamIds, ...visibleExams.map((e) => e.id)]));
      setSelectedExamIds(merged);
    }
  };

  const selectUnscheduledOnly = () => {
    const unscheduled = exams.filter((e) => !e.startTime || !e.endTime).map((e) => e.id);
    setSelectedExamIds(unscheduled);
  };

  const selectCurrentFilteredOnly = (visibleExams: ExamItem[]) => {
    setSelectedExamIds(visibleExams.map((e) => e.id));
  };

  // ✏️ Mode Edit Cepat di Tabel Matriks
  const handleToggleInlineEdit = () => {
    if (!isInlineEditMode) {
      const initial: Record<string, { startTime: string; endTime: string }> = {};
      exams.forEach((e) => {
        initial[e.id] = {
          startTime: toDateTimeLocalInput(e.startTime, cbtTimezone),
          endTime: toDateTimeLocalInput(e.endTime, cbtTimezone),
        };
      });
      setInlineSchedules(initial);
      setModifiedInlineIds(new Set());
    }
    setIsInlineEditMode(!isInlineEditMode);
  };

  const handleInlineChange = (id: string, field: 'startTime' | 'endTime', val: string) => {
    setModifiedInlineIds((prev) => new Set(prev).add(id));
    setInlineSchedules((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { startTime: '', endTime: '' }),
        [field]: val,
      },
    }));
  };

  const handleInlinePreset = (id: string, minutes: number) => {
    setModifiedInlineIds((prev) => new Set(prev).add(id));
    setInlineSchedules((prev) => {
      const current = prev[id] || { startTime: '', endTime: '' };
      const startStr = current.startTime || getPresetDateTimeInTimezone(0, 8, 0, cbtTimezone);
      const endStr = addDurationToDateTimeInput(startStr, minutes, cbtTimezone);
      return {
        ...prev,
        [id]: {
          startTime: startStr,
          endTime: endStr,
        },
      };
    });
  };

  const handleSaveInlineSchedules = async () => {
    if (modifiedInlineIds.size === 0) {
      setIsInlineEditMode(false);
      return;
    }
    setInlineSaving(true);
    const modifiedList = Array.from(modifiedInlineIds);
    const payload = modifiedList.map((id) => {
      const sched = inlineSchedules[id] || { startTime: '', endTime: '' };
      return {
        id,
        startTime: sched.startTime ? parseDateTimeInputToIso(sched.startTime, cbtTimezone) : null,
        endTime: sched.endTime ? parseDateTimeInputToIso(sched.endTime, cbtTimezone) : null,
      };
    });

    const res = await batchUpdateExamSchedules(payload, true);
    if (res.success) {
      setExams((prev) =>
        prev.map((e) => {
          if (!modifiedInlineIds.has(e.id)) return e;
          const mod = inlineSchedules[e.id];
          if (!mod) return e;
          return {
            ...e,
            startTime: mod.startTime ? new Date(parseDateTimeInputToIso(mod.startTime, cbtTimezone)) : null,
            endTime: mod.endTime ? new Date(parseDateTimeInputToIso(mod.endTime, cbtTimezone)) : null,
          };
        })
      );
      setModifiedInlineIds(new Set());
      setIsInlineEditMode(false);
      showAlert('Jadwal Disimpan', `Berhasil menyimpan perubahan jadwal untuk ${payload.length} paket ujian!`, 'success');
    } else {
      showAlert('Gagal Menyimpan', res.error || 'Gagal menyimpan perubahan matriks jadwal.', 'danger');
    }
    setInlineSaving(false);
  };

  // 🧙‍♂️ Wizard Batch Scheduling (Sesi Bersama & Berurutan Otomatis)
  const getSequentialSchedulePreview = () => {
    const selected = exams.filter((e) => selectedExamIds.includes(e.id));
    if (selected.length === 0 || !batchDate || !batchSeqStart) return [];

    const items: Array<{
      exam: ExamItem;
      startIso: string;
      endIso: string;
      startDisplay: string;
      endDisplay: string;
      breakAfter: number;
    }> = [];

    const startInitialIso = parseDateTimeInputToIso(`${batchDate}T${batchSeqStart}`, cbtTimezone);
    let currentDateTime = new Date(startInitialIso);

    selected.forEach((ex, idx) => {
      const dur = batchDurationType === 'DEFAULT' ? ex.duration || 60 : batchUniformDuration;
      const start = new Date(currentDateTime);
      const end = new Date(start.getTime() + dur * 60 * 1000);

      items.push({
        exam: ex,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        startDisplay: formatScheduleTime(start, cbtTimezone).replace(` ${cbtTimezone}`, ''),
        endDisplay: formatScheduleTime(end, cbtTimezone).replace(` ${cbtTimezone}`, ''),
        breakAfter: idx < selected.length - 1 ? batchBreakMinutes : 0,
      });

      currentDateTime = new Date(end.getTime() + batchBreakMinutes * 60 * 1000);
    });

    return items;
  };

  const handleApplyBatchWizard = async () => {
    if (selectedExamIds.length === 0) return;
    setBatchLoading(true);

    let payload: Array<{ id: string; startTime: string | null; endTime: string | null }> = [];

    if (batchMode === 'PARALLEL') {
      if (!batchDate || !batchStartTime || !batchEndTime) {
        showAlert('Lengkapi Data', 'Mohon lengkapi tanggal, jam mulai, dan jam selesai terlebih dahulu.', 'warning');
        setBatchLoading(false);
        return;
      }
      const startIso = parseDateTimeInputToIso(`${batchDate}T${batchStartTime}`, cbtTimezone);
      const endIso = parseDateTimeInputToIso(`${batchDate}T${batchEndTime}`, cbtTimezone);
      if (new Date(startIso) >= new Date(endIso)) {
        showAlert('Jam Tidak Sesuai', 'Jam mulai harus lebih awal dari jam selesai.', 'warning');
        setBatchLoading(false);
        return;
      }
      payload = selectedExamIds.map((id) => ({
        id,
        startTime: startIso,
        endTime: endIso,
      }));
    } else {
      const preview = getSequentialSchedulePreview();
      payload = preview.map((p) => ({
        id: p.exam.id,
        startTime: p.startIso,
        endTime: p.endIso,
      }));
    }

    const res = await batchUpdateExamSchedules(payload, batchAllowConflict);
    if (res.success) {
      setExams((prev) =>
        prev.map((e) => {
          const match = payload.find((p) => p.id === e.id);
          if (!match) return e;
          return {
            ...e,
            startTime: match.startTime ? new Date(match.startTime) : null,
            endTime: match.endTime ? new Date(match.endTime) : null,
          };
        })
      );
      setIsBatchModalOpen(false);
      setSelectedExamIds([]);
      showAlert('Jadwal Kolektif Berhasil', `Sukses! ${payload.length} jadwal ujian berhasil diperbarui secara kolektif.`, 'success');
    } else {
      showAlert('Gagal Terapkan Jadwal', res.error || 'Gagal menerapkan jadwal kolektif.', 'danger');
    }
    setBatchLoading(false);
  };

  const handleClearSelectedSchedules = () => {
    if (selectedExamIds.length === 0) return;
    showConfirm({
      title: 'Kosongkan Jadwal Terpilih',
      message: `Kosongkan jadwal untuk ${selectedExamIds.length} ujian terpilih? Semua ujian terpilih akan diubah berstatus tanpa jadwal resmi.`,
      variant: 'warning',
      confirmText: 'Ya, Kosongkan',
      cancelText: 'Batal',
      onConfirm: async () => {
        setFeedbackModal(null);
        setLoading(true);
        const payload = selectedExamIds.map((id) => ({
          id,
          startTime: null,
          endTime: null,
        }));
        const res = await batchUpdateExamSchedules(payload, true);
        if (res.success) {
          setExams((prev) =>
            prev.map((e) =>
              selectedExamIds.includes(e.id) ? { ...e, startTime: null, endTime: null } : e
            )
          );
          setSelectedExamIds([]);
          showAlert('Jadwal Dikosongkan', `Jadwal untuk ${payload.length} ujian berhasil dikosongkan.`, 'success');
        } else {
          showAlert('Gagal Mengosongkan', res.error || 'Gagal mengosongkan jadwal.', 'danger');
        }
        setLoading(false);
      },
    });
  };

  // 📊 CSV Import & Template Generator
  const handleDownloadScheduleCsv = () => {
    const headers = [
      'ID_UJIAN',
      'JUDUL_UJIAN',
      'MATA_PELAJARAN',
      'KELAS',
      'DURASI_MENIT',
      'TANGGAL_MULAI',
      'JAM_MULAI',
      'TANGGAL_SELESAI',
      'JAM_SELESAI',
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];

    const rows = exams.map((ex) => {
      let tglMulai = defaultDate;
      let jamMulai = '08:00';
      let tglSelesai = defaultDate;
      let jamSelesai = '09:30';

      if (ex.startTime) {
        const s = new Date(ex.startTime);
        tglMulai = s.toISOString().split('T')[0];
        jamMulai = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      }
      if (ex.endTime) {
        const e = new Date(ex.endTime);
        tglSelesai = e.toISOString().split('T')[0];
        jamSelesai = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      }

      return [
        `"${ex.id}"`,
        `"${ex.title.replace(/"/g, '""')}"`,
        `"${ex.subject.replace(/"/g, '""')}"`,
        `"${ex.classTarget}"`,
        ex.duration || 60,
        tglMulai,
        jamMulai,
        tglSelesai,
        jamSelesai,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_jadwal_ujian_cbt_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File CSV kosong.');

        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) throw new Error('File CSV tidak memiliki data ujian.');

        const parsed: Array<{
          id: string;
          title: string;
          subject: string;
          classTarget: string;
          startTime: string;
          endTime: string;
        }> = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const cols = row
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 8) continue;

          const [id, title, , , , tglMulai, jamMulai, tglSelesai, jamSelesai] = cols;

          const matchedExam = exams.find(
            (e) => e.id === id || e.title.toLowerCase() === title.toLowerCase()
          );
          if (!matchedExam) continue;

          const cleanJamMulai = jamMulai ? jamMulai.replace('.', ':') : '08:00';
          const cleanJamSelesai = jamSelesai ? jamSelesai.replace('.', ':') : '09:30';

          const startStr = `${tglMulai}T${cleanJamMulai.length === 5 ? cleanJamMulai : '08:00'}:00`;
          const endStr = `${tglSelesai || tglMulai}T${cleanJamSelesai.length === 5 ? cleanJamSelesai : '09:30'}:00`;

          parsed.push({
            id: matchedExam.id,
            title: matchedExam.title,
            subject: matchedExam.subject,
            classTarget: matchedExam.classTarget,
            startTime: startStr,
            endTime: endStr,
          });
        }

        if (parsed.length === 0) {
          throw new Error(
            'Tidak ada baris ujian yang cocok dengan data di sistem. Pastikan kolom ID_UJIAN tidak diubah.'
          );
        }

        setCsvParsedRows(parsed);
        setIsCsvModalOpen(true);
      } catch (err: any) {
        setCsvError(err.message || 'Format CSV tidak valid.');
        showAlert('Gagal Memproses CSV', err.message || 'Gagal memproses file CSV.', 'danger');
      } finally {
        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCsvSchedules = async () => {
    if (csvParsedRows.length === 0) return;
    setCsvSaving(true);
    const payload = csvParsedRows.map((r) => ({
      id: r.id,
      startTime: parseDateTimeInputToIso(r.startTime, cbtTimezone),
      endTime: parseDateTimeInputToIso(r.endTime, cbtTimezone),
    }));

    const res = await batchUpdateExamSchedules(payload, true);
    if (res.success) {
      setExams((prev) =>
        prev.map((e) => {
          const match = payload.find((p) => p.id === e.id);
          if (!match) return e;
          return {
            ...e,
            startTime: match.startTime ? new Date(match.startTime) : null,
            endTime: match.endTime ? new Date(match.endTime) : null,
          };
        })
      );
      setIsCsvModalOpen(false);
      setCsvParsedRows([]);
      showAlert('Impor Jadwal Berhasil', `Berhasil mengimpor dan menerapkan jadwal untuk ${payload.length} ujian dari CSV!`, 'success');
    } else {
      showAlert('Gagal Terapkan Jadwal', res.error || 'Gagal menerapkan jadwal dari CSV.', 'danger');
    }
    setCsvSaving(false);
  };

  const handleOpenCreate = () => {
    setEditingExam(null);
    setIsCustomClassTarget(false);
    setClassTargetMode('preset');
    setIsEndTimeManuallyEdited(false);
    const randomToken = 'CBT' + Math.floor(100 + Math.random() * 900);
    const startStr = getPresetDateTimeInTimezone(0, 8, 0, cbtTimezone);
    const endStr = addDurationToDateTimeInput(startStr, 60, cbtTimezone);

    const defaultClass = (selectedClassFilter !== 'ALL' && selectedClassFilter)
      ? selectedClassFilter
      : (classPresets.find((c: string) => c !== 'Semua Kelas') || 'Semua Kelas');

    setFormData({
      title: '',
      subject: subjectPresets[0] || dynamicSubjectPresets?.[0] || exams?.[0]?.subject || '',
      classTarget: defaultClass,
      duration: 60,
      token: randomToken,
      description: '',
      status: 'PUBLISHED',
      shuffleQuestions: true,
      authorName: teacherName,
      startTime: startStr,
      endTime: endStr,
      enableSchedule: true,
      allowConflict: false,
      targetReligion: 'ALL',
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: ExamItem) => {
    if (!isExamOwner(exam)) {
      showAlert('Akses Dibatasi', 'Akses ditolak: Anda bertugas sebagai Pengawas dan tidak memiliki izin untuk mengedit paket ujian ini.', 'warning');
      return;
    }
    setEditingExam(exam);
    setIsEndTimeManuallyEdited(true);
    setIsCustomClassTarget(!classPresets.includes(exam.classTarget));
    if (exam.classTarget.includes(',')) {
      setClassTargetMode('multi');
    } else if (
      !classPresets.includes(exam.classTarget) &&
      !exam.classTarget.toLowerCase().includes('semua kelas')
    ) {
      setClassTargetMode('custom');
    } else {
      setClassTargetMode('preset');
    }
    const startStr = toDateTimeLocalInput(exam.startTime, cbtTimezone);
    const endStr = toDateTimeLocalInput(exam.endTime, cbtTimezone);

    setFormData({
      title: exam.title,
      subject: exam.subject,
      classTarget: exam.classTarget,
      duration: exam.duration,
      token: exam.token || '',
      description: exam.description || '',
      status: exam.status,
      shuffleQuestions: exam.shuffleQuestions,
      authorName: exam.authorName || teacherName,
      startTime: startStr,
      endTime: endStr,
      enableSchedule: Boolean(exam.startTime || exam.endTime),
      allowConflict: false,
      targetReligion: exam.targetReligion || 'ALL',
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleQuickToggleSession = async (exam: ExamItem, forceAllowOutsideSchedule: boolean = false) => {
    const tokenInfo = isExamTokenActive(exam);
    const nextOpen = !tokenInfo.isActive;

    // ⏰ Schedule Discrepancy Verification on Token Release / Session Open:
    // Sesuai kebutuhan: Paket ujian secara otomatis aktif sesuai jadwal resmi.
    // Namun jika pengawas membuka sesi di luar tanggal/jam, proses tetap diizinkan
    // setelah menampilkan notifikasi edukatif pemberitahuan ketidaksesuaian waktu.
    if (nextOpen && !forceAllowOutsideSchedule) {
      const discrepancy = checkScheduleDiscrepancy(exam.startTime, exam.endTime, cbtTimezone);
      if (discrepancy.isOutside) {
        setScheduleNoticeModal({
          exam,
          discrepancy,
        });
        return;
      }
    }

    // ⚡ Fast Response / Optimistic UI:
    // Langsung update status di layar seketika (0ms) agar tombol langsung berubah aktif/nonaktif
    const previousExams = exams;
    const optimisticStatus = nextOpen ? 'ACTIVE' : 'PUBLISHED';
    setExams((prev) =>
      prev.map((e) =>
        e.id === exam.id
          ? {
              ...e,
              status: optimisticStatus,
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    );

    setSessionLoadingId(exam.id);
    const res = await toggleExamSession(exam.id, nextOpen, exam.token || undefined);

    if (res.success && res.data) {
      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id
            ? {
                ...e, 
                status: res.data.status, 
                token: res.data.token,
                updatedAt: res.data.updatedAt || new Date().toISOString(),
              }
            : e
        )
      );
    } else {
      // Rollback jika request server gagal
      setExams(previousExams);
      showAlert('Gagal Mengubah Sesi', res.error || 'Gagal mengubah status sesi ujian', 'danger');
    }
    setSessionLoadingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const startIso = formData.enableSchedule && formData.startTime 
      ? parseDateTimeInputToIso(formData.startTime, cbtTimezone) 
      : null;
    const endIso = formData.enableSchedule && formData.endTime 
      ? parseDateTimeInputToIso(formData.endTime, cbtTimezone) 
      : null;

    if (startIso && endIso) {
      if (new Date(startIso) >= new Date(endIso)) {
        showAlert('Jadwal Tidak Sesuai', 'Jadwal Mulai harus lebih awal daripada Jadwal Selesai.', 'warning');
        setLoading(false);
        return;
      }
    }

    const payload = {
      title: formData.title,
      subject: formData.subject,
      classTarget: formData.classTarget,
      duration: Number(formData.duration),
      token: formData.token,
      description: formData.description,
      status: formData.status,
      shuffleQuestions: formData.shuffleQuestions,
      authorName: formData.authorName || teacherName,
      startTime: startIso,
      endTime: endIso,
      allowConflict: formData.allowConflict,
      targetReligion: formData.targetReligion || 'ALL',
    };

    if (editingExam) {
      const res = await updateExam(editingExam.id, payload);
      if (res.success && res.data) {
        setExams(exams.map((ex) => (ex.id === editingExam.id ? { ...ex, ...res.data } : ex)));
        setIsModalOpen(false);
      } else if ((res as any).conflict) {
        setConflicts((res as any).conflicts || []);
        showAlert('Jadwal Bentrok', res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.', 'warning');
      } else {
        showAlert('Gagal Mengubah Ujian', res.error || 'Gagal mengubah ujian', 'danger');
      }
    } else {
      const res = await createExam(payload);
      if (res.success && res.data) {
        setExams([
          {
            ...res.data,
            _count: { questions: 0, attempts: 0 },
            attempts: [],
          },
          ...exams,
        ]);
        setIsModalOpen(false);
      } else if ((res as any).conflict) {
        setConflicts((res as any).conflicts || []);
        showAlert('Jadwal Bentrok', res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.', 'warning');
      } else {
        showAlert('Gagal Membuat Ujian', res.error || 'Gagal membuat ujian', 'danger');
      }
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    const res = await deleteExam(deleteTargetId);
    if (res.success) {
      setExams(exams.filter((ex) => ex.id !== deleteTargetId));
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    } else {
      showAlert('Gagal Menghapus Ujian', res.error || 'Gagal menghapus ujian', 'danger');
    }
    setLoading(false);
  };

  // Helper deteksi target agama efektif ujian untuk evaluasi toleransi jadwal paralel agama
  const getExamEffectiveReligion = (exam: { targetReligion?: string | null; subject?: string | null; title?: string | null }): ReligionCode => {
    const norm = normalizeReligion(exam.targetReligion);
    if (norm !== 'ALL') return norm;
    const sub = `${exam.subject || ''} ${exam.title || ''}`.toUpperCase();
    if (
      sub.includes('ISLAM') || 
      sub.includes('PAI') || 
      sub.includes('PABP') || 
      sub.includes('BTA') || 
      sub.includes('BTQ') || 
      sub.includes('QURAN') || 
      sub.includes("QUR'AN") || 
      sub.includes('TAHFIDZ') || 
      sub.includes('FIQIH') || 
      sub.includes('AQIDAH')
    ) return 'ISLAM';
    if (
      sub.includes('KRISTEN') || 
      sub.includes('PAK') || 
      sub.includes('PROTESTAN')
    ) return 'KRISTEN';
    if (sub.includes('KATOLIK')) return 'KATOLIK';
    if (sub.includes('HINDU')) return 'HINDU';
    if (sub.includes('BUDDHA') || sub.includes('BUDHA')) return 'BUDDHA';
    if (sub.includes('KHONGHUCU') || sub.includes('KONGHUCU')) return 'KHONGHUCU';
    return 'ALL';
  };

  // ⚡ Fast Response: Memoized filtered exams list (0ms keystroke search & filter)
  const filteredExams = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return exams.filter((exam) => {
      // Hak Akses Tampilan Paket Ujian:
      if (!isSuperAdmin && !isAuthorMatch(exam.authorName)) {
        return false;
      }
      if (isSuperAdmin) {
        if (mineOnlyFilter && !isAuthorMatch(exam.authorName)) return false;
        if (adminTeacherFilter !== 'ALL' && exam.authorName !== adminTeacherFilter) return false;
      }

      const matchesSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.subject.toLowerCase().includes(q) ||
        exam.classTarget.toLowerCase().includes(q) ||
        (exam.authorName && exam.authorName.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
      const matchesSubject = selectedSubjectFilter === 'ALL' || exam.subject === selectedSubjectFilter;
      
      const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
      const matchesSchedule =
        scheduleFilter === 'ALL' ||
        (scheduleFilter === 'TODAY' && schedState.isOngoingToday) ||
        (scheduleFilter === 'ONGOING' && schedState.state === 'ONGOING') ||
        (scheduleFilter === 'UPCOMING' && schedState.state === 'UPCOMING') ||
        (scheduleFilter === 'ENDED' && schedState.state === 'ENDED');

      return matchesSearch && matchesStatus && matchesSchedule && matchesSubject;
    });
  }, [exams, isSuperAdmin, isAuthorMatch, mineOnlyFilter, adminTeacherFilter, searchTerm, statusFilter, scheduleFilter, selectedSubjectFilter]);

  // ⚡ Fast Response: Memoized system-wide schedule conflicts across all exams
  // Mengeliminasi perhitungan kuadratik O(N^2) berulang setiap kali user mengetik/render
  const systemConflicts = useMemo(() => {
    const list: Array<{ exam1: ExamItem; exam2: ExamItem }> = [];
    for (let i = 0; i < exams.length; i++) {
      for (let j = i + 1; j < exams.length; j++) {
        const e1 = exams[i];
        const e2 = exams[j];
        if (e1.status === 'ARCHIVED' || e2.status === 'ARCHIVED') continue;
        if (!e1.startTime || !e1.endTime || !e2.startTime || !e2.endTime) continue;
        const start1 = new Date(e1.startTime).getTime();
        const end1 = new Date(e1.endTime).getTime();
        const start2 = new Date(e2.startTime).getTime();
        const end2 = new Date(e2.endTime).getTime();

        const classOverlap = isClassOverlap(e1.classTarget, e2.classTarget);
        const timeOverlap = start1 < end2 && end1 > start2;

        if (classOverlap && timeOverlap) {
          // 🕌 Toleransi Cerdas Sesi Paralel Agama:
          const rel1 = getExamEffectiveReligion(e1);
          const rel2 = getExamEffectiveReligion(e2);
          if (isReligiousVariantParallel(rel1, rel2)) {
            continue;
          }

          list.push({ exam1: e1, exam2: e2 });
        }
      }
    }
    return list;
  }, [exams]);

  // ⚡ Fast Response: Filter exams for schedule matrix table (Memoized)
  const scheduledExams = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return exams.filter((exam) => {
      if (!isSuperAdmin && !isAuthorMatch(exam.authorName)) {
        return false;
      }
      if (isSuperAdmin && adminTeacherFilter !== 'ALL' && exam.authorName !== adminTeacherFilter) {
        return false;
      }

      const matchesSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.subject.toLowerCase().includes(q) ||
        exam.classTarget.toLowerCase().includes(q) ||
        (exam.authorName && exam.authorName.toLowerCase().includes(q));
      
      const matchesClass =
        selectedClassFilter === 'ALL' ||
        exam.classTarget === selectedClassFilter ||
        isClassOverlap(exam.classTarget, selectedClassFilter);

      const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
      const matchesSchedule =
        scheduleFilter === 'ALL' ||
        (scheduleFilter === 'TODAY' && schedState.isOngoingToday) ||
        (scheduleFilter === 'ONGOING' && schedState.state === 'ONGOING') ||
        (scheduleFilter === 'UPCOMING' && schedState.state === 'UPCOMING') ||
        (scheduleFilter === 'ENDED' && schedState.state === 'ENDED');

      // 📅 Filter Hari & Tanggal Pelaksanaan (Dinamis dari jadwal guru)
      let matchesDate = true;
      if (selectedDateFilter === 'UNSCHEDULED') {
        matchesDate = !exam.startTime || !exam.endTime;
      } else if (selectedDateFilter !== 'ALL') {
        if (!exam.startTime) {
          matchesDate = false;
        } else {
          const d = new Date(exam.startTime);
          if (isNaN(d.getTime())) {
            matchesDate = false;
          } else {
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            matchesDate = dateKey === selectedDateFilter;
          }
        }
      }

      // 🏫 Filter Ruangan Ujian (Dinamis dari exam.roomName)
      const examRoom = exam.roomName?.trim() || 'Ruang Utama';
      const matchesRoom = selectedRoomFilter === 'ALL' || examRoom === selectedRoomFilter;

      return matchesSearch && matchesClass && matchesSchedule && matchesDate && matchesRoom;
    }).sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [exams, isSuperAdmin, isAuthorMatch, adminTeacherFilter, searchTerm, selectedClassFilter, scheduleFilter, selectedDateFilter, selectedRoomFilter]);

  // 🎨 Helper styling warna dinamis untuk kartu jadwal berdasarkan rumpun mata pelajaran
  const getSubjectColorStyles = (subject: string) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('matematika') || s.includes('fisika') || s.includes('kimia') || s.includes('ipa') || s.includes('biologi')) {
      return {
        badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
        iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
        borderAccent: 'border-l-4 border-l-blue-500',
        dotColor: 'bg-blue-500',
      };
    }
    if (s.includes('indonesia') || s.includes('inggris') || s.includes('jepang') || s.includes('bahasa') || s.includes('sunda')) {
      return {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
        borderAccent: 'border-l-4 border-l-emerald-500',
        dotColor: 'bg-emerald-500',
      };
    }
    if (s.includes('agama') || s.includes('islam') || s.includes('kristen') || s.includes('katolik') || s.includes('hindu') || s.includes('buddha') || s.includes('pai')) {
      return {
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
        borderAccent: 'border-l-4 border-l-amber-500',
        dotColor: 'bg-amber-500',
      };
    }
    if (s.includes('tkj') || s.includes('rpl') || s.includes('akl') || s.includes('kejuruan') || s.includes('produktif') || s.includes('dkv') || s.includes('otomotif') || s.includes('jaringan') || s.includes('akuntansi') || s.includes('coding')) {
      return {
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
        iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        borderAccent: 'border-l-4 border-l-indigo-500',
        dotColor: 'bg-indigo-500',
      };
    }
    return {
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
      borderAccent: 'border-l-4 border-l-purple-500',
      dotColor: 'bg-purple-500',
    };
  };

  // 🗂️ Pengelompokan Jadwal Berdasarkan Hari & Sesi Waktu Pelaksanaan (Untuk Roster Profesional & Cetak)
  const groupedScheduleByDay = useMemo(() => {
    const dayMap = new Map<string, {
      dateKey: string;
      fullDateLabel: string;
      dayName: string;
      rawDate: Date;
      exams: ExamItem[];
      rooms: string[];
    }>();

    const unscheduledList: ExamItem[] = [];

    scheduledExams.forEach((exam) => {
      if (!exam.startTime || !exam.endTime) {
        unscheduledList.push(exam);
        return;
      }
      const d = new Date(exam.startTime);
      if (isNaN(d.getTime())) {
        unscheduledList.push(exam);
        return;
      }

      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const fullDateLabel = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          dateKey,
          fullDateLabel,
          dayName,
          rawDate: d,
          exams: [],
          rooms: [],
        });
      }
      const group = dayMap.get(dateKey)!;
      group.exams.push(exam);
      const r = exam.roomName?.trim() || 'Ruang Utama';
      if (!group.rooms.includes(r)) {
        group.rooms.push(r);
      }
    });

    const sortedDays = Array.from(dayMap.values()).sort(
      (a, b) => a.rawDate.getTime() - b.rawDate.getTime()
    );

    sortedDays.forEach((day) => {
      day.exams.sort((a, b) => {
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });
      day.rooms.sort();
    });

    return { sortedDays, unscheduledList };
  }, [scheduledExams]);

  // ⚡ Fast Response: Calculate stats based on visible & subject-filtered exams (Memoized)
  const visibleExams = useMemo(() => {
    return isSuperAdmin ? exams : exams.filter((e) => isAuthorMatch(e.authorName));
  }, [exams, isSuperAdmin, isAuthorMatch]);

  const targetStatsExams = useMemo(() => {
    if (selectedSubjectFilter === 'ALL') return visibleExams;
    return visibleExams.filter((e) => e.subject === selectedSubjectFilter);
  }, [visibleExams, selectedSubjectFilter]);

  const { totalExams, totalQuestions, totalAttempts, totalUniqueStudents, avgScore, unscheduledCount } = useMemo(() => {
    const totalExams = targetStatsExams.length;
    const totalQuestions = targetStatsExams.reduce((acc, curr) => acc + curr._count.questions, 0);
    const totalAttempts = targetStatsExams.reduce((acc, curr) => acc + curr._count.attempts, 0);

    // 🎯 Hitung Siswa Fisik Unik (Distinct Students)
    // Siswa A mengerjakan MTK dihitung 1, siswa A mengerjakan B. Indo tetap dihitung 1 (tidak berlipat ganda)!
    const uniqueStudentKeys = new Set<string>();
    targetStatsExams.forEach((e) => {
      if (e.attempts && Array.isArray(e.attempts)) {
        e.attempts.forEach((a) => {
          const key = (a.studentNis && a.studentNis.trim() !== '')
            ? `nis:${a.studentNis.trim()}`
            : (a.studentName && a.studentName.trim() !== '')
            ? `name:${a.studentName.trim().toLowerCase()}`
            : (a.id ? `id:${a.id}` : null);
          if (key) {
            uniqueStudentKeys.add(key);
          }
        });
      }
    });
    const totalUniqueStudents = uniqueStudentKeys.size;

    const totalSubmitted = targetStatsExams.flatMap((e) => e.attempts || []).filter((a) => a.status === 'SUBMITTED');
    const avgScore = totalSubmitted.length > 0
      ? Math.round(totalSubmitted.reduce((acc, a) => acc + a.score, 0) / totalSubmitted.length)
      : 0;
    const unscheduledCount = targetStatsExams.filter((e) => !e.startTime || !e.endTime).length;
    return { totalExams, totalQuestions, totalAttempts, totalUniqueStudents, avgScore, unscheduledCount };
  }, [targetStatsExams]);

  return (
    <div className="px-3.5 py-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs font-semibold">
              <BookOpen size={13} /> Smart CBT Guru • Rilis Token & Kontrol Ruang Ujian
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Created By Abdul Rahman
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Ujian Online (CBT)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm flex items-center flex-wrap gap-1.5 sm:gap-2">
            <span>Login sebagai: <strong className="text-purple-600 dark:text-purple-400">{teacherName}</strong></span>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold">
                👑 Admin Utama (Monitoring Seluruh Guru)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs font-bold">
                👤 Paket Ujian Mandiri Guru
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons: Responsive Grid on Mobile, Clean Flex on Desktop */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {isSuperAdmin && (
            <button
              onClick={() => setIsParticipantCardModalOpen(true)}
              className="group relative overflow-hidden flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer text-center whitespace-nowrap"
              title="Cetak Kartu Login & Peserta Ujian CBT Siswa (Khusus Admin Utama)"
            >
              <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <CreditCard size={16} className="shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
              <span>Cetak Kartu</span>
            </button>
          )}
          <Link
            href="/portal/siswa/cbt"
            target="_blank"
            className="group flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-center whitespace-nowrap"
          >
            <ExternalLink size={15} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span>Tampilan Siswa</span>
          </Link>
          <button
            onClick={handleOpenCreate}
            className="group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 text-center cursor-pointer whitespace-nowrap"
          >
            <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
            <Plus size={17} className="shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            <span>Buat Paket Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* 🌟 VIEW MODE SELECTOR TABS (CYBER COMMAND NAVIGATION BAR - RESPONSIVE SEGMENTED CONTROL) */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4 w-full">
        <div className="w-full p-1.5 sm:p-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-inner backdrop-blur-md">
          <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-6 sm:grid-cols-3' : 'lg:grid-cols-4 sm:grid-cols-2'} gap-1.5 sm:gap-2 w-full`}>
            <button
              type="button"
              onClick={() => handleTabSwitch('exams')}
              className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                activeMainTab === 'exams'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/40'
                  : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <BookOpen size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'exams' ? 'text-white' : 'text-purple-500'}`} />
              <span className="truncate">Daftar Paket Ujian</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeMainTab === 'exams' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {totalExams}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('schedule')}
              className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                activeMainTab === 'schedule'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                  : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Calendar size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'schedule' ? 'text-white' : 'text-indigo-500'}`} />
              <span className="truncate">Matriks Jadwal Ujian</span>
              {systemConflicts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0">
                  {systemConflicts.length} Bentrok!
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('reports')}
              className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                activeMainTab === 'reports'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/40'
                  : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <FileSpreadsheet size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'reports' ? 'text-white' : 'text-emerald-500'}`} />
              <span className="truncate">Laporan & Rekap Nilai</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('proctors')}
              className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                activeMainTab === 'proctors'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
                  : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <ShieldCheck size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'proctors' ? 'text-white' : 'text-blue-500'}`} />
              <span className="truncate">Plotting Pengawas</span>
              {unassignedProctorsCount > 0 && isSuperAdmin && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse shrink-0">
                  {unassignedProctorsCount} Belum Di-plot
                </span>
              )}
            </button>

            {/* 🛡️ TAB KHUSUS ADMIN UTAMA: PUSAT MONITORING & BUKA SUSPEND CBT */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleTabSwitch('suspend')}
                className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                  activeMainTab === 'suspend'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/25 ring-1 ring-rose-400/40'
                    : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
                }`}
              >
                <ShieldAlert size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'suspend' ? 'text-white' : 'text-rose-500'}`} />
                <span className="truncate">Pusat Suspend</span>
                {dynamicSuspendedCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0 shadow-xs">
                    {dynamicSuspendedCount} Suspend
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeMainTab === 'suspend' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    0
                  </span>
                )}
              </button>
            )}

            {/* 🟢 TAB KHUSUS ADMIN UTAMA: LAPORAN & MONITORING SISWA LOGIN CBT */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleTabSwitch('logins')}
                className={`group w-full px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-0 ${
                  activeMainTab === 'logins'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 ring-1 ring-teal-400/40'
                    : 'bg-white/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
                }`}
              >
                <Activity size={16} className={`shrink-0 group-hover:scale-115 transition-transform duration-200 ${activeMainTab === 'logins' ? 'text-white' : 'text-teal-500'}`} />
                <span className="truncate">Siswa Login</span>
                {activeLoginsCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse shrink-0 shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    {activeLoginsCount} Online
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeMainTab === 'logins' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    0
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 w-full">
          {/* 🌐 Quick Timezone Switcher Pill */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1.5 flex items-center gap-1">
              <Globe size={13} className="text-purple-600 shrink-0" />
              Zona:
            </span>
            {(['WIB', 'WITA', 'WIT'] as const).map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => handleTimezoneChange(tz)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  cbtTimezone === tz
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300'
                }`}
                title={`Beralih ke zona waktu ${tz} (${tz === 'WIB' ? 'UTC+7' : tz === 'WITA' ? 'UTC+8' : 'UTC+9'})`}
              >
                {tz}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Status Jadwal:</span>
            {systemConflicts.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Bebas Bentrok</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
                <span>{systemConflicts.length} Bentrok</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {activeMainTab === 'logins' && isSuperAdmin ? (
        <CbtStudentLoginMonitorView
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          kopSuratConfig={kopSuratConfig}
          onActiveLoginCountChange={(count) => setActiveLoginsCount(count)}
        />
      ) : activeMainTab === 'suspend' && isSuperAdmin ? (
        <CbtSuspendCenterView
          initialSuspendedStudents={initialSuspendedStudents}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onSuspendedCountChange={(count) => setLiveSuspendedCount(count)}
        />
      ) : activeMainTab === 'proctors' ? (
        <CbtProctorPlottingView
          exams={exams as any}
          teachers={teachers}
          currentUser={currentUser}
          kopSuratConfig={kopSuratConfig}
          onExamsUpdated={(updated) => {
            setExams(prev => prev.map(e => e.id === updated.id ? ({ ...e, ...updated, _count: e._count } as ExamItem) : e));
          }}
        />
      ) : activeMainTab === 'reports' ? (
        <CbtReportView
          exams={exams as any}
          currentUser={currentUser}
          classPresets={classPresets}
          subjectPresets={subjectPresets}
          kopSuratConfig={kopSuratConfig}
          cbtTimezone={cbtTimezone}
        />
      ) : activeMainTab === 'schedule' ? (
        <div className="space-y-6">
          {/* Conflict Alert Banner */}
          {systemConflicts.length > 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-slate-50/50 dark:from-rose-950/40 dark:via-amber-950/20 dark:to-slate-900/40 border border-rose-500/30 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-3.5 shadow-sm shadow-rose-500/5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-rose-500/25 ring-4 ring-rose-500/10">
                    <AlertTriangle size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-rose-950 dark:text-rose-100">
                        Peringatan Sistem: Terdeteksi {systemConflicts.length} Pasang Jadwal Bertabrakan!
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200">
                        Perlu Penyesuaian
                      </span>
                    </div>
                    <p className="text-xs text-rose-800/90 dark:text-rose-300 mt-0.5">
                      Ujian di bawah ini memiliki waktu pengerjaan yang saling bertumpukan untuk rombel kelas yang sama.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {systemConflicts.map((conf, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">{conf.exam1.title}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{conf.exam1.subject} • Kelas: <strong className="text-rose-600 font-bold">{conf.exam1.classTarget}</strong></span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 block mt-0.5 font-medium">{formatExamScheduleRange(conf.exam1.startTime, conf.exam1.endTime, cbtTimezone)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(conf.exam1)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
                      >
                        Ubah Jadwal
                      </button>
                    </div>
                    <div className="text-[10px] text-center font-bold text-rose-500 uppercase tracking-widest border-t border-b border-rose-100 dark:border-rose-900/40 py-1 bg-rose-50/50 dark:bg-rose-950/20 rounded-md">
                      ⚔️ BENTROK WAKTU DENGAN:
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">{conf.exam2.title}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{conf.exam2.subject} • Kelas: <strong className="text-rose-600 font-bold">{conf.exam2.classTarget}</strong></span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 block mt-0.5 font-medium">{formatExamScheduleRange(conf.exam2.startTime, conf.exam2.endTime, cbtTimezone)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(conf.exam2)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
                      >
                        Ubah Jadwal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/40 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-emerald-500/5 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 shrink-0 ring-4 ring-emerald-500/10 dark:ring-emerald-400/10">
                  <CheckCircle2 size={22} className="stroke-[2.5]" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-emerald-100 tracking-tight">
                      Seluruh Jadwal Ujian Telah Selaras & Bebas Bentrok
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      0 Bentrok
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                    Sistem otomatis mendeteksi 0 bentrok jadwal antar mata pelajaran untuk setiap kelas & ruangan.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenCreate}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
              >
                <Plus size={15} className="stroke-[2.5]" /> Tambah Jadwal Ujian
              </button>
            </div>
          )}

          {/* Hidden File Input for CSV Upload */}
          <input
            type="file"
            ref={csvFileInputRef}
            onChange={handleCsvFileUpload}
            accept=".csv"
            className="hidden"
          />

          {/* Schedule Filter, Target Class, Date & Room Selectors (Executive Control Center) */}
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
            {/* Row 1: Dropdown Filters & Search Box */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 w-full">
              {/* Dropdown Filters (Kelas, Hari/Tanggal, Ruangan) */}
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                {/* 1. Filter Kelas */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-3 py-2 shadow-xs hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                  <Users size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Kelas:</span>
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[170px] truncate"
                    title="Filter jadwal berdasarkan Target Kelas"
                  >
                    <option value="ALL">Semua Kelas ({exams.length} Ujian)</option>
                    <optgroup label="🌟 Lintas Jurusan (Tingkat)">
                      <option value="Semua Kelas X (Semua Jurusan)">🎯 Semua Kelas X (Semua Jurusan)</option>
                      <option value="Semua Kelas XI (Semua Jurusan)">🎯 Semua Kelas XI (Semua Jurusan)</option>
                      <option value="Semua Kelas XII (Semua Jurusan)">🎯 Semua Kelas XII (Semua Jurusan)</option>
                    </optgroup>
                    {groupedClassOptions.xClasses.length > 0 && (
                      <optgroup label="Tingkat X">
                        {groupedClassOptions.xClasses.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {groupedClassOptions.xiClasses.length > 0 && (
                      <optgroup label="Tingkat XI">
                        {groupedClassOptions.xiClasses.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {groupedClassOptions.xiiClasses.length > 0 && (
                      <optgroup label="Tingkat XII">
                        {groupedClassOptions.xiiClasses.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {groupedClassOptions.others.length > 0 && (
                      <optgroup label="Lainnya">
                        {groupedClassOptions.others.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* 2. Filter Hari & Tanggal Pelaksanaan (Dinamis dari input jadwal guru) */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-3 py-2 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                  <Calendar size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Hari/Tgl:</span>
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[210px] truncate"
                    title="Filter jadwal berdasarkan Hari & Tanggal Pelaksanaan"
                  >
                    <option value="ALL">Semua Tanggal ({exams.length} Ujian)</option>
                    {availableScheduleDates.sortedDates.map((d) => (
                      <option key={d.dateKey} value={d.dateKey}>
                        {d.fullLabel} ({d.count} Ujian)
                      </option>
                    ))}
                    {availableScheduleDates.unscheduledCount > 0 && (
                      <option value="UNSCHEDULED">⚠️ Belum Diberi Tanggal ({availableScheduleDates.unscheduledCount})</option>
                    )}
                  </select>
                </div>

                {/* 3. Filter Ruangan Ujian (Dinamis dari input ruang) */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-3 py-2 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                  <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Ruang:</span>
                  <select
                    value={selectedRoomFilter}
                    onChange={(e) => setSelectedRoomFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
                    title="Filter jadwal berdasarkan Ruang Ujian"
                  >
                    <option value="ALL">Semua Ruangan ({availableRooms.length})</option>
                    {availableRooms.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name} ({r.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tombol Reset Filter jika ada filter aktif */}
                {(selectedClassFilter !== 'ALL' || selectedDateFilter !== 'ALL' || selectedRoomFilter !== 'ALL' || scheduleFilter !== 'ALL' || searchTerm.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassFilter('ALL');
                      setSelectedDateFilter('ALL');
                      setSelectedRoomFilter('ALL');
                      setScheduleFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs border border-rose-200/60 dark:border-rose-900/50"
                    title="Reset semua filter jadwal kembali ke default"
                  >
                    <RotateCcw size={12} className="stroke-[2.5]" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative w-full xl:w-72 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Cari jadwal, mapel, kelas, pengawas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none shadow-xs transition-all placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Hapus pencarian"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Status Waktu Pills Bar */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0 hidden sm:inline">
                Status Waktu:
              </span>
              <div className="w-full sm:w-auto overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
                <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl min-w-max border border-slate-200/60 dark:border-slate-800">
                  {[
                    { id: 'ALL', label: 'Semua Status' },
                    { id: 'TODAY', label: '📅 Hari Ini' },
                    { id: 'UPCOMING', label: '⏳ Akan Datang' },
                    { id: 'ONGOING', label: '🟢 Berlangsung' },
                    { id: 'ENDED', label: '🏁 Selesai' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setScheduleFilter(s.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 ${
                        scheduleFilter === s.id
                          ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-extrabold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ⚡ COMMAND BAR: AKSI PENJADWALAN & DATA CSV */}
          <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-slate-100/70 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/50 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Scheduling Commands */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedExamIds.length === 0) {
                    showAlert('Pilih Paket Ujian', 'Pilih minimal 1 paket ujian dengan mencentang kotak di tabel terlebih dahulu.', 'info');
                    return;
                  }
                  setIsBatchModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/25 hover:shadow-purple-500/35 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={14} className="stroke-[2.5]" />
                <span>Atur Jadwal Kolektif</span>
                {selectedExamIds.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/25 text-[10px] font-black">
                    {selectedExamIds.length}
                  </span>
                )}
              </button>

              {isInlineEditMode ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveInlineSchedules}
                    disabled={inlineSaving}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} className="stroke-[2.5]" />
                    <span>{inlineSaving ? 'Menyimpan...' : 'Simpan Semua'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInlineEditMode(false)}
                    className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleInlineEdit}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-purple-200/90 dark:border-purple-800/80 hover:bg-purple-50/80 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <Edit3 size={14} className="stroke-[2]" />
                  <span>Mode Edit Cepat di Tabel</span>
                </button>
              )}
            </div>

            {/* Right: Print & Data Export/Import */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsSchedulePrintModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/25 active:scale-95 duration-200"
                title="Cetak dan Download Jadwal Ujian Resmi Lengkap dengan Kop Surat & Tanda Tangan"
              >
                <Printer size={14} className="stroke-[2.5]" />
                <span className="truncate">Cetak Jadwal Resmi</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadScheduleCsv}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:border-indigo-300 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Download template CSV untuk edit jadwal secara massal di Excel"
              >
                <Download size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[2.2]" />
                <span className="truncate">Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-300 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Upload file CSV hasil edit jadwal untuk diterapkan sekaligus"
              >
                <Upload size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                <span className="truncate">Import CSV</span>
              </button>
            </div>
          </div>

          {/* 📌 BAR SELEKSI MASSAL (JIKA ADA UJIAN DICENTANG) */}
          {selectedExamIds.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-purple-950/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/30 flex items-center justify-center font-bold text-purple-300">
                  <CheckCheck size={16} />
                </div>
                <div className="text-xs">
                  <strong className="text-purple-300 font-bold">{selectedExamIds.length}</strong> paket ujian terpilih dari tabel
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={14} /> Atur Jadwal ({selectedExamIds.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedSchedules}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw size={13} /> Kosongkan Jadwal
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExamIds([])}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Quick Select Helper Chips & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
            {/* Left: Quick Select Chips & Active Filters */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Pilih Cepat:</span>
              <button
                type="button"
                onClick={() => selectCurrentFilteredOnly(scheduledExams)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                Semua yang Terlihat ({scheduledExams.length})
              </button>
              <button
                type="button"
                onClick={selectUnscheduledOnly}
                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer transition-colors"
              >
                Belum Terjadwal ({unscheduledCount})
              </button>
              {selectedExamIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedExamIds([])}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 text-rose-500 font-bold cursor-pointer"
                >
                  Reset Seleksi
                </button>
              )}

              {/* Active Filter Badges */}
              {selectedDateFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                  <Calendar size={11} />
                  <span>
                    {selectedDateFilter === 'UNSCHEDULED'
                      ? 'Belum Diberi Tanggal'
                      : availableScheduleDates.sortedDates.find((d) => d.dateKey === selectedDateFilter)?.fullLabel || selectedDateFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('ALL')}
                    className="hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-0.5"
                    title="Hapus filter tanggal"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {selectedRoomFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/50 dark:border-emerald-800/50">
                  <MapPin size={11} />
                  <span>{selectedRoomFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomFilter('ALL')}
                    className="hover:text-emerald-900 dark:hover:text-white cursor-pointer ml-0.5"
                    title="Hapus filter ruangan"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {selectedClassFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/50 dark:border-purple-800/50">
                  <Users size={11} />
                  <span className="max-w-[120px] truncate">{selectedClassFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassFilter('ALL')}
                    className="hover:text-purple-900 dark:hover:text-white cursor-pointer ml-0.5"
                    title="Hapus filter kelas"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Right: Mode Switcher (Agenda Roster vs Matriks Tabel) */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setScheduleViewMode('roster')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  scheduleViewMode === 'roster'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <LayoutGrid size={13} className="stroke-[2.5]" />
                <span>Agenda & Sesi Roster</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  scheduleViewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <List size={13} className="stroke-[2.5]" />
                <span>Matriks Tabel</span>
              </button>
            </div>
          </div>

          {/* Main Schedule Content: Roster Mode vs Table Mode */}
          {scheduleViewMode === 'roster' ? (
            <div className="space-y-6">
              {groupedScheduleByDay.sortedDays.length === 0 && groupedScheduleByDay.unscheduledList.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada jadwal yang sesuai filter</h4>
                  <p className="text-xs text-slate-500 mt-1">Coba ubah filter kelas, tanggal, ruangan, atau kata kunci pencarian.</p>
                </div>
              ) : (
                <>
                  {/* Daftar Hari Ujian */}
                  {groupedScheduleByDay.sortedDays.map((day, dayIdx) => {
                    const isCollapsed = Boolean(collapsedDays[day.dateKey]);
                    const isToday = (() => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const dayStr = day.rawDate.toISOString().slice(0, 10);
                      return todayStr === dayStr;
                    })();

                    // Kelompokkan ujian per Time Slot / Sesi dalam hari ini
                    const slotMap = new Map<string, {
                      timeRangeFormatted: string;
                      startTime: string;
                      endTime: string;
                      exams: ExamItem[];
                    }>();

                    day.exams.forEach((exam) => {
                      const key = `${exam.startTime}_${exam.endTime}`;
                      if (!slotMap.has(key)) {
                        slotMap.set(key, {
                          timeRangeFormatted: formatExamScheduleRange(exam.startTime, exam.endTime, cbtTimezone),
                          startTime: exam.startTime as string,
                          endTime: exam.endTime as string,
                          exams: [],
                        });
                      }
                      slotMap.get(key)!.exams.push(exam);
                    });

                    const timeSlots = Array.from(slotMap.values());

                    return (
                      <div
                        key={day.dateKey}
                        className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                      >
                        {/* Day Card Header */}
                        <div
                          onClick={() => toggleDayCollapse(day.dateKey)}
                          className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isToday
                              ? 'bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent dark:from-purple-950/40 dark:via-indigo-950/30'
                              : 'bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0 ${
                              isToday
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30 ring-4 ring-purple-500/10'
                                : 'bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-700 dark:to-slate-800 shadow-slate-900/10'
                            }`}>
                              <Calendar size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                  {day.dayName}, {day.fullDateLabel}
                                </h3>
                                {isToday && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                    HARI INI
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-purple-700 dark:text-purple-300">
                                  Hari Ke-{dayIdx + 1}
                                </span>
                                <span>•</span>
                                <span><strong>{day.exams.length}</strong> Ujian Terjadwal</span>
                                <span>•</span>
                                <span>{day.rooms.length} Ruangan: <strong className="text-slate-700 dark:text-slate-200">{day.rooms.join(', ')}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                              {isCollapsed ? 'Buka Jadwal' : 'Lipat'}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Day Card Body (Sessions) */}
                        {!isCollapsed && (
                          <div className="p-4 sm:p-5 space-y-6 divide-y divide-slate-100 dark:divide-slate-800/80">
                            {timeSlots.map((slot, slotIdx) => (
                              <div key={slotIdx} className={slotIdx > 0 ? 'pt-6' : ''}>
                                {/* Sesi Header Banner */}
                                <div className="flex items-center justify-between gap-3 mb-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                      <span>SESI {slotIdx + 1}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-purple-700 dark:text-purple-300 font-bold">{slot.timeRangeFormatted}</span>
                                    </h4>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                                    {slot.exams.length} Rombel
                                  </span>
                                </div>

                                {/* Grid of Exam Cards in this Slot */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                                  {slot.exams.map((exam) => {
                                    const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
                                    const subjectStyles = getSubjectColorStyles(exam.subject);
                                    const isCopied = copiedTokenId === exam.id;

                                    return (
                                      <div
                                        key={exam.id}
                                        className={`group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-3 ${subjectStyles.borderAccent}`}
                                      >
                                        <div className="space-y-2.5">
                                          {/* Card Top: Subject & Status */}
                                          <div className="flex items-start justify-between gap-2">
                                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${subjectStyles.badgeBg} truncate max-w-[170px]`}>
                                              {exam.subject}
                                            </span>

                                            {/* Status Badge */}
                                            {schedState.state === 'ONGOING' ? (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 shadow-xs shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                BERLANGSUNG
                                              </span>
                                            ) : schedState.state === 'UPCOMING' ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shrink-0">
                                                <Clock size={10} /> AKAN DATANG
                                              </span>
                                            ) : schedState.state === 'ENDED' ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                                SELESAI
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 shrink-0">
                                                DRAF
                                              </span>
                                            )}
                                          </div>

                                          {/* Title & Description */}
                                          <div>
                                            <h5 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                              {exam.title}
                                            </h5>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                              <Users size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                              <strong className="text-slate-700 dark:text-slate-200">{exam.classTarget}</strong>
                                            </div>
                                          </div>

                                          {/* Meta Pills: Room, Duration, Author & Proctor */}
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                              <MapPin size={11} /> {exam.roomName?.trim() || 'Ruang Utama'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                              <Clock size={11} /> {exam.duration} Menit
                                            </span>
                                            {exam.authorName && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                👤 {exam.authorName}
                                              </span>
                                            )}
                                            <span 
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold truncate max-w-[170px] ${
                                                exam.proctorName 
                                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50' 
                                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700'
                                              }`}
                                              title={exam.proctorName ? `Pengawas: ${exam.proctorName}${exam.proctor2Name ? ` & ${exam.proctor2Name}` : ''}` : 'Belum ada pengawas yang di-plot'}
                                            >
                                              🛡️ {exam.proctorName ? exam.proctorName : 'Pengawas: Belum Di-plot'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Card Footer: Token & Actions */}
                                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                          {/* Token Pill */}
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopyExamToken(exam.id, exam.token, e)}
                                            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer group/tok"
                                            title="Klik untuk menyalin token ujian"
                                          >
                                            <Key size={11} className="text-slate-400 group-hover/tok:text-purple-600" />
                                            <span className="font-mono text-xs font-black tracking-widest text-slate-800 dark:text-slate-200">
                                              {exam.token}
                                            </span>
                                            {isCopied ? (
                                              <Check size={11} className="text-emerald-600" />
                                            ) : (
                                              <Copy size={11} className="text-slate-400 group-hover/tok:text-purple-600" />
                                            )}
                                          </button>

                                          {/* Action Buttons */}
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEdit(exam)}
                                              className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                                              title="Ubah Jadwal Ujian"
                                            >
                                              <Edit3 size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleQuickDownloadExamQuestions(exam)}
                                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                              title="Buka Bank Soal"
                                            >
                                              <Download size={13} />
                                            </button>
                                            <Link
                                              href={`/admin/cbt/${exam.id}`}
                                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                              title="Masuk Ruang Ujian"
                                            >
                                              <ExternalLink size={13} />
                                            </Link>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Belum Terjadwal Section */}
                  {groupedScheduleByDay.unscheduledList.length > 0 && (
                    <div className="rounded-3xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                          <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                            Paket Ujian Belum Diberi Jadwal ({groupedScheduleByDay.unscheduledList.length})
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExamIds(groupedScheduleByDay.unscheduledList.map((e) => e.id));
                            setIsBatchModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Zap size={13} /> Atur Jadwal Sekaligus
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {groupedScheduleByDay.unscheduledList.map((exam) => (
                          <div
                            key={exam.id}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{exam.title}</span>
                              <span className="text-[11px] text-slate-500 block truncate">{exam.subject} • {exam.classTarget}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exam)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                            >
                              Jadwalkan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Table Mode */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-4 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={scheduledExams.length > 0 && scheduledExams.every((e) => selectedExamIds.includes(e.id))}
                        onChange={() => toggleSelectAll(scheduledExams)}
                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        title="Pilih / Batal Semua"
                      />
                    </th>
                    <th className="py-4 px-2 text-center w-10">No</th>
                    <th className="py-4 px-4">Mata Pelajaran & Judul</th>
                    <th className="py-4 px-4">Target Kelas</th>
                    <th className="py-4 px-4">Guru Pengampu</th>
                    <th className="py-4 px-4">Jadwal Pelaksanaan ({cbtTimezone})</th>
                    <th className="py-4 px-4 text-center">Durasi</th>
                    <th className="py-4 px-4">Status Waktu</th>
                    <th className="py-4 px-4 text-center">Token</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scheduledExams.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Tidak ada jadwal ujian yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    scheduledExams.map((exam, idx) => {
                      const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
                      const isSelected = selectedExamIds.includes(exam.id);

                      return (
                        <tr
                          key={exam.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-purple-50/60 dark:bg-purple-950/30'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectExam(exam.id)}
                              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">{exam.title}</span>
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{exam.subject}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span 
                              className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block max-w-[200px] truncate"
                              title={exam.classTarget}
                            >
                              {formatClassTargetDisplay(exam.classTarget)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {exam.authorName || 'Guru Pengampu'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isInlineEditMode ? (
                              <div className="space-y-1.5 py-1 min-w-[240px]">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-12">Mulai:</span>
                                  <input
                                    type="datetime-local"
                                    value={inlineSchedules[exam.id]?.startTime || ''}
                                    onChange={(e) => handleInlineChange(exam.id, 'startTime', e.target.value)}
                                    className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-purple-500 w-full"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-12">Selesai:</span>
                                  <input
                                    type="datetime-local"
                                    value={inlineSchedules[exam.id]?.endTime || ''}
                                    onChange={(e) => handleInlineChange(exam.id, 'endTime', e.target.value)}
                                    className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-purple-500 w-full"
                                  />
                                </div>
                                <div className="flex items-center gap-1 pt-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold">Preset:</span>
                                  {[30, 45, 60, 90, 120].map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => handleInlinePreset(exam.id, m)}
                                      className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-bold cursor-pointer"
                                    >
                                      +{m}m
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <Calendar size={13} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                  <span>{getExamScheduleDetails(exam.startTime, exam.endTime, cbtTimezone).dateText}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                                  <Clock size={11} className="text-purple-500 shrink-0" />
                                  <span>{getExamScheduleDetails(exam.startTime, exam.endTime, cbtTimezone).timeRangeText}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{schedState.countdown}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                            {exam.duration} mnt
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${schedState.badgeClass}`}>
                              {schedState.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-700 dark:text-slate-200">
                              {(exam.token || '').split('|')[0] || 'Tanpa Token'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isExamOwner(exam) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickDownloadExamQuestions(exam)}
                                    disabled={downloadingExamId === exam.id}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                                    title={`Unduh Bank Soal (${exam._count?.questions || 0} Soal) - Format Siap Upload`}
                                  >
                                    {downloadingExamId === exam.id ? (
                                      <RefreshCw size={14} className="animate-spin text-emerald-600" />
                                    ) : (
                                      <Download size={14} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(exam)}
                                    className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 size={13} /> Atur Jadwal
                                  </button>
                                </>
                              )}
                              <Link
                                href={`/admin/cbt/${exam.id}`}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isExamProctor(exam)
                                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={isExamProctor(exam) ? 'Buka Ruang Pengawasan' : 'Buka Bank Soal'}
                              >
                                {isExamProctor(exam) ? <ShieldCheck size={15} /> : <ExternalLink size={15} />}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
      {/* Stats Cards (4 KPI Cards Elegan, Modern & Beranimasi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Paket Ujian */}
        <div className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <BookOpen size={24} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{totalExams}</span>
              <span className="text-xs font-semibold text-slate-400">Paket</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Paket Ujian</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
              {selectedSubjectFilter !== 'ALL' ? `Mapel: ${selectedSubjectFilter}` : unscheduledCount > 0 ? `${unscheduledCount} belum terjadwal` : 'Semua sudah terjadwal'}
            </div>
          </div>
        </div>

        {/* Card 2: Total Butir Soal */}
        <div className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <FileCheck2 size={24} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{totalQuestions}</span>
              <span className="text-xs font-semibold text-slate-400">Soal</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Butir Soal</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Bank Soal Terpasang
            </div>
          </div>
        </div>

        {/* Card 3: Siswa Mengerjakan (Siswa Unik Nyata) */}
        <div className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Users size={24} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{totalUniqueStudents}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Siswa Unik</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Siswa Mengerjakan</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 flex items-center gap-1 truncate" title={`Akumulasi lembar ujian: ${totalAttempts} sesi`}>
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span>{totalAttempts} Sesi Lembar{selectedSubjectFilter !== 'ALL' ? ` (${selectedSubjectFilter})` : ' (Seluruh Mapel)'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rata-Rata Nilai */}
        <div className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Award size={24} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{avgScore}</span>
              <span className="text-xs font-semibold text-slate-400">/ 100</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rata-Rata Nilai</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Dari siswa yang submit
            </div>
          </div>
        </div>
      </div>

      {/* 🎛️ Unified Command Center & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top Row: Search Input + Result Counter + Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari nama ujian, mapel, kelas, guru pengampu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
              {filteredExams.length} Paket Ujian
            </span>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm shadow-purple-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Buat Paket</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Status Ruang Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'ACTIVE', label: '🟢 Sesi Aktif' },
              { id: 'PUBLISHED', label: '⏳ Ruang Tunggu' },
              { id: 'DRAFT', label: '📝 Draft' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters: Schedule & Teacher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Schedule Status Filter */}
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: 'Semua Jadwal' },
                { id: 'TODAY', label: 'Hari Ini' },
                { id: 'UPCOMING', label: 'Akan Datang' },
                { id: 'ONGOING', label: 'Berlangsung' },
                { id: 'ENDED', label: 'Selesai' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScheduleFilter(s.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    scheduleFilter === s.id
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMineOnlyFilter(!mineOnlyFilter)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mineOnlyFilter
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title="Tampilkan hanya paket ujian yang dibuat akun Admin ini"
                >
                  <UserCheck size={13} />
                  <span>Ujian Saya</span>
                </button>
                {teachers.length > 0 && (
                  <select
                    value={adminTeacherFilter}
                    onChange={(e) => setAdminTeacherFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Guru ({teachers.length})</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Filter Mata Pelajaran Responsif */}
            {availableSubjects.length > 0 && (
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                title="Filter paket ujian & metrik statistik berdasarkan Mata Pelajaran"
              >
                <option value="ALL">Semua Mapel ({availableSubjects.length})</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters Button if any filter active */}
            {(searchTerm || statusFilter !== 'ALL' || scheduleFilter !== 'ALL' || selectedSubjectFilter !== 'ALL' || mineOnlyFilter || adminTeacherFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setScheduleFilter('ALL');
                  setSelectedSubjectFilter('ALL');
                  setMineOnlyFilter(false);
                  setAdminTeacherFilter('ALL');
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exam List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredExams.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <BookOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada paket ujian yang sesuai filter.</p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              Buat Paket Ujian Baru
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const tokenStatus = isExamTokenActive(exam);
            const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status, new Date(), exam.updatedAt, exam.duration);
            const schedDetails = getExamScheduleDetails(exam.startTime, exam.endTime, cbtTimezone);
            const isLive = tokenStatus.isActive;
            const isSessionLoading = sessionLoadingId === exam.id;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group h-full"
              >
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  {/* Top Status & Subject Bar */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span 
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 truncate max-w-[170px]"
                        title={exam.subject}
                      >
                        {exam.subject}
                      </span>
                      {exam.targetReligion && exam.targetReligion !== 'ALL' && (() => {
                        const rel = getReligionConfig(exam.targetReligion);
                        return (
                          <span 
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 shrink-0 ${rel.bgBadge} ${rel.borderBadge} ${rel.textBadge}`}
                            title={`Khusus Siswa: ${rel.label}`}
                          >
                            <span>{rel.icon}</span>
                            <span>{rel.badgeLabel}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${
                        isLive
                          ? tokenStatus.isSusulan
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse'
                          : tokenStatus.isExpired
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : exam.status === 'PUBLISHED'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isLive 
                        ? tokenStatus.isSusulan
                          ? '⚠️ Sesi Live (Susulan)'
                          : '🟢 Sesi Live' 
                        : tokenStatus.isExpired
                        ? '⌛ Waktu Berakhir'
                        : exam.status === 'PUBLISHED' 
                        ? '⏳ Ruang Tunggu' 
                        : 'Draft'}
                    </span>
                  </div>

                  <h3 
                    className="font-bold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 min-h-[2.85rem] mb-1.5 group-hover:text-purple-600 transition-colors"
                    title={exam.title}
                  >
                    {exam.title}
                  </h3>

                  {/* Author / Teacher Line */}
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>Guru:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold truncate" title={exam.authorName || 'Guru Pengampu'}>
                        {exam.authorName || 'Guru Pengampu'}
                      </strong>
                    </div>
                    {isExamProctor(exam) && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-[10px] shrink-0">
                        Pengawas {exam.roomName ? `Ruang ${exam.roomName}` : ''}
                      </span>
                    )}
                  </div>

                  {/* 📅 EXAM SCHEDULE & TIME BOX */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200/70 dark:border-purple-800/50 mb-3 space-y-2">
                    {/* Row 1: Tanggal Pelaksanaan & Status Sesi */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100">
                        <Calendar size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
                        <span title={schedDetails.dateText}>{schedDetails.dateText}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${schedState.badgeClass}`}>
                        {schedState.label}
                      </span>
                    </div>

                    {/* Row 2: Jam Mulai & Jam Berakhir */}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                        <Clock size={12} className="text-purple-500 shrink-0" />
                        <span className="text-[11px] font-semibold">Jam Ujian:</span>
                      </div>
                      <div className="font-mono font-black text-xs text-purple-700 dark:text-purple-300 tracking-tight">
                        {schedDetails.timeRangeText}
                      </div>
                    </div>

                    {/* Row 3: Countdown / Sisa Waktu Menuju Ujian */}
                    {schedState.countdown && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5 px-0.5">
                        <span className="font-medium">Waktu Pengerjaan:</span>
                        <span className={`font-bold ${isLive && schedState.isOutsideSchedule ? 'text-amber-600 dark:text-amber-400' : 'text-purple-700 dark:text-purple-300'}`}>
                          {schedState.countdown}
                        </span>
                      </div>
                    )}

                    {/* Notice informatif jika sesi aktif di luar jadwal resmi (Susulan) */}
                    {isLive && schedState.isOutsideSchedule && (
                      <div className="mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] flex items-start gap-1.5 leading-tight">
                        <AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Info Ujian Susulan:</strong> Sesi aktif dibuka pengawas di luar jadwal resmi. Siswa tetap dapat login & mengerjakan ujian.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description with unified min-height */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem] mb-3">
                    {exam.description || 'Tidak ada deskripsi tambahan.'}
                  </p>

                  {/* 📊 3-Column Metrics Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-semibold">Durasi</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                        <Clock size={11} className="text-purple-500 shrink-0" />
                        <span>{exam.duration} Mnt</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-semibold">Target Kelas</div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate px-0.5" title={exam.classTarget}>
                        {formatClassTargetDisplay(exam.classTarget, true)}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-semibold">Butir Soal</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                        <FileCheck2 size={11} className="text-emerald-500 shrink-0" />
                        <span>{exam._count.questions} Soal</span>
                      </div>
                    </div>
                  </div>

                  {/* 🚀 QUICK TOKEN CONTROL BANNER */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs mb-3 transition-colors ${
                    tokenStatus.isActive 
                      ? tokenStatus.isSusulan
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200' 
                      : tokenStatus.isExpired
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[9.5px] tracking-wider text-slate-400 truncate">
                        <Key size={12} className={tokenStatus.isActive ? "text-amber-500" : "text-slate-400"} />
                        <span>{tokenStatus.statusLabel}</span>
                        {tokenStatus.isActive && (
                          <span className="font-mono text-[8.5px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                            {tokenStatus.isSusulan ? `${tokenStatus.remainingSusulanMinutes || exam.duration} MNT` : '10 MNT'}
                          </span>
                        )}
                        {!tokenStatus.isActive && tokenStatus.isExpired && (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30">
                            KADALUARSA
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-black text-sm mt-0.5 truncate flex items-center gap-1.5">
                        {tokenStatus.isActive ? (
                          <>
                            <span className="text-slate-900 dark:text-white tracking-wider">{tokenStatus.rawToken}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                          </>
                        ) : (
                          <span className={tokenStatus.isExpired ? "text-rose-600 dark:text-rose-400 font-bold text-xs" : "text-slate-500 dark:text-slate-400 font-bold text-xs"}>
                            {tokenStatus.displayToken}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickToggleSession(exam)}
                      disabled={isSessionLoading}
                      className={`group relative overflow-hidden px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs hover:shadow-md shrink-0 cursor-pointer disabled:opacity-50 ${
                        tokenStatus.isActive
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 hover:shadow-rose-600/30'
                          : tokenStatus.isExpired
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20 hover:shadow-amber-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:shadow-emerald-600/30'
                      }`}
                    >
                      <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                      {isSessionLoading ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : tokenStatus.isActive ? (
                        <>
                          <Square size={12} className="fill-white group-hover:scale-110 transition-transform duration-200" /> <span>Tutup Sesi</span>
                        </>
                      ) : tokenStatus.isExpired ? (
                        <>
                          <Play size={12} className="fill-white group-hover:scale-115 group-hover:translate-x-0.5 transition-transform duration-200" /> <span>Rilis Susulan</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-white group-hover:scale-115 group-hover:translate-x-0.5 transition-transform duration-200" /> <span>Rilis Token</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2 mt-auto">
                  {isExamProctor(exam) ? (
                    <Link
                      href={`/admin/cbt/${exam.id}`}
                      className="group relative overflow-hidden flex-1 text-center py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                      <ShieldCheck size={14} className="group-hover:scale-110 transition-transform duration-200" />
                      <span>Ruang Pengawasan & Monitoring</span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/admin/cbt/${exam.id}`}
                        className="group relative overflow-hidden flex-1 text-center py-2.5 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                        <BookOpen size={14} className="group-hover:scale-110 transition-transform duration-200" />
                        <span>Buka Bank Soal & Nilai</span>
                      </Link>
                      {isExamOwner(exam) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickDownloadExamQuestions(exam)}
                            disabled={downloadingExamId === exam.id}
                            className="group p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                            title={`Unduh Bank Soal (${exam._count?.questions || 0} Soal) - Format Excel/CSV Siap Upload`}
                          >
                            {downloadingExamId === exam.id ? (
                              <RefreshCw size={15} className="animate-spin text-emerald-600" />
                            ) : (
                              <Download size={15} className="group-hover:-translate-y-0.5 transition-transform duration-200" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exam)}
                            className="group p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Edit Pengaturan Ujian"
                          >
                            <Edit3 size={15} className="group-hover:rotate-12 transition-transform duration-200" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetId(exam.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="group p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Hapus Ujian"
                          >
                            <Trash2 size={15} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
      )}

      {/* Modal Buat / Edit Ujian */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingExam ? 'Edit Paket Ujian' : 'Buat Paket Ujian Baru (CBT Guru)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Ujian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Akhir Semester (PAS) Pemrograman Web"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="subject-presets"
                    placeholder="Pilih atau ketik mapel"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <datalist id="subject-presets">
                    {subjectPresets.map((s: string, idx: number) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi Pengerjaan (Menit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* 🕌 VARIAN AGAMA SISWA (UNTUK MAPEL AGAMA SERENTAK DENGAN TOKEN BERSAMA) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-sky-50/60 to-purple-50/60 dark:from-emerald-950/20 dark:via-sky-950/20 dark:to-purple-950/20 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>🕌</span>
                    <span>Target Varian Agama Siswa:</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                    Multi-Agama Serentak
                  </span>
                </div>
                <select
                  value={formData.targetReligion}
                  onChange={(e) => {
                    const newRel = e.target.value;
                    setFormData({ ...formData, targetReligion: newRel });
                    if (formData.startTime && formData.endTime) {
                      runConflictCheck(formData.startTime, formData.endTime, formData.classTarget, newRel);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {RELIGION_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 <strong>Untuk Mapel Agama:</strong> Pilih agama spesifik agar siswa yang berbeda agama di kelas ini dapat mengerjakan ujian secara serentak dengan <strong>1 token bersama</strong> tanpa bentrok jadwal.
                </p>
              </div>

              {/* 🎯 TARGET KELAS & JURUSAN (LINTAS JURUSAN & MULTI-ROMBEL) */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users size={14} className="text-purple-600" />
                      Target Kelas & Jurusan Siswa <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      Pilih seluruh jurusan dalam 1 tingkat, beberapa rombel, atau 1 kelas spesifik
                    </span>
                  </div>
                  
                  {/* Mode switcher tabs */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setClassTargetMode('preset')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        classTargetMode === 'preset'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                      }`}
                    >
                      🎯 Tingkat / Dropdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassTargetMode('multi')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        classTargetMode === 'multi'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                      }`}
                    >
                      👥 Multi-Jurusan
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassTargetMode('custom')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        classTargetMode === 'custom'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                      }`}
                    >
                      ✏️ Manual
                    </button>
                  </div>
                </div>

                {/* 1. PRESET & SINGLE DROPDOWN MODE */}
                {classTargetMode === 'preset' && (
                  <div className="space-y-2.5">
                    {/* Fast 1-click level target pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = 'Semua Kelas X (Semua Jurusan)';
                          setFormData({ ...formData, classTarget: val });
                          if (formData.startTime && formData.endTime) {
                            runConflictCheck(formData.startTime, formData.endTime, val);
                          }
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          formData.classTarget === 'Semua Kelas X (Semua Jurusan)'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-400/30'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        <span className="truncate">🎯 Tingkat X (Semua)</span>
                        {formData.classTarget === 'Semua Kelas X (Semua Jurusan)' && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = 'Semua Kelas XI (Semua Jurusan)';
                          setFormData({ ...formData, classTarget: val });
                          if (formData.startTime && formData.endTime) {
                            runConflictCheck(formData.startTime, formData.endTime, val);
                          }
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          formData.classTarget === 'Semua Kelas XI (Semua Jurusan)'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-400/30'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        <span className="truncate">🎯 Tingkat XI (Semua)</span>
                        {formData.classTarget === 'Semua Kelas XI (Semua Jurusan)' && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = 'Semua Kelas XII (Semua Jurusan)';
                          setFormData({ ...formData, classTarget: val });
                          if (formData.startTime && formData.endTime) {
                            runConflictCheck(formData.startTime, formData.endTime, val);
                          }
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          formData.classTarget === 'Semua Kelas XII (Semua Jurusan)'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-400/30'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        <span className="truncate">🎯 Tingkat XII (Semua)</span>
                        {formData.classTarget === 'Semua Kelas XII (Semua Jurusan)' && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = 'Semua Kelas';
                          setFormData({ ...formData, classTarget: val });
                          if (formData.startTime && formData.endTime) {
                            runConflictCheck(formData.startTime, formData.endTime, val);
                          }
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          formData.classTarget === 'Semua Kelas'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-400/30'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        <span className="truncate">🌐 Seluruh Sekolah</span>
                        {formData.classTarget === 'Semua Kelas' && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                    </div>

                    <select
                      required
                      value={formData.classTarget}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, classTarget: val });
                        if (formData.startTime && formData.endTime) {
                          runConflictCheck(formData.startTime, formData.endTime, val);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Atau Pilih 1 Rombel / Tingkat dari Dropdown --</option>
                      <optgroup label="🌟 Lintas Jurusan (Tingkat)">
                        <option value="Semua Kelas">🌐 Semua Kelas (Terbuka untuk Semua Siswa)</option>
                        <option value="Semua Kelas X (Semua Jurusan)">🎯 Semua Kelas X (Seluruh Jurusan Tingkat X)</option>
                        <option value="Semua Kelas XI (Semua Jurusan)">🎯 Semua Kelas XI (Seluruh Jurusan Tingkat XI)</option>
                        <option value="Semua Kelas XII (Semua Jurusan)">🎯 Semua Kelas XII (Seluruh Jurusan Tingkat XII)</option>
                      </optgroup>
                      {groupedClassOptions.xClasses.length > 0 && (
                        <optgroup label="📚 Tingkat X (Kelas 10)">
                          {groupedClassOptions.xClasses.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedClassOptions.xiClasses.length > 0 && (
                        <optgroup label="📚 Tingkat XI (Kelas 11)">
                          {groupedClassOptions.xiClasses.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedClassOptions.xiiClasses.length > 0 && (
                        <optgroup label="📚 Tingkat XII (Kelas 12)">
                          {groupedClassOptions.xiiClasses.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedClassOptions.others.length > 0 && (
                        <optgroup label="📚 Kelas Lainnya">
                          {groupedClassOptions.others.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {formData.classTarget && !classPresets.includes(formData.classTarget) && (
                        <optgroup label="Kelas Terpilih Sebelumnya">
                          <option value={formData.classTarget}>{formData.classTarget}</option>
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* 2. MULTI-JURUSAN CHECKLIST MODE */}
                {classTargetMode === 'multi' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Centang Rombel yang Diikutsertakan:
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {groupedClassOptions.xClasses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllLevel(groupedClassOptions.xClasses)}
                            className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 cursor-pointer"
                          >
                            + Semua X
                          </button>
                        )}
                        {groupedClassOptions.xiClasses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllLevel(groupedClassOptions.xiClasses)}
                            className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 cursor-pointer"
                          >
                            + Semua XI
                          </button>
                        )}
                        {groupedClassOptions.xiiClasses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllLevel(groupedClassOptions.xiiClasses)}
                            className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 cursor-pointer"
                          >
                            + Semua XII
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, classTarget: 'Semua Kelas' });
                            if (formData.startTime && formData.endTime) {
                              runConflictCheck(formData.startTime, formData.endTime, 'Semua Kelas');
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-300 cursor-pointer"
                        >
                          Bersihkan
                        </button>
                      </div>
                    </div>

                    {/* Checklist badges */}
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {groupedClassOptions.xClasses.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat X</div>
                          <div className="flex flex-wrap gap-1.5">
                            {groupedClassOptions.xClasses.map((c) => {
                              const isChecked = parseClassTargets(formData.classTarget).includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleToggleMultiClass(c)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isChecked
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                    isChecked ? 'bg-white text-purple-600 font-black' : 'border border-slate-300 dark:border-slate-700'
                                  }`}>
                                    {isChecked && '✓'}
                                  </div>
                                  <span>{c}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {groupedClassOptions.xiClasses.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat XI</div>
                          <div className="flex flex-wrap gap-1.5">
                            {groupedClassOptions.xiClasses.map((c) => {
                              const isChecked = parseClassTargets(formData.classTarget).includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleToggleMultiClass(c)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isChecked
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                    isChecked ? 'bg-white text-purple-600 font-black' : 'border border-slate-300 dark:border-slate-700'
                                  }`}>
                                    {isChecked && '✓'}
                                  </div>
                                  <span>{c}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {groupedClassOptions.xiiClasses.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat XII</div>
                          <div className="flex flex-wrap gap-1.5">
                            {groupedClassOptions.xiiClasses.map((c) => {
                              const isChecked = parseClassTargets(formData.classTarget).includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleToggleMultiClass(c)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isChecked
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                    isChecked ? 'bg-white text-purple-600 font-black' : 'border border-slate-300 dark:border-slate-700'
                                  }`}>
                                    {isChecked && '✓'}
                                  </div>
                                  <span>{c}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected summary */}
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs font-semibold text-purple-800 dark:text-purple-300 flex items-center justify-between">
                      <span>🎯 Rombel Terpilih: <strong>{formatClassTargetDisplay(formData.classTarget)}</strong></span>
                    </div>
                  </div>
                )}

                {/* 3. CUSTOM TEXT INPUT MODE */}
                {classTargetMode === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X DKV 1, X MPLB 1 atau Tingkat X"
                    value={formData.classTarget}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, classTarget: val });
                      if (formData.startTime && formData.endTime) {
                        runConflictCheck(formData.startTime, formData.endTime, val);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                )}

                {/* Dynamic Helper Pill based on target */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2 leading-relaxed">
                  <Sparkles size={14} className="text-blue-600 shrink-0" />
                  <span>
                    {formData.classTarget.includes('Semua Kelas X') || formData.classTarget === 'Tingkat X' ? (
                      <>Ujian otomatis dapat diakses oleh <strong>SEMUA siswa di seluruh jurusan Tingkat X</strong> (TJKT, DKV, MPLB, dll). Guru cukup upload 1 kali!</>
                    ) : formData.classTarget.includes('Semua Kelas XI') || formData.classTarget === 'Tingkat XI' ? (
                      <>Ujian otomatis dapat diakses oleh <strong>SEMUA siswa di seluruh jurusan Tingkat XI</strong>. Guru cukup upload 1 kali!</>
                    ) : formData.classTarget.includes('Semua Kelas XII') || formData.classTarget === 'Tingkat XII' ? (
                      <>Ujian otomatis dapat diakses oleh <strong>SEMUA siswa di seluruh jurusan Tingkat XII</strong>. Guru cukup upload 1 kali!</>
                    ) : formData.classTarget === 'Semua Kelas' ? (
                      <>Ujian terbuka untuk <strong>seluruh siswa di semua tingkatan & jurusan</strong>.</>
                    ) : (
                      <>Ujian ditargetkan khusus untuk: <strong>{formatClassTargetDisplay(formData.classTarget)}</strong>.</>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Token Masuk Ujian
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, token: 'CBT' + Math.floor(100 + Math.random() * 900) }))}
                    className="text-[10px] text-purple-600 font-bold hover:underline"
                  >
                    Acak Token
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: CBT889"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                />
              </div>

              {/* 📅 PENGATURAN JADWAL UJIAN & ANTI-BENTROK */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Jadwal Pelaksanaan Ujian (CBT)</div>
                      <div className="text-[11px] text-slate-500">Atur tanggal & waktu ujian agar tidak bertabrakan</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enableSchedule}
                      onChange={(e) => setFormData({ ...formData, enableSchedule: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {formData.enableSchedule && (
                  <div className="space-y-3 pt-1">
                    {/* 🌐 Opsi Zona Waktu Ujian (WIB, WITA, WIT) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/70 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <Globe size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Zona Waktu Ujian:
                        </span>
                      </div>
                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {(['WIB', 'WITA', 'WIT'] as const).map((tz) => (
                          <button
                            key={tz}
                            type="button"
                            onClick={() => handleTimezoneChange(tz)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                              cbtTimezone === tz
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300'
                            }`}
                          >
                            {tz} {tz === 'WIB' ? '(UTC+7)' : tz === 'WITA' ? '(UTC+8)' : '(UTC+9)'}
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold w-full">
                        {cbtTimezone === 'WITA' && '📍 Standar Waktu Kalimantan Selatan (Banjarbaru / WITA UTC+8)'}
                        {cbtTimezone === 'WIB' && '📍 Standar Waktu Pulau Jawa, Sumatera, Kalbar, Kalteng (WIB UTC+7)'}
                        {cbtTimezone === 'WIT' && '📍 Standar Waktu Maluku & Papua (WIT UTC+9)'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Mulai Ujian ({cbtTimezone}) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.startTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            let nextEnd = formData.endTime;
                            if (val && formData.duration && (!isEndTimeManuallyEdited || !formData.endTime)) {
                              nextEnd = addDurationToDateTimeInput(val, formData.duration, cbtTimezone);
                            }
                            setFormData((prev) => ({
                              ...prev,
                              startTime: val,
                              endTime: nextEnd,
                            }));
                            if (val) {
                              runConflictCheck(val, nextEnd, formData.classTarget);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Selesai / Tutup ({cbtTimezone}) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.endTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setIsEndTimeManuallyEdited(true);
                            setFormData({ ...formData, endTime: val });
                            runConflictCheck(formData.startTime, val, formData.classTarget);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Preset Shortcuts */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-400">Pilihan Cepat:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const startStr = formData.startTime || getPresetDateTimeInTimezone(0, 8, 0, cbtTimezone);
                          const endStr = addDurationToDateTimeInput(startStr, formData.duration, cbtTimezone);
                          setIsEndTimeManuallyEdited(false);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
                      >
                        + {formData.duration} Menit (Durasi)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const startStr = getPresetDateTimeInTimezone(0, 8, 0, cbtTimezone);
                          const endStr = getPresetDateTimeInTimezone(0, 10, 0, cbtTimezone);
                          setIsEndTimeManuallyEdited(true);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Hari Ini 08:00 - 10:00 ({cbtTimezone})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const startStr = getPresetDateTimeInTimezone(1, 8, 0, cbtTimezone);
                          const endStr = getPresetDateTimeInTimezone(1, 10, 0, cbtTimezone);
                          setIsEndTimeManuallyEdited(true);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Besok 08:00 - 10:00 ({cbtTimezone})
                      </button>
                    </div>

                    {/* ⚡ Pratinjau Jadwal Terkunci & Validasi Canggih */}
                    {formData.startTime && formData.endTime && (() => {
                      const startIso = parseDateTimeInputToIso(formData.startTime, cbtTimezone);
                      const endIso = parseDateTimeInputToIso(formData.endTime, cbtTimezone);
                      const startDate = new Date(startIso);
                      const endDate = new Date(endIso);
                      const isValid = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());
                      const isEndAfterStart = isValid && endDate > startDate;
                      const windowMinutes = isEndAfterStart ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : 0;
                      const isWindowEnough = windowMinutes >= (formData.duration || 60);

                      return (
                        <div className={`p-3 rounded-xl border text-xs transition-all ${
                          !isEndAfterStart
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            : !isWindowEnough
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Calendar size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>Pratinjau Jadwal Terkunci ({cbtTimezone})</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              !isEndAfterStart
                                ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                : !isWindowEnough
                                ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                            }`}>
                              {!isEndAfterStart ? '⚠️ Waktu Tidak Valid' : !isWindowEnough ? '⚠️ Jendela Terlalu Singkat' : '✓ Jadwal Tepat & Terkunci'}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Rentang Waktu:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatExamScheduleRange(startDate, endDate, cbtTimezone)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Jendela Ujian Terbuka:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {isEndAfterStart ? `${windowMinutes} Menit` : '-'}
                                <span className="text-slate-500 font-normal ml-1">(Durasi Pengerjaan: {formData.duration} Menit)</span>
                              </span>
                            </div>
                          </div>

                          {!isEndAfterStart && (
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mt-1.5 pt-1.5 border-t border-rose-200 dark:border-rose-800">
                              ⚠️ Waktu selesai harus lebih lambat dari waktu mulai ujian!
                            </p>
                          )}
                          {isEndAfterStart && !isWindowEnough && (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-1.5 pt-1.5 border-t border-amber-200 dark:border-amber-800">
                              ⚠️ Jendela ujian ({windowMinutes} menit) lebih singkat dari durasi pengerjaan siswa ({formData.duration} menit). Siswa yang baru mulai di tengah waktu tidak akan mendapat waktu penuh!
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Conflict Indicator */}
                    {checkingConflict && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 animate-pulse pt-1">
                        <RefreshCw size={12} className="animate-spin text-purple-600" />
                        <span>Memeriksa tabrakan jadwal kelas {formData.classTarget}...</span>
                      </div>
                    )}

                    {conflicts.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                          <span>Peringatan: Jadwal Bentrok Terdeteksi! ({conflicts.length} Ujian)</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                          Target kelas <strong>{formData.classTarget}</strong> telah memiliki jadwal ujian lain pada rentang waktu ini:
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {conflicts.map((c) => (
                            <div key={c.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-[11px]">
                              <div className="font-bold text-slate-900 dark:text-white">{c.title}</div>
                              <div className="text-slate-500 flex items-center gap-2 mt-0.5 text-[10px]">
                                <span>Mapel: <strong>{c.subject}</strong></span>
                                <span>•</span>
                                <span>Kelas: <strong>{c.classTarget}</strong></span>
                                <span>•</span>
                                <span>{formatExamScheduleRange(c.startTime, c.endTime, cbtTimezone)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          <input
                            type="checkbox"
                            checked={formData.allowConflict}
                            onChange={(e) => setFormData({ ...formData, allowConflict: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span>Tetap jadwalkan bersamaan (Bypass peringatan bentrok)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guru Pembuat / Pengampu
                </label>
                {!isSuperAdmin ? (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={teacherName}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed outline-none"
                    />
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 block font-medium">
                      🔒 Otomatis terikat pada akun login Anda ({teacherName})
                    </span>
                  </div>
                ) : (
                  <div>
                    {teachers && teachers.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={formData.authorName}
                          onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                        >
                          <option value={teacherName}>-- Saya Sendiri ({teacherName}) --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.username})
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-400 block">
                          👑 Mode Admin Utama: Anda dapat menugaskan paket ujian ini ke akun guru pengampu tertentu.
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.authorName}
                        onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Petunjuk & Catatan Ujian
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruksi untuk siswa sebelum mulai..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Acak Urutan Soal (Anti-Contek)</div>
                  <div className="text-[11px] text-slate-500">Urutan butir soal akan berbeda pada tiap siswa</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : editingExam ? 'Simpan Perubahan' : 'Buat Paket Ujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧙‍♂️ MODAL PENJADWALAN KOLEKTIF (BATCH SCHEDULER WIZARD) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* STICKY HEADER */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 flex-shrink-0 bg-white dark:bg-slate-900">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold mb-1">
                  <Zap size={12} /> Fitur Kolektif Kurikulum & Panitia
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Atur Jadwal Ujian Massal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menjadwalkan <strong className="text-purple-600 font-bold">{selectedExamIds.length} paket ujian</strong> sekaligus tanpa perlu edit satu per satu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Selected Exam Chips */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    Paket Ujian yang Dipilih ({selectedExamIds.length})
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                    Klik &times; untuk membatalkan
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {exams
                    .filter((e) => selectedExamIds.includes(e.id))
                    .map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                      >
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          {e.classTarget}
                        </span>
                        <span className="truncate max-w-[220px]">{e.title}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelectExam(e.id)}
                          className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                          title="Hapus dari seleksi"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
              </div>

              {/* 🌐 Timezone Selector in Batch Modal */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/50">
                <div className="flex items-center gap-1.5">
                  <Globe size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Zona Waktu Penjadwalan:
                  </span>
                </div>
                <div className="inline-flex p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 shadow-2xs">
                  {(['WIB', 'WITA', 'WIT'] as const).map((tz) => (
                    <button
                      key={tz}
                      type="button"
                      onClick={() => handleTimezoneChange(tz)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        cbtTimezone === tz
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-purple-700'
                      }`}
                    >
                      {tz}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold w-full sm:w-auto">
                  {cbtTimezone === 'WITA' ? 'WITA (Banjarbaru / UTC+8)' : cbtTimezone === 'WIB' ? 'WIB (Jakarta / UTC+7)' : 'WIT (Jayapura / UTC+9)'}
                </span>
              </div>

              {/* Mode Tabs: Paralel vs Sequential */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBatchMode('PARALLEL')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchMode === 'PARALLEL'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Clock size={14} /> Jam Serentak (Paralel)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('SEQUENTIAL')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchMode === 'SEQUENTIAL'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers size={14} /> Sesi Berurutan (Shift Otomatis)
                </button>
              </div>

              {/* Mode 1: PARALLEL */}
              {batchMode === 'PARALLEL' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 text-xs border border-purple-100 dark:border-purple-900/50 flex items-start gap-2.5">
                    <Clock size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Semua ujian yang dipilih akan diset pada <strong>tanggal dan jam yang persis sama</strong> (cocok jika beberapa kelas berbeda mengerjakan ujian masing-masing pada jam serentak).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tanggal Pelaksanaan Ujian
                    </label>
                    <input
                      type="date"
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Jam Mulai ({cbtTimezone})
                      </label>
                      <input
                        type="time"
                        value={batchStartTime}
                        onChange={(e) => setBatchStartTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Jam Selesai ({cbtTimezone})
                      </label>
                      <input
                        type="time"
                        value={batchEndTime}
                        onChange={(e) => setBatchEndTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-xs text-slate-400 font-bold">Preset Durasi Cepat:</span>
                    {[30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          if (!batchStartTime) return;
                          const [h, m] = batchStartTime.split(':').map(Number);
                          const totalMins = h * 60 + m + mins;
                          const newH = Math.floor(totalMins / 60) % 24;
                          const newM = totalMins % 60;
                          setBatchEndTime(
                            `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-900/40 text-xs font-bold text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        +{mins} Menit
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 2: SEQUENTIAL */}
              {batchMode === 'SEQUENTIAL' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5">
                    <Layers size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Sistem akan <strong>menghitung jam ujian secara bertingkat/berurutan otomatis</strong> dari Sesi 1 sampai selesai, lengkap dengan jeda istirahat antar ujian.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tanggal Pelaksanaan
                      </label>
                      <input
                        type="date"
                        value={batchDate}
                        onChange={(e) => setBatchDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Jam Mulai Sesi 1 ({cbtTimezone})
                      </label>
                      <input
                        type="time"
                        value={batchSeqStart}
                        onChange={(e) => setBatchSeqStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Durasi Ujian
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={batchDurationType}
                          onChange={(e) => setBatchDurationType(e.target.value as any)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="DEFAULT">Durasi Asli Masing-Masing</option>
                          <option value="CUSTOM">Durasi Seragam</option>
                        </select>
                        {batchDurationType === 'CUSTOM' && (
                          <input
                            type="number"
                            min={15}
                            max={300}
                            value={batchUniformDuration}
                            onChange={(e) => setBatchUniformDuration(Number(e.target.value))}
                            className="w-20 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-center"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Jeda Istirahat Antar Ujian
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[0, 10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setBatchBreakMinutes(mins)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              batchBreakMinutes === mins
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {mins} mnt
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Timeline Simulation */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Simulasi Agenda yang Dihasilkan:
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {getSequentialSchedulePreview().map((item, idx) => (
                        <div key={item.exam.id} className="space-y-1">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <div>
                                <strong className="text-slate-900 dark:text-white block">{item.exam.title}</strong>
                                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                  Kelas: {formatClassTargetDisplay(item.exam.classTarget)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                              {item.startDisplay} - {item.endDisplay} {cbtTimezone}
                            </div>
                          </div>
                          {item.breakAfter > 0 && (
                            <div className="text-[10px] text-center font-bold text-amber-600 dark:text-amber-400 py-0.5">
                              ☕ Istirahat {item.breakAfter} Menit
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Anti-Bentrok Bypass Checkbox */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={batchAllowConflict}
                    onChange={(e) => setBatchAllowConflict(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer accent-purple-600"
                  />
                  <span>Izinkan penjadwalan jika ada bentrok (Bypass warning)</span>
                </label>
              </div>
            </div>

            {/* STICKY FOOTER */}
            <div className="px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                <strong className="text-purple-600 font-bold">{selectedExamIds.length}</strong> ujian siap dijadwalkan
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchWizard}
                  disabled={batchLoading || selectedExamIds.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/25 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Zap size={14} />
                  {batchLoading ? 'Menerapkan...' : `Terapkan ke ${selectedExamIds.length} Paket Ujian`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📥 MODAL PREVIEW IMPORT CSV JADWAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* STICKY HEADER */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 flex-shrink-0 bg-white dark:bg-slate-900">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold mb-1">
                  <FileSpreadsheet size={13} /> Import Excel / CSV Jadwal
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Konfirmasi Terapkan Jadwal dari CSV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ditemukan <strong className="text-emerald-600 font-bold">{csvParsedRows.length} baris jadwal ujian</strong> yang valid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE TABLE BODY */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Mata Pelajaran & Judul</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Waktu Mulai Baru</th>
                      <th className="py-2.5 px-3">Waktu Selesai Baru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {csvParsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{r.title}</span>
                          <span className="text-[11px] text-purple-600 dark:text-purple-400">{r.subject}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-600">{formatClassTargetDisplay(r.classTarget)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {formatScheduleDate(r.startTime, cbtTimezone)} • {formatScheduleTime(r.startTime, cbtTimezone)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {formatScheduleDate(r.endTime, cbtTimezone)} • {formatScheduleTime(r.endTime, cbtTimezone)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STICKY FOOTER */}
            <div className="px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total <strong className="text-emerald-600 font-bold">{csvParsedRows.length}</strong> jadwal baru
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyCsvSchedules}
                  disabled={csvSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all"
                >
                  <CheckCheck size={14} />
                  {csvSaving ? 'Menyimpan...' : `Simpan ${csvParsedRows.length} Jadwal ke Database`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL PERINGATAN / NOTIFIKASI KETIDAKSESUAIAN JADWAL RILIS TOKEN (Compact & Elegan) */}
      {scheduleNoticeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setScheduleNoticeModal(null)}
        >
          <div 
            className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-[1.75rem] max-w-md w-full p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Amber Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400" />

            {/* Header */}
            <div className="flex items-start gap-3 pt-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-4 ring-amber-500/10">
                <AlertTriangle size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  Pemberitahuan Waktu Ujian
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rilis token / sesi di luar jadwal resmi paket ujian
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                aria-label="Tutup"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Details Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Paket Ujian:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[210px]">
                  {scheduleNoticeModal.exam.title}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Mapel / Target:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                  {scheduleNoticeModal.exam.subject} ({formatClassTargetDisplay(scheduleNoticeModal.exam.classTarget, true)})
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Jadwal Resmi:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                  {scheduleNoticeModal.discrepancy.scheduledRangeText}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Sekarang:</span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                  {scheduleNoticeModal.discrepancy.formattedCurrentTime}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium text-[11px] leading-relaxed">
                {scheduleNoticeModal.discrepancy.message}
              </div>
            </div>

            {/* Informative notice */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Zap size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <strong>Ujian Tetap Bisa Dilakukan:</strong> Notifikasi ini memastikan pengawas mengetahui waktu ujian. Sesi tetap bisa dibuka untuk susulan atau remedial.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScheduleNoticeModal(null)}
                className="w-1/2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer active:scale-95 text-center"
              >
                Batal / Cek Jadwal
              </button>
              <button
                type="button"
                onClick={() => {
                  const examToOpen = scheduleNoticeModal.exam;
                  setScheduleNoticeModal(null);
                  handleQuickToggleSession(examToOpen, true);
                }}
                className="w-1/2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <Play size={12} className="fill-white" />
                <span>Tetap Buka Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🪪 Modal Studio Cetak Kartu Peserta & Login CBT (Khusus Admin Utama) */}
      {isSuperAdmin && (
        <CbtParticipantCardModal
          isOpen={isParticipantCardModalOpen}
          onClose={() => setIsParticipantCardModalOpen(false)}
          kopSuratConfig={kopSuratConfig}
          initialClasses={classPresets}
          cbtTimezone={cbtTimezone}
        />
      )}

      {/* Modal Hapus Ujian */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Paket Ujian"
        message="Apakah Anda yakin ingin menghapus paket ujian ini? Semua butir soal dan riwayat nilai siswa yang telah mengerjakan akan ikut terhapus permanen."
        confirmText="Ya, Hapus Ujian"
        cancelText="Batal"
        variant="danger"
        isLoading={loading}
      />

      {/* 🌟 Universal High-Tech Center Feedback & Alert Dialog */}
      {feedbackModal && (
        <ConfirmModal
          isOpen={feedbackModal.isOpen}
          onClose={() => setFeedbackModal(null)}
          onConfirm={feedbackModal.onConfirm}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText={feedbackModal.confirmText}
          cancelText={feedbackModal.cancelText}
          variant={feedbackModal.variant || 'info'}
          isAlert={feedbackModal.isAlert}
          isLoading={loading || batchLoading || inlineSaving}
        />
      )}

      {/* 📥 Modal Studio Unduh & Cadangan Bank Soal (Format Siap Upload Ulang) */}
      {downloadModalData && (
        <CbtDownloadBankSoalModal
          isOpen={downloadModalData.isOpen}
          onClose={() => setDownloadModalData(null)}
          examTitle={downloadModalData.examTitle}
          examSubject={downloadModalData.examSubject}
          questions={downloadModalData.questions}
          totalPoints={downloadModalData.totalPoints}
        />
      )}

      {/* 🖨️ MODAL CETAK JADWAL PELAKSANAAN RESMI CBT */}
      <CbtPrintModalWrapper
        isOpen={isSchedulePrintModalOpen}
        onClose={() => setIsSchedulePrintModalOpen(false)}
        title="Pratinjau Cetak Jadwal Resmi Ujian CBT"
        subtitle="Dokumen resmi jadwal pelaksanaan ujian berbasis komputer untuk papan pengumuman & arsip dinas"
        maxWidth="max-w-5xl"
        printButtonText="Cetak / Simpan ke PDF"
        onDownloadPdf={handleDownloadScheduleDocument}
        downloadPdfButtonText="Unduh Dokumen (Siap Kirim)"
        isDownloadingPdf={isDownloadingSchedulePdf}
        footerExtra={
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="text-emerald-600 font-bold">💡 Tips:</span>
            <span>Klik tombol hijau untuk mengunduh dokumen instan (bisa langsung dikirim via WhatsApp), atau klik tombol cetak untuk Simpan ke PDF.</span>
          </div>
        }
      >
        {/* 🎛️ PANEL PENETAPAN KETUA PANITIA UJIAN (HANYA BISA DIUBAH ADMIN UTAMA) - DILUAR DOKUMEN CETAK */}
        <div 
          id="cbt-committee-selector-banner"
          className="print:hidden cbt-ignore-pdf mb-4 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 dark:border-purple-800/40 rounded-2xl shadow-xs font-sans text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <UserCheck size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs">
                    Penetapan Ketua Panitia Ujian CBT
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-extrabold text-[10px] uppercase tracking-wider">
                    User Guru
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isSuperAdmin
                    ? 'Khusus Admin Utama: Tunjuk akun Guru yang menandatangani jadwal resmi sebagai Ketua Panitia.'
                    : 'Ketua Panitia Ujian resmi ditetapkan oleh Admin Utama.'}
                </p>
              </div>
            </div>

            {/* Dropdown Selector (Active for Admin Utama, Read-only badge for non-admin) */}
            <div className="flex items-center gap-2">
              {isSuperAdmin ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap hidden sm:inline">
                    Pilih Guru:
                  </label>
                  <select
                    value={selectedCommitteeTeacherId}
                    onChange={(e) => handleSelectCommitteeTeacher(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-purple-300 bg-white font-semibold text-slate-900 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    {teacherCandidates.map((t) => (
                      <option key={t.id} value={t.id}>
                        👨‍🏫 {t.name} {t.nisn ? `(NIP: ${t.nisn})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-purple-100/80 border border-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1.5">
                  <span>👨‍🏫 {effectiveCommitteeHead.name}</span>
                  {effectiveCommitteeHead.nip && (
                    <span className="text-[10px] text-purple-700 font-normal">
                      (NIP: {effectiveCommitteeHead.nip})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📄 DOKUMEN CETAK RESMI KEDINASAN (MENGALIR SECARA ALAMI TANPA GAP KOSONG) */}
        <div id="cbt-printable-official-schedule" className="space-y-4 print:space-y-2.5 bg-white font-serif text-slate-950 cbt-printable-sheet">
          {/* Kop Surat Resmi */}
          <CbtOfficialKopSurat
            config={kopSuratConfig}
            documentTitle="JADWAL PELAKSANAAN RESMI UJIAN BERBASIS KOMPUTER (CBT)"
            documentNumber={`421.5/PAN-CBT/${new Date().getFullYear()}`}
            subTitle={`TAHUN AJARAN ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
          />

          {/* Info Metadata */}
          <div className="border border-slate-300 rounded-lg p-2.5 print:p-2 bg-slate-50/60 font-sans text-xs print:text-[10px] space-y-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] print:text-[9px] uppercase">Zona Waktu:</span>
                <span className="font-bold text-slate-900">{cbtTimezone} (Standar Server)</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] print:text-[9px] uppercase">Filter Ruangan:</span>
                <span className="font-bold text-slate-900">{selectedRoomFilter === 'ALL' ? 'Semua Ruangan' : selectedRoomFilter}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] print:text-[9px] uppercase">Filter Kelas:</span>
                <span className="font-bold text-slate-900">{selectedClassFilter === 'ALL' ? 'Seluruh Rombel' : selectedClassFilter}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] print:text-[9px] uppercase">Total Terjadwal:</span>
                <span className="font-bold text-slate-900">{scheduledExams.length} Paket Ujian</span>
              </div>
            </div>
          </div>

          {/* Tabel Terstruktur per Hari (Alami & Mengalir, Tidak Memaksa Lompat Halaman) */}
          <div className="space-y-4 print:space-y-3">
            {groupedScheduleByDay.sortedDays.map((day, dayIdx) => (
              <div key={day.dateKey} className="space-y-1.5 print:space-y-1">
                {/* Header Hari (Anti-Break agar nempel dengan tabel) */}
                <div className="bg-slate-100 border-l-4 border-slate-800 px-3 py-1 print:py-0.5 flex items-center justify-between font-sans print-avoid-break">
                  <div className="font-bold text-xs print:text-[10.5px] uppercase tracking-wider text-slate-900">
                    📅 HARI KE-{dayIdx + 1} : {day.dayName.toUpperCase()}, {day.fullDateLabel.toUpperCase()}
                  </div>
                  <div className="text-[11px] print:text-[10px] text-slate-600 font-medium">
                    {day.exams.length} Ujian Terjadwal
                  </div>
                </div>

                <table className="w-full text-left text-[11px] print:text-[10px] font-sans border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] print:text-[9px]">
                    <tr>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-7">No</th>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-32 print:w-28">Waktu / Sesi ({cbtTimezone})</th>
                      <th className="border border-slate-300 py-1.5 px-2.5">Mata Pelajaran & Judul Ujian</th>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-24">Target Kelas</th>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-20">Ruang</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 text-center w-14">Durasi</th>
                      <th className="border border-slate-300 py-1.5 px-2.5">Guru Pengampu</th>
                      <th className="border border-slate-300 py-1.5 px-2.5 bg-blue-50/70 text-blue-900">Pengawas Ruang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exams.map((exam, exIdx) => (
                      <tr key={exam.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-slate-600">
                          {exIdx + 1}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold text-slate-900 whitespace-nowrap text-[10px]">
                          {formatExamScheduleRange(exam.startTime, exam.endTime, cbtTimezone)}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5">
                          <strong className="block text-slate-900 font-bold">{exam.subject}</strong>
                          <span className="text-[10px] print:text-[9px] text-slate-500 block leading-tight">{exam.title}</span>
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-slate-800">
                          {exam.classTarget}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold text-slate-800">
                          {exam.roomName?.trim() || 'Ruang Utama'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center text-slate-700">
                          {exam.duration} m
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-slate-800 text-[10px]">
                          {exam.authorName || 'Guru Pengampu'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-[10px]">
                          {exam.proctorName ? (
                            <div>
                              <span className="font-bold text-slate-900 block">{exam.proctorName}</span>
                              {exam.proctor2Name && (
                                <span className="text-[9px] text-slate-500 block">P2: {exam.proctor2Name}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 font-semibold italic text-[10px]">Belum Di-plot</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {groupedScheduleByDay.unscheduledList.length > 0 && (
              <div className="space-y-1.5 print:space-y-1">
                <div className="bg-amber-100 border-l-4 border-amber-600 px-3 py-1 print-avoid-break font-sans font-bold text-xs uppercase tracking-wider text-amber-900">
                  ⚠️ PAKET UJIAN BELUM DIBERI JADWAL ({groupedScheduleByDay.unscheduledList.length})
                </div>
                <table className="w-full text-left text-[11px] print:text-[10px] font-sans border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] print:text-[9px]">
                    <tr>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-7">No</th>
                      <th className="border border-slate-300 py-1.5 px-2.5">Mata Pelajaran & Judul Ujian</th>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-24">Target Kelas</th>
                      <th className="border border-slate-300 py-1.5 px-2 text-center w-20">Ruang</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 text-center w-14">Durasi</th>
                      <th className="border border-slate-300 py-1.5 px-2.5">Guru Pengampu</th>
                      <th className="border border-slate-300 py-1.5 px-2.5 bg-blue-50/70 text-blue-900">Pengawas Ruang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedScheduleByDay.unscheduledList.map((exam, exIdx) => (
                      <tr key={exam.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600 font-bold">{exIdx + 1}</td>
                        <td className="border border-slate-300 py-1.5 px-2.5">
                          <strong className="block text-slate-900 font-bold">{exam.subject}</strong>
                          <span className="text-[10px] print:text-[9px] text-slate-500 block leading-tight">{exam.title}</span>
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">{exam.classTarget}</td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center">{exam.roomName?.trim() || 'Ruang Utama'}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center">{exam.duration} m</td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-slate-800 text-[10px]">{exam.authorName || 'Guru Pengampu'}</td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-[10px]">
                          {exam.proctorName ? (
                            <span className="font-bold text-slate-900">{exam.proctorName}</span>
                          ) : (
                            <span className="text-amber-600 font-semibold italic text-[10px]">Belum Di-plot</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Kotak Validasi & Lembar Tanda Tangan Resmi (Anti-Break agar menyatu) */}
          <div className="print-avoid-break space-y-4 print:space-y-3 pt-2">
            {/* QR Keabsahan Digital */}
            <CbtSecurityValidationBox
              verificationCode={`SCH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`}
              examTitle="Jadwal Resmi Pelaksanaan CBT"
            />

            {/* Lembar Tanda Tangan Resmi */}
            <CbtOfficialSignatures
              config={kopSuratConfig}
              mode="two-column"
              teacherName={effectiveCommitteeHead.name}
              teacherNip={effectiveCommitteeHead.nip || undefined}
              subTitle={effectiveCommitteeHead.nip ? `NIP. ${effectiveCommitteeHead.nip}` : (kopSuratConfig?.schoolName || 'SMK GARUDA MAHADHIKA')}
              roleTitle="Ketua Panitia Ujian CBT"
              dateString={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
          </div>
        </div>
      </CbtPrintModalWrapper>

      {/* Footer identitas pengembang */}
      <footer className="mt-12 pt-6 pb-2 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
        <span>Smart CBT Engine • SMK Digital Vocational Excellence</span>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">Created By Abdul Rahman</span>
      </footer>
    </div>
  );
}
