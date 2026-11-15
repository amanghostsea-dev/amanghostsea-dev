'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  MonitorPlay, 
  Key, 
  User, 
  ArrowRight, 
  Clock, 
  FileCheck2, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Wifi,
  ChevronRight,
  Hash,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Check,
  X,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { 
  verifyAndPrepareExamJoinAction, 
  confirmAndJoinExamAction, 
  lookupStudentIdentityAction,
  VerifiedStudentData,
  VerifiedExamData
} from './actions';
import { formatClassTargetDisplay } from '@/lib/cbt-schedule';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status?: string;
  _count: {
    questions: number;
  };
}

export default function UjianGatewayClient({
  activeExams = [],
  currentStudentName = '',
  currentStudentNis = '',
}: {
  activeExams: ExamItem[];
  currentStudentName?: string;
  currentStudentNis?: string;
}) {
  const [nisn, setNisn] = useState(currentStudentNis);
  const [studentName, setStudentName] = useState(currentStudentName);
  const [token, setToken] = useState('');
  
  // States untuk Verifikasi & Pencocokan Database
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [liveLookupInfo, setLiveLookupInfo] = useState<{ name: string; studentClass: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // States untuk Modal Konfirmasi Identitas Resmi
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudentData | null>(null);
  const [verifiedExam, setVerifiedExam] = useState<VerifiedExamData | null>(null);
  const [isConfirming, startConfirming] = useTransition();

  // 🔍 Live background lookup saat siswa mengetik NISN (otomatis mendeteksi nama & kelas)
  useEffect(() => {
    const trimmedNisn = nisn.trim();
    if (trimmedNisn.length < 4) {
      setLiveLookupInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const res = await lookupStudentIdentityAction(trimmedNisn);
        if (res.success && res.student) {
          setLiveLookupInfo({
            name: res.student.name,
            studentClass: res.student.studentClass,
          });
          // Otomatis isi Nama Lengkap jika masih kosong
          if (!studentName.trim()) {
            setStudentName(res.student.name);
          }
        } else {
          setLiveLookupInfo(null);
        }
      } catch {
        setLiveLookupInfo(null);
      } finally {
        setIsLookingUp(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [nisn, studentName]);

  // Handle Verifikasi Data Siswa & Token saat tombol Mulai Masuk Ujian diklik
  const handleVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await verifyAndPrepareExamJoinAction({
        nisn: nisn.trim(),
        studentName: studentName.trim(),
        token: token.trim().toUpperCase(),
      });

      if (!res.success || !res.student) {
        setErrorMessage(res.error || 'Data siswa atau token tidak valid.');
        setLoading(false);
        return;
      }

      // Jika data 100% cocok dengan database, buka Modal Konfirmasi Resmi
      setVerifiedStudent(res.student);
      setVerifiedExam(res.exam || null);
      setIsConfirmModalOpen(true);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat memeriksa database siswa.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Handle Konfirmasi Final Siswa: Masuk ke Ruang Ujian
  const handleFinalConfirmJoin = () => {
    if (!verifiedStudent) return;

    startConfirming(async () => {
      try {
        const res = await confirmAndJoinExamAction({
          userId: verifiedStudent.id,
          examId: verifiedExam?.id || null,
        });

        if (res && res.error) {
          setErrorMessage(res.error);
          setIsConfirmModalOpen(false);
        }
      } catch {
        // Normal Next.js redirect behavior
      }
    });
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'SW';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500 selection:text-white">
      {/* Background cyber ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>Server CBT Aktif & Terhubung</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* Hero Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-purple-400" />
            Gerbang Masuk Ujian Mandiri Siswa
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Smart CBT <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400">Ruang Ujian Online</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Akses langsung ujian berbasis komputer & smartphone. Masukkan NISN, Nama Lengkap, dan Token Ujian resmi dari pengawas Anda.
          </p>
        </div>

        {/* Quick Login Form Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500"></div>

            {/* Alert Notifikasi Error Jika Data Siswa / Token Salah */}
            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in-50 shadow-lg shadow-rose-950/30">
                <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-300">Pencocokan Data Gagal</div>
                  <div className="text-rose-200/90 leading-relaxed">{errorMessage}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              {/* Field 1: NISN Siswa */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash size={14} className="text-purple-400" /> NISN / Nomor Peserta
                  </label>
                  <span className="text-[10px] text-purple-400/80 font-medium">Wajib diisi</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Contoh: 105802928"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono font-medium tracking-wide"
                  />
                  {isLookingUp && (
                    <div className="absolute right-3.5 top-3.5 text-purple-400">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  )}
                </div>

                {/* Live Match Indicator */}
                {liveLookupInfo && (
                  <div className="mt-2 p-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in-50">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <strong>{liveLookupInfo.name}</strong> • {liveLookupInfo.studentClass}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold shrink-0">
                      Terdaftar
                    </span>
                  </div>
                )}
              </div>

              {/* Field 2: Nama Lengkap Siswa */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-indigo-400" /> Nama Lengkap Siswa
                  </label>
                  <span className="text-[10px] text-slate-500">Sesuai Kartu Ujian</span>
                </div>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Jurrien Aurelia Wynette Sasalab"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                />
              </div>

              {/* Field 3: Token Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key size={14} className="text-amber-400" /> Token Ujian
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Diberikan Pengawas)
                  </span>
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="CONTOH: PAS24G"
                  maxLength={12}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-600 text-center text-lg sm:text-xl font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Tombol Submit & Verifikasi */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Mencocokkan Database Siswa...</span>
                  </div>
                ) : (
                  <>
                    <span>Mulai Masuk Ujian</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <Link
                href="/portal/siswa/cbt"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua paket ujian di Portal Siswa</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* 🌟 MODAL KONFIRMASI IDENTITAS RESMI PESERTA UJIAN */}
        {isConfirmModalOpen && verifiedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-50">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl shadow-purple-950/80 relative overflow-hidden space-y-5 animate-in zoom-in-95">
              {/* Top Cyber Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-purple-500 to-indigo-500"></div>

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Konfirmasi Identitas Peserta
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Data Anda 100% cocok dengan Database Siswa Resmi SMK.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Verified Profile Badge */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800/80">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-purple-900/40 shrink-0">
                    {getInitials(verifiedStudent.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-black text-white truncate">
                      {verifiedStudent.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-sky-400 font-semibold">NISN: {verifiedStudent.nisn}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Status: Aktif</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kelas Resmi</span>
                    <strong className="text-white text-sm font-extrabold text-purple-300">
                      {verifiedStudent.studentClass}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Program Keahlian</span>
                    <strong className="text-white text-xs font-bold text-indigo-300 truncate block" title={verifiedStudent.majorName}>
                      {verifiedStudent.majorName}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Target Exam Details (Jika ada Token) */}
              {verifiedExam ? (
                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MonitorPlay size={14} className="text-purple-400" /> Ruang Ujian CBT
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                      Token: {token}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {verifiedExam.title}
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                    <span>Mata Pelajaran: <strong className="text-slate-200">{verifiedExam.subject}</strong></span>
                    <span>•</span>
                    <span>Durasi: <strong className="text-slate-200">{verifiedExam.duration} Menit</strong></span>
                    <span>•</span>
                    <span>Ruang: <strong className="text-slate-200">{verifiedExam.roomName}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Info size={16} className="text-sky-400 shrink-0" />
                  <span>Anda akan diarahkan ke Dashboard Portal CBT untuk memilih paket ujian yang tersedia.</span>
                </div>
              )}

              {/* Notice Confirmation */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
                ⚠️ <strong>Pemberitahuan:</strong> Pastikan nama dan NISN di atas adalah milik Anda. Seluruh jawaban, durasi pengerjaan, dan perolehan nilai akan otomatis direkam permanen ke akun rapor siswa ini.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isConfirming}
                  className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition text-center cursor-pointer disabled:opacity-50"
                >
                  Bukan Saya / Ubah
                </button>

                <button
                  type="button"
                  onClick={handleFinalConfirmJoin}
                  disabled={isConfirming}
                  className="w-full sm:w-2/3 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menghubungkan ke Ruang Ujian...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Data Benar — Masuk Ujian</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Exams Preview Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                <MonitorPlay size={18} />
              </div>
              <h2 className="text-lg font-bold text-white">
                Daftar Paket Ujian Aktif Hari Ini
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {activeExams.length} Paket Tersedia
            </span>
          </div>

          {activeExams.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <p className="text-sm text-slate-400">
                Belum ada jadwal ujian berstatus aktif saat ini. Silakan hubungi pengawas atau guru pengampu Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-purple-950/20 flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {exam.subject}
                      </span>
                      {exam.status === 'ACTIVE' ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sesi Dibuka
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                          <Clock size={11} /> Ruang Tunggu
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                      {exam.title}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-purple-400" />
                        <span>{exam.duration}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileCheck2 size={12} className="text-emerald-400" />
                        <span>{exam._count.questions} Soal</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0" title={exam.classTarget}>
                        <Users size={12} className="text-sky-400 shrink-0" />
                        <span className="truncate">{formatClassTargetDisplay(exam.classTarget)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (exam.token) {
                        setToken(exam.token.split('|')[0]);
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-4 w-full py-2 px-3 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Pilih Paket Ujian Ini</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & System Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Wifi size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Hemat Kuota & Cepat</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dioptimasi khusus untuk smartphone siswa dengan sinyal seluler minimal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Anti-Cheat Cerdas</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mencatat perpindahan tab browser otomatis demi integritas ujian.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Sinkronisasi Rapor</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nilai dan jawaban ujian langsung terhubung otomatis ke buku nilai rapor siswa.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Portal Ujian Mandiri Siswa (Smart CBT) • SMK Digital Vocational Excellence
      </footer>
    </div>
  );
}
