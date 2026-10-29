'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  RotateCcw
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  createExam, 
  updateExam, 
  deleteExam, 
  toggleExamSession, 
  checkExamScheduleConflict, 
  ScheduleConflictExam,
  batchUpdateExamSchedules,
  batchCreateExamsWithSchedule
} from './actions';
import { 
  formatExamScheduleRange, 
  getExamScheduleState, 
  toDateTimeLocalInput 
} from '@/lib/cbt-schedule';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status: string;
  shuffleQuestions: boolean;
  authorName: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  createdAt: Date | string;
  _count: {
    questions: number;
    attempts: number;
  };
  attempts: {
    score: number;
    status: string;
  }[];
}

interface CbtDashboardProps {
  exams: ExamItem[];
  currentUser?: {
    name: string;
    role: string;
  };
}

export default function CbtDashboard({ exams: initialExams, currentUser }: CbtDashboardProps) {
  const [exams, setExams] = useState(initialExams);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mineOnlyFilter, setMineOnlyFilter] = useState(false);
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const teacherName = currentUser?.name || 'Bpk. Ahmad ST';

  // Main View Tab: 'exams' (Paket Soal) | 'schedule' (Matriks Penjadwalan)
  const [activeMainTab, setActiveMainTab] = useState<'exams' | 'schedule'>('exams');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'jadwal') {
        setActiveMainTab('schedule');
      }
    }
  }, []);

  const handleTabSwitch = (tab: 'exams' | 'schedule') => {
    setActiveMainTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'schedule') {
        url.searchParams.set('tab', 'jadwal');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

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

  // 📊 CSV Import / Export State
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvParsedRows, setCsvParsedRows] = useState<
    Array<{ id: string; title: string; subject: string; classTarget: string; startTime: string; endTime: string }>
  >([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSaving, setCsvSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Pemrograman Web',
    classTarget: 'XI RPL 1',
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
  });

  const subjectPresets = [
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

  const classPresets = [
    'Semua Kelas',
    'X RPL 1',
    'XI RPL 1',
    'XI RPL 2',
    'XII RPL 1',
    'X TKJ 1',
    'XI TKJ 1',
    'XII TKJ 1',
    'X DKV 1',
    'XI DKV 1',
    'XII DKV 1',
    'X MPLB 1',
    'XI MPLB 1',
  ];

  const runConflictCheck = async (startTime: string, endTime: string, classTarget: string) => {
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
        startTime,
        endTime,
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
          startTime: toDateTimeLocalInput(e.startTime),
          endTime: toDateTimeLocalInput(e.endTime),
        };
      });
      setInlineSchedules(initial);
    }
    setIsInlineEditMode(!isInlineEditMode);
  };

  const handleInlineChange = (id: string, field: 'startTime' | 'endTime', val: string) => {
    setInlineSchedules((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { startTime: '', endTime: '' }),
        [field]: val,
      },
    }));
  };

  const handleInlinePreset = (id: string, minutes: number) => {
    setInlineSchedules((prev) => {
      const current = prev[id] || { startTime: '', endTime: '' };
      const baseStart = current.startTime ? new Date(current.startTime) : new Date();
      if (!current.startTime) {
        baseStart.setHours(8, 0, 0, 0);
      }
      const end = new Date(baseStart.getTime() + minutes * 60 * 1000);
      return {
        ...prev,
        [id]: {
          startTime: toDateTimeLocalInput(baseStart),
          endTime: toDateTimeLocalInput(end),
        },
      };
    });
  };

  const handleSaveInlineSchedules = async () => {
    setInlineSaving(true);
    const payload = Object.entries(inlineSchedules).map(([id, sched]) => ({
      id,
      startTime: sched.startTime ? sched.startTime : null,
      endTime: sched.endTime ? sched.endTime : null,
    }));

    const res = await batchUpdateExamSchedules(payload, true);
    if (res.success) {
      setExams((prev) =>
        prev.map((e) => {
          const mod = inlineSchedules[e.id];
          if (!mod) return e;
          return {
            ...e,
            startTime: mod.startTime ? new Date(mod.startTime) : null,
            endTime: mod.endTime ? new Date(mod.endTime) : null,
          };
        })
      );
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

    let currentDateTime = new Date(`${batchDate}T${batchSeqStart}:00`);

    selected.forEach((ex, idx) => {
      const dur = batchDurationType === 'DEFAULT' ? ex.duration || 60 : batchUniformDuration;
      const start = new Date(currentDateTime);
      const end = new Date(start.getTime() + dur * 60 * 1000);

      items.push({
        exam: ex,
        startIso: toDateTimeLocalInput(start),
        endIso: toDateTimeLocalInput(end),
        startDisplay: start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        endDisplay: end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
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
      const startIso = `${batchDate}T${batchStartTime}:00`;
      const endIso = `${batchDate}T${batchEndTime}:00`;
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
      startTime: r.startTime,
      endTime: r.endTime,
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
    const randomToken = 'CBT' + Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const startStr = toDateTimeLocalInput(now);
    const endStr = toDateTimeLocalInput(new Date(now.getTime() + 60 * 60000));

    setFormData({
      title: '',
      subject: 'Pemrograman Web',
      classTarget: 'XI RPL 1',
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
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: ExamItem) => {
    setEditingExam(exam);
    const startStr = toDateTimeLocalInput(exam.startTime);
    const endStr = toDateTimeLocalInput(exam.endTime);

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
    });
    setConflicts([]);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleQuickToggleSession = async (exam: ExamItem) => {
    setSessionLoadingId(exam.id);
    const isCurrentlyActive = exam.status === 'ACTIVE';
    const nextOpen = !isCurrentlyActive;
    const res = await toggleExamSession(exam.id, nextOpen, exam.token || undefined);

    if (res.success && res.data) {
      setExams(exams.map((e) => (e.id === exam.id ? { ...e, status: res.data.status, token: res.data.token } : e)));
    } else {
      alert(res.error || 'Gagal mengubah status sesi ujian');
    }
    setSessionLoadingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.enableSchedule && formData.startTime && formData.endTime) {
      if (new Date(formData.startTime) >= new Date(formData.endTime)) {
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
      startTime: formData.enableSchedule && formData.startTime ? formData.startTime : null,
      endTime: formData.enableSchedule && formData.endTime ? formData.endTime : null,
      allowConflict: formData.allowConflict,
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
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.authorName && exam.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
    const matchesMine = !mineOnlyFilter || (exam.authorName && exam.authorName.toLowerCase() === teacherName.toLowerCase());
    
    const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
    const matchesSchedule =
      scheduleFilter === 'ALL' ||
      (scheduleFilter === 'TODAY' && schedState.isOngoingToday) ||
      (scheduleFilter === 'ONGOING' && schedState.state === 'ONGOING') ||
      (scheduleFilter === 'UPCOMING' && schedState.state === 'UPCOMING') ||
      (scheduleFilter === 'ENDED' && schedState.state === 'ENDED');

    return matchesSearch && matchesStatus && matchesMine && matchesSchedule;
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

      const classOverlap =
        e1.classTarget === 'Semua Kelas' ||
        e2.classTarget === 'Semua Kelas' ||
        e1.classTarget === e2.classTarget;
      const timeOverlap = start1 < end2 && end1 > start2;

      if (classOverlap && timeOverlap) {
        systemConflicts.push({ exam1: e1, exam2: e2 });
      }
    }
  }

  // Filter exams for schedule matrix table
  const scheduledExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.classTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.authorName && exam.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesClass = selectedClassFilter === 'ALL' || exam.classTarget === selectedClassFilter;

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

  // Calculate stats
  const totalExams = exams.length;
  const totalQuestions = exams.reduce((acc, curr) => acc + curr._count.questions, 0);
  const totalAttempts = exams.reduce((acc, curr) => acc + curr._count.attempts, 0);
  const totalSubmitted = exams.flatMap((e) => e.attempts).filter((a) => a.status === 'SUBMITTED');
  const avgScore = totalSubmitted.length > 0
    ? Math.round(totalSubmitted.reduce((acc, a) => acc + a.score, 0) / totalSubmitted.length)
    : 0;
  const unscheduledCount = exams.filter((e) => !e.startTime || !e.endTime).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-2">
            <BookOpen size={14} /> Smart CBT Guru • Rilis Token & Kontrol Ruang Ujian
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Ujian Online (CBT)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Login sebagai: <strong className="text-purple-600 dark:text-purple-400">{teacherName}</strong>. Susun bank soal, kontrol sesi ujian, rilis token langsung ke kelas, dan pantau nilai siswa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/siswa/cbt"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm"
          >
            <ExternalLink size={16} /> Tampilan Siswa
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> Buat Paket Ujian Baru
          </button>
        </div>
      </div>

      {/* 🌟 VIEW MODE SELECTOR TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabSwitch('exams')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'exams'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={16} /> Daftar Paket Ujian ({totalExams})
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('schedule')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'schedule'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} /> Matriks Jadwal Ujian & Anti-Bentrok
            {systemConflicts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {systemConflicts.length} Bentrok!
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Status Jadwal Sistem:</span>
          {systemConflicts.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Bebas Bentrok (0 Tabrakan)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
              <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
              <span>{systemConflicts.length} Tabrakan Terdeteksi</span>
            </span>
          )}
        </div>
      </div>

      {activeMainTab === 'schedule' ? (
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
                        <span className="text-[11px] text-purple-600 block mt-0.5">{formatExamScheduleRange(conf.exam1.startTime, conf.exam1.endTime)}</span>
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
                        <span className="text-[11px] text-purple-600 block mt-0.5">{formatExamScheduleRange(conf.exam2.startTime, conf.exam2.endTime)}</span>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Users size={14} /> Filter Kelas:
              </div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="ALL">Semua Kelas ({exams.length} Ujian)</option>
                {classPresets.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

          {/* ⚡ TOOLBAR PENJADWALAN KOLEKTIF & CSV */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedExamIds.length === 0) {
                    setSelectedExamIds(scheduledExams.map((e) => e.id));
                  }
                  setIsBatchModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap size={14} /> Atur Jadwal Kolektif
              </button>

              {isInlineEditMode ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveInlineSchedules}
                    disabled={inlineSaving}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} /> {inlineSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInlineEditMode(false)}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleInlineEdit}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Edit3 size={14} className="text-purple-600" /> Mode Edit Cepat di Tabel
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadScheduleCsv}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download template CSV untuk edit jadwal secara massal di Excel"
              >
                <Download size={14} className="text-blue-600" /> Unduh Format CSV
              </button>
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Upload file CSV hasil edit jadwal untuk diterapkan sekaligus"
              >
                <Upload size={14} className="text-emerald-600" /> Import CSV Jadwal
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
                    <th className="py-4 px-4">Jadwal Pelaksanaan (WIB)</th>
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
                            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {exam.classTarget}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {exam.authorName || 'Bpk. Ahmad ST'}
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
                                  <span>{formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
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
                              <button
                                onClick={() => handleOpenEdit(exam)}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 size={13} /> Atur Jadwal
                              </button>
                              <Link
                                href={`/admin/cbt/${exam.id}`}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Buka Bank Soal"
                              >
                                <ExternalLink size={15} />
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari ujian, mapel, kelas, guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Ujian Saya Filter Toggle */}
          <button
            onClick={() => setMineOnlyFilter(!mineOnlyFilter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              mineOnlyFilter
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <UserCheck size={14} /> Ujian Saya
          </button>

          {/* Schedule Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Semua Jadwal' },
              { id: 'TODAY', label: '📅 Hari Ini' },
              { id: 'UPCOMING', label: '⏳ Akan Datang' },
              { id: 'ONGOING', label: '🟢 Berlangsung' },
              { id: 'ENDED', label: '🏁 Selesai' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setScheduleFilter(s.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  scheduleFilter === s.id
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {['ALL', 'ACTIVE', 'PUBLISHED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Ruang'
                : st === 'ACTIVE'
                ? '🟢 Sesi Aktif'
                : st === 'PUBLISHED'
                ? 'Ruang Tunggu'
                : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Exam List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <BookOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-slate-500 font-medium">Belum ada paket ujian yang sesuai.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
            >
              Buat Ujian Baru
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const isLive = exam.status === 'ACTIVE';
            const isSessionLoading = sessionLoadingId === exam.id;
            const schedState = getExamScheduleState(exam.startTime, exam.endTime, exam.status);

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Top Status & Subject Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                      {exam.subject}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isLive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse'
                          : exam.status === 'PUBLISHED'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isLive ? '🟢 Sesi Live' : exam.status === 'PUBLISHED' ? '⏳ Ruang Tunggu' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-1.5 group-hover:text-purple-600 transition-colors">
                    {exam.title}
                  </h3>

                  {/* Author / Teacher Badge */}
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                    <span>Guru Pengampu:</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{exam.authorName || 'Bpk. Ahmad ST'}</strong>
                  </div>

                  {/* 📅 Exam Schedule Badge */}
                  <div className="p-2.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 mb-3 space-y-1">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Calendar size={13} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="line-clamp-1">{formatExamScheduleRange(exam.startTime, exam.endTime)}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${schedState.badgeClass}`}>
                        {schedState.label}
                      </span>
                    </div>
                    {schedState.countdown && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                        <span>Waktu Pengerjaan:</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">{schedState.countdown}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {exam.description || 'Tidak ada deskripsi tambahan.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-purple-500" />
                      <span>{exam.duration} Menit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" />
                      <span>{exam.classTarget}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-emerald-500" />
                      <span>{exam._count.questions} Butir Soal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Key size={14} className="text-amber-500" />
                      <span className="font-mono font-bold">{(exam.token || '').split('|')[0] || 'Tanpa Token'}</span>
                    </div>
                  </div>

                  {/* 🚀 QUICK TOKEN CONTROL BANNER */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    isLive 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div>
                      <div className="font-extrabold uppercase text-[10px] tracking-wider text-slate-400">
                        {isLive ? 'Token Live Kelas:' : 'Status Token:'}
                      </div>
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5">
                        {(exam.token || '').split('|')[0] || 'BELUM AKTIF'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickToggleSession(exam)}
                      disabled={isSessionLoading}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                        isLive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isSessionLoading ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : isLive ? (
                        <>
                          <Square size={12} className="fill-white" /> Tutup Sesi
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-white" /> Rilis Token
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/cbt/${exam.id}`}
                    className="flex-1 text-center py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    Buka Bank Soal & Nilai
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Edit Pengaturan Ujian"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(exam.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Ujian"
                  >
                    <Trash2 size={16} />
                  </button>
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
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
                    {subjectPresets.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="class-presets"
                    placeholder="Pilih atau ketik kelas"
                    value={formData.classTarget}
                    onChange={(e) => setFormData({ ...formData, classTarget: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <datalist id="class-presets">
                    {classPresets.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Mulai Ujian (WIB) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.startTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const updated = { ...prev, startTime: val };
                              if (val && prev.duration) {
                                const end = new Date(new Date(val).getTime() + prev.duration * 60000);
                                updated.endTime = toDateTimeLocalInput(end);
                              }
                              return updated;
                            });
                            if (val) {
                              const end = new Date(new Date(val).getTime() + formData.duration * 60000);
                              runConflictCheck(val, toDateTimeLocalInput(end), formData.classTarget);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Waktu Selesai / Tutup (WIB) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.enableSchedule}
                          value={formData.endTime}
                          onChange={(e) => {
                            const val = e.target.value;
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
                          if (!formData.startTime) {
                            const now = new Date();
                            const startStr = toDateTimeLocalInput(now);
                            const endStr = toDateTimeLocalInput(new Date(now.getTime() + formData.duration * 60000));
                            setFormData({ ...formData, startTime: startStr, endTime: endStr });
                            runConflictCheck(startStr, endStr, formData.classTarget);
                          } else {
                            const end = new Date(new Date(formData.startTime).getTime() + formData.duration * 60000);
                            const endStr = toDateTimeLocalInput(end);
                            setFormData({ ...formData, endTime: endStr });
                            runConflictCheck(formData.startTime, endStr, formData.classTarget);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50"
                      >
                        + {formData.duration} Menit (Durasi)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          today.setHours(8, 0, 0, 0);
                          const startStr = toDateTimeLocalInput(today);
                          today.setHours(10, 0, 0, 0);
                          const endStr = toDateTimeLocalInput(today);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Hari Ini 08:00 - 10:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(8, 0, 0, 0);
                          const startStr = toDateTimeLocalInput(tomorrow);
                          tomorrow.setHours(10, 0, 0, 0);
                          const endStr = toDateTimeLocalInput(tomorrow);
                          setFormData({ ...formData, startTime: startStr, endTime: endStr });
                          runConflictCheck(startStr, endStr, formData.classTarget);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Besok 08:00 - 10:00
                      </button>
                    </div>

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
                                <span>{formatExamScheduleRange(c.startTime, c.endTime)}</span>
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
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                />
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
                        Jam Mulai (WIB)
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
                        Jam Selesai (WIB)
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
                        Jam Mulai Sesi 1 (WIB)
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
                                  Kelas: {item.exam.classTarget}
                                </span>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                              {item.startDisplay} - {item.endDisplay} WIB
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
                        <td className="py-2.5 px-3 font-semibold text-blue-600">{r.classTarget}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {new Date(r.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {new Date(r.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB
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
    </div>
  );
}
