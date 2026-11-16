'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import Link from 'next/link';
import {
  MonitorPlay,
  Key,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
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
  Wifi,
  FileCheck2,
} from 'lucide-react';
import {
  verifyAndPrepareExamJoinAction,
  confirmAndJoinExamAction,
  lookupStudentIdentityAction,
  studentGatewayLogoutAction,
  studentDirectLoginAction,
  VerifiedStudentData,
  VerifiedExamData,
  WrongRoomDetails,
} from './actions';

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
  const [token, setToken] = useState(prefillToken ? prefillToken.toUpperCase().slice(0, 6) : '');

  // 6-Slot OTP state and refs
  const slotRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpChars = Array.from({ length: 6 }, (_, i) => token[i] || '');

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

  // Click ripple animations for lightweight high-tech tactile feedback
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const triggerClickAnim = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now() + Math.random(), x, y };
    setRipples((prev) => [...prev.slice(-4), newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  // Handle slot token changes
  const handleSlotChange = (index: number, val: string) => {
    const cleanChar = val.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const currentChars = Array.from({ length: 6 }, (_, i) => token[i] || '');
    currentChars[index] = cleanChar;
    const newToken = currentChars.join('').trimEnd();
    setToken(newToken);
    if (cleanChar && index < 5) {
      slotRefs.current[index + 1]?.focus();
    }
  };

  const handleSlotKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpChars[index] && index > 0) {
        slotRefs.current[index - 1]?.focus();
      } else if (otpChars[index]) {
        const currentChars = Array.from({ length: 6 }, (_, i) => token[i] || '');
        currentChars[index] = '';
        setToken(currentChars.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      slotRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      slotRefs.current[index + 1]?.focus();
    }
  };

  const handleSlotPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    if (pasted) {
      setToken(pasted);
      const nextIdx = Math.min(pasted.length, 5);
      slotRefs.current[nextIdx]?.focus();
    }
  };

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

    const cleanToken = token.trim().toUpperCase();
    if (!cleanToken) {
      setErrorMessage('Silakan masukkan 6 digit Token Ujian yang diberikan pengawas.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyAndPrepareExamJoinAction({
        authenticatedUserId: authenticatedStudent?.id,
        usernameOrNisn: usernameOrNisn.trim(),
        password: password.trim(),
        token: cleanToken,
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
    return (
      fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || 'SW'
    );
  };

  return (
    <div className="min-h-screen relative bg-[#f7f8f6] text-slate-800 flex flex-col justify-between font-sans selection:bg-[#5fa08d] selection:text-white overflow-hidden">
      {/* 🎨 Lightweight Floating Organic Bokeh Shapes (60fps GPU Hardware Accelerated) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Mint / Sage Floating Blob */}
        <div
          className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#5fa08d]/22 via-[#80bdab]/15 to-transparent blur-[90px] animate-[floatDrift1_18s_easeInOut_infinite]"
          style={{ willChange: 'transform' }}
        />
        {/* Soft Honey / Champagne Floating Blob */}
        <div
          className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-gradient-to-bl from-[#caa55d]/20 via-[#e2c788]/15 to-transparent blur-[100px] animate-[floatDrift2_22s_easeInOut_infinite]"
          style={{ willChange: 'transform' }}
        />
        {/* Bottom Soft Emerald Glow */}
        <div
          className="absolute -bottom-40 left-1/3 w-[600px] h-[500px] rounded-full bg-gradient-to-t from-[#5fa08d]/18 via-[#a5d8cb]/10 to-transparent blur-[110px] animate-[floatDrift3_20s_easeInOut_infinite]"
          style={{ willChange: 'transform' }}
        />
        {/* Ambient Top Pastel Geometry Accent */}
        <div className="absolute top-12 right-[12%] w-64 h-64 rounded-[48px] bg-gradient-to-br from-[#68a795]/10 to-[#caa55d]/10 rotate-12 blur-2xl opacity-70" />
        <div className="absolute bottom-24 left-[8%] w-56 h-56 rounded-full bg-[#f1dfb8]/25 blur-2xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-white/60 bg-white/70 backdrop-blur-xl px-3 sm:px-8 py-2.5 sm:py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            onClick={triggerClickAnim}
            className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 transition-colors group cursor-pointer shrink-0"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span className="hidden sm:inline">Kembali ke Beranda</span>
            <span className="sm:hidden">Beranda</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-500/10 border border-emerald-300/60 px-2.5 sm:px-3.5 py-1 rounded-full shadow-2xs backdrop-blur-md shrink-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="hidden xs:inline">Server CBT Aktif & Terhubung</span>
            <span className="xs:hidden">Server CBT Aktif</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8 flex flex-col justify-center">
        {/* 🌟 HERO TITLE DENGAN ANIMASI CANGGIH & 100% TETAP TERBACA DI SEMUA PERANGKAT */}
        <div className="text-center space-y-2.5 sm:space-y-3 relative select-none">
          {/* 1. Interactive Pill Badge: Breathing & Twinkling */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/90 border border-[#5fa08d]/35 text-[#1b5344] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(95,160,141,0.12)] backdrop-blur-md animate-[badgeFloat_4.5s_ease-in-out_infinite] transition-transform hover:scale-105 cursor-default">
            <Sparkles size={13} className="text-[#caa55d] shrink-0 animate-[sparkleGleam_3s_ease-in-out_infinite]" />
            <span className="bg-gradient-to-r from-[#1b5344] to-[#2f6354] bg-clip-text text-transparent font-extrabold">
              Gerbang Masuk Ujian Mandiri Siswa
            </span>
          </div>

          {/* 2. Main Title: "Smart CBT" (Glint Sheen) + "Ruang Ujian Online" (Fluid Aurora Wave + Ambient Aura) */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Holographic Ambient Glow behind text (Layer kedalaman 3D futuristik) */}
            <div
              aria-hidden="true"
              className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-r from-[#5fa08d]/25 via-[#f0ca65]/20 to-[#caa55d]/25 blur-2xl rounded-full opacity-60 pointer-events-none animate-[auraPulse_5s_ease-in-out_infinite]"
            />

            <h1 className="relative text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.2] drop-shadow-2xs flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3.5 gap-y-1">
              {/* "Smart CBT" with sophisticated metallic glint sheen */}
              <span className="smart-cbt-text font-black inline-block whitespace-nowrap">
                Smart CBT
              </span>

              {/* "Ruang Ujian Online" with flowing aurora gradient */}
              <span className="ruang-ujian-aurora font-black inline-block text-center whitespace-normal sm:whitespace-nowrap">
                Ruang Ujian Online
              </span>
            </h1>
          </div>

          {/* 3. Subtitle: Crisp Slate with high readability across all devices */}
          <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium max-w-xl mx-auto leading-relaxed px-2">
            {authenticatedStudent
              ? `Selamat datang, ${authenticatedStudent.name}! Masukkan Token Ujian resmi dari pengawas untuk memulai pengerjaan.`
              : 'Gunakan Username & Password resmi pada Kartu Login Peserta Ujian Anda serta Token Ujian dari pengawas ruangan.'}
          </p>
        </div>

        {/* 🌟 EXACT GLASSMORPHIC FLOATING CARD (MATCHING USER SCREENSHOT) */}
        <div className="max-w-md w-full mx-auto">
          <div className="relative backdrop-blur-2xl bg-white/85 border border-white/90 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-[0_25px_60px_-15px_rgba(62,114,100,0.12),0_12px_28px_-10px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#10705a] via-[#5fa08d] via-[#f0ca65] to-[#cca348]"></div>

            {/* Top Header Row inside Card: CBT Secure Exam • v2.6 Terenkripsi */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100/90 mb-4 sm:mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-400"></span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">CBT Secure Exam</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-500 tracking-wide">
                v2.6 • Terenkripsi
              </span>
            </div>

            {/* TAB SELECTOR: Tampil jika siswa BELUM login */}
            {!authenticatedStudent && (
              <div className="p-1 bg-slate-100/90 rounded-full border border-slate-200/70 mb-4 sm:mb-5 grid grid-cols-2 gap-1 text-[11px] sm:text-xs font-bold shadow-inner">
                <button
                  type="button"
                  onClick={(e) => {
                    triggerClickAnim(e);
                    setActiveTab('exam');
                    setErrorMessage('');
                  }}
                  className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-full transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer relative overflow-hidden ${
                    activeTab === 'exam'
                      ? 'bg-gradient-to-r from-[#10705a] via-[#3e8571] to-[#cca348] text-white shadow-md shadow-[#3e8571]/30 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Key size={13} className={activeTab === 'exam' ? 'text-white' : 'text-[#cca348]'} />
                  <span className="truncate">Masuk Ujian (Token)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    triggerClickAnim(e);
                    setActiveTab('portal');
                    setPortalError('');
                  }}
                  className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-full transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer relative overflow-hidden ${
                    activeTab === 'portal'
                      ? 'bg-gradient-to-r from-[#10705a] via-[#3e8571] to-[#cca348] text-white shadow-md shadow-[#3e8571]/30 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen size={13} className={activeTab === 'portal' ? 'text-white' : 'text-[#3e8571]'} />
                  <span className="truncate">Portal Siswa (Jadwal)</span>
                </button>
              </div>
            )}

            {/* ⛔ Alert Notifikasi Rapi: Salah Kamar Ujian */}
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
                {/* 🪪 TAMPILAN JIKA SISWA SUDAH LOGIN: KARTU PESERTA AKTIF + 6-SLOT OTP */}
                {authenticatedStudent ? (
                  <div className="space-y-4">
                    {/* Kartu Profil Siswa Terautentikasi */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#5fa08d]/10 via-[#caa55d]/10 to-white/60 border border-[#5fa08d]/25 shadow-sm space-y-3 backdrop-blur-md">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10705a] via-[#5fa08d] to-[#cca348] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#5fa08d]/25 shrink-0">
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
                      {/* 6-Slot Token Input */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Key size={13} className="text-[#caa55d]" /> TOKEN UJIAN
                          </label>
                          <span className="text-[11px] font-semibold text-[#caa55d]">
                            (DIBERIKAN PENGAWAS)
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                          {otpChars.map((char, idx) => (
                            <div key={idx} className="relative aspect-square">
                              <input
                                ref={(el) => {
                                  slotRefs.current[idx] = el;
                                }}
                                type="text"
                                inputMode="text"
                                autoCapitalize="characters"
                                maxLength={1}
                                value={char}
                                onChange={(e) => handleSlotChange(idx, e.target.value)}
                                onKeyDown={(e) => handleSlotKeyDown(idx, e)}
                                onPaste={handleSlotPaste}
                                autoFocus={idx === 0}
                                className={`w-full h-full text-center text-lg sm:text-2xl font-black font-mono uppercase bg-white border rounded-xl sm:rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 outline-none select-all caret-[#5fa08d] ${
                                  char
                                    ? 'border-[#5fa08d] text-slate-900 bg-emerald-50/20'
                                    : 'border-slate-200/90 text-slate-700'
                                } focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/20 focus:scale-[1.04] focus:z-10`}
                              />
                              <Key
                                size={9}
                                className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 text-slate-300 pointer-events-none"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                          <Info size={12} className="text-[#caa55d] shrink-0" />
                          <span>Minta 6 karakter token kepada pengawas ruangan Anda.</span>
                        </p>
                      </div>

                      {/* Tombol Masuk Ujian */}
                      <button
                        type="submit"
                        disabled={loading}
                        onClick={triggerClickAnim}
                        className="relative w-full mt-2 py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white shadow-xl shadow-[#3e8571]/25 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 overflow-hidden cursor-pointer group bg-gradient-to-r from-[#10705a] via-[#2f8872] via-[#a3944d] to-[#cca348] hover:brightness-105"
                      >
                        {/* Shimmer sweep */}
                        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmerSweep_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                        {/* Ripples */}
                        {ripples.map((rip) => (
                          <span
                            key={rip.id}
                            className="absolute rounded-full bg-white/30 pointer-events-none animate-[ripple_0.6s_ease-out]"
                            style={{
                              left: rip.x,
                              top: rip.y,
                              width: 120,
                              height: 120,
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                        ))}

                        <div className="relative flex items-center justify-center gap-2">
                          {loading ? (
                            <>
                              <Loader2 size={18} className="animate-spin text-white" />
                              <span>Mencocokkan Ruang & Token...</span>
                            </>
                          ) : (
                            <>
                              <span>Mulai Masuk Ujian</span>
                              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  </div>
                ) : (
                  /* 🪪 TAMPILAN JIKA SISWA BELUM LOGIN: SESUAI GAMBAR USER SCREENSHOT */
                  <form onSubmit={handleVerifySubmit} className="space-y-4">
                    {/* Notice Wajib Kartu Login: Champagne Box */}
                    <div className="p-3.5 rounded-2xl bg-[#faf6eb] border border-[#eedeb7] flex items-start gap-2.5 text-xs text-slate-800 shadow-2xs">
                      <CreditCard size={17} className="text-[#caa55d] shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="text-slate-900 font-bold">Wajib Kredensial Kartu:</strong> Masukkan
                        Username/NISN & Password sesuai{' '}
                        <strong className="text-slate-900 font-bold">Kartu Login Peserta Ujian</strong> Anda.
                      </div>
                    </div>

                    {/* Field 1: USERNAME / NISN SISWA */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={13} className="text-slate-700" /> USERNAME / NISN SISWA
                        </label>
                        <span className="text-[11px] font-semibold text-[#caa55d]">Dari Kartu Login</span>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          value={usernameOrNisn}
                          onChange={(e) => setUsernameOrNisn(e.target.value)}
                          placeholder="Contoh: 105802928"
                          required
                          className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-white/90 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/15 transition-all font-mono font-medium shadow-2xs group-hover:border-slate-300"
                        />
                        {isLookingUp && (
                          <div className="absolute right-3.5 top-3.5 text-[#5fa08d]">
                            <Loader2 size={16} className="animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Live Match Indicator Nama & Kelas */}
                      {liveLookupInfo && (
                        <div className="mt-2 p-2.5 px-3 rounded-xl bg-emerald-50/90 border border-emerald-300 text-[11px] text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50 shadow-2xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            <span className="truncate">
                              <strong>{liveLookupInfo.name}</strong> • {liveLookupInfo.studentClass}
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md font-bold shrink-0">
                            Terverifikasi
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Field 2: PASSWORD AKUN UJIAN */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock size={13} className="text-[#caa55d]" /> PASSWORD AKUN UJIAN
                        </label>
                        <span className="text-[11px] font-semibold text-[#caa55d]">Kredensial Kartu</span>
                      </div>
                      <div className="relative group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white/90 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/15 transition-all font-medium shadow-2xs group-hover:border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                          aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Default:{' '}
                        <code className="text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          siswa123
                        </code>{' '}
                        (atau sesuai kartu peserta)
                      </p>
                    </div>

                    {/* Field 3: 6-SLOT PIN/OTP TOKEN UJIAN DENGAN WATERMARK KEY */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Key size={13} className="text-[#caa55d]" /> TOKEN UJIAN
                        </label>
                        <span className="text-[11px] font-semibold text-[#caa55d]">
                          (DIBERIKAN PENGAWAS)
                        </span>
                      </div>

                      <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                        {otpChars.map((char, idx) => (
                          <div key={idx} className="relative aspect-square">
                            <input
                              ref={(el) => {
                                slotRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="text"
                              autoCapitalize="characters"
                              maxLength={1}
                              value={char}
                              onChange={(e) => handleSlotChange(idx, e.target.value)}
                              onKeyDown={(e) => handleSlotKeyDown(idx, e)}
                              onPaste={handleSlotPaste}
                              className={`w-full h-full text-center text-lg sm:text-2xl font-black font-mono uppercase bg-white border rounded-xl sm:rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 outline-none select-all caret-[#5fa08d] ${
                                char
                                  ? 'border-[#5fa08d] text-slate-900 bg-emerald-50/20'
                                  : 'border-slate-200/90 text-slate-700'
                              } focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/20 focus:scale-[1.04] focus:z-10`}
                            />
                            <Key
                              size={9}
                              className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 text-slate-300 pointer-events-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button with High-Tech Shimmer and Haptic Ripple */}
                    <button
                      type="submit"
                      disabled={loading}
                      onClick={triggerClickAnim}
                      className="relative w-full mt-2 py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white shadow-xl shadow-[#3e8571]/25 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 overflow-hidden cursor-pointer group bg-gradient-to-r from-[#10705a] via-[#2f8872] via-[#a3944d] to-[#cca348] hover:brightness-105"
                    >
                      {/* Shimmer sweep animation */}
                      <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmerSweep_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                      {/* Ripple items */}
                      {ripples.map((rip) => (
                        <span
                          key={rip.id}
                          className="absolute rounded-full bg-white/30 pointer-events-none animate-[ripple_0.6s_ease-out]"
                          style={{
                            left: rip.x,
                            top: rip.y,
                            width: 120,
                            height: 120,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      ))}

                      <div className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin text-white" />
                            <span>Memvalidasi Kredensial Kartu...</span>
                          </>
                        ) : (
                          <>
                            <span>Otentikasi & Mulai Ujian</span>
                            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: LOGIN LANGSUNG KE PORTAL SISWA (LIHAT JADWAL & MATERI) */}
            {activeTab === 'portal' && !authenticatedStudent && (
              <form onSubmit={handlePortalLoginSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#5fa08d]/10 border border-[#5fa08d]/25 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                  <GraduationCap size={18} className="text-[#caa55d] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Portal Siswa CBT:</strong> Masuk untuk melihat seluruh jadwal
                    ujian, pengumuman nilai, dan materi tanpa memasukkan token sekarang.
                  </div>
                </div>

                {portalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>{portalError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                    Username / NISN
                  </label>
                  <input
                    type="text"
                    value={portalUsername}
                    onChange={(e) => setPortalUsername(e.target.value)}
                    placeholder="Masukkan Username atau NISN"
                    required
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/15 font-mono shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                    Password Akun
                  </label>
                  <div className="relative">
                    <input
                      type={portalShowPassword ? 'text' : 'password'}
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#5fa08d] focus:ring-4 focus:ring-[#5fa08d]/15 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setPortalShowPassword(!portalShowPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {portalShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={portalLoading}
                  onClick={triggerClickAnim}
                  className="relative w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white shadow-xl shadow-[#3e8571]/25 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 overflow-hidden cursor-pointer group bg-gradient-to-r from-[#10705a] via-[#2f8872] via-[#a3944d] to-[#cca348] hover:brightness-105"
                >
                  {portalLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span>Masuk ke Portal...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Masuk ke Portal Siswa</span>
                      <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </button>
              </form>
            )}

            {/* Quick Link Portal Siswa & Developer Badge */}
            <div className="mt-5 text-center space-y-2.5">
              <Link
                href="/portal/siswa/cbt"
                onClick={triggerClickAnim}
                className="text-xs text-slate-700 hover:text-[#caa55d] font-bold inline-flex items-center gap-1.5 transition-colors group cursor-pointer"
              >
                <span>Lihat semua jadwal paket ujian di Portal Siswa</span>
                <ChevronRight
                  size={14}
                  className="text-[#caa55d] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
              <div className="pt-2 border-t border-slate-100/80 text-[10.5px] text-slate-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
                <span>Smart CBT Platform v2.6</span>
                <span>•</span>
                <span className="text-slate-600 font-bold">Created By Abdul Rahman</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 MODAL KONFIRMASI IDENTITAS RESMI PESERTA UJIAN */}
        {isConfirmModalOpen && verifiedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in-50">
            <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-2xl sm:rounded-[32px] max-w-lg w-full p-4 sm:p-7 shadow-2xl relative overflow-hidden space-y-4 sm:space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
              {/* Top Logo Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#10705a] via-[#5fa08d] via-[#f0ca65] to-[#cca348]"></div>

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#5fa08d]/10 border border-[#5fa08d]/25 text-[#2f6354] flex items-center justify-center shrink-0">
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
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Verified Profile Badge */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3.5">
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#10705a] via-[#5fa08d] to-[#cca348] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#5fa08d]/25 shrink-0">
                    {getInitials(verifiedStudent.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {verifiedStudent.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-700 font-semibold">
                        NISN: {verifiedStudent.nisn}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">Status: Aktif</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Kelas Resmi
                    </span>
                    <strong className="text-sm font-extrabold text-[#9a782a]">
                      {verifiedStudent.studentClass}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Program Keahlian
                    </span>
                    <strong
                      className="text-xs font-bold text-[#2f6354] truncate block"
                      title={verifiedStudent.majorName}
                    >
                      {verifiedStudent.majorName}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Target Exam Details (Jika ada Token) */}
              {verifiedExam ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5fa08d]/8 to-[#caa55d]/8 border border-[#5fa08d]/25 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2f6354] uppercase tracking-wider flex items-center gap-1.5">
                      <MonitorPlay size={14} className="text-[#caa55d]" /> Ruang Ujian CBT
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#caa55d]/15 text-[#9a782a] border border-[#caa55d]/35">
                      Token: {token}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{verifiedExam.title}</div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-1">
                    <span>
                      Mata Pelajaran: <strong className="text-slate-800">{verifiedExam.subject}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Durasi: <strong className="text-slate-800">{verifiedExam.duration} Menit</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Ruang: <strong className="text-slate-800">{verifiedExam.roomName}</strong>
                    </span>
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
                ⚠️ <strong>Pemberitahuan:</strong> Pastikan nama dan NISN di atas adalah milik Anda. Seluruh
                jawaban, durasi pengerjaan, dan perolehan nilai akan otomatis direkam permanen ke akun rapor siswa
                ini.
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
                  className="w-full sm:w-2/3 py-3 px-5 rounded-xl bg-gradient-to-r from-[#10705a] via-[#3e8571] to-[#cca348] hover:brightness-105 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#3e8571]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm">
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

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm">
            <div className="p-2 bg-[#5fa08d]/10 text-[#2f6354] rounded-xl shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Anti-Cheat Cerdas</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mencatat perpindahan tab browser otomatis demi integritas ujian.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm">
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
      <footer className="relative z-10 border-t border-slate-200/60 py-4 px-4 text-center text-xs text-slate-500 bg-white/50 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
        <span>Portal Ujian Mandiri Siswa (Smart CBT) • SMK Digital Vocational Excellence</span>
        <span className="hidden sm:inline text-slate-300">•</span>
        <span className="font-semibold text-slate-700">Created By Abdul Rahman</span>
      </footer>

      {/* 🚀 CSS Keyframes for 60fps animations */}
      <style jsx global>{`
        /* 💎 Smart CBT Titanium Metallic Sheen Animation */
        .smart-cbt-text {
          color: #091e2b;
          background: linear-gradient(
            115deg,
            #091e2b 0%,
            #091e2b 35%,
            #477a6c 50%,
            #091e2b 65%,
            #091e2b 100%
          );
          background-size: 240% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glintWave 5.5s ease-in-out infinite;
        }

        /* 🌊 Ruang Ujian Online Fluid Aurora Gradient Wave */
        .ruang-ujian-aurora {
          color: #1b5e4c;
          background: linear-gradient(
            100deg,
            #175444 0%,
            #2a7360 22%,
            #5fa08d 45%,
            #d6a746 72%,
            #8e6c26 90%,
            #175444 100%
          );
          background-size: 260% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: auroraFlow 6.5s ease-in-out infinite alternate;
        }

        @keyframes auroraFlow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }

        @keyframes glintWave {
          0%, 60% {
            background-position: -180% 0;
          }
          100% {
            background-position: 180% 0;
          }
        }

        @keyframes badgeFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes sparkleGleam {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.3) rotate(18deg);
            opacity: 1;
            filter: drop-shadow(0 0 6px rgba(202, 165, 93, 0.95));
          }
        }

        @keyframes auraPulse {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.97);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.03);
          }
        }

        @keyframes floatDrift1 {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(35px, -25px) scale(1.06);
          }
        }
        @keyframes floatDrift2 {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(-30px, 30px) scale(0.96);
          }
        }
        @keyframes floatDrift3 {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(25px, 35px) scale(1.04);
          }
        }
        @keyframes shimmerSweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
