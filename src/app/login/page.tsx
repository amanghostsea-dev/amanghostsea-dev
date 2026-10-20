'use client';

import { useState, useEffect } from 'react';
import { loginAction } from './actions';
import { 
  Lock, 
  User, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  Cpu, 
  Activity, 
  Layers, 
  Globe,
  Radio
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type JurusanKey = 'dkv' | 'mplb' | 'tjkt';

interface JurusanInfo {
  code: string;
  name: string;
  fullName: string;
  tagline: string;
  image: string;
  accentColor: string;
  glowColor: string;
  badgeBg: string;
  borderGlow: string;
  gradientText: string;
  buttonGradient: string;
  ringColor: string;
}

const JURUSAN_DATA: Record<JurusanKey, JurusanInfo> = {
  dkv: {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    fullName: 'DKV Garuda Mahadhika',
    tagline: 'Visual Creative, Motion Graphics & Digital Arts',
    image: '/images/emblem/dkv.png',
    accentColor: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.45)',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    borderGlow: 'hover:border-purple-500/50',
    gradientText: 'from-purple-400 via-fuchsia-300 to-indigo-400',
    buttonGradient: 'from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 shadow-purple-900/40',
    ringColor: 'focus-within:border-purple-500 focus-within:ring-purple-500/20',
  },
  mplb: {
    code: 'MPLB',
    name: 'Manajemen Perkantoran',
    fullName: 'MPLB Garuda Mahadhika',
    tagline: 'Corporate Governance & Modern Business Administration',
    image: '/images/emblem/mplb.png',
    accentColor: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
    borderGlow: 'hover:border-sky-500/50',
    gradientText: 'from-sky-400 via-cyan-300 to-blue-400',
    buttonGradient: 'from-sky-600 via-blue-600 to-cyan-600 hover:from-sky-500 hover:via-blue-500 hover:to-cyan-500 shadow-blue-900/40',
    ringColor: 'focus-within:border-sky-500 focus-within:ring-sky-500/20',
  },
  tjkt: {
    code: 'TJKT',
    name: 'Teknik Jaringan Komputer',
    fullName: 'TJKT Garuda Mahadhika',
    tagline: 'Cybersecurity, Cloud Infrastructure & Telecom Engineering',
    image: '/images/emblem/tjkt.png',
    accentColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    badgeBg: 'bg-red-500/10 border-red-500/30 text-red-300',
    borderGlow: 'hover:border-red-500/50',
    gradientText: 'from-red-400 via-rose-300 to-amber-400',
    buttonGradient: 'from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:via-rose-500 hover:to-amber-500 shadow-red-900/40',
    ringColor: 'focus-within:border-red-500 focus-within:ring-red-500/20',
  },
};

export default function LoginPage() {
  const [activeJurusan, setActiveJurusan] = useState<JurusanKey>('tjkt');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const current = JURUSAN_DATA[activeJurusan];

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#070b14] text-white flex flex-col justify-between overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* =========================================================================
          BACKGROUND LAYER 1: Futuristic Tech Grid & Ambient Aura Orbs
          ========================================================================= */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial Gradient Ambient Glow matching Active Jurusan */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 animate-pulse-glow"
        style={{
          background: `radial-gradient(circle, ${current.glowColor} 0%, rgba(7, 11, 20, 0) 70%)`
        }}
      />
      <div 
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-40 transition-colors duration-1000"
        style={{ background: current.accentColor }}
      />
      <div 
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-30 transition-colors duration-1000"
        style={{ background: current.accentColor }}
      />

      {/* =========================================================================
          BACKGROUND LAYER 2: Giant Transparent Holographic Watermark Emblem
          ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Futuristic Cyber Rings */}
        <div className="absolute w-[500px] h-[500px] sm:w-[750px] sm:h-[750px] rounded-full border border-white/5 animate-spin-slow" />
        <div 
          className="absolute w-[440px] h-[440px] sm:w-[680px] sm:h-[680px] rounded-full border border-dashed opacity-20 transition-colors duration-1000"
          style={{ borderColor: current.accentColor }}
        />
        <div className="absolute w-[380px] h-[380px] sm:w-[600px] sm:h-[600px] rounded-full border border-white/10" />

        {/* The Huge Transparent Watermark Emblem */}
        <div className="relative w-[340px] h-[340px] sm:w-[540px] sm:h-[540px] lg:w-[680px] lg:h-[680px] opacity-10 lg:opacity-15 mix-blend-screen transition-all duration-1000 transform animate-float">
          <Image
            src={current.image}
            alt={current.fullName}
            fill
            sizes="(max-width: 768px) 340px, (max-width: 1200px) 540px, 680px"
            className="object-contain filter drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]"
            priority
          />
        </div>
      </div>

      {/* =========================================================================
          TOP HUD BAR: High-Tech Telemetry & Quick Back Link
          ========================================================================= */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-slate-950/40">
        <Link 
          href="/" 
          className="group inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Live HUD Telemetry */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">SECURE NODE</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">TLS 1.3</span>
          </div>
          <div className="bg-slate-900/80 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
            <Radio size={12} className="text-cyan-400 animate-pulse" />
            <span>TIME: <span className="text-white font-bold">{currentTime || 'ONLINE'}</span></span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN CONTENT: Glassmorphic High-Tech Login Card
          ========================================================================= */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md">

          {/* Futuristic Hologram Card Container */}
          <div className="relative rounded-3xl bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.85)] p-6 sm:p-8 overflow-hidden transition-all duration-500">
            
            {/* Top Glowing Dynamic Light Bar */}
            <div 
              className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${current.buttonGradient} transition-all duration-700`}
            />

            {/* Subtle Card Circuit Pattern Highlight */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            {/* Emblem & Crest Display Header */}
            <div className="text-center relative mb-6">
              
              {/* Floating Transparent Emblem Badge with Spotlight Pedestal */}
              <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center">
                {/* Glow ring under emblem */}
                <div 
                  className="absolute inset-0 rounded-full blur-xl opacity-75 transition-all duration-700 animate-pulse-glow"
                  style={{ background: current.accentColor }}
                />
                
                {/* Holographic Platform Base */}
                <div className="absolute -bottom-1 w-20 h-4 bg-white/10 rounded-full blur-sm" />
                
                {/* The Crisp Transparent Emblem */}
                <div className="relative w-24 h-24 transform hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] animate-float">
                  <Image
                    src={current.image}
                    alt={current.fullName}
                    fill
                    sizes="96px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {/* Title & Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2 border backdrop-blur-sm transition-all duration-500 shadow-sm"
                   style={{
                     backgroundColor: `${current.accentColor}18`,
                     borderColor: `${current.accentColor}44`,
                     color: current.accentColor === '#dc2626' ? '#fca5a5' : (current.accentColor === '#0284c7' ? '#7dd3fc' : '#d8b4fe')
                   }}>
                <Sparkles size={12} className="animate-spin-slow" />
                <span>GARUDA MAHADHIKA</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Sistem Informasi Terpadu
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Portal Autentikasi Pengelola & Civitas Akademika
              </p>
            </div>

            {/* Jurusan Quick Interactive Switcher Pills */}
            <div className="mb-6">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />
                  Tema Kejuruan:
                </span>
                <span className="text-slate-300 font-semibold">{current.code}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-white/5">
                {(Object.keys(JURUSAN_DATA) as JurusanKey[]).map((key) => {
                  const j = JURUSAN_DATA[key];
                  const isActive = activeJurusan === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveJurusan(key)}
                      className={`relative py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        isActive
                          ? `bg-gradient-to-r ${j.buttonGradient} text-white shadow-lg shadow-black/40 scale-102`
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span>{j.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm animate-fade-in backdrop-blur-md">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form action={handleSubmit} className="space-y-4">
              
              {/* Username Input Field */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                  USERNAME / NISN / NIP
                </label>
                <div className={`relative rounded-xl border border-white/10 bg-slate-900/80 transition-all duration-300 ${current.ringColor}`}>
                  <input
                    required
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder="Masukkan username atau NISN"
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                  />
                  <User className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                </div>
              </div>

              {/* Password Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300 font-mono">
                    PASSWORD KREDENSIAL
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Enkripsi Aktif
                  </span>
                </div>
                <div className={`relative rounded-xl border border-white/10 bg-slate-900/80 transition-all duration-300 ${current.ringColor}`}>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                  />
                  <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                  
                  {/* Toggle Show/Hide Password */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Links */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0" 
                  />
                  <span>Ingat Sesi Ini</span>
                </label>
                <a 
                  href="https://wa.me/6282246464677?text=Halo%20Admin%20SMK%20Garuda%20Mahadhika,%20saya%20membutuhkan%20bantuan%20login%20portal." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Butuh Bantuan?
                </a>
              </div>

              {/* Submit Button with High-Tech Shimmer */}
              <button
                type="submit"
                disabled={loading}
                className={`relative w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-300 bg-gradient-to-r ${current.buttonGradient} shadow-lg hover:shadow-2xl flex items-center justify-center gap-2 group active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {/* Shimmer sweep effect */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer pointer-events-none" />

                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengautentikasi...</span>
                  </div>
                ) : (
                  <>
                    <LogIn size={18} className="transition-transform group-hover:translate-x-0.5" />
                    <span>Masuk ke Portal Sistem</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Links Section */}
            <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <Link 
                href="/ppdb" 
                className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Pendaftaran Siswa Baru (PPDB)</span>
              </Link>
              <Link 
                href="/ppdb/status" 
                className="hover:text-cyan-400 transition-colors"
              >
                Cek Verifikasi &rarr;
              </Link>
            </div>

          </div>

          {/* Micro Telemetry Footer */}
          <div className="mt-4 flex items-center justify-between px-3 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Cpu size={12} className="text-slate-600" />
              SMK-ID // 2026.4
            </span>
            <span>END-TO-END VERIFIED</span>
          </div>

        </div>
      </main>

      {/* =========================================================================
          BOTTOM FOOTER: School Copyright & Portal Identity
          ========================================================================= */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/5 backdrop-blur-md bg-slate-950/40 text-center text-xs text-slate-400">
        <p>
          &copy; {new Date().getFullYear()} <strong className="text-slate-300 font-semibold">SMK Garuda Mahadhika</strong>. All Rights Reserved.
        </p>
      </footer>

    </div>
  );
}
