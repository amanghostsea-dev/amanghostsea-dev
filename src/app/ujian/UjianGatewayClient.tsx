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
  BookOpen,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
  LogOut,
  QrCode
} from 'lucide-react';
import {
  verifyAndPrepareExamJoinAction,
  confirmAndJoinExamAction,
  lookupStudentIdentityAction,
  studentGatewayLogoutAction,
  studentDirectLoginAction,
  VerifiedStudentData,
  VerifiedExamData,
  WrongRoomDetails
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

export interface AuthenticatedStudentProp {
  id: string;
  name: string;
  username: string;
  nisn: string;
  studentClass: string;
}

export default function UjianGatewayClient({
  activeExams = [],
  currentStudentName = '',
  currentStudentNis = '',
  authenticatedStudent = null,
  prefillUsername = '',
  prefillToken = '',
}: {
  activeExams?: ExamItem[];
  currentStudentName?: string;
  currentStudentNis?: string;
  authenticatedStudent?: AuthenticatedStudentProp | null;
  prefillUsername?: string;
  prefillToken?: string;
}) {
  // Mode Tab: 'exam' (Ruang Ujian Token) atau 'portal' (Portal Siswa)
  const [activeTab, setActiveTab] = useState<'exam' | 'portal'>('exam');

  // Input states untuk Ruang Ujian (dengan Kredensial Kartu)
  const [usernameOrNisn, setUsernameOrNisn] = useState(
    prefillUsername || authenticatedStudent?.username || currentStudentNis || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState(prefillToken || '');

  // Input states untuk Tab Portal Siswa
  const [portalUsername, setPortalUsername] = useState(
    prefillUsername || authenticatedStudent?.username || currentStudentNis || ''
  );
  const [portalPassword, setPortalPassword] = useState('');
  const [portalShowPassword, setPortalShowPassword] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  // States untuk Verifikasi & Pencocokan Database
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wrongRoomInfo, setWrongRoomInfo] = useState<WrongRoomDetails | null>(null);
  const [liveLookupInfo, setLiveLookupInfo] = useState<{ name: string; studentClass: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // States untuk Modal Konfirmasi Identitas Resmi
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudentData | null>(null);
  const [verifiedExam, setVerifiedExam] = useState<VerifiedExamData | null>(null);
  const [isConfirming, startConfirming] = useTransition();

  // 🔍 Live background lookup saat siswa mengetik Username / NISN (hanya jika belum login)
  useEffect(() => {
    if (authenticatedStudent) return;

    const trimmed = usernameOrNisn.trim();
    if (trimmed.length < 3) {
      setLiveLookupInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const res = await lookupStudentIdentityAction(trimmed);
        if (res.success && res.student) {
          setLiveLookupInfo({
            name: res.student.name,
            studentClass: res.student.studentClass,
          });
        } else {
          setLiveLookupInfo(null);
        }
      } catch {
        setLiveLookupInfo(null);
      } finally {
        setIsLookingUp(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [usernameOrNisn, authenticatedStudent]);

  // Handle Verifikasi Kredensial Kartu & Token Ujian
  const handleVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setWrongRoomInfo(null);
    setLoading(true);

    try {
      const res = await verifyAndPrepareExamJoinAction({
        authenticatedUserId: authenticatedStudent?.id,
        usernameOrNisn: usernameOrNisn.trim(),
        password: password.trim(),
        token: token.trim().toUpperCase(),
      });

      if (!res.success || !res.student) {
        if (res.wrongRoomDetails) {
          setWrongRoomInfo(res.wrongRoomDetails);
        } else {
          setErrorMessage(res.error || 'Data kredensial kartu atau token tidak valid.');
        }
        setLoading(false);
        return;
      }

      // Jika data 100% cocok dengan database, buka Modal Konfirmasi Resmi
      setVerifiedStudent(res.student);
      setVerifiedExam(res.exam || null);
      setIsConfirmModalOpen(true);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat memeriksa kredensial kartu siswa.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Handle Login Langsung ke Portal Siswa dari Tab Portal
  const handlePortalLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPortalError('');
    setPortalLoading(true);

    const formData = new FormData();
    formData.append('username', portalUsername.trim());
    formData.append('password', portalPassword.trim());

    try {
      const res = await studentDirectLoginAction(formData);
      if (res?.error) {
        setPortalError(res.error);
        setPortalLoading(false);
      }
    } catch {
      // Normal redirect from Next.js Server Action
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
          setWrongRoomInfo(null);
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
    <div className="min-h-screen bg-[#fafaf9] text-slate-800 flex flex-col justify-between font-sans selection:bg-[#5fa08d] selection:text-white">
      {/* Background soft ambient glow matching loading book logo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#5fa08d]/10 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[#caa55d]/10 blur-[130px] rounded-full"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full shadow-2xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>Server CBT Aktif & Terhubung</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

        {/* Hero Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#5fa08d]/10 border border-[#5fa08d]/30 text-[#3a6b5d] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 shadow-2xs">
            <Sparkles size={13} className="text-[#caa55d]" />
            Gerbang Masuk Ujian Mandiri Siswa
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Smart CBT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3e7264] via-[#5fa08d] to-[#caa55d]">Ruang Ujian Online</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            {authenticatedStudent
              ? `Selamat datang, ${authenticatedStudent.name}! Masukkan Token Ujian resmi dari pengawas untuk memulai pengerjaan.`
              : 'Gunakan Username & Password resmi pada Kartu Login Peserta Ujian Anda serta Token Ujian dari pengawas ruangan.'}
          </p>
        </div>

        {/* Quick Login Form Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] via-[#f5d076] to-[#caa55d]"></div>

            {/* TAB SELECTOR: Hanya tampil jika siswa BELUM login */}
            {!authenticatedStudent && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/90 mb-5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('exam');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'exam'
                      ? 'bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white shadow-md shadow-[#5fa08d]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Key size={14} />
                  <span>Masuk Ujian (Token)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('portal');
                    setPortalError('');
                  }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'portal'
                      ? 'bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white shadow-md shadow-[#5fa08d]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <BookOpen size={14} />
                  <span>Portal Siswa (Jadwal)</span>
                </button>
              </div>
            )}

            {/* ⛔ Alert Notifikasi Rapi: Salah Kamar Ujian (Komparatif, Tidak Menumpuk) */}
            {wrongRoomInfo ? (
              <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm animate-in fade-in-50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <span>Salah Kamar Ujian</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                    Akses Ditolak
                  </span>
                </div>

                <div className="text-xs text-rose-800 leading-relaxed">
                  Token ini milik paket <strong className="text-rose-950 font-bold">"{wrongRoomInfo.examTitle}"</strong> ({wrongRoomInfo.examSubject}).
                </div>

                {/* Perbandingan Rapi 2 Kolom: Target Ujian vs Kelas Siswa */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white border border-rose-200 text-xs shadow-2xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Target Ujian:</span>
                    <span className="font-extrabold text-emerald-700 truncate block mt-0.5">
                      {wrongRoomInfo.targetClass}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Kelas Anda:</span>
                    <span className="font-extrabold text-rose-700 truncate block mt-0.5">
                      {wrongRoomInfo.studentClass}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <Info size={13} className="text-[#caa55d] shrink-0" />
                  <span>Silakan tanyakan token ujian yang sesuai dengan kelas Anda ke pengawas ruangan.</span>
                </div>
              </div>
            ) : errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in-50 shadow-sm">
                <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-800">
                    {errorMessage.includes('Salah Kamar')
                      ? 'Salah Kamar Ujian'
                      : errorMessage.includes('Password')
                      ? 'Kredensial Password Salah'
                      : 'Pencocokan Data Gagal'}
                  </div>
                  <div className="text-rose-700 leading-relaxed text-xs">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* TAB 1: FORM MASUK RUANG UJIAN CBT */}
            {activeTab === 'exam' && (
              <>
                {/* 🪪 TAMPILAN JIKA SISWA SUDAH LOGIN: KARTU PESERTA AKTIF */}
                {authenticatedStudent ? (
                  <div className="space-y-4">
                    {/* Kartu Profil Siswa Terautentikasi */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#5fa08d]/8 via-[#caa55d]/8 to-white border border-[#5fa08d]/25 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#5fa08d]/25 shrink-0">
                            {getInitials(authenticatedStudent.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Kartu Login Aktif
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#caa55d]/15 text-[#916f21] border border-[#caa55d]/35">
                                {authenticatedStudent.studentClass}
                              </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate mt-1">
                              {authenticatedStudent.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-mono">
                              NISN: {authenticatedStudent.nisn}
                            </p>
                          </div>
                        </div>

                        {/* Tombol Logout / Ganti Siswa */}
                        <form action={studentGatewayLogoutAction}>
                          <button
                            type="submit"
                            title="Ganti Akun Siswa (Komputer Lab)"
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200 cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">Ganti Akun</span>
                          </button>
                        </form>
                      </div>
                    </div>

                    <form onSubmit={handleVerifySubmit} className="space-y-4">
                      {/* Input Token Ujian */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Key size={14} className="text-[#caa55d]" /> Masukkan Token Ujian
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Diberikan Pengawas)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={token}
                          onChange={(e) => setToken(e.target.value.toUpperCase())}
                          placeholder="CONTOH: PAS24G"
                          maxLength={12}
                          required
                          autoFocus
                          className="w-full px-4 py-3.5 rounded-2xl bg-slate-50/80 border border-slate-300 text-slate-900 placeholder-slate-400 text-center text-lg sm:text-xl font-mono font-bold tracking-widest uppercase focus:bg-white focus:outline-none focus:border-[#caa55d] focus:ring-2 focus:ring-[#caa55d]/25 transition-all shadow-inner"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                          <Info size={12} className="text-[#caa55d] shrink-0" />
                          <span>Minta 6 karakter token kepada pengawas ruangan Anda.</span>
                        </p>
                      </div>

                      {/* Tombol Masuk Ujian */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#437768] hover:to-[#be984e] text-white font-extrabold rounded-2xl shadow-lg shadow-[#5fa08d]/25 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin text-white" />
                            <span>Mencocokkan Ruang & Token...</span>
                          </div>
                        ) : (
                          <>
                            <span>Mulai Masuk Ujian</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* 🪪 TAMPILAN JIKA SISWA BELUM LOGIN: FORM OTENTIKASI KARTU PESERTA + TOKEN */
                  <form onSubmit={handleVerifySubmit} className="space-y-4">
                    {/* Notice Wajib Kartu Login */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#5fa08d]/10 via-[#caa55d]/10 to-transparent border border-[#5fa08d]/25 flex items-start gap-2.5 text-xs text-slate-700">
                      <CreditCard size={18} className="text-[#caa55d] shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>Wajib Kredensial Kartu:</strong> Masukkan Username/NISN & Password sesuai <strong>Kartu Login Peserta Ujian</strong> Anda.
                      </div>
                    </div>

                    {/* Field 1: Username / NISN Siswa */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={14} className="text-[#3e7264]" /> Username / NISN Siswa
                        </label>
                        <span className="text-[10px] text-[#caa55d] font-semibold">Dari Kartu Login</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={usernameOrNisn}
                          onChange={(e) => setUsernameOrNisn(e.target.value)}
                          placeholder="Contoh: 105802928"
                          required
                          className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] focus:ring-2 focus:ring-[#5fa08d]/20 transition-all font-mono font-medium tracking-wide shadow-2xs"
                        />
                        {isLookingUp && (
                          <div className="absolute right-3.5 top-3.5 text-[#5fa08d]">
                            <Loader2 size={16} className="animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Live Match Indicator Nama & Kelas */}
                      {liveLookupInfo && (
                        <div className="mt-1.5 p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            <span className="truncate">
                              <strong>{liveLookupInfo.name}</strong> • {liveLookupInfo.studentClass}
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                            Terverifikasi
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Field 2: Password Akun Ujian */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock size={14} className="text-[#caa55d]" /> Password Akun Ujian
                        </label>
                        <span className="text-[10px] text-slate-500">Kredensial Kartu</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] focus:ring-2 focus:ring-[#5fa08d]/20 transition-all font-medium shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition-colors"
                          aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Default: <code className="text-slate-700 font-mono bg-slate-100 px-1 py-0.5 rounded">siswa123</code> (atau sesuai kartu peserta)
                      </p>
                    </div>

                    {/* Field 3: Token Ujian */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Key size={14} className="text-[#caa55d]" /> Token Ujian
                        </span>
                        <span className="text-[10px] text-[#caa55d] font-semibold">
                          (Diberikan Pengawas)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value.toUpperCase())}
                        placeholder="CONTOH: PAS24G"
                        maxLength={12}
                        required
                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-center text-lg sm:text-xl font-mono font-bold tracking-widest uppercase focus:bg-white focus:outline-none focus:border-[#caa55d] focus:ring-2 focus:ring-[#caa55d]/25 transition-all shadow-inner"
                      />
                    </div>

                    {/* Tombol Submit & Verifikasi */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#437768] hover:to-[#be984e] text-white font-extrabold rounded-2xl shadow-lg shadow-[#5fa08d]/25 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={18} className="animate-spin text-white" />
                          <span>Memvalidasi Kredensial Kartu...</span>
                        </div>
                      ) : (
                        <>
                          <span>Otentikasi & Mulai Ujian</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: LOGIN LANGSUNG KE PORTAL SISWA (LIHAT JADWAL & MATERI) */}
            {activeTab === 'portal' && !authenticatedStudent && (
              <form onSubmit={handlePortalLoginSubmit} className="space-y-4">
                <div className="p-3 rounded-2xl bg-[#5fa08d]/10 border border-[#5fa08d]/20 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                  <GraduationCap size={18} className="text-[#caa55d] shrink-0 mt-0.5" />
                  <div>
                    <strong>Portal Siswa CBT:</strong> Masuk untuk melihat seluruh jadwal ujian, pengumuman nilai, dan materi tanpa memasukkan token sekarang.
                  </div>
                </div>

                {portalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>{portalError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Username / NISN
                  </label>
                  <input
                    type="text"
                    value={portalUsername}
                    onChange={(e) => setPortalUsername(e.target.value)}
                    placeholder="Masukkan Username atau NISN"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] font-mono shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Password Akun
                  </label>
                  <div className="relative">
                    <input
                      type={portalShowPassword ? 'text' : 'password'}
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setPortalShowPassword(!portalShowPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                    >
                      {portalShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={portalLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#437768] hover:to-[#be984e] text-white font-extrabold rounded-2xl shadow-lg shadow-[#5fa08d]/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {portalLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span>Masuk ke Portal...</span>
                    </div>
                  ) : (
                    <>
                      <span>Masuk ke Portal Siswa</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Quick Link Portal Siswa */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <Link
                href="/portal/siswa/cbt"
                className="text-xs text-[#3e7264] hover:text-[#caa55d] font-bold inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua jadwal paket ujian di Portal Siswa</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* 🌟 MODAL KONFIRMASI IDENTITAS RESMI PESERTA UJIAN */}
        {isConfirmModalOpen && verifiedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5 animate-in zoom-in-95">
              {/* Top Logo Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4d8675] via-[#5fa08d] via-[#f5d076] to-[#caa55d]"></div>

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#5fa08d]/10 border border-[#5fa08d]/25 text-[#3e7264] flex items-center justify-center shrink-0">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Konfirmasi Identitas Peserta
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Data Anda 100% cocok dengan Database Siswa Resmi SMK.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Verified Profile Badge */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#4d8675] via-[#5fa08d] to-[#caa55d] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#5fa08d]/25 shrink-0">
                    {getInitials(verifiedStudent.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {verifiedStudent.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-700 font-semibold">NISN: {verifiedStudent.nisn}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">Status: Aktif</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Kelas Resmi</span>
                    <strong className="text-sm font-extrabold text-[#9a782a]">
                      {verifiedStudent.studentClass}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Program Keahlian</span>
                    <strong className="text-xs font-bold text-[#3e7264] truncate block" title={verifiedStudent.majorName}>
                      {verifiedStudent.majorName}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Target Exam Details (Jika ada Token) */}
              {verifiedExam ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5fa08d]/8 to-[#caa55d]/8 border border-[#5fa08d]/25 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#3e7264] uppercase tracking-wider flex items-center gap-1.5">
                      <MonitorPlay size={14} className="text-[#caa55d]" /> Ruang Ujian CBT
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#caa55d]/15 text-[#9a782a] border border-[#caa55d]/35">
                      Token: {token}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {verifiedExam.title}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-1">
                    <span>Mata Pelajaran: <strong className="text-slate-800">{verifiedExam.subject}</strong></span>
                    <span>•</span>
                    <span>Durasi: <strong className="text-slate-800">{verifiedExam.duration} Menit</strong></span>
                    <span>•</span>
                    <span>Ruang: <strong className="text-slate-800">{verifiedExam.roomName}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info size={16} className="text-blue-500 shrink-0" />
                  <span>Anda akan diarahkan ke Dashboard Portal CBT untuk memilih paket ujian yang tersedia.</span>
                </div>
              )}

              {/* Notice Confirmation */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Pemberitahuan:</strong> Pastikan nama dan NISN di atas adalah milik Anda. Seluruh jawaban, durasi pengerjaan, dan perolehan nilai akan otomatis direkam permanen ke akun rapor siswa ini.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isConfirming}
                  className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-center cursor-pointer disabled:opacity-50"
                >
                  Bukan Saya / Ubah
                </button>

                <button
                  type="button"
                  onClick={handleFinalConfirmJoin}
                  disabled={isConfirming}
                  className="w-full sm:w-2/3 py-3 px-5 rounded-xl bg-gradient-to-r from-[#4d8675] via-[#5fa08d] to-[#caa55d] hover:from-[#437768] hover:to-[#be984e] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#5fa08d]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        {/* Security & System Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Wifi size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Hemat Kuota & Cepat</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dioptimasi khusus untuk smartphone siswa dengan sinyal seluler minimal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="p-2 bg-[#5fa08d]/10 text-[#3e7264] rounded-xl shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Anti-Cheat Cerdas</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mencatat perpindahan tab browser otomatis demi integritas ujian.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Sinkronisasi Rapor</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nilai dan jawaban ujian langsung terhubung otomatis ke buku nilai rapor siswa.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 py-4 px-4 text-center text-xs text-slate-500 bg-white/70">
        Portal Ujian Mandiri Siswa (Smart CBT) • SMK Digital Vocational Excellence
      </footer>
    </div>
  );
}
