'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  HardDrive,
  Users,
  BookOpen,
  FileText,
  HelpCircle,
  Sparkles,
  Lock,
  ArrowRight,
  X,
  Server,
  Activity,
  Zap,
  Clock,
  ShieldAlert,
  Wifi
} from 'lucide-react';
import {
  exportCbtBackupAction,
  validateCbtBackupAction,
  restoreCbtBackupAction,
  checkDatabaseHealthAction,
  CbtBackupMetadata,
  DatabaseHealthResult,
} from './backup-actions';

interface CbtBackupRestoreViewProps {
  currentUser?: {
    name: string;
    role: string;
    username?: string;
  };
  totalExams: number;
  totalQuestions: number;
  totalAttempts: number;
}

export default function CbtBackupRestoreView({
  currentUser,
  totalExams,
  totalQuestions,
  totalAttempts,
}: CbtBackupRestoreViewProps) {
  // State Ekspor
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // State Validasi & Restore
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedMetadata, setValidatedMetadata] = useState<CbtBackupMetadata | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // State Modal Konfirmasi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'CLEAN' | 'MERGE'>('CLEAN');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // State Live Health Check
  const [healthResult, setHealthResult] = useState<DatabaseHealthResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔍 Handler Diagnosa Kesehatan Database Real-Time
  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await checkDatabaseHealthAction();
      setHealthResult(res);
    } catch (err: any) {
      setHealthResult({
        success: false,
        status: 'DOWN',
        pingMs: 0,
        dbTime: '',
        timeOffsetMs: 0,
        provider: 'Supabase PostgreSQL',
        poolerStatus: 'Error Jaringan Klien',
        counts: { exams: totalExams, questions: totalQuestions, attempts: totalAttempts, users: 0 },
        summary: `Gagal memverifikasi: ${err.message || 'Error server'}`,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    handleRunHealthCheck();
  }, []);

  // 📦 Handler Ekspor Cadangan (.cbtbak)
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setExportSuccess(null);

      const res = await exportCbtBackupAction();
      if (!res.success || !res.backupString) {
        alert(res.error || 'Gagal mengekspor data cadangan.');
        return;
      }

      // Buat file blob dan trigger unduhan browser
      const blob = new Blob([res.backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `cbt-database-backup-${new Date().toISOString().split('T')[0]}.cbtbak`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(
        `Cadangan berhasil diunduh! (${res.summary?.examsCount || 0} Ujian, ${res.summary?.questionsCount || 0} Soal, ${res.summary?.attemptsCount || 0} Jawaban Siswa)`
      );
    } catch (err: any) {
      alert(`Terjadi kesalahan saat mengunduh: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 📂 Handler Pilih File Cadangan
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setRestoreError(null);
    setValidatedMetadata(null);
    setIsValidating(true);

    try {
      const text = await file.text();
      setFileContent(text);

      const res = await validateCbtBackupAction(text);
      if (!res.isValid || !res.metadata) {
        setRestoreError(res.error || 'Berkas cadangan tidak valid atau rusak.');
        return;
      }

      setValidatedMetadata(res.metadata);
      setConfirmPhrase('');
      setIsModalOpen(true);
    } catch (err: any) {
      setRestoreError(`Gagal membaca berkas: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setIsValidating(false);
      // Reset input agar bisa pilih ulang file yang sama jika perlu
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 🚀 Handler Eksekusi Pemulihan (Restore)
  const handleExecuteRestore = async () => {
    if (!fileContent) return;
    if (confirmPhrase.trim().toUpperCase() !== 'SAYA YAKIN') {
      alert('Ketik "SAYA YAKIN" dengan huruf kapital untuk mengonfirmasi pemulihan.');
      return;
    }

    try {
      setIsRestoring(true);
      const res = await restoreCbtBackupAction(fileContent, restoreMode);

      if (!res.success) {
        alert(res.error || 'Pemulihan database gagal.');
        return;
      }

      setRestoreSuccessMessage(res.message || 'Pemulihan database CBT berhasil!');
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Terjadi kesalahan saat memulihkan: ${err.message || 'Error server'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🌟 BANNER UTAMA DENGAN BADGE KEAMANAN */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white border border-indigo-900/60 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-bold">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>Pusat Cadangan & Pemulihan CBT • Khusus Admin Utama</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Cadangan & Pemulihan Database Ujian CBT
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pusat ekspor & impor database seluruh ekosistem ujian (Akun Siswa, Guru, Paket Ujian, Bank Soal, Lembar Jawaban Siswa, hingga Nilai Raport). Gunakan berkas <strong>.cbtbak</strong> untuk migrasi server atau pengisian ke database baru tanpa risiko bentrok data.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">Format Standar</span>
              <span className="text-lg font-black text-cyan-300 font-mono">.CBTBAK v2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 KOTAK NOTIFIKASI SUKSES RESTORE */}
      {restoreSuccessMessage && (
        <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-base">Pemulihan Database Sukses 100%!</h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">{restoreSuccessMessage}</p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang Halaman & Lihat Data Baru</span>
            </button>
            <button
              onClick={() => setRestoreSuccessMessage(null)}
              className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
            >
              Tutup Pesan
            </button>
          </div>
        </div>
      )}

      {/* 🔍 LIVE DIAGNOSA KESEHATAN DATABASE SUPABASE */}
      <div className={`rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-300 shadow-sm ${
        isCheckingHealth
          ? 'border-blue-400 ring-2 ring-blue-400/20'
          : healthResult?.status === 'HEALTHY'
            ? 'border-emerald-400/80 ring-2 ring-emerald-400/15 dark:border-emerald-700/80'
            : healthResult?.status === 'DEGRADED'
              ? 'border-amber-400/80 ring-2 ring-amber-400/20 dark:border-amber-700/80'
              : healthResult?.status === 'DOWN'
                ? 'border-rose-500 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              healthResult?.status === 'HEALTHY'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : healthResult?.status === 'DEGRADED'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            }`}>
              <Activity size={22} className={isCheckingHealth ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Diagnosa Kesehatan Database Supabase
                </h3>
                {healthResult ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    healthResult.status === 'HEALTHY'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : healthResult.status === 'DEGRADED'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      healthResult.status === 'HEALTHY'
                        ? 'bg-emerald-500 animate-pulse'
                        : healthResult.status === 'DEGRADED'
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-rose-500 animate-ping'
                    }`} />
                    <span>
                      {healthResult.status === 'HEALTHY'
                        ? 'Normal & Sangat Sehat'
                        : healthResult.status === 'DEGRADED'
                          ? 'Terhubung (Ada Latensi)'
                          : 'Gangguan / Offline'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <RefreshCw size={10} className="animate-spin" /> Menghubungkan...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uji langsung latensi query, status PgBouncer pooler, dan kesiapan baca-tulis server secara real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRunHealthCheck}
              disabled={isCheckingHealth}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer ${
                isCheckingHealth
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              <RefreshCw size={14} className={isCheckingHealth ? 'animate-spin' : ''} />
              <span>{isCheckingHealth ? 'Menguji Koneksi...' : 'Uji Koneksi Ulang'}</span>
            </button>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {/* Metric 1: Latensi Respon */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Zap size={11} className="text-amber-500" /> Latensi Query
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono ${
                (healthResult?.pingMs || 0) <= 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : (healthResult?.pingMs || 0) <= 400
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              }`}>
                {healthResult ? `${healthResult.pingMs}` : '--'}
              </span>
              <span className="text-xs font-bold text-slate-400">ms</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              {(healthResult?.pingMs || 0) <= 100 ? '⚡ Sangat Cepat' : (healthResult?.pingMs || 0) <= 400 ? '🟡 Normal' : '🔴 Lambat'}
            </span>
          </div>

          {/* Metric 2: Connection Pooler */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Server size={11} className="text-blue-500" /> Connection Pooler
            </span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              PgBouncer 6543
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
              Mode: Transaksi Aktif
            </span>
          </div>

          {/* Metric 3: Sinkronisasi Jam */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Clock size={11} className="text-purple-500" /> Jam Server DB
            </span>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
              {healthResult?.dbTime ? new Date(healthResult.dbTime).toLocaleTimeString('id-ID') : '--:--:--'}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Offset: {healthResult ? `${(healthResult.timeOffsetMs / 1000).toFixed(2)} dtk` : '0 dtk'}
            </span>
          </div>

          {/* Metric 4: Tabel Terhubung */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Database size={11} className="text-cyan-500" /> Status Database
            </span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              {healthResult?.counts ? `${healthResult.counts.exams} Paket Ujian` : `${totalExams} Paket Ujian`}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {healthResult?.counts ? `${healthResult.counts.questions} Soal • ${healthResult.counts.attempts} Siswa` : `${totalQuestions} Soal`}
            </span>
          </div>
        </div>

        {/* SUMMARY FOOTER NOTE */}
        {healthResult && (
          <div className={`mt-4 p-3 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
            healthResult.status === 'HEALTHY'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : healthResult.status === 'DEGRADED'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={healthResult.status === 'HEALTHY' ? 'text-emerald-600' : 'text-amber-600'} />
              <span><strong>Diagnosa:</strong> {healthResult.summary}</span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 hidden md:inline">
              Terakhir diperiksa: {new Date(healthResult.checkedAt).toLocaleTimeString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* 2 KARTU UTAMA: EKSPOR & IMPOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📦 KARTU 1: EKSPOR CADANGAN DATABASE */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Ekspor Database CBT (.cbtbak)
                </h3>
                <p className="text-xs text-slate-500">
                  Unduh seluruh data CBT ke dalam satu berkas terenkripsi & siap migrasi.
                </p>
              </div>
            </div>

            {/* Live Data Summary Pills */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Paket Ujian</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{totalExams}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Butir Soal</span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">{totalQuestions}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Jawaban Siswa</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalAttempts}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Format <strong>.cbtbak</strong> menyertakan hash integritas SHA-256 (anti-korup).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Password akun siswa & guru tersimpan aman tanpa perlu di-reset di database baru.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Kop surat dinas, timezone WITA, dan riwayat nilai ikut tercadangkan 100%.</span>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Membuat Cadangan Database...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Unduh Cadangan Database Lengkap (.cbtbak)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 🚀 KARTU 2: IMPOR / PULIHKAN KE DATABASE BARU */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Unggah & Pulihkan Database Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Gunakan berkas cadangan (.cbtbak) untuk mengisi database baru secara otomatis.
                </p>
              </div>
            </div>

            {/* Input File Box / Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-3 cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".cbtbak,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <FileCheck2 size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isValidating
                    ? 'Memeriksa Integritas File...'
                    : 'Klik atau Tarik Berkas Cadangan (.cbtbak) ke Sini'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Mendukung format cadangan resmi sistem: <strong>.cbtbak</strong> atau .json
                </p>
              </div>
            </div>

            {restoreError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Gagal Validasi Berkas:</span>
                  <p className="text-[11px] leading-relaxed">{restoreError}</p>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed text-[11px]">
                <span className="font-bold">Keamanan Pemulihan Terpadu:</span> Seluruh pemulihan dijalankan dalam 1 transaksi ACID. Sistem melakukan <em>Smart ID Remapping</em> sehingga paket ujian, soal, dan jawaban siswa tersambung sempurna tanpa kendala foreign key constraint.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isValidating}
              className="w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Upload size={18} />
              <span>Pilih Berkas Cadangan (.cbtbak)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📘 PANDUAN MIGRASI DATABASE BARU */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle size={15} className="text-blue-500" />
          <span>Panduan Migrasi ke Database Baru (Supabase / Neon / PostgreSQL Lokal)</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-1">
          <li>Di database lama, klik tombol <strong>"Unduh Cadangan Database Lengkap (.cbtbak)"</strong> di atas.</li>
          <li>Ganti konfigurasi environment `POSTGRES_PRISMA_DATABASE_URL` di server baru Anda (jalankan `npx prisma db push` satu kali agar skema tabel terbentuk).</li>
          <li>Buka menu ini di database baru, lalu unggah berkas <strong>.cbtbak</strong> Anda.</li>
          <li>Pilih <strong>Mode Timpa Bersih</strong>, lalu ketik konfirmasi. Seluruh akun, soal, dan jawaban akan tersinkronisasi 100% siap digunakan!</li>
        </ol>
      </div>

      {/* 🛡️ MODAL KONFIRMASI HEALTH CHECK & PEMULIHAN */}
      {isModalOpen && validatedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Verifikasi Berkas Cadangan CBT
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berkas valid & siap dipulihkan ke database ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Ringkasan File */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-900 dark:text-indigo-300 font-bold">Asal Sekolah:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{validatedMetadata.schoolName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-900 dark:text-indigo-300 font-bold">Waktu Ekspor:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {new Date(validatedMetadata.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-900 dark:text-indigo-300 font-bold">Integritas Checksum:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> SHA-256 Valid
                  </span>
                </div>
              </div>

              {/* Data Summary Badges */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rincian Data yang Akan Dimasukkan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Akun Pengguna</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {validatedMetadata.summary.usersCount} Akun
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Paket Ujian</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {validatedMetadata.summary.examsCount} Paket
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Butir Soal</span>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                      {validatedMetadata.summary.questionsCount} Soal
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Jawaban Siswa</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {validatedMetadata.summary.attemptsCount} Lembar
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Mata Pelajaran</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {validatedMetadata.summary.subjectsCount} Mapel
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nilai Raport</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {validatedMetadata.summary.gradesCount} Nilai
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Pemulihan Radio */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Metode Pemulihan:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setRestoreMode('CLEAN')}
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                      restoreMode === 'CLEAN'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'CLEAN'}
                      onChange={() => setRestoreMode('CLEAN')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Mode Timpa Bersih (Direkomendasikan untuk Database Baru)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Membersihkan data ujian lama di database ini dan mengisi ulang dengan data cadangan. Menjamin struktur 100% sinkron dan bebas duplikasi.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setRestoreMode('MERGE')}
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                      restoreMode === 'MERGE'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'MERGE'}
                      onChange={() => setRestoreMode('MERGE')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Mode Penggabungan (Merge / Append)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Menambahkan paket ujian baru ke database tanpa menghapus data ujian yang sudah ada saat ini.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Konfirmasi Keamanan */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <Lock size={14} />
                  <span>Konfirmasi Keamanan Admin Utama</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-300">
                  Ketik <strong>SAYA YAKIN</strong> di bawah ini untuk membuka tombol pemulihan database:
                </p>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="Ketik: SAYA YAKIN"
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || confirmPhrase.trim().toUpperCase() !== 'SAYA YAKIN'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition disabled:opacity-40"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Memulihkan Database (Mohon Tunggu)...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Mulai Pemulihan Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
