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
  Globe
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import CbtParticipantCardModal from '@/components/cbt/CbtParticipantCardModal';
import { 
  createExam, 
  updateExam, 
  deleteExam, 
  toggleExamSession, 
  checkExamScheduleConflict, 
  ScheduleConflictExam,
  batchUpdateExamSchedules,
  batchCreateExamsWithSchedule,
  saveCbtTimezone
} from './actions';
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
import { RELIGION_OPTIONS, getReligionConfig } from '@/lib/cbt-religion';
import CbtReportView from './CbtReportView';
import CbtProctorPlottingView, { TeacherUserItem } from './CbtProctorPlottingView';
import CbtSuspendCenterView from './CbtSuspendCenterView';
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
  initialTab?: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend';
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
  const [mineOnlyFilter, setMineOnlyFilter] = useState(false);
  const [adminTeacherFilter, setAdminTeacherFilter] = useState('ALL');
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);

  const teacherName = currentUser?.name || 'Guru Pengampu';
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';

  // Timezone State (WIB, WITA, WIT)
  const [cbtTimezone, setCbtTimezone] = useState<CbtTimezone>(initialTimezone || DEFAULT_CBT_TIMEZONE);

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

  // Main View Tab: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend'
  const [activeMainTab, setActiveMainTab] = useState<'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend'>(initialTab);
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

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
    } else if (tabParam === 'ujian' || !tabParam) {
      setActiveMainTab('exams');
    }
  }, [searchParams]);

  const handleTabSwitch = (tab: 'exams' | 'schedule' | 'reports' | 'proctors' | 'suspend') => {
    setActiveMainTab(tab);
    if (tab === 'schedule') {
      router.replace('/admin/cbt?tab=jadwal', { scroll: false });
    } else if (tab === 'reports') {
      router.replace('/admin/cbt?tab=laporan', { scroll: false });
    } else if (tab === 'proctors') {
      router.replace('/admin/cbt?tab=pengawas', { scroll: false });
    } else if (tab === 'suspend') {
      router.replace('/admin/cbt?tab=suspend', { scroll: false });
    } else {
      router.replace('/admin/cbt', { scroll: false });
    }
  };

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
    const defaults = [
      'Pemrograman Web',
      'Basis Data',
      'Pemrograman Berorientasi Objek',
      'Administrasi Sistem Jaringan',
      'Teknologi Layanan Jaringan',
      'Desain Media Interaktif',
      'Dasar-dasar Kejuruan',
      'Matematika',
      'Bahasa Inggris',
      'Bahasa Indonesia',
      'Pendidikan Agama',
    ];
    if (dynamicSubjectPresets && dynamicSubjectPresets.length > 0) {
      return Array.from(new Set([...dynamicSubjectPresets, ...defaults]));
    }
    return defaults;
  }, [dynamicSubjectPresets]);

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

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Pemrograman Web',
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
      alert(`Berhasil menyimpan perubahan jadwal untuk ${payload.length} paket ujian!`);
    } else {
      alert(res.error || 'Gagal menyimpan perubahan matriks jadwal.');
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
        alert('Mohon lengkapi tanggal, jam mulai, dan jam selesai.');
        setBatchLoading(false);
        return;
      }
      const startIso = parseDateTimeInputToIso(`${batchDate}T${batchStartTime}`, cbtTimezone);
      const endIso = parseDateTimeInputToIso(`${batchDate}T${batchEndTime}`, cbtTimezone);
      if (new Date(startIso) >= new Date(endIso)) {
        alert('Jam mulai harus lebih awal dari jam selesai.');
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
      alert(`Sukses! ${payload.length} jadwal ujian berhasil diperbarui secara kolektif.`);
    } else {
      alert(res.error || 'Gagal menerapkan jadwal kolektif.');
    }
    setBatchLoading(false);
  };

  const handleClearSelectedSchedules = async () => {
    if (selectedExamIds.length === 0) return;
    if (
      !confirm(
        `Kosongkan jadwal untuk ${selectedExamIds.length} ujian terpilih? Ujian akan berstatus tanpa jadwal.`
      )
    ) {
      return;
    }
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
      alert(`Jadwal untuk ${payload.length} ujian berhasil dikosongkan.`);
    } else {
      alert(res.error || 'Gagal mengosongkan jadwal.');
    }
    setLoading(false);
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
        alert(err.message || 'Gagal memproses file CSV.');
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
      alert(`Berhasil mengimpor dan menerapkan jadwal untuk ${payload.length} ujian dari CSV!`);
    } else {
      alert(res.error || 'Gagal menerapkan jadwal dari CSV.');
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
      subject: subjectPresets[0] || 'Pemrograman Web',
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
      alert('Akses ditolak: Anda bertugas sebagai Pengawas dan tidak memiliki izin untuk mengedit paket ujian ini.');
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

    setSessionLoadingId(exam.id);
    const res = await toggleExamSession(exam.id, nextOpen, exam.token || undefined);

    if (res.success && res.data) {
      setExams(exams.map((e) => (e.id === exam.id ? { 
        ...e, 
        status: res.data.status, 
        token: res.data.token,
        updatedAt: res.data.updatedAt || new Date().toISOString(),
      } : e)));
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian');
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
        alert('Jadwal Mulai harus lebih awal daripada Jadwal Selesai.');
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
        alert(res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.');
      } else {
        alert(res.error || 'Gagal mengubah ujian');
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
        alert(res.error || 'Terdeteksi bentrok jadwal ujian! Silakan sesuaikan jam atau centang bypass.');
      } else {
        alert(res.error || 'Gagal membuat ujian');
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
      alert(res.error || 'Gagal menghapus ujian');
    }
    setLoading(false);
  };

  const filteredExams = exams.filter((exam) => {
    // Hak Akses Tampilan Paket Ujian:
    // - Jika Guru: HANYA tampilkan paket ujian yang diinput / dimiliki oleh dirinya sendiri.
    // - Jika Super Admin: Tampilkan seluruhnya untuk monitoring, atau filter sesuai pilihan admin.
    if (!isSuperAdmin && !isAuthorMatch(exam.authorName)) {
      return false;
    }
    if (isSuperAdmin) {
      if (mineOnlyFilter && !isAuthorMatch(exam.authorName)) return false;
      if (adminTeacherFilter !== 'ALL' && exam.authorName !== adminTeacherFilter) return false;
    }

    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.authorName && exam.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
    
    const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
    const matchesSchedule =
      scheduleFilter === 'ALL' ||
      (scheduleFilter === 'TODAY' && schedState.isOngoingToday) ||
      (scheduleFilter === 'ONGOING' && schedState.state === 'ONGOING') ||
      (scheduleFilter === 'UPCOMING' && schedState.state === 'UPCOMING') ||
      (scheduleFilter === 'ENDED' && schedState.state === 'ENDED');

    return matchesSearch && matchesStatus && matchesSchedule;
  });

  // Calculate system-wide schedule conflicts across all exams
  const systemConflicts: Array<{ exam1: ExamItem; exam2: ExamItem }> = [];
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
        systemConflicts.push({ exam1: e1, exam2: e2 });
      }
    }
  }

  // Filter exams for schedule matrix table
  const scheduledExams = exams.filter((exam) => {
    if (!isSuperAdmin && !isAuthorMatch(exam.authorName)) {
      return false;
    }
    if (isSuperAdmin && adminTeacherFilter !== 'ALL' && exam.authorName !== adminTeacherFilter) {
      return false;
    }

    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.authorName && exam.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
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

    return matchesSearch && matchesClass && matchesSchedule;
  }).sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // Calculate stats based on visible exams (guru sees their own stats, admin sees all)
  const visibleExams = isSuperAdmin ? exams : exams.filter((e) => isAuthorMatch(e.authorName));
  const totalExams = visibleExams.length;
  const totalQuestions = visibleExams.reduce((acc, curr) => acc + curr._count.questions, 0);
  const totalAttempts = visibleExams.reduce((acc, curr) => acc + curr._count.attempts, 0);
  const totalSubmitted = visibleExams.flatMap((e) => e.attempts).filter((a) => a.status === 'SUBMITTED');
  const avgScore = totalSubmitted.length > 0
    ? Math.round(totalSubmitted.reduce((acc, a) => acc + a.score, 0) / totalSubmitted.length)
    : 0;
  const unscheduledCount = visibleExams.filter((e) => !e.startTime || !e.endTime).length;

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
          <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-1.5 sm:gap-2 w-full`}>
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

      {activeMainTab === 'suspend' && isSuperAdmin ? (
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
            <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>Peringatan Sistem: Terdeteksi {systemConflicts.length} Pasang Jadwal Ujian yang Bertabrakan!</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                Ujian di bawah ini memiliki waktu pengerjaan yang saling tumpang tindih untuk kelas yang sama. Klik tombol <strong>Ubah Jadwal</strong> untuk menyesuaikan jam ujian:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {systemConflicts.map((conf, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">{conf.exam1.title}</span>
                        <span className="text-[11px] text-slate-500">{conf.exam1.subject} • Kelas: <strong className="text-rose-600">{conf.exam1.classTarget}</strong></span>
                        <span className="text-[11px] text-purple-600 block mt-0.5">{formatExamScheduleRange(conf.exam1.startTime, conf.exam1.endTime, cbtTimezone)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(conf.exam1)}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
                      >
                        Ubah Jadwal
                      </button>
                    </div>
                    <div className="text-[10px] text-center font-bold text-rose-500 uppercase tracking-widest border-t border-b border-rose-100 dark:border-rose-900/40 py-0.5">
                      ⚔️ BENTROK WAKTU DENGAN:
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">{conf.exam2.title}</span>
                        <span className="text-[11px] text-slate-500">{conf.exam2.subject} • Kelas: <strong className="text-rose-600">{conf.exam2.classTarget}</strong></span>
                        <span className="text-[11px] text-purple-600 block mt-0.5">{formatExamScheduleRange(conf.exam2.startTime, conf.exam2.endTime, cbtTimezone)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(conf.exam2)}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
                      >
                        Ubah Jadwal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Seluruh Jadwal Ujian Telah Selaras & Bebas Bentrok</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Sistem otomatis mendeteksi 0 bentrok jadwal antar mata pelajaran untuk setiap kelas.</p>
                </div>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Tambah Jadwal Ujian
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

          {/* Schedule Filter & Target Class Selector */}
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                    <Users size={14} /> Filter Kelas:
                  </div>
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
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

                {/* Status pills scrollable on mobile */}
                <div className="w-full sm:w-auto overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
                  <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl min-w-max">
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          scheduleFilter === s.id
                            ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari jadwal ujian, mapel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* ⚡ TOOLBAR PENJADWALAN KOLEKTIF & CSV */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedExamIds.length === 0) {
                    alert('Pilih minimal 1 paket ujian dengan mencentang kotak di tabel terlebih dahulu.');
                    return;
                  }
                  setIsBatchModalOpen(true);
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <Zap size={14} className="shrink-0" /> Atur Jadwal Kolektif
              </button>

              {isInlineEditMode ? (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveInlineSchedules}
                    disabled={inlineSaving}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 text-center"
                  >
                    <Save size={14} className="shrink-0" /> {inlineSaving ? 'Menyimpan...' : 'Simpan Semua'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInlineEditMode(false)}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-center justify-center"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleInlineEdit}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer text-center"
                >
                  <Edit3 size={14} className="text-purple-600 shrink-0" /> Mode Edit Cepat di Tabel
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadScheduleCsv}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                title="Download template CSV untuk edit jadwal secara massal di Excel"
              >
                <Download size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                title="Upload file CSV hasil edit jadwal untuk diterapkan sekaligus"
              >
                <Upload size={14} className="text-emerald-600 shrink-0" />
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

          {/* Quick Select Helper Chips */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span className="font-semibold">Pilih Cepat:</span>
            <button
              type="button"
              onClick={() => selectCurrentFilteredOnly(scheduledExams)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Semua yang Terlihat ({scheduledExams.length})
            </button>
            <button
              type="button"
              onClick={selectUnscheduledOnly}
              className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium cursor-pointer"
            >
              Belum Terjadwal ({unscheduledCount})
            </button>
            {selectedExamIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedExamIds([])}
                className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-rose-500 font-semibold cursor-pointer"
              >
                Reset Seleksi
              </button>
            )}
          </div>

          {/* Schedule Matrix Table */}
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
                                <button
                                  onClick={() => handleOpenEdit(exam)}
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 size={13} /> Atur Jadwal
                                </button>
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
        </div>
      ) : (
        <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalExams}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Paket Ujian</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalQuestions}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Butir Soal</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalAttempts}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Siswa Mengerjakan</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore} / 100</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rata-Rata Nilai</div>
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

            {/* Reset Filters Button if any filter active */}
            {(searchTerm || statusFilter !== 'ALL' || scheduleFilter !== 'ALL' || mineOnlyFilter || adminTeacherFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setScheduleFilter('ALL');
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

      {/* ⚠️ MODAL PERINGATAN / NOTIFIKASI KETIDAKSESUAIAN JADWAL RILIS TOKEN */}
      {scheduleNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            {/* Header */}
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

            {/* Content Details Box */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Paket Ujian:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[240px]">
                  {scheduleNoticeModal.exam.title}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Mata Pelajaran / Target:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {scheduleNoticeModal.exam.subject} ({formatClassTargetDisplay(scheduleNoticeModal.exam.classTarget, true)})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Jadwal Resmi:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {scheduleNoticeModal.discrepancy.scheduledRangeText}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Sekarang:</span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                  {scheduleNoticeModal.discrepancy.formattedCurrentTime}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium text-[11px] leading-relaxed">
                {scheduleNoticeModal.discrepancy.message}
              </div>
            </div>

            {/* Informative notice */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Zap size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Ujian Tetap Bisa Dilakukan:</strong> Notifikasi ini bertujuan untuk memastikan pengawas mengetahui kesesuaian waktu ujian. Ujian tetap dapat dikerjakan siswa (misalnya untuk ujian susulan, remedial, atau penyesuaian waktu oleh pengawas).
              </div>
            </div>

            {/* Action Buttons */}
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
                  const examToOpen = scheduleNoticeModal.exam;
                  setScheduleNoticeModal(null);
                  handleQuickToggleSession(examToOpen, true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Tetap Rilis Token & Buka Sesi</span>
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
        variant="danger"
        isLoading={loading}
      />

      {/* Footer identitas pengembang */}
      <footer className="mt-12 pt-6 pb-2 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
        <span>Smart CBT Engine • SMK Digital Vocational Excellence</span>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">Created By Abdul Rahman</span>
      </footer>
    </div>
  );
}
