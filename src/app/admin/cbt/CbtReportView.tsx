'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  FileCheck2, 
  Sparkles, 
  GraduationCap, 
  Check, 
  X,
  FileText,
  RotateCcw,
  Settings2,
  BarChart3,
  Layers,
  PieChart
} from 'lucide-react';
import { KopSuratConfig } from '@/app/admin/settings/types';
import { resetStudentAttemptAction, syncCbtScoresToStudentGradesAction } from './actions';
import ConfirmModal from '@/components/ConfirmModal';
import CbtAnalyticsCharts from './CbtAnalyticsCharts';
import { 
  CbtOfficialKopSurat, 
  CbtOfficialSignatures, 
  CbtSecurityValidationBox, 
  CbtDigitalStamp,
  CbtPrintModalWrapper
} from '@/components/cbt/CbtOfficialPrintComponents';
import { extractJurusanCode, getJurusanFullName, CbtTimezone, DEFAULT_CBT_TIMEZONE, formatScheduleTime } from '@/lib/cbt-schedule';

export interface ReportAttemptItem {
  id: string;
  studentName: string;
  studentNis?: string | null;
  studentClass?: string | null;
  score: number;
  totalQuestions?: number;
  totalCorrect?: number;
  status: string;
  tabSwitchCount?: number;
  startedAt?: Date | string;
  submittedAt?: Date | string | null;
}

export interface ReportExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  authorName?: string | null;
  attempts: ReportAttemptItem[];
  _count?: {
    questions?: number;
  };
}

interface CbtReportViewProps {
  exams: ReportExamItem[];
  currentUser?: {
    name: string;
    role: string;
  };
  classPresets?: string[];
  subjectPresets?: string[];
  subjectsWithKkm?: { name: string; kkm: number }[];
  kopSuratConfig?: KopSuratConfig;
  cbtTimezone?: CbtTimezone;
}

export default function CbtReportView({
  exams,
  currentUser,
  classPresets = [],
  subjectPresets = [],
  subjectsWithKkm = [],
  kopSuratConfig,
  cbtTimezone = DEFAULT_CBT_TIMEZONE,
}: CbtReportViewProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Utama';
  const isGuru = currentUser?.role === 'Guru';
  const currentUserName = currentUser?.name || '';

  // 🗺️ Map Nama Mata Pelajaran -> Standar KKM Resmi dari Master Data Mapel
  const subjectKkmMap = useMemo(() => {
    const map = new Map<string, number>();
    if (subjectsWithKkm && subjectsWithKkm.length > 0) {
      subjectsWithKkm.forEach((s) => {
        if (s.name) {
          map.set(s.name.trim().toLowerCase(), s.kkm ?? 75);
        }
      });
    }
    return map;
  }, [subjectsWithKkm]);

  // Filter States
  const [examFilter, setExamFilter] = useState('ALL');
  const [jurusanFilter, setJurusanFilter] = useState<'ALL' | string>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [passingFilter, setPassingFilter] = useState<'ALL' | 'PASSED' | 'REMEDIAL' | 'IN_PROGRESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyExams, setOnlyMyExams] = useState(isGuru);
  const [kkmScore, setKkmScore] = useState(75);

  // Otomatis sinkronkan ambang KKM sesuai Mapel atau Paket Ujian yang dipilih
  useEffect(() => {
    if (subjectFilter !== 'ALL') {
      const found = subjectKkmMap.get(subjectFilter.trim().toLowerCase());
      if (found) setKkmScore(found);
    } else if (examFilter !== 'ALL') {
      const selected = exams.find((e) => e.id === examFilter);
      if (selected?.subject) {
        const found = subjectKkmMap.get(selected.subject.trim().toLowerCase());
        if (found) setKkmScore(found);
      }
    }
  }, [subjectFilter, examFilter, subjectKkmMap, exams]);

  // Action States
  const [syncingExamId, setSyncingExamId] = useState<string | null>(null);
  const [resetTargetAttempt, setResetTargetAttempt] = useState<{ id: string; studentName: string; examTitle: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [printStudentCard, setPrintStudentCard] = useState<any | null>(null);
  const [isPrintCollectiveModalOpen, setIsPrintCollectiveModalOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'BOTH' | 'CHARTS' | 'TABLE'>('BOTH');

  // 🌟 Universal Modern Center Dialog (Alert & Confirm)
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    onCloseCallback?: () => void;
  } | null>(null);

  const showAlert = (
    title: string,
    message: React.ReactNode,
    variant: 'danger' | 'warning' | 'info' | 'success' = 'info',
    onCloseCallback?: () => void
  ) => {
    setFeedbackModal({
      isOpen: true,
      title,
      message,
      variant,
      onCloseCallback,
    });
  };

  // Flatten all attempts into uniform report rows
  const allRows = useMemo(() => {
    const list: Array<{
      attemptId: string;
      examId: string;
      examTitle: string;
      subject: string;
      examClassTarget: string;
      examAuthor: string;
      studentName: string;
      studentNis: string;
      studentClass: string;
      score: number;
      totalQuestions: number;
      totalCorrect: number;
      status: string;
      tabSwitchCount: number;
      startedAt: string | Date;
      submittedAt: string | Date | null;
    }> = [];

    for (const ex of exams) {
      for (const at of (ex.attempts || [])) {
        list.push({
          attemptId: at.id,
          examId: ex.id,
          examTitle: ex.title,
          subject: ex.subject,
          examClassTarget: ex.classTarget,
          examAuthor: ex.authorName || 'Guru Pengampu',
          studentName: at.studentName,
          studentNis: at.studentNis || '-',
          studentClass: at.studentClass || ex.classTarget || 'Semua Kelas',
          score: at.score,
          totalQuestions: at.totalQuestions || ex._count?.questions || 0,
          totalCorrect: at.totalCorrect || 0,
          status: at.status,
          tabSwitchCount: at.tabSwitchCount || 0,
          startedAt: at.startedAt || '',
          submittedAt: at.submittedAt || null,
        });
      }
    }
    return list;
  }, [exams]);

  // List jurusan unik yang tersedia di hasil ujian siswa
  const availableJurusans = useMemo(() => {
    const map = new Map<string, number>();
    allRows.forEach((r) => {
      const code = extractJurusanCode(r.studentClass) || 'LAINNYA';
      map.set(code, (map.get(code) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([code, count]) => ({
        code,
        name: getJurusanFullName(code === 'LAINNYA' ? null : code),
        count,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [allRows]);

  // List mata pelajaran yang tersedia di ujian / laporan ini (100% data riil tersinkronisasi)
  const availableSubjects = useMemo(() => {
    const map = new Map<string, { examCount: number; studentCount: number }>();

    // 1. Kumpulkan seluruh mapel dari ujian riil yang ada
    exams.forEach((ex) => {
      const sub = ex.subject?.trim();
      if (!sub) return;
      const cur = map.get(sub) || { examCount: 0, studentCount: 0 };
      cur.examCount += 1;
      cur.studentCount += (ex.attempts?.length || 0);
      map.set(sub, cur);
    });

    // 2. Tambahkan mapel resmi dari Master Mata Pelajaran (subjectPresets) jika ada
    subjectPresets.forEach((sub) => {
      const clean = sub.trim();
      if (clean && !map.has(clean)) {
        map.set(clean, { examCount: 0, studentCount: 0 });
      }
    });

    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => {
        // Prioritaskan mapel yang memiliki hasil ujian siswa terlebih dahulu
        if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
        return a.name.localeCompare(b.name, 'id');
      });
  }, [exams, subjectPresets]);

  // Apply All Active Filters
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      // Guru hanya dapat melihat laporan ujian miliknya sendiri; Super Admin melihat seluruh laporan
      if (isGuru) {
        const a = r.examAuthor.toLowerCase().trim();
        const u = currentUserName.toLowerCase().trim();
        if (a !== u && !a.includes(u) && !u.includes(a)) {
          return false;
        }
      }
      if (examFilter !== 'ALL' && r.examId !== examFilter) return false;
      if (jurusanFilter !== 'ALL') {
        const jur = extractJurusanCode(r.studentClass) || 'LAINNYA';
        if (jur !== jurusanFilter) return false;
      }
      if (classFilter !== 'ALL' && r.studentClass !== classFilter) return false;
      if (subjectFilter !== 'ALL' && r.subject !== subjectFilter) return false;
      if (passingFilter === 'PASSED' && (Math.round(r.score) < kkmScore || r.status !== 'SUBMITTED')) return false;
      if (passingFilter === 'REMEDIAL' && (Math.round(r.score) >= kkmScore || r.status !== 'SUBMITTED')) return false;
      if (passingFilter === 'IN_PROGRESS' && r.status !== 'IN_PROGRESS') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.studentName.toLowerCase().includes(q) ||
          r.studentNis.toLowerCase().includes(q) ||
          r.studentClass.toLowerCase().includes(q) ||
          r.examTitle.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allRows, isGuru, onlyMyExams, currentUserName, examFilter, jurusanFilter, classFilter, subjectFilter, passingFilter, searchQuery, kkmScore]);

  // Analytics Metrics
  const totalAttempts = filteredRows.length;
  const submittedRows = filteredRows.filter((r) => r.status === 'SUBMITTED');
  const submittedCount = submittedRows.length;
  const passedCount = submittedRows.filter((r) => Math.round(r.score) >= kkmScore).length;
  const remedialCount = submittedRows.filter((r) => Math.round(r.score) < kkmScore).length;
  const passRate = submittedCount > 0 ? Math.round((passedCount / submittedCount) * 100) : 0;
  const avgScore = submittedCount > 0
    ? Math.round(submittedRows.reduce((sum, r) => sum + r.score, 0) / submittedCount)
    : 0;
  const highestScore = submittedCount > 0 ? Math.max(...submittedRows.map((r) => r.score)) : 0;
  const lowestScore = submittedCount > 0 ? Math.min(...submittedRows.map((r) => r.score)) : 0;
  const totalCheatingWarnings = filteredRows.reduce((sum, r) => sum + r.tabSwitchCount, 0);

  // Urutkan data berdasarkan kelas lalu abjad nama siswa untuk kerapian cetak resmi
  const sortedFilteredRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const classCmp = (a.studentClass || '').localeCompare(b.studentClass || '', 'id', { numeric: true });
      if (classCmp !== 0) return classCmp;
      return (a.studentName || '').localeCompare(b.studentName || '', 'id');
    });
  }, [filteredRows]);

  // Derivasi cerdas data Mata Pelajaran, Guru Pengampu, dan Kelas untuk Printout Laporan Resmi
  const printMetadata = useMemo(() => {
    const selectedExam = examFilter !== 'ALL' ? exams.find((e) => e.id === examFilter) : null;
    
    // Kumpulan unik subjek, pembuat, dan kelas dari baris data yang sedang aktif
    const uniqueSubjects = Array.from(new Set(filteredRows.map((r) => r.subject).filter(Boolean)));
    const uniqueAuthors = Array.from(new Set(filteredRows.map((r) => r.examAuthor).filter(Boolean)));
    const uniqueClasses = Array.from(new Set(filteredRows.map((r) => r.studentClass).filter(Boolean)));
    const uniqueExams = Array.from(new Set(filteredRows.map((r) => r.examTitle).filter(Boolean)));

    // 1. Mata Pelajaran
    let effectiveSubject = '';
    if (subjectFilter !== 'ALL') {
      effectiveSubject = subjectFilter;
    } else if (selectedExam?.subject) {
      effectiveSubject = selectedExam.subject;
    } else if (uniqueSubjects.length === 1) {
      effectiveSubject = uniqueSubjects[0];
    } else if (uniqueSubjects.length > 1) {
      effectiveSubject = 'Seluruh Mata Pelajaran Terpilih';
    } else {
      effectiveSubject = exams[0]?.subject || 'Seluruh Mata Pelajaran';
    }

    // 2. Guru / Pengampu
    let effectiveTeacher = '';
    if (isGuru && currentUserName) {
      effectiveTeacher = currentUserName;
    } else if (selectedExam?.authorName) {
      effectiveTeacher = selectedExam.authorName;
    } else if (subjectFilter !== 'ALL') {
      const matchExam = exams.find((e) => e.subject === subjectFilter && e.authorName);
      effectiveTeacher = matchExam?.authorName || (uniqueAuthors.length === 1 ? uniqueAuthors[0] : (currentUser?.name || 'Guru Mata Pelajaran'));
    } else if (uniqueAuthors.length === 1) {
      effectiveTeacher = uniqueAuthors[0];
    } else if (uniqueAuthors.length > 1) {
      effectiveTeacher = 'Tim Pendidik / Guru Mata Pelajaran';
    } else {
      effectiveTeacher = currentUser?.name || 'Tim Kurikulum & CBT';
    }

    // 3. Tingkat / Target Kelas
    let effectiveClass = '';
    if (classFilter !== 'ALL') {
      effectiveClass = classFilter;
    } else if (jurusanFilter !== 'ALL') {
      effectiveClass = `Jurusan ${jurusanFilter} (Semua Rombel)`;
    } else if (selectedExam?.classTarget) {
      effectiveClass = selectedExam.classTarget;
    } else if (uniqueClasses.length === 1) {
      effectiveClass = uniqueClasses[0];
    } else {
      effectiveClass = 'Seluruh Rombel Kelas';
    }

    // 4. Judul Paket Ujian
    let effectiveExamTitle = '';
    if (selectedExam?.title) {
      effectiveExamTitle = selectedExam.title;
    } else if (uniqueExams.length === 1) {
      effectiveExamTitle = uniqueExams[0];
    } else {
      effectiveExamTitle = 'Seluruh Paket Ujian Terpilih';
    }

    const singleSubject = uniqueSubjects.length === 1 
      ? uniqueSubjects[0] 
      : (subjectFilter !== 'ALL' ? subjectFilter : (selectedExam?.subject || null));

    return {
      subject: effectiveSubject,
      teacher: effectiveTeacher,
      classTarget: effectiveClass,
      examTitle: effectiveExamTitle,
      singleSubject,
    };
  }, [examFilter, subjectFilter, classFilter, jurusanFilter, exams, filteredRows, isGuru, currentUserName, currentUser]);

  // 🎯 KKM Spesifik Kartu Siswa (diambil dari Master Mapel siswa atau nilai KKM toolbar aktif)
  const effectiveCardKkm = useMemo(() => {
    if (!printStudentCard) return kkmScore;
    const sub = (printStudentCard.subject || '').trim().toLowerCase();
    return subjectKkmMap.get(sub) ?? kkmScore ?? 75;
  }, [printStudentCard, subjectKkmMap, kkmScore]);

  // Group classes for filter dropdown
  const groupedClasses = useMemo(() => {
    const onlyClasses = classPresets.filter((c) => c !== 'Semua Kelas');
    const x = onlyClasses.filter((c) => c.startsWith('X ') || c.startsWith('X-') || c === 'X');
    const xi = onlyClasses.filter((c) => c.startsWith('XI ') || c.startsWith('XI-') || c === 'XI');
    const xii = onlyClasses.filter((c) => c.startsWith('XII ') || c.startsWith('XII-') || c === 'XII');
    const others = onlyClasses.filter((c) => !x.includes(c) && !xi.includes(c) && !xii.includes(c));
    return { x, xi, xii, others };
  }, [classPresets]);

  // Handlers
  const handleResetAttempt = async () => {
    if (!resetTargetAttempt) return;
    setIsResetting(true);
    try {
      const res = await resetStudentAttemptAction(resetTargetAttempt.id);
      if (res?.success) {
        setResetTargetAttempt(null);
        showAlert('Reset Ujian Berhasil', res.message, 'success', () => {
          window.location.reload();
        });
      } else {
        showAlert('Gagal Mereset', res?.error || 'Gagal mereset ujian siswa.', 'danger');
      }
    } catch (e: any) {
      showAlert('Kesalahan Sistem', e.message || 'Terjadi kesalahan sistem.', 'danger');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncToGrades = async (examId: string) => {
    setSyncingExamId(examId);
    try {
      const res = await syncCbtScoresToStudentGradesAction(examId);
      if (res?.success) {
        showAlert('Sinkronisasi Sukses', res.message, 'success');
      } else {
        showAlert('Gagal Sinkronisasi', res?.error || 'Gagal menyinkronkan nilai.', 'danger');
      }
    } catch (e: any) {
      showAlert('Kesalahan Sistem', e.message || 'Gagal menyinkronkan nilai ke buku nilai.', 'danger');
    } finally {
      setSyncingExamId(null);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showAlert('Data Kosong', 'Tidak ada data hasil ujian yang dapat diekspor.', 'warning');
      return;
    }

    const headers = [
      'No', 
      'Nama Siswa', 
      'NISN', 
      'Jurusan',
      'Kelas / Rombel', 
      'Mata Pelajaran', 
      'Paket Ujian', 
      'Skor Nilai', 
      'Status Ketuntasan', 
      'Jawaban Benar', 
      'Total Soal', 
      'Pelanggaran Tab Switch', 
      'Tanggal Submit'
    ];
    const rows = filteredRows.map((r, i) => {
      const jur = extractJurusanCode(r.studentClass) || '-';
      return [
        i + 1,
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.studentNis}"`,
        `"${jur}"`,
        `"${r.studentClass}"`,
        `"${r.subject}"`,
        `"${r.examTitle.replace(/"/g, '""')}"`,
        r.score,
        r.status === 'SUBMITTED' ? (Math.round(r.score) >= kkmScore ? 'TUNTAS' : 'REMEDIAL') : 'SEDANG DIKERJAKAN',
        r.totalCorrect,
        r.totalQuestions,
        r.tabSwitchCount,
        r.submittedAt ? new Date(r.submittedAt).toLocaleString('id-ID') : '-'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    let fileSuffix = '';
    if (jurusanFilter !== 'ALL') fileSuffix += `_Jurusan_${jurusanFilter}`;
    if (classFilter !== 'ALL') fileSuffix += `_Kelas_${classFilter.replace(/\s+/g, '_')}`;

    link.setAttribute('download', `Laporan_Hasil_CBT${fileSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrintReport = () => {
    setIsPrintCollectiveModalOpen(true);
  };

  return (
    <div className="space-y-3.5 font-sans">
      {/* 🌟 1. COMPACT TOP HEADER BAR (Ringkas, Elegan, Seimbang & Selaras) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-md border border-purple-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Sisi Kiri: Judul & Konteks Role (Cukup Ruang, Tidak Terjepit) */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200 text-[10px] sm:text-[11px] font-semibold border border-white/10 backdrop-blur-xs whitespace-nowrap">
              <FileCheck2 size={13} className="text-purple-300" />
              <span>
                Laporan &amp; Rekapitulasi CBT • {isSuperAdmin ? 'Tingkat Sekolah (SuperAdmin)' : isGuru ? `Mode Guru: ${currentUserName}` : 'Semua Data'}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Laporan Evaluasi &amp; Buku Nilai CBT
            </h2>
            <p className="text-[11px] sm:text-xs text-purple-200/90 hidden sm:block max-w-2xl leading-relaxed">
              {isSuperAdmin
                ? 'Pantau sebaran nilai siswa, analisis ketuntasan KKM, kelola integritas, dan sinkronisasi ke buku nilai raport.'
                : 'Pantau nilai siswa kelas yang Anda ampu, sinkronisasi otomatis ke raport, dan cetak lembar evaluasi resmi.'}
            </p>
          </div>

          {/* Sisi Kanan: Tombol Aksi Dokumen (Rapi, Sejajar & Beranimasi) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center">
            {isSuperAdmin && (
              <a
                href="/admin/settings#kop-surat"
                className="group relative px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/25 font-bold text-xs flex items-center gap-2 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
                title="Atur Kop Surat &amp; Tanda Tangan Resmi"
              >
                <Settings2 size={13} className="text-purple-300 group-hover:rotate-90 transition-transform duration-300" />
                <span>Atur Kop</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="group relative px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/25 font-bold text-xs flex items-center gap-2 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
              title="Unduh format spreadsheet CSV / Excel"
            >
              <Download size={13} className="text-purple-300 group-hover:translate-y-0.5 transition-transform duration-200" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="group relative overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right hover:shadow-lg hover:shadow-purple-500/40 active:scale-95 text-white font-bold text-xs flex items-center gap-2 border border-purple-400/30 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
              title="Cetak lembar rekapitulasi nilai resmi sekolah"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <Printer size={13} className="text-white group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* 🧭 Sub-strip: Pengalih Mode Tampilan (Segmented Switcher Selaras & Rapi) */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-purple-200/90 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            <span>Format Tampilan Laporan CBT:</span>
          </div>

          <div className="inline-flex items-center p-1 bg-white/10 rounded-xl border border-white/15 backdrop-blur-md self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewLayout('BOTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'BOTH'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
              title="Tampilkan grafik visual dan tabel nilai bersamaan"
            >
              <Layers size={13} />
              <span>Grafik &amp; Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('CHARTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'CHARTS'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
              title="Fokus tampilkan grafik analitik saja"
            >
              <PieChart size={13} />
              <span>Hanya Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'TABLE'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
              title="Tampilkan tabel daftar nilai saja"
            >
              <FileText size={13} />
              <span>Hanya Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔍 2. COMPACT FILTER TOOLBAR (Toolbar 1-2 Baris Sangat Rapi & Hemat Ruang) */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
        {/* Baris 1: Pencarian Cepat + Toggle Guru + Tombol Sinkronisasi Raport */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, rombel kelas, atau nama ujian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Guru Toggle */}
            {isGuru && (
              <button
                type="button"
                onClick={() => setOnlyMyExams(!onlyMyExams)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  onlyMyExams
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles size={12} />
                {onlyMyExams ? 'Ujian Saya' : 'Semua Ujian'}
              </button>
            )}

            {/* Quick KKM Adjuster */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-xs" title="Standar Kriteria Ketuntasan Minimal (KKM) Ujian">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">KKM:</span>
              <input
                type="number"
                min={50}
                max={100}
                value={kkmScore}
                onChange={(e) => setKkmScore(Number(e.target.value) || 75)}
                className="w-12 text-center text-xs font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-0.5 text-purple-700 dark:text-purple-300 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Quick Sync to Raport Button */}
            {examFilter !== 'ALL' && (
              <button
                onClick={() => handleSyncToGrades(examFilter)}
                disabled={syncingExamId === examFilter}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Sinkronkan nilai paket ujian ini ke Buku Nilai Raport Guru"
              >
                {syncingExamId === examFilter ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Menyinkronkan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> Sinkronkan ke Raport
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Baris 2: 5 Filter Dropdown Responsif */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Filter Paket Ujian */}
          <div>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate"
            >
              <option value="ALL">Semua Paket Ujian ({exams.length})</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jurusan Keahlian */}
          <div>
            <select
              value={jurusanFilter}
              onChange={(e) => setJurusanFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate"
            >
              <option value="ALL">Semua Jurusan ({availableJurusans.length})</option>
              {availableJurusans.map((jur) => (
                <option key={jur.code} value={jur.code}>
                  {jur.code} - {jur.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Target Rombel Kelas */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate"
            >
              <option value="ALL">Semua Rombel Kelas</option>
              {groupedClasses.x.length > 0 && (
                <optgroup label="Tingkat X (Kelas 10)">
                  {groupedClasses.x.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.xi.length > 0 && (
                <optgroup label="Tingkat XI (Kelas 11)">
                  {groupedClasses.xi.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.xii.length > 0 && (
                <optgroup label="Tingkat XII (Kelas 12)">
                  {groupedClasses.xii.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              {groupedClasses.others.length > 0 && (
                <optgroup label="Kelas Lainnya">
                  {groupedClasses.others.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Filter Mata Pelajaran */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate"
            >
              <option value="ALL">
                Semua Mata Pelajaran ({availableSubjects.length})
              </option>
              {availableSubjects.map((sub) => (
                <option key={sub.name} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Ketuntasan */}
          <div>
            <select
              value={passingFilter}
              onChange={(e) => setPassingFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate col-span-2 sm:col-span-1"
            >
              <option value="ALL">Semua Status Ketuntasan</option>
              <option value="PASSED">✅ Tuntas (Skor ≥ {kkmScore})</option>
              <option value="REMEDIAL">⚠️ Remedial (Skor &lt; {kkmScore})</option>
              <option value="IN_PROGRESS">⏳ Sedang Mengerjakan</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📊 3. COMPACT 5 KPI METRICS STRIP (Hemat Ruang & Sangat Jelas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Metric 1: Total Siswa */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Total Peserta</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {totalAttempts} <span className="text-[10px] font-semibold text-slate-400">({submittedCount} submit)</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Rata-Rata Nilai */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Award size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Rata-Rata Nilai</div>
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">
              {avgScore} <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Ketuntasan Belajar */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Ketuntasan KKM</div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {passRate}% <span className="text-[10px] font-semibold text-emerald-600/80">({passedCount} tuntas)</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Remedial */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Perlu Remedial</div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
              {remedialCount} <span className="text-[10px] font-semibold text-slate-400">Siswa (&lt; {kkmScore})</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Integritas Anti-Curang */}
        <div className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <ShieldAlert size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">Pelanggaran Tab</div>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 leading-tight">
              {totalCheatingWarnings} <span className="text-[10px] font-semibold text-slate-400">Peringatan</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 4. GRAFIK & ANALITIK CBT (MUNCUL LANGSUNG DI ATAS TANPA SCROLL!) */}
      {(viewLayout === 'BOTH' || viewLayout === 'CHARTS') && (
        <div className="animate-in fade-in duration-300">
          <CbtAnalyticsCharts rows={filteredRows} kkmScore={kkmScore} />
        </div>
      )}

      {/* 📋 5. MAIN RESULTS TABLE */}
      {(viewLayout === 'BOTH' || viewLayout === 'TABLE') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Daftar Nilai Siswa ({filteredRows.length} Data)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Diurutkan berdasarkan pengerjaan terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama Siswa & NISN</th>
                <th className="p-4">Rombel Kelas</th>
                <th className="p-4">Paket Ujian / Mapel</th>
                <th className="p-4 text-center">Skor Nilai</th>
                <th className="p-4 text-center">Ketuntasan (KKM: {kkmScore})</th>
                <th className="p-4 text-center">Benar / Soal</th>
                <th className="p-4 text-center">Anti-Curang</th>
                <th className="p-4">Status & Waktu Selesai</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center text-slate-400">
                    <GraduationCap className="mx-auto mb-2 text-slate-300" size={32} />
                    Tidak ada hasil ujian yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isPassed = Math.round(row.score) >= kkmScore;
                  const isSubmitted = row.status === 'SUBMITTED';

                  return (
                    <tr
                      key={row.attemptId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NISN: {row.studentNis}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-bold text-[10px]">
                            {extractJurusanCode(row.studentClass) || 'UMUM'}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/50 text-[11px] font-mono">
                            {row.studentClass}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {row.examTitle}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                          {row.subject} • Pengampu: {row.examAuthor}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-block">
                          <span
                            className={`text-base font-black px-3 py-1 rounded-xl block font-mono ${
                              !isSubmitted
                                ? 'bg-slate-100 text-slate-500'
                                : isPassed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {isSubmitted ? Math.round(row.score) : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {!isSubmitted ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 whitespace-nowrap">
                            ⏳ Sedang Ujian
                          </span>
                        ) : isPassed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 whitespace-nowrap">
                            ✓ TUNTAS KKM
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm shadow-amber-500/20 whitespace-nowrap" title={`Nilai ${Math.round(row.score)} di bawah standar KKM ${kkmScore}`}>
                            REMEDIAL
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {isSubmitted ? `${row.totalCorrect} / ${row.totalQuestions}` : '—'}
                      </td>

                      <td className="p-4 text-center">
                        {row.tabSwitchCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">
                            ⚠️ {row.tabSwitchCount}x Tab
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold text-xs">Aman</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {row.submittedAt ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                              ✓ Selesai Submit
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {formatScheduleTime(row.submittedAt, cbtTimezone)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                            ⏳ Belum Submit
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintStudentCard(row)}
                            className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                            title="Cetak Lembar Nilai Siswa"
                          >
                            <Printer size={15} />
                          </button>

                          {(isSuperAdmin || isGuru) && (
                            <button
                              type="button"
                              onClick={() =>
                                setResetTargetAttempt({
                                  id: row.attemptId,
                                  studentName: row.studentName,
                                  examTitle: row.examTitle,
                                })
                              }
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Reset Ujian (Izinkan Ujian Ulang)"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
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

      {/* 🖨️ MODAL 1: CETAK REKAPITULASI RESMI KOLEKTIF (KELAS / MAPEL) */}
      <CbtPrintModalWrapper
        isOpen={isPrintCollectiveModalOpen}
        onClose={() => setIsPrintCollectiveModalOpen(false)}
        title="Pratinjau Lembar Rekapitulasi Nilai Resmi CBT"
        subtitle="Format cetak resmi standar Dinas Pendidikan & SMK TI GAMA 1 BEKASI"
        maxWidth="max-w-5xl"
        printButtonText="Cetak Rekap Dokumen Sekarang (PDF / Print)"
      >
        <div id="cbt-printable-collective-report" className="space-y-4 bg-white text-black cbt-printable-sheet">
                {/* 🏛️ KOP SURAT RESMI */}
                <CbtOfficialKopSurat
                  config={kopSuratConfig}
                  documentTitle="DAFTAR NILAI & REKAPITULASI HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
                  documentNumber={`Nomor: 421.5 / CBT-REKAP / ${new Date().getFullYear()} / SMK-GAMA`}
                  subTitle="Semester Ganjil • Tahun Ajaran 2025/2026"
                />

                {/* 📋 METADATA LAPORAN */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Mata Pelajaran</span>
                    <span>: <strong>{printMetadata.subject}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Tingkat / Target Kelas</span>
                    <span>: <strong>{printMetadata.classTarget}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Paket Ujian CBT</span>
                    <span>: <strong>{printMetadata.examTitle}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Standar KKM Sekolah</span>
                    <span>: <strong>{Number(kkmScore).toFixed(2)}</strong> (Kriteria Ketuntasan Minimal)</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-700">Guru / Pengampu</span>
                    <span>: <strong>{printMetadata.teacher}</strong></span>
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
                    {sortedFilteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                          Tidak ada data peserta ujian yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      sortedFilteredRows.map((r, idx) => {
                        const isTuntas = r.score >= kkmScore;
                        const isSubmitted = r.status === 'SUBMITTED';
                        let grade = '-';
                        if (isSubmitted) {
                          if (r.score >= 90) grade = 'A';
                          else if (r.score >= 80) grade = 'B';
                          else if (r.score >= kkmScore) grade = 'C+';
                          else if (r.score >= 60) grade = 'C';
                          else grade = 'D';
                        }

                        return (
                          <tr key={r.attemptId} className="text-center print-avoid-break">
                            <td className="py-1.5 px-1 border-r border-black font-bold">{idx + 1}</td>
                            <td className="py-1.5 px-2 border-r border-black font-mono font-medium text-[10px]">{r.studentNis}</td>
                            <td className="py-1.5 px-3 border-r border-black text-left font-semibold uppercase">{r.studentName}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{r.studentClass}</td>
                            <td className="py-1.5 px-2 border-r border-black font-semibold">{r.totalCorrect} / {r.totalQuestions}</td>
                            <td className="py-1.5 px-2 border-r border-black font-black text-sm">
                              {Math.round(r.score)}
                            </td>
                            <td className="py-1.5 px-2 border-r border-black font-bold">{grade}</td>
                            <td className="py-1.5 px-2 border-r border-black font-bold text-[10px]">
                              {!isSubmitted ? (
                                <span className="text-amber-700">SEDANG UJIAN</span>
                              ) : isTuntas ? (
                                <span className="text-emerald-800">TUNTAS</span>
                              ) : (
                                <span className="text-rose-800">REMEDIAL</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-[9px]">
                              {r.tabSwitchCount === 0 ? 'Tertib' : `⚠️ ${r.tabSwitchCount}x Tab`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-black text-[10px] sm:text-xs">
                      <td colSpan={4} className="py-2 px-3 text-right border-r border-black">
                        Statistik Evaluasi (Total: {totalAttempts} Peserta):
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black">
                        Avg:
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black font-black text-sm text-purple-900">
                        {avgScore}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black font-black">
                        {avgScore >= kkmScore ? 'TUNTAS' : 'REMED'}
                      </td>
                      <td colSpan={2} className="py-2 px-2 text-center font-bold">
                        {passRate}% Kelulusan ({passedCount} Tuntas / {remedialCount} Remedial)
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* 🔒 KEABSAHAN SISTEM CBT */}
                <CbtSecurityValidationBox
                  examTitle={printMetadata.examTitle}
                />

                {/* 🖋️ TANDA TANGAN 3 PIHAK */}
                <CbtOfficialSignatures
                  config={kopSuratConfig}
                  teacherName={printMetadata.teacher}
                  subjectName={printMetadata.singleSubject || (printMetadata.subject.includes('Seluruh') ? undefined : printMetadata.subject)}
                  classNameTarget={printMetadata.classTarget !== 'Seluruh Rombel Kelas' ? printMetadata.classTarget : undefined}
                  mode="three-column"
                />
              </div>
      </CbtPrintModalWrapper>

      {/* 🖨️ MODAL 2: CETAK KARTU / TRANSKRIP RESMI SISWA INDIVIDUAL */}
      <CbtPrintModalWrapper
        isOpen={Boolean(printStudentCard)}
        onClose={() => setPrintStudentCard(null)}
        title="Surat Keterangan Hasil Evaluasi Ujian (CBT) Siswa"
        subtitle="Sistem Evaluasi Berbasis Komputer & Verifikasi Akademik Resmi"
        maxWidth="max-w-2xl"
        printButtonText="Cetak Lembar Nilai Siswa (PDF / Print)"
      >
        {printStudentCard && (
          <div id="cbt-printable-student-card" className="space-y-4 bg-white text-black cbt-printable-sheet">
            {/* 🏛️ KOP SURAT RESMI */}
            <CbtOfficialKopSurat
              config={kopSuratConfig}
              documentTitle="SURAT KETERANGAN HASIL EVALUASI UJIAN BERBASIS KOMPUTER (CBT)"
              documentNumber={`Nomor: 421.5 / SKH-CBT / ${new Date().getFullYear()} / ${printStudentCard.studentNis}`}
              subTitle="Sistem Evaluasi Berbasis Komputer & Verifikasi Akademik Resmi"
            />

            {/* 👤 IDENTITAS RESMI SISWA */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-black p-3 bg-slate-50/50 print-avoid-break">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Nama Lengkap</span>
                <span className="font-bold text-black">: {printStudentCard.studentName}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Kelas / Rombel</span>
                <span className="font-bold text-black">: {printStudentCard.studentClass}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">NISN / Nomor Induk</span>
                <span className="font-mono font-bold text-black">: {printStudentCard.studentNis}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Waktu Evaluasi</span>
                <span>: {printStudentCard.submittedAt ? new Date(printStudentCard.submittedAt).toLocaleString('id-ID') : '-'}</span>
              </div>
            </div>

            {/* 📚 RINCIAN PAKET UJIAN */}
            <div className="p-3 border border-black bg-purple-50/30 print-avoid-break space-y-1">
              <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                Mata Pelajaran: {printStudentCard.subject}
              </div>
              <div className="text-base font-black text-black">
                {printStudentCard.examTitle}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 pt-0.5">
                <span>Target: <strong>{printStudentCard.studentClass}</strong></span>
                <span>•</span>
                <span>Guru Pengampu: <strong>{printStudentCard.examAuthor || 'Guru Pengampu'}</strong></span>
                <span>•</span>
                <span>KKM: <strong>{Number(effectiveCardKkm).toFixed(2)}</strong></span>
                <span>•</span>
                <span>Total Soal: <strong>{printStudentCard.totalQuestions} Butir</strong></span>
              </div>
            </div>

            {/* 🎯 KOTAK NILAI RESMI KEDINASAN */}
            <div className="border-2 border-black p-4 bg-slate-50 flex items-center justify-between print-avoid-break">
              <div>
                <span className="text-[11px] font-bold text-slate-600 block uppercase">
                  Nilai Perolehan Ujian CBT:
                </span>
                <div className="text-4xl font-black text-black">
                  {Math.round(printStudentCard.score)} <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
                <span className="text-[10px] text-slate-500 italic block mt-0.5">
                  Terbilang: {printStudentCard.score >= 90 ? 'Sangat Baik' : printStudentCard.score >= 80 ? 'Baik' : printStudentCard.score >= effectiveCardKkm ? 'Cukup (Tuntas KKM)' : 'Perlu Peningkatan'}
                </span>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Status Kriteria Ketuntasan:</span>
                {printStudentCard.score >= effectiveCardKkm ? (
                  <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black border border-black uppercase tracking-wider">
                    ✓ LULUS / TUNTAS
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-white text-black text-xs font-black border-2 border-black uppercase tracking-wider">
                    WAJIB REMEDIAL
                  </span>
                )}
                <div className="text-[10px] text-slate-700">
                  Benar: <strong>{printStudentCard.totalCorrect}</strong> dari {printStudentCard.totalQuestions} Soal
                </div>
              </div>
            </div>

            {/* 🛡️ KEABSAHAN & TANDA TANGAN */}
            <CbtSecurityValidationBox
              examTitle={printStudentCard.examTitle}
            />

            <CbtOfficialSignatures
              config={kopSuratConfig}
              teacherName={printStudentCard.examAuthor || (isGuru ? currentUserName : (currentUser?.name || 'Guru Mata Pelajaran'))}
              subjectName={printStudentCard.subject}
              classNameTarget={printStudentCard.studentClass}
              mode="two-column"
            />
          </div>
        )}
      </CbtPrintModalWrapper>

      {/* 🔄 MODAL KONFIRMASI RESET UJIAN */}
      <ConfirmModal
        isOpen={Boolean(resetTargetAttempt)}
        onClose={() => setResetTargetAttempt(null)}
        onConfirm={handleResetAttempt}
        title="Konfirmasi Reset Ujian Siswa"
        message={`Apakah Anda yakin ingin mereset hasil ujian untuk siswa "${resetTargetAttempt?.studentName}" pada paket "${resetTargetAttempt?.examTitle}"? Data nilai saat ini akan dihapus dan siswa dapat login untuk mengerjakan ujian ulang.`}
        confirmText="Ya, Reset Ujian"
        cancelText="Batal"
        isLoading={isResetting}
        variant="danger"
      />

      {/* 🌟 Universal High-Tech Center Alert Dialog */}
      {feedbackModal && (
        <ConfirmModal
          isOpen={feedbackModal.isOpen}
          onClose={() => {
            const cb = feedbackModal.onCloseCallback;
            setFeedbackModal(null);
            if (cb) cb();
          }}
          title={feedbackModal.title}
          message={feedbackModal.message}
          variant={feedbackModal.variant || 'info'}
          isAlert={true}
          confirmText={feedbackModal.confirmText || 'Mengerti'}
        />
      )}
    </div>
  );
}

