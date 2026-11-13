'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  X, 
  Search, 
  Filter, 
  QrCode, 
  Eye, 
  EyeOff, 
  Scissors, 
  ShieldCheck, 
  Layers, 
  Settings2, 
  School, 
  User, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Calendar,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';
import { KopSuratConfig, DEFAULT_KOP_SURAT_CONFIG } from '@/app/admin/settings/types';
import { CbtDigitalStamp } from './CbtOfficialPrintComponents';
import { generateQrSvg } from '@/lib/pure-qr';
import { getCbtStudentCardsDataAction, CbtStudentCardItem } from '@/app/admin/cbt/actions';

interface CbtParticipantCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  kopSuratConfig?: Partial<KopSuratConfig>;
  initialClasses?: string[];
}

export default function CbtParticipantCardModal({
  isOpen,
  onClose,
  kopSuratConfig: initialKopConfig,
  initialClasses = [],
}: CbtParticipantCardModalProps) {
  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [students, setStudents] = useState<CbtStudentCardItem[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(initialClasses);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [kopConfig, setKopConfig] = useState<KopSuratConfig>({
    ...DEFAULT_KOP_SURAT_CONFIG,
    ...initialKopConfig,
  });

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedMajor, setSelectedMajor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Customization States
  const [examTitle, setExamTitle] = useState<string>('ASESMEN SUMATIF AKHIR SEMESTER (ASAS) GANJIL');
  const [academicYear, setAcademicYear] = useState<string>('TAHUN AJARAN 2026/2027 • SEMESTER GANJIL');
  const [examRoom, setExamRoom] = useState<string>('Lab Komputer 1 / Ruang CBT');
  const [examSession, setExamSession] = useState<string>('Sesi 1 (07:30 - 09:30 WIB)');
  const [portalUrl, setPortalUrl] = useState<string>('https://smk-web.vercel.app/ujian');
  const [selectedExamId, setSelectedExamId] = useState<string>('custom');

  // Display Options
  const [layoutMode, setLayoutMode] = useState<'4-per-page' | '6-per-page'>('4-per-page');
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [showQr, setShowQr] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showCuttingGuide, setShowCuttingGuide] = useState<boolean>(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);

  // Set default portalUrl based on browser origin once mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalUrl(`${window.location.origin}/ujian`);
    }
  }, []);

  // Fetch student data on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getCbtStudentCardsDataAction();
        if (!isMounted) return;

        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setStudents(res.students || []);
          if (res.availableClasses && res.availableClasses.length > 0) {
            setAvailableClasses(res.availableClasses);
          }
          if (res.kopSuratConfig) {
            setKopConfig({
              ...DEFAULT_KOP_SURAT_CONFIG,
              ...res.kopSuratConfig,
            });
          }
          if (res.exams) {
            setAvailableExams(res.exams);
          }
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg(err.message || 'Gagal memuat data kartu siswa.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle preset exam selection
  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (examId === 'custom') return;
    const found = availableExams.find((e) => e.id === examId);
    if (found) {
      setExamTitle(found.title.toUpperCase());
      if (found.roomName) setExamRoom(found.roomName);
      if (found.startTime) {
        const dateObj = new Date(found.startTime);
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setExamSession(`Sesi Ujian (${timeStr} WIB)`);
      }
      if (found.classTarget && found.classTarget !== 'Semua Kelas') {
        setSelectedClass(found.classTarget);
      }
    }
  };

  // Extract unique majors from students & available classes
  const uniqueMajors = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.major && s.major !== 'Umum') set.add(s.major);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Filter Kelas
      if (selectedClass !== 'ALL' && s.studentClass !== selectedClass) return false;
      // Filter Tingkat (X, XI, XII)
      if (selectedGrade !== 'ALL' && s.gradeLevel !== selectedGrade) return false;
      // Filter Jurusan
      if (selectedMajor !== 'ALL' && s.major !== selectedMajor) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesUsername = s.username.toLowerCase().includes(q);
        const matchesNisn = s.nisn ? s.nisn.toLowerCase().includes(q) : false;
        const matchesClass = s.studentClass.toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesNisn && !matchesClass) return false;
      }
      return true;
    });
  }, [students, selectedClass, selectedGrade, selectedMajor, searchQuery]);

  // Generate vector QR SVG string once for the portal URL
  const qrSvg = useMemo(() => {
    try {
      return generateQrSvg(portalUrl || 'https://smk-web.vercel.app/ujian', {
        size: layoutMode === '4-per-page' ? 84 : 70,
        padding: 1,
        darkColor: '#0f172a',
      });
    } catch (e) {
      return '';
    }
  }, [portalUrl, layoutMode]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-start p-0 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      {/* 🛠️ TOP CONTROL BAR (HIDDEN IN PRINT) */}
      <div className="w-full max-w-7xl bg-white dark:bg-slate-900 rounded-b-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 mb-4 sticky top-0 z-50 print:hidden transition-all">
        {/* Title & Close */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-bold mb-1.5 shadow-sm">
              <ShieldCheck size={14} className="text-amber-600" /> 👑 Fitur Resmi Admin Utama: Cetak Kartu Login Peserta CBT
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Studio Kartu Login Peserta Ujian</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {filteredStudents.length} Siswa Terpilih
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kartu resmi berisi akun login (Username & Password) untuk dibagikan kepada siswa sebelum ujian dimulai.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                isOptionsOpen
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-purple-600 dark:text-purple-400'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Settings2 size={16} /> Kustomisasi Teks & Tata Letak
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || filteredStudents.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Printer size={18} /> Cetak Kartu Sekarang (A4)
            </button>

            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Tutup Studio"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 🎛️ ACCORDION KUSTOMISASI DETAIL UJIAN & LAYOUT */}
        {isOptionsOpen && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ambil Dari Paket Ujian (Opsional):
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => handleExamChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                >
                  <option value="custom">-- Kustom Manual --</option>
                  {availableExams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.subject} • {e.classTarget})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Ujian Pada Kartu:
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Misal: ASAS GANJIL 2026/2027"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Ajaran / Keterangan Header:
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Misal: TAHUN AJARAN 2026/2027 • SEMESTER GANJIL"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ruang Ujian Default:
                </label>
                <input
                  type="text"
                  value={examRoom}
                  onChange={(e) => setExamRoom(e.target.value)}
                  placeholder="Misal: Lab Komputer 1 / Ruang CBT"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sesi Ujian Default:
                </label>
                <input
                  type="text"
                  value={examSession}
                  onChange={(e) => setExamSession(e.target.value)}
                  placeholder="Misal: Sesi 1 (07:30 - 09:30 WIB)"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL Portal CBT Siswa (QR Target):
                </label>
                <input
                  type="text"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://smk-web.vercel.app/ujian"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-purple-600" /> Mode Kertas:
              </span>
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setLayoutMode('4-per-page')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    layoutMode === '4-per-page'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  4 Kartu / Hal A4 (Besar & Lega)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('6-per-page')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    layoutMode === '6-per-page'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  6 Kartu / Hal A4 (Hemat Kertas)
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <KeyRound size={13} className="text-amber-500" /> Tampilkan Password
                </span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <QrCode size={13} className="text-indigo-500" /> QR Scan Cepat
                </span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" /> Cap Stempel Digital
                </span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCuttingGuide}
                  onChange={(e) => setShowCuttingGuide(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Scissors size={13} className="text-rose-500" /> Garis Potong Gunting
                </span>
              </label>
            </div>
          </div>
        )}

        {/* 🔍 FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          {/* Filter Kelas */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {availableClasses.map((cls) => {
                const count = students.filter((s) => s.studentClass === cls).length;
                return (
                  <option key={cls} value={cls}>
                    {cls} ({count} Siswa)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter Tingkat */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Filter Tingkat:
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Semua Tingkat (X, XI, XII)</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          {/* Filter Jurusan */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Filter Jurusan:
            </label>
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Semua Jurusan</option>
              {uniqueMajors.map((m) => (
                <option key={m} value={m}>
                  Jurusan {m}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Nama / NISN */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Cari Nama / NISN / User:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama atau NISN..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ ERROR OR LOADING STATE */}
      {loading && (
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-xl text-center space-y-4 my-10 print:hidden">
          <RefreshCw size={36} className="animate-spin text-purple-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Memuat Data Siswa & Kredensial CBT...</h3>
          <p className="text-xs text-slate-500">Menyinkronkan data NISN, kelas, dan akun login seluruh siswa.</p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="w-full max-w-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-6 rounded-2xl shadow-xl text-center space-y-3 my-10 print:hidden">
          <AlertCircle size={36} className="text-rose-600 mx-auto" />
          <h3 className="text-lg font-bold text-rose-800 dark:text-rose-200">Gagal Membuka Kartu Peserta</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300">{errorMsg}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Tutup
          </button>
        </div>
      )}

      {!loading && !errorMsg && filteredStudents.length === 0 && (
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-xl text-center space-y-3 my-10 print:hidden">
          <User size={36} className="text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tidak Ada Siswa Ditemukan</h3>
          <p className="text-xs text-slate-500">
            Tidak ada siswa aktif yang cocok dengan filter kelas atau kata kunci pencarian Anda.
          </p>
        </div>
      )}

      {/* 📄 PRINTABLE CARDS CONTAINER */}
      {!loading && !errorMsg && filteredStudents.length > 0 && (
        <div className="w-full max-w-7xl pb-16 print:pb-0 print:w-full print:max-w-none">
          {/* Printable Grid */}
          <div
            className={`grid gap-4 print:gap-2 print:p-0 ${
              layoutMode === '4-per-page'
                ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2'
            }`}
          >
            {filteredStudents.map((student, idx) => (
              <SingleParticipantCard
                key={student.id}
                student={student}
                kopConfig={kopConfig}
                examTitle={examTitle}
                academicYear={academicYear}
                examRoom={examRoom}
                examSession={examSession}
                portalUrl={portalUrl}
                qrSvg={qrSvg}
                showPassword={showPassword}
                showQr={showQr}
                showStamp={showStamp}
                showCuttingGuide={showCuttingGuide}
                layoutMode={layoutMode}
                cardIndex={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* 🖨️ NATIVE PRINT MEDIA STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 🪪 SINGLE PARTICIPANT CARD COMPONENT (Ultra-Clean, Official, Modern)
 */
function SingleParticipantCard({
  student,
  kopConfig,
  examTitle,
  academicYear,
  examRoom,
  examSession,
  portalUrl,
  qrSvg,
  showPassword,
  showQr,
  showStamp,
  showCuttingGuide,
  layoutMode,
  cardIndex,
}: {
  student: CbtStudentCardItem;
  kopConfig: KopSuratConfig;
  examTitle: string;
  academicYear: string;
  examRoom: string;
  examSession: string;
  portalUrl: string;
  qrSvg: string;
  showPassword: boolean;
  showQr: boolean;
  showStamp: boolean;
  showCuttingGuide: boolean;
  layoutMode: '4-per-page' | '6-per-page';
  cardIndex: number;
}) {
  const isCompact = layoutMode === '6-per-page';

  // Get initials for modern avatar
  const initials = student.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={`relative bg-white text-slate-900 border-2 border-slate-800 rounded-xl shadow-md overflow-hidden print-avoid-break print:shadow-none font-sans ${
        isCompact ? 'p-3' : 'p-4'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* ✂️ OPTIONAL CUTTING GUIDES */}
      {showCuttingGuide && (
        <div className="absolute top-1 right-2 text-[9px] text-slate-400 flex items-center gap-1 font-mono select-none print:text-slate-500">
          <Scissors size={10} /> <span>✂ Potong di sini</span>
        </div>
      )}

      {/* 🏛️ CARD HEADER */}
      <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-900">
        {/* School Logo */}
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
          {kopConfig.logoLeftUrl ? (
            <img
              src={kopConfig.logoLeftUrl}
              alt={kopConfig.schoolName}
              className="max-w-[44px] max-h-[44px] object-contain"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 text-white flex items-center justify-center font-black text-sm shadow-sm border border-amber-400">
              SMK
            </div>
          )}
        </div>

        {/* School Name & Title */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider truncate leading-tight">
            {kopConfig.yayasanName || 'YAYASAN PENDIDIKAN NUSANTARA'}
          </div>
          <div className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-tight truncate leading-tight">
            {kopConfig.schoolName}
          </div>
          <div className="text-[10px] font-black text-blue-900 uppercase tracking-wide leading-tight mt-0.5">
            KARTU LOGIN & PESERTA UJIAN CBT
          </div>
          <div className="text-[8px] text-slate-500 font-semibold truncate leading-tight">
            {examTitle} • {academicYear}
          </div>
        </div>

        {/* Accreditation / Badge */}
        <div className="hidden sm:flex flex-col items-center justify-center px-2 py-1 rounded-md bg-slate-100 border border-slate-300 text-center flex-shrink-0">
          <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">AKREDITASI</span>
          <span className="text-xs font-black text-blue-900 leading-tight">
            {kopConfig.akreditasi ? kopConfig.akreditasi.charAt(0) : 'A'}
          </span>
        </div>
      </div>

      {/* 👤 CARD BODY: STUDENT IDENTITY & LOGIN BOX */}
      <div className="mt-2.5 grid grid-cols-12 gap-2.5 items-stretch">
        {/* Left Column: Student Details */}
        <div className="col-span-7 flex flex-col justify-between space-y-2">
          {/* Top Info */}
          <div className="space-y-1">
            {/* Student Name */}
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Nama Peserta Ujian:</span>
              <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-tight line-clamp-1">
                {student.name}
              </div>
            </div>

            {/* Table of Info */}
            <div className="text-[9px] sm:text-[9.5px] space-y-0.5 font-medium text-slate-700">
              <div className="flex items-center gap-1">
                <span className="w-16 font-semibold text-slate-500">NISN / NIS:</span>
                <span className="font-mono font-bold text-slate-900">
                  {student.nisn || student.username}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-16 font-semibold text-slate-500">Kelas / Rombel:</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-purple-50 text-purple-900 border border-purple-200 text-[9px]">
                  {student.studentClass}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-16 font-semibold text-slate-500">Jurusan:</span>
                <span className="font-bold text-slate-800">{student.major}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-16 font-semibold text-slate-500">Ruang & Sesi:</span>
                <span className="font-semibold text-slate-800 truncate">
                  {examRoom.split('/')[0].trim()} • {examSession.split('(')[0].trim()}
                </span>
              </div>
            </div>
          </div>

          {/* Mini Rules */}
          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[7.5px] text-slate-600 leading-tight">
            <strong>Perhatian:</strong> Kartu wajib dibawa & ditaruh di meja saat ujian. Jaga kerahasiaan password Anda!
          </div>
        </div>

        {/* Right Column: Credentials Box & QR */}
        <div className="col-span-5 flex flex-col justify-between items-center text-center space-y-1.5">
          {/* Highlighted Login Credential Box */}
          <div className="w-full bg-slate-900 text-white rounded-lg p-2 shadow-sm border border-slate-950 flex flex-col justify-center">
            <div className="text-[7.5px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <KeyRound size={9} /> Kredensial Login CBT
            </div>

            {/* Username */}
            <div className="text-left bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 mb-1">
              <div className="text-[6.5px] text-slate-400 uppercase font-semibold">Username:</div>
              <div className="font-mono font-black text-[11px] sm:text-xs text-emerald-400 tracking-wide truncate">
                {student.username}
              </div>
            </div>

            {/* Password */}
            <div className="text-left bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              <div className="text-[6.5px] text-slate-400 uppercase font-semibold">Password:</div>
              <div className="font-mono font-black text-[11px] sm:text-xs text-amber-300 tracking-wide">
                {showPassword ? student.password : '••••••••'}
              </div>
            </div>
          </div>

          {/* Quick QR Code */}
          {showQr && qrSvg && (
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-0.5 border border-slate-300 rounded-md shadow-xs flex items-center justify-center overflow-hidden"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="text-[6.5px] font-bold text-slate-600 mt-0.5 uppercase tracking-tighter">
                Scan Masuk Ujian
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 🖋️ CARD FOOTER: SIGNATURE & OFFICIAL DIGITAL STAMP */}
      <div className="mt-2.5 pt-1.5 border-t border-slate-200 flex items-end justify-between text-[8px] text-slate-600">
        <div className="text-left leading-tight">
          <div className="font-semibold text-slate-500">Portal Ujian Siswa:</div>
          <div className="font-mono font-bold text-blue-900 text-[8.5px] truncate max-w-[150px]">
            {portalUrl.replace(/^https?:\/\//, '')}
          </div>
          <div className="text-[6.5px] text-slate-400 mt-0.5 font-mono">
            ID: {student.id.slice(-6).toUpperCase()} • {student.studentClass}
          </div>
        </div>

        {/* Headmaster Signature & Stamp */}
        <div className="relative text-right flex flex-col items-end">
          <div className="text-[7.5px] text-slate-600 font-medium">
            {kopConfig.city || 'Kota Bekasi'}, {currentDateFormatted}
          </div>
          <div className="text-[8px] font-bold text-slate-800">
            Kepala Sekolah,
          </div>

          {/* Digital Stamp Overlay */}
          <div className="relative h-9 w-28 flex items-center justify-center my-0.5">
            {showStamp && (
              <div className="absolute right-3 -top-2 opacity-85 scale-[0.38] pointer-events-none transform origin-center">
                <CbtDigitalStamp
                  schoolName={kopConfig.schoolName}
                  yayasanName={kopConfig.yayasanName}
                />
              </div>
            )}
            <div className="text-[6.5px] text-slate-400 italic">
              [ Tanda Tangan Resmi ]
            </div>
          </div>

          <div className="font-bold underline text-slate-900 text-[8.5px] leading-none">
            {kopConfig.headmasterName || 'H. Ahmad Fauzi, M.Pd'}
          </div>
          <div className="text-[7px] text-slate-500 font-mono">
            NIP. {kopConfig.headmasterNip || '19780512 200312 1 004'}
          </div>
        </div>
      </div>
    </div>
  );
}

