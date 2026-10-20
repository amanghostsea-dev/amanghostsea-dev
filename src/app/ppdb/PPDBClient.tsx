'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Calendar, 
  MapPin, 
  School, 
  BookOpen, 
  Phone, 
  CheckCircle2, 
  Award, 
  HeartHandshake, 
  Loader2, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Copy,
  Banknote,
  Building,
  FileText,
  Search,
  Radio,
  Cpu,
  Layers,
  GraduationCap,
  QrCode,
  Download
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import { PPDBPaymentConfig, DEFAULT_PPDB_PAYMENT_CONFIG, getTrackConfig } from '@/app/admin/settings/types';

export interface JurusanItem {
  id?: string;
  name: string;
  code: string;
  kuota?: number;
  description?: string;
}

export type PPDBTheme = 'cyber-cards' | 'stepper' | 'dark-glass';

interface JurusanEmblemInfo {
  code: string;
  name: string;
  title: string;
  tagline: string;
  badge: string;
  image: string;
  accent: string;
  borderActive: string;
  bgActive: string;
  textColor: string;
  glow: string;
  iconBg: string;
}

const JURUSAN_EMBLEMS: Record<string, JurusanEmblemInfo> = {
  TJKT: {
    code: 'TJKT',
    name: 'Teknik Jaringan Komputer & Telekomunikasi',
    title: 'TJKT Garuda Mahadhika',
    tagline: 'Cybersecurity, Cloud Infrastructure & Fiber Telecom Network',
    badge: 'Akreditasi A • Kuota 72 Siswa',
    image: '/images/emblem/tjkt.png',
    accent: '#dc2626',
    borderActive: 'border-red-500 ring-2 ring-red-500/20',
    bgActive: 'bg-red-50/80 dark:bg-red-950/30',
    textColor: 'text-red-600 dark:text-red-400',
    glow: 'rgba(220, 38, 38, 0.4)',
    iconBg: 'from-red-600 to-rose-700',
  },
  DKV: {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    title: 'DKV Garuda Mahadhika',
    tagline: 'Creative Multimedia, UI/UX Design, 3D Motion & Digital Arts',
    badge: 'Akreditasi A • Kuota 72 Siswa',
    image: '/images/emblem/dkv.png',
    accent: '#9333ea',
    borderActive: 'border-purple-500 ring-2 ring-purple-500/20',
    bgActive: 'bg-purple-50/80 dark:bg-purple-950/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    glow: 'rgba(147, 51, 234, 0.4)',
    iconBg: 'from-purple-600 to-fuchsia-700',
  },
  MPLB: {
    code: 'MPLB',
    name: 'Manajemen Perkantoran & Layanan Bisnis',
    title: 'MPLB Garuda Mahadhika',
    tagline: 'Modern Corporate Governance, Digital Business & Administration',
    badge: 'Akreditasi A • Kuota 72 Siswa',
    image: '/images/emblem/mplb.png',
    accent: '#0284c7',
    borderActive: 'border-sky-500 ring-2 ring-sky-500/20',
    bgActive: 'bg-sky-50/80 dark:bg-sky-950/30',
    textColor: 'text-sky-600 dark:text-sky-400',
    glow: 'rgba(2, 132, 199, 0.4)',
    iconBg: 'from-sky-600 to-blue-700',
  },
};

const SHOWCASE_ROTATION: ('TJKT' | 'DKV' | 'MPLB')[] = ['TJKT', 'DKV', 'MPLB'];

export default function PPDBClient({ 
  schoolName = "SMK GaMa",
  jurusanList = [],
  defaultTheme = 'cyber-cards',
  paymentConfig = DEFAULT_PPDB_PAYMENT_CONFIG,
}: { 
  schoolName?: string;
  jurusanList?: JurusanItem[];
  defaultTheme?: PPDBTheme;
  paymentConfig?: PPDBPaymentConfig;
}) {
  const router = useRouter();

  // Active Theme State
  const [theme, setTheme] = useState<PPDBTheme>(defaultTheme || 'cyber-cards');

  // Selected Jurusan for FORM REGISTRATION (100% independent from showcase)
  const [selectedMajor, setSelectedMajor] = useState<string>('TJKT');

  // 10-Second Auto-Rotating Showcase for Header Logos (Visual only, does not affect form registration!)
  const [showcaseMajor, setShowcaseMajor] = useState<'TJKT' | 'DKV' | 'MPLB'>('TJKT');
  const [isPausedShowcase, setIsPausedShowcase] = useState(false);
  const [showcaseTimerKey, setShowcaseTimerKey] = useState(0);

  // Auto-rotate every 10 seconds (10,000ms)
  useEffect(() => {
    if (isPausedShowcase) return;

    const interval = setInterval(() => {
      setShowcaseMajor((prev) => {
        const nextIdx = (SHOWCASE_ROTATION.indexOf(prev) + 1) % SHOWCASE_ROTATION.length;
        return SHOWCASE_ROTATION[nextIdx];
      });
      setShowcaseTimerKey((k) => k + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [isPausedShowcase]);

  // Click handler for showcase preview (Visual change only, does NOT change form choice!)
  const handleShowcaseClick = (code: 'TJKT' | 'DKV' | 'MPLB') => {
    setShowcaseMajor(code);
    setShowcaseTimerKey((k) => k + 1);
  };

  // Stepper Current Step (for Theme 2: Stepper)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form States
  const [jalur, setJalur] = useState<'normal' | 'afirmasi' | 'beasiswa'>('normal');
  const [afirmasiType, setAfirmasiType] = useState<'kip' | 'sktm' | 'both'>('kip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [applicantData, setApplicantData] = useState<any>(null);

  // Controlled form state to guarantee values are never lost across stepper steps
  const [formDataState, setFormDataState] = useState({
    fullName: '',
    nisn: '',
    birthInfo: '',
    gender: 'Laki-laki',
    phone: '',
    previousSchool: '',
    address: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormDataState((prev) => ({ ...prev, [name]: value }));
  };

  const handleStep2Next = () => {
    if (!formDataState.fullName.trim() || formDataState.fullName.trim().length < 3) {
      alert('Nama lengkap calon siswa wajib diisi minimal 3 karakter.');
      return;
    }
    if (!/^\d{10}$/.test(formDataState.nisn.trim())) {
      alert('Format NISN tidak valid! NISN harus terdiri dari tepat 10 digit angka (contoh: 0071234567).');
      return;
    }
    if (!formDataState.gender) {
      alert('Silakan pilih jenis kelamin.');
      return;
    }
    const cleanPhone = formDataState.phone.replace(/[\s-]/g, '').trim();
    if (!/^(08|\+62|62)\d{8,12}$/.test(cleanPhone)) {
      alert('Format nomor WhatsApp tidak valid! Harap masukkan nomor aktif yang diawali 08 (10-14 digit).');
      return;
    }
    if (!formDataState.birthInfo.trim()) {
      alert('Tempat dan tanggal lahir wajib diisi.');
      return;
    }
    if (!formDataState.previousSchool.trim()) {
      alert('Nama asal sekolah (SMP/MTs) wajib diisi.');
      return;
    }
    if (!formDataState.address.trim()) {
      alert('Alamat tempat tinggal wajib diisi.');
      return;
    }
    setCurrentStep(3);
  };

  // Payment State (Transfer vs QRIS vs Cash)
  const [payMethod, setPayMethod] = useState<'TRANSFER' | 'QRIS' | 'CASH'>('TRANSFER');
  const [transferProofUrl, setTransferProofUrl] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const activeMajorData = JURUSAN_EMBLEMS[selectedMajor] || JURUSAN_EMBLEMS.TJKT;

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const formEntries = Object.fromEntries(formData.entries());

    // Explicitly merge formDataState and formEntries so stepper inputs are NEVER undefined
    const data: Record<string, any> = {
      ...formEntries,
      fullName: (formDataState.fullName || formEntries.fullName || '').toString().trim(),
      nisn: (formDataState.nisn || formEntries.nisn || '').toString().trim(),
      gender: formDataState.gender || (formEntries.gender as string) || 'Laki-laki',
      phone: (formDataState.phone || formEntries.phone || '').toString().trim(),
      birthInfo: (formDataState.birthInfo || formEntries.birthInfo || '').toString().trim(),
      previousSchool: (formDataState.previousSchool || formEntries.previousSchool || '').toString().trim(),
      address: (formDataState.address || formEntries.address || '').toString().trim(),
      jalur,
      major: selectedMajor,
    };

    // Pastikan major terisi dari kartu terpilih jika belum ada
    if (!data.major) {
      data.major = selectedMajor;
    }

    // Validasi Keamanan & Format Ketat
    const rawFullName = String(data.fullName || '').trim();
    if (rawFullName.length < 3) {
      alert('Nama lengkap calon siswa wajib diisi minimal 3 karakter.');
      setIsSubmitting(false);
      return;
    }

    const rawNisn = String(data.nisn || '').trim();
    if (!/^\d{10}$/.test(rawNisn)) {
      alert('Format NISN tidak valid! NISN harus terdiri dari tepat 10 digit angka (contoh: 0071234567).');
      setIsSubmitting(false);
      return;
    }

    const rawPhone = String(data.phone || '').replace(/[\s-]/g, '').trim();
    if (!/^(08|\+62|62)\d{8,12}$/.test(rawPhone)) {
      alert('Format nomor WhatsApp / HP tidak valid! Harap masukkan nomor aktif yang diawali 08... (10 - 14 digit angka).');
      setIsSubmitting(false);
      return;
    }
    
    // Validasi Dokumen Wajib per Jalur Khusus
    if (jalur === 'afirmasi') {
      const docKip = (data.documentKip as string || '').trim();
      const docAfirmasi = (data.documentAfirmasi as string || '').trim();

      if (afirmasiType === 'kip' && !docKip) {
        alert('Silakan unggah Berkas / Foto Kartu Indonesia Pintar (KIP) terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }
      if (afirmasiType === 'sktm' && !docAfirmasi) {
        alert('Silakan unggah Surat Keterangan Tidak Mampu (SKTM) dari pihak berwenang terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }
      if (afirmasiType === 'both' && !docKip && !docAfirmasi) {
        alert('Silakan unggah minimal salah satu berkas afirmasi: Berkas Kartu KIP atau Surat SKTM.');
        setIsSubmitting(false);
        return;
      }
    }

    if (jalur === 'beasiswa') {
      const docPrestasi = data.documentPrestasi as string;
      if (!docPrestasi || docPrestasi === '[]' || docPrestasi.trim() === '') {
        alert('Silakan unggah minimal 1 berkas bukti prestasi (surat ranking kelas / piagam / sertifikat) terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/ppdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || 'Terjadi kesalahan saat menyimpan data pendaftaran.');
        setIsSubmitting(false);
        return;
      }

      setApplicantData(result.applicant);
      setIsSubmitting(false);

      const trackConfig = getTrackConfig(paymentConfig, jalur);
      const isFeeRequired = paymentConfig.enabled && trackConfig.enabled && trackConfig.totalAmount > 0;

      if (isFeeRequired) {
        setShowPayment(true);
      } else {
        router.push(`/ppdb/success?id=${result.applicant.id}&name=${encodeURIComponent(result.applicant.fullName)}`);
      }
    } catch (error) {
      alert('Gagal menghubungi server. Silakan periksa koneksi internet Anda.');
      setIsSubmitting(false);
    }
  };

  const handlePayQRIS = async () => {
    if (!transferProofUrl) {
      alert('Silakan unggah tangkapan layar (screenshot) bukti pembayaran QRIS Anda terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ppdb/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicantData.id,
          paymentMethod: 'QRIS',
          paymentProof: transferProofUrl,
          paymentNotes: transferNotes || 'Pembayaran via QRIS (E-Wallet / M-Banking)',
        }),
      });

      if (!res.ok) throw new Error('Gagal mengirim bukti pembayaran QRIS');
      setIsSubmitting(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        router.push(`/ppdb/success?id=${applicantData.id}&name=${encodeURIComponent(applicantData.fullName)}&method=QRIS`);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal menghubungi server untuk verifikasi pembayaran QRIS');
      setIsSubmitting(false);
    }
  };

  const handlePayTransfer = async () => {
    if (!transferProofUrl) {
      alert('Silakan unggah struk atau bukti transfer terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ppdb/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicantData.id,
          paymentMethod: 'TRANSFER',
          paymentProof: transferProofUrl,
          paymentNotes: transferNotes || 'Transfer Bank/QRIS',
        }),
      });

      if (!res.ok) throw new Error('Gagal mengirim bukti pembayaran');
      setIsSubmitting(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        router.push(`/ppdb/success?id=${applicantData.id}&name=${encodeURIComponent(applicantData.fullName)}&method=TRANSFER`);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal menghubungi server untuk verifikasi pembayaran');
      setIsSubmitting(false);
    }
  };

  const handlePayCash = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ppdb/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicantData.id,
          paymentMethod: 'CASH',
          paymentNotes: 'Pembayaran tunai di loket kasir PPDB sekolah',
        }),
      });

      if (!res.ok) throw new Error('Gagal memilih metode bayar tunai');
      setIsSubmitting(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        router.push(`/ppdb/success?id=${applicantData.id}&name=${encodeURIComponent(applicantData.fullName)}&method=CASH`);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal menghubungi server');
      setIsSubmitting(false);
    }
  };

  const isDarkMode = theme === 'dark-glass';
  const activeShowcaseData = JURUSAN_EMBLEMS[showcaseMajor] || JURUSAN_EMBLEMS.TJKT;
  const activeRegistrationData = JURUSAN_EMBLEMS[selectedMajor] || JURUSAN_EMBLEMS.TJKT;

  return (
    <div className={`min-h-screen font-sans relative overflow-hidden transition-colors duration-700 ${
      isDarkMode 
        ? 'bg-[#070b14] text-white selection:bg-cyan-500/30 selection:text-cyan-200' 
        : 'bg-slate-100/95 text-slate-800 selection:bg-blue-500/20'
    }`}>

      {/* =========================================================================
          BACKGROUND LAYER: Dynamic Grid & Giant Floating Transparent Watermark
          ========================================================================= */}
      <div 
        className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'opacity-20' : 'opacity-40'}`}
        style={{
          backgroundImage: isDarkMode
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`
            : `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: isDarkMode ? '40px 40px' : '24px 24px',
        }}
      />

      {/* Ambient Radial Aura matching Active 10s Showcase */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[850px] sm:h-[850px] rounded-full blur-[50px] sm:blur-[140px] pointer-events-none transition-all duration-700 animate-pulse-glow gpu-accelerated"
        style={{
          background: `radial-gradient(circle, ${activeShowcaseData.glow} 0%, rgba(0,0,0,0) 70%)`
        }}
      />

      {/* Giant Transparent Watermark of the Active 10s Showcase Crest */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0 select-none">
        <div className="hidden sm:block absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full border border-white/5 animate-spin-slow" />
        <div 
          className="relative w-[300px] h-[300px] sm:w-[580px] sm:h-[580px] lg:w-[720px] lg:h-[720px] transition-opacity duration-700 gpu-accelerated"
          style={{ opacity: isDarkMode ? 0.10 : 0.06 }}
        >
          <Image
            src={activeShowcaseData.image}
            alt={activeShowcaseData.title}
            fill
            sizes="(max-width: 768px) 300px, (max-width: 1200px) 580px, 720px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* =========================================================================
          TOP NAVIGATION BAR
          ========================================================================= */}
      <header className={`relative z-20 w-full px-6 py-4 flex items-center justify-between border-b backdrop-blur-md transition-colors ${
        isDarkMode 
          ? 'border-white/10 bg-slate-950/60' 
          : 'border-slate-200/80 bg-white/70 shadow-xs'
      }`}>
        <a 
          href="https://smkgama.sch.id/" 
          className={`group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors py-1.5 px-3 rounded-xl border ${
            isDarkMode 
              ? 'text-slate-300 hover:text-white border-white/10 hover:border-white/25 bg-white/5' 
              : 'text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300 bg-white shadow-xs'
          }`}
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </a>

        <div className="flex items-center gap-3">
          <Link 
            href="/ppdb/status" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline py-1 px-2.5 rounded-lg"
          >
            <Search size={14} />
            <span>Cek Status & Verifikasi</span>
          </Link>
          <Link 
            href="/login" 
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-mono font-semibold py-1.5 px-3 rounded-lg border transition-all ${
              isDarkMode 
                ? 'border-white/10 hover:border-white/30 text-slate-300' 
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            }`}
          >
            <span>Portal Petugas</span>
          </Link>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER: 10-Second Auto-Rotating Holographic Showcase
          ========================================================================= */}
      <section className="relative z-10 pt-8 pb-6 px-4 text-center max-w-5xl mx-auto">
        
        {/* Holographic Interactive Stage with 10s Auto-Timer */}
        <div 
          className="relative max-w-2xl mx-auto mb-6 p-5 sm:p-6 rounded-3xl transition-all duration-500 backdrop-blur-xl border shadow-2xl group gpu-accelerated"
          style={{
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: `${activeShowcaseData.accent}44`,
            boxShadow: `0 14px 45px -10px ${activeShowcaseData.glow}`
          }}
          onMouseEnter={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              setIsPausedShowcase(true);
            }
          }}
          onMouseLeave={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              setIsPausedShowcase(false);
            }
          }}
        >
          {/* Spotlight Pedestal Top Laser Beam */}
          <div 
            className="absolute top-0 left-1/4 right-1/4 h-1 rounded-full blur-[2px] transition-all duration-500"
            style={{ background: activeShowcaseData.accent }}
          />

          {/* The 3 Emblems Showcase Row */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 pt-2 pb-4">
            {(['TJKT', 'DKV', 'MPLB'] as const).map((code) => {
              const item = JURUSAN_EMBLEMS[code];
              const isActive = showcaseMajor === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleShowcaseClick(code)}
                  className={`group/btn relative flex flex-col items-center transition-all duration-200 active:scale-95 cursor-pointer p-2 rounded-2xl select-none ${
                    isActive 
                      ? 'scale-115 -translate-y-2 z-10' 
                      : 'opacity-50 hover:opacity-90 hover:scale-105 z-0'
                  }`}
                  title={`Klik untuk preview kejuruan ${item.code} (Hanya visual)`}
                >
                  {/* Glowing Spotlight Ring for Active Emblem */}
                  <div 
                    className={`absolute inset-0 rounded-full blur-xl transition-all duration-700 ${
                      isActive ? 'opacity-90 animate-pulse-glow' : 'opacity-0'
                    }`}
                    style={{ background: item.accent }}
                  />

                  {/* Holographic Pedestal Disc for Active Emblem */}
                  {isActive && (
                    <div 
                      className="absolute -bottom-2 w-16 h-3 rounded-full blur-xs opacity-75"
                      style={{ background: item.accent }}
                    />
                  )}

                  {/* Floating Transparent Emblem */}
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 ${
                    isActive ? 'animate-float' : ''
                  }`}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="96px"
                      className="object-contain"
                      priority
                    />
                  </div>

                  {/* Micro Code Badge */}
                  <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase mt-2.5 px-3 py-0.5 rounded-full transition-all border ${
                    isActive 
                      ? 'bg-slate-950 text-white shadow-lg' 
                      : 'bg-transparent text-slate-500 border-transparent'
                  }`}
                  style={{
                    borderColor: isActive ? item.accent : 'transparent',
                    boxShadow: isActive ? `0 0 15px ${item.glow}` : 'none'
                  }}>
                    {item.code}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Major Teaser Info Box */}
          <div className="pt-3 border-t border-white/10 text-center animate-fade-in" key={showcaseMajor}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ background: activeShowcaseData.accent }} />
              <h3 className="font-black text-sm sm:text-base tracking-wide" style={{ color: isDarkMode ? '#ffffff' : activeShowcaseData.accent }}>
                {activeShowcaseData.title}
              </h3>
            </div>
            <p className={`text-xs max-w-lg mx-auto font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {activeShowcaseData.tagline}
            </p>
          </div>

          {/* 10-Second Countdown Neon Progress Bar */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio size={11} className="text-cyan-400 animate-pulse" />
                <span>ROTASI OTOMATIS // 10 DETIK</span>
                {isPausedShowcase && <span className="text-amber-400">(DIJEDA)</span>}
              </span>
              <span className="uppercase tracking-wider font-semibold" style={{ color: activeShowcaseData.accent }}>
                PREVIEW KEJURUAN
              </span>
            </div>

            {/* The Animated 10s Timer Line */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                key={showcaseTimerKey}
                className="h-full rounded-full animate-timer-10s"
                style={{
                  background: `linear-gradient(90deg, #06b6d4, ${activeShowcaseData.accent}, #ec4899)`,
                  animationPlayState: isPausedShowcase ? 'paused' : 'running'
                }}
              />
            </div>
          </div>

        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-3 border backdrop-blur-md shadow-sm transition-all"
             style={{
               backgroundColor: `${activeShowcaseData.accent}15`,
               borderColor: `${activeShowcaseData.accent}55`,
               color: isDarkMode ? '#f8fafc' : activeShowcaseData.accent
             }}>
          <Sparkles size={14} className="animate-spin-slow" />
          <span>GARUDA MAHADHIKA • PPDB TAHUN AJARAN 2026/2027</span>
        </div>

        <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Pendaftaran Peserta Didik Baru
        </h1>
        <p className={`text-xs sm:text-base mt-2 max-w-2xl mx-auto leading-relaxed ${
          isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          Gerbang resmi menuju keunggulan kejuruan digital berstandar industri. Lengkapi formulir di bawah ini dengan data yang sah dan valid.
        </p>

        {/* =====================================================================
            THEME 2 ONLY: Futuristic Multi-Step Progress Stepper
            ===================================================================== */}
        {theme === 'stepper' && (
          <div className="mt-8 max-w-3xl mx-auto p-4 rounded-3xl bg-slate-900/90 border border-purple-500/30 text-white shadow-xl backdrop-blur-xl animate-fade-in">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-purple-300 font-bold flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" />
                TAHAP {currentStep} DARI 4
              </span>
              <span className="text-purple-400 font-bold">{currentStep * 25}% SELESAI</span>
            </div>

            {/* Neon Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${currentStep * 25}%` }}
              />
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
              {[
                { s: 1, label: '1. Jalur' },
                { s: 2, label: '2. Biodata' },
                { s: 3, label: '3. Jurusan' },
                { s: 4, label: '4. Berkas' }
              ].map(st => (
                <button
                  key={st.s}
                  type="button"
                  onClick={() => setCurrentStep(st.s)}
                  className={`py-1.5 px-2 rounded-xl font-bold transition-all duration-150 active:scale-95 cursor-pointer select-none ${
                    currentStep === st.s
                      ? 'bg-purple-600 text-white shadow-md'
                      : currentStep > st.s
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          MAIN FORM CONTAINER
          ========================================================================= */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        
        <div className={`rounded-3xl border transition-all duration-500 overflow-hidden ${
          isDarkMode
            ? 'bg-slate-950/80 border-white/10 backdrop-blur-2xl shadow-[0_0_90px_rgba(0,0,0,0.9)]'
            : 'bg-white/95 border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur-md'
        }`}>

          {/* Form Top Accent Stripe */}
          <div 
            className="h-1.5 w-full transition-colors duration-700"
            style={{
              background: `linear-gradient(90deg, ${activeMajorData.accent}, #06b6d4, ${activeMajorData.accent})`
            }}
          />

          <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-10">
            {/* Honeypot Anti-Spam Bot Trap (Invisible to humans, traps automated spam bots) */}
            <div style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
              <label htmlFor="_hp_website">Website</label>
              <input type="text" id="_hp_website" name="_hp_website" tabIndex={-1} autoComplete="off" defaultValue="" />
              <label htmlFor="_hp_company">Company</label>
              <input type="text" id="_hp_company" name="_hp_company" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* Form Hidden Inputs (Always submitted across all steps) */}
            <input type="hidden" name="jalur" value={jalur} />
            <input type="hidden" name="jalurPendaftaran" value={jalur} />
            <input type="hidden" name="major" value={selectedMajor} />

            {/* ===================================================================
                SECTION 01: PILIH JALUR PENDAFTARAN
                =================================================================== */}
            <section className={`space-y-6 animate-fade-in ${theme === 'stepper' && currentStep !== 1 ? 'hidden' : 'block'}`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 shrink-0">
                    01
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      <Layers className="text-blue-500" size={20} />
                      Pilih Jalur Pendaftaran
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Tentukan jalur yang sesuai dengan kualifikasi pendaftar
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Jalur Reguler */}
                  <button 
                    type="button"
                    onClick={() => setJalur('normal')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98] select-none cursor-pointer relative group ${
                      jalur === 'normal' 
                        ? (isDarkMode 
                            ? 'border-blue-500 bg-blue-950/40 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] ring-2 ring-blue-500/20 -translate-y-1'
                            : 'border-blue-600 bg-gradient-to-b from-blue-50/90 via-white to-blue-50/30 shadow-lg ring-2 ring-blue-500/20 -translate-y-1 text-slate-900')
                        : (isDarkMode 
                            ? 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:bg-slate-900' 
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md text-slate-800')
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        jalur === 'normal' 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40' 
                          : 'bg-slate-800/20 text-slate-400 group-hover:text-blue-500'
                      }`}>
                        <School size={22} />
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        jalur === 'normal' ? 'bg-blue-600 text-white' : 'border border-slate-400'
                      }`}>
                        {jalur === 'normal' && <Check size={14} className="stroke-[3]" />}
                      </div>
                    </div>
                    <div className="font-black text-base mb-1">Jalur Reguler</div>
                    <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Jalur umum menggunakan nilai rapor & tes wawancara. Tanpa syarat unggah berkas awal.
                    </p>
                  </button>

                  {/* Jalur Afirmasi (KIP / SKTM) */}
                  <button 
                    type="button"
                    onClick={() => setJalur('afirmasi')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98] select-none cursor-pointer relative group ${
                      jalur === 'afirmasi' 
                        ? (isDarkMode 
                            ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/20 -translate-y-1'
                            : 'border-emerald-600 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 shadow-lg ring-2 ring-emerald-500/20 -translate-y-1 text-slate-900')
                        : (isDarkMode 
                            ? 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:bg-slate-900' 
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md text-slate-800')
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        jalur === 'afirmasi' 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/40' 
                          : 'bg-slate-800/20 text-slate-400 group-hover:text-emerald-500'
                      }`}>
                        <HeartHandshake size={22} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          GRATIS
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          jalur === 'afirmasi' ? 'bg-emerald-600 text-white' : 'border border-slate-400'
                        }`}>
                          {jalur === 'afirmasi' && <Check size={14} className="stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-base mb-1">Jalur Afirmasi (KIP/SKTM)</div>
                    <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Khusus pemegang Kartu Indonesia Pintar (KIP/PIP) atau surat SKTM. 100% bebas biaya formulir.
                    </p>
                  </button>

                  {/* Jalur Prestasi / Beasiswa */}
                  <button 
                    type="button"
                    onClick={() => setJalur('beasiswa')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98] select-none cursor-pointer relative group ${
                      jalur === 'beasiswa' 
                        ? (isDarkMode 
                            ? 'border-purple-500 bg-purple-950/40 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] ring-2 ring-purple-500/20 -translate-y-1'
                            : 'border-purple-600 bg-gradient-to-b from-purple-50/90 via-white to-purple-50/30 shadow-lg ring-2 ring-purple-500/20 -translate-y-1 text-slate-900')
                        : (isDarkMode 
                            ? 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:bg-slate-900' 
                            : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md text-slate-800')
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        jalur === 'beasiswa' 
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/40' 
                          : 'bg-slate-800/20 text-slate-400 group-hover:text-purple-500'
                      }`}>
                        <Award size={22} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          BEASISWA
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          jalur === 'beasiswa' ? 'bg-purple-600 text-white' : 'border border-slate-400'
                        }`}>
                          {jalur === 'beasiswa' && <Check size={14} className="stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-base mb-1">Prestasi & Beasiswa</div>
                    <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ranking kelas atau pemegang piagam/sertifikat kejuaraan akademik & non-akademik.
                    </p>
                  </button>
                </div>

                {theme === 'stepper' && (
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all duration-150"
                    >
                      <span>Lanjut: Data Pribadi</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </section>

            {/* ===================================================================
                SECTION 02: DATA PRIBADI & ASAL SEKOLAH
                =================================================================== */}
            <section className={`space-y-6 animate-fade-in ${theme === 'stepper' && currentStep !== 2 ? 'hidden' : 'block'}`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 shrink-0">
                    02
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      <User className="text-blue-500" size={20} />
                      Data Pribadi & Kontak Siswa
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Lengkapi identitas diri sesuai kartu keluarga dan nomor WhatsApp aktif
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Lengkap */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        name="fullName" 
                        value={formDataState.fullName}
                        onChange={handleInputChange}
                        placeholder="Sesuai ijazah SMP/MTs"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* NISN */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      NISN (10 Digit) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        name="nisn" 
                        maxLength={10}
                        value={formDataState.nisn}
                        onChange={handleInputChange}
                        placeholder="Contoh: 0071234567"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Jenis Kelamin <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formDataState.gender}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                      }`}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  {/* Nomor WhatsApp */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="tel" 
                        name="phone" 
                        value={formDataState.phone}
                        onChange={handleInputChange}
                        placeholder="Contoh: 081234567890"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tempat, Tanggal Lahir */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Tempat & Tanggal Lahir <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        name="birthInfo" 
                        value={formDataState.birthInfo}
                        onChange={handleInputChange}
                        placeholder="Contoh: Jakarta, 15 Mei 2010"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Asal Sekolah */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Asal Sekolah (SMP/MTs) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <School size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        name="previousSchool" 
                        value={formDataState.previousSchool}
                        onChange={handleInputChange}
                        placeholder="Nama SMP/MTs asal"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Alamat Tempat Tinggal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <textarea 
                        name="address" 
                        rows={2} 
                        value={formDataState.address}
                        onChange={handleInputChange}
                        placeholder="Nama jalan, RT/RW, kelurahan, kecamatan, kota/kabupaten"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all resize-none ${
                          isDarkMode 
                            ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {theme === 'stepper' && (
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 border border-slate-700 text-slate-300 active:scale-95 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                    >
                      <ChevronLeft size={16} />
                      <span>Kembali</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStep2Next}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all duration-150"
                    >
                      <span>Lanjut: Pilih Jurusan</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </section>

            {/* ===================================================================
                SECTION 03: PILIHAN JURUSAN (3D HOLOGRAPHIC CARDS)
                =================================================================== */}
            <section className={`space-y-6 animate-fade-in ${theme === 'stepper' && currentStep !== 3 ? 'hidden' : 'block'}`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 shrink-0">
                    03
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      <GraduationCap className="text-blue-500" size={20} />
                      Pilihan Program Keahlian (Garuda Mahadhika)
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Klik salah satu kartu jurusan di bawah ini untuk memilih prioritas kejuruanmu
                    </p>
                  </div>
                </div>

                {/* The 3 Interactive Major Cards with Transparent Emblems */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {(['TJKT', 'DKV', 'MPLB'] as const).map((code) => {
                    const j = JURUSAN_EMBLEMS[code];
                    const isSelected = selectedMajor === code;

                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedMajor(code)}
                        className={`w-full p-6 rounded-3xl border-2 transition-all duration-150 active:scale-[0.98] select-none cursor-pointer relative group flex flex-col justify-between text-left gpu-accelerated ${
                          isSelected
                            ? (isDarkMode 
                                ? `${j.borderActive} bg-slate-900/90 shadow-[0_0_40px_${j.glow}] -translate-y-1.5` 
                                : `${j.borderActive} ${j.bgActive} shadow-xl -translate-y-1.5`)
                            : (isDarkMode 
                                ? 'border-white/10 bg-slate-900/50 hover:border-white/30 hover:bg-slate-900/80 hover:-translate-y-0.5' 
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5')
                        }`}
                      >
                        {/* Top Badge & Checkmark */}
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            isSelected 
                              ? 'bg-slate-900 text-white border-white/20' 
                              : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-transparent'
                          }`}>
                            {j.badge}
                          </span>

                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? 'bg-emerald-500 text-white shadow-sm' : 'border border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check size={14} className="stroke-[3]" />}
                          </div>
                        </div>

                        {/* Floating Transparent Crest */}
                        <div className="relative w-28 h-28 mx-auto my-2 flex items-center justify-center">
                          {/* Glow backdrop on select */}
                          <div 
                            className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${
                              isSelected ? 'opacity-80 animate-pulse-glow' : 'opacity-0 group-hover:opacity-40'
                            }`}
                            style={{ background: j.accent }}
                          />

                          <div className="relative w-24 h-24 transform group-hover:scale-105 transition-transform duration-200 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
                            <Image
                              src={j.image}
                              alt={j.title}
                              fill
                              sizes="96px"
                              className="object-contain"
                            />
                          </div>
                        </div>

                        {/* Text Information */}
                        <div className="text-center mt-3">
                          <h3 className={`font-black text-lg ${isSelected ? j.textColor : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                            {j.name}
                          </h3>
                          <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {j.tagline}
                          </p>
                        </div>

                        {/* Selected Indicator Bar */}
                        <div className={`mt-5 pt-3 border-t text-center text-xs font-bold transition-colors ${
                          isSelected 
                            ? `${j.textColor} border-current/20` 
                            : 'text-slate-400 border-slate-100 dark:border-slate-800'
                        }`}>
                          {isSelected ? '✓ Jurusan Terpilih' : 'Klik untuk Memilih'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {theme === 'stepper' && (
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 border border-slate-700 text-slate-300 active:scale-95 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                    >
                      <ChevronLeft size={16} />
                      <span>Kembali</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all duration-150"
                    >
                      <span>Lanjut: Berkas & Konfirmasi</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </section>

            {/* ===================================================================
                SECTION 04: PERSYARATAN BERKAS & KONFIRMASI
                =================================================================== */}
            <section className={`space-y-6 animate-fade-in ${theme === 'stepper' && currentStep !== 4 ? 'hidden' : 'block'}`}>
                
                {/* Syarat Khusus Jalur Afirmasi (KIP / SKTM) */}
                {jalur === 'afirmasi' && (
                  <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isDarkMode 
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-white' 
                      : 'border-emerald-300 bg-emerald-50/70 text-slate-900'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <HeartHandshake className="text-emerald-500" size={22} />
                      <div>
                        <h3 className="font-extrabold text-base">Syarat Khusus: Berkas Afirmasi</h3>
                        <p className="text-xs text-slate-400">Pilih dokumen yang ingin dilampirkan (Bebas Biaya Formulir)</p>
                      </div>
                    </div>

                    {/* Selector Jenis Dokumen */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                      <button
                        type="button"
                        onClick={() => setAfirmasiType('kip')}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all duration-150 active:scale-[0.98] select-none cursor-pointer flex items-center gap-2.5 ${
                          afirmasiType === 'kip' 
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                            : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard size={16} />
                        <span>Kartu KIP / PIP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAfirmasiType('sktm')}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all duration-150 active:scale-[0.98] select-none cursor-pointer flex items-center gap-2.5 ${
                          afirmasiType === 'sktm' 
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                            : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <FileText size={16} />
                        <span>Surat SKTM / PKH</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAfirmasiType('both')}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all duration-150 active:scale-[0.98] select-none cursor-pointer flex items-center gap-2.5 ${
                          afirmasiType === 'both' 
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                            : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        <span>Keduanya (KIP & SKTM)</span>
                      </button>
                    </div>

                    {/* Input Fields untuk KIP */}
                    {(afirmasiType === 'kip' || afirmasiType === 'both') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                        <div>
                          <label className="block text-xs font-semibold uppercase mb-1 font-mono">
                            Nomor Kartu KIP / PIP <span className="text-red-400">*</span>
                          </label>
                          <input 
                            required 
                            type="text" 
                            name="kipNumber" 
                            placeholder="Contoh: KIP-8921820"
                            className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-slate-900 text-white text-sm outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <FileUpload
                            name="documentKip"
                            label="Unggah Foto/Scan Kartu KIP"
                            colorTheme="green"
                            helperText="Format JPG/PNG/PDF (Maks: 4.5MB)"
                            required={true}
                          />
                        </div>
                      </div>
                    )}

                    {/* Input Fields untuk SKTM */}
                    {(afirmasiType === 'sktm' || afirmasiType === 'both') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                        <div>
                          <label className="block text-xs font-semibold uppercase mb-1 font-mono">
                            Nomor Surat SKTM / PKH <span className="text-red-400">*</span>
                          </label>
                          <input 
                            required 
                            type="text" 
                            name="afirmasiNumber" 
                            placeholder="Nomor surat resmi dari kelurahan"
                            className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-slate-900 text-white text-sm outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <FileUpload
                            name="documentAfirmasi"
                            label="Unggah Berkas Surat SKTM"
                            colorTheme="green"
                            helperText="Scan surat keterangan tidak mampu resmi (Maks: 4.5MB)"
                            required={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Syarat Khusus Jalur Prestasi */}
                {jalur === 'beasiswa' && (
                  <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isDarkMode 
                      ? 'border-purple-500/40 bg-purple-950/20 text-white' 
                      : 'border-purple-300 bg-purple-50/70 text-slate-900'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="text-purple-500" size={22} />
                      <div>
                        <h3 className="font-extrabold text-base">Syarat Khusus: Berkas Prestasi</h3>
                        <p className="text-xs text-slate-400">Unggah bukti prestasi akademik (ranking raport) atau piagam penghargaan</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1 font-mono">
                          Jenis Prestasi <span className="text-red-400">*</span>
                        </label>
                        <select
                          required
                          name="prestasiType"
                          defaultValue=""
                          className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-slate-900 text-white text-sm outline-none focus:border-purple-400"
                        >
                          <option value="" disabled>Pilih Jenis Prestasi</option>
                          <option value="Akademik">Akademik (Ranking 1-3 Raport)</option>
                          <option value="Non-Akademik">Non-Akademik (Juara Lomba / OSN / O2SN / FLS2N)</option>
                          <option value="Tahfidz">Tahfidz Quran / Keagamaan</option>
                        </select>
                      </div>
                      <div>
                        <FileUpload
                          name="documentPrestasi"
                          label="Unggah Piagam / Sertifikat / Bukti Ranking"
                          colorTheme="blue"
                          helperText="Format JPG/PNG/PDF (Maks: 4.5MB)"
                          required={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkbox Pernyataan */}
                <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-white/10 text-slate-300' 
                    : 'bg-blue-50/70 border-blue-200 text-slate-700'
                }`}>
                  <input 
                    required 
                    type="checkbox" 
                    id="terms" 
                    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs sm:text-sm leading-relaxed cursor-pointer select-none">
                    Saya menyatakan bahwa seluruh data yang diisikan adalah benar dan siap dipertanggungjawabkan. Saya memilih jurusan <strong className="font-bold underline">{activeMajorData.name} ({activeMajorData.code})</strong> pada <span className="font-bold">{schoolName}</span>.
                  </label>
                </div>

                {/* Submit Area */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span>Enkripsi Data SSL 256-Bit • Aman & Terverifikasi</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {theme === 'stepper' && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="px-5 py-3 border border-slate-700 text-slate-300 active:scale-95 rounded-2xl font-bold flex items-center gap-1.5 cursor-pointer text-sm transition-all duration-150"
                      >
                        <ChevronLeft size={16} />
                        <span>Kembali</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Mengirim Formulir...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} className="text-cyan-200" />
                          <span>Kirim Formulir PPDB</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </section>

          </form>

          {/* ===================================================================
              MODAL PEMBAYARAN FORMULIR (JALUR REGULER)
              =================================================================== */}
          {/* ===================================================================
              MODAL PEMBAYARAN FORMULIR (TRANSFER, QRIS, & TUNAI)
              =================================================================== */}
          {showPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
              <div className="bg-slate-900 text-white rounded-3xl border border-white/20 w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-zoom-in my-auto">
                
                {/* Header Modal - PINNED AT TOP */}
                <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/95 backdrop-blur shrink-0 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase font-bold">
                      Langkah 2: Selesaikan Pembayaran
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">Pilih Metode Pembayaran</h3>
                    <p className="text-xs text-slate-400 truncate max-w-[260px] sm:max-w-none">
                      {applicantData?.fullName} • NISN: {applicantData?.nisn}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPayment(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* 3 OPSI METODE PEMBAYARAN - PINNED DI ATAS AGAR SELALU TERLIHAT */}
                <div className="px-4 py-3 sm:px-5 bg-slate-950/80 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      PILIH METODE PEMBAYARAN:
                    </span>
                    <span className="text-[11px] font-bold text-cyan-400">
                      {payMethod === 'TRANSFER' && '💳 Transfer Rekening'}
                      {payMethod === 'QRIS' && '📱 Scan QRIS E-Wallet'}
                      {payMethod === 'CASH' && '💵 Bayar Tunai di Loket'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('TRANSFER')}
                      className={`p-2.5 sm:p-3 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        payMethod === 'TRANSFER'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-2 ring-blue-500/30'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <CreditCard size={16} className={payMethod === 'TRANSFER' ? 'text-white' : 'text-blue-400'} />
                      <span>Transfer Bank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('QRIS')}
                      className={`p-2.5 sm:p-3 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        payMethod === 'QRIS'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-500/30 ring-2 ring-purple-500/30'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <QrCode size={16} className={payMethod === 'QRIS' ? 'text-white' : 'text-purple-400'} />
                      <span>Scan QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('CASH')}
                      className={`p-2.5 sm:p-3 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        payMethod === 'CASH'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/30'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Banknote size={16} className={payMethod === 'CASH' ? 'text-white' : 'text-emerald-400'} />
                      <span>Bayar Tunai</span>
                    </button>
                  </div>
                </div>

                {!paymentSuccess ? (
                  <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
                    {(() => {
                      const activeTrackConfig = getTrackConfig(paymentConfig, jalur);
                      const trackBadgeLabel = jalur === 'afirmasi' ? 'Jalur Afirmasi' : jalur === 'beasiswa' ? 'Jalur Prestasi' : 'Jalur Reguler';
                      const badgeColor = jalur === 'afirmasi' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : jalur === 'beasiswa' 
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                      return (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/10">
                            <div>
                              <span className="text-[11px] text-slate-400 block font-medium">
                                {activeTrackConfig.title}
                              </span>
                              <span className="text-2xl font-black text-cyan-400 font-mono">
                                Rp {(activeTrackConfig.totalAmount || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border flex-shrink-0 ${badgeColor}`}>
                              {trackBadgeLabel}
                            </span>
                          </div>

                          {/* Rincian Komponen Biaya */}
                          {activeTrackConfig.feeItems && activeTrackConfig.feeItems.length > 0 && (
                            <div className="space-y-1.5 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Rincian Pembayaran ({trackBadgeLabel}):
                              </span>
                              <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                                {activeTrackConfig.feeItems.map((item, idx) => (
                                  <div key={item.id || idx} className="flex items-center justify-between text-xs py-0.5">
                                    <span className="text-slate-300 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80"></span>
                                      {item.name}
                                    </span>
                                    <span className="font-mono font-semibold text-white">
                                      Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                ))}
                                <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between font-bold text-xs text-cyan-300">
                                  <span>Total Tagihan Pembayaran</span>
                                  <span className="font-mono text-sm">
                                    Rp {(activeTrackConfig.totalAmount || 0).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTrackConfig.notes && (
                            <p className="text-[11px] text-slate-400 italic">
                              *{activeTrackConfig.notes}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Mode Transfer Bank */}
                    {payMethod === 'TRANSFER' && (
                      <div className="space-y-4">
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-900 to-indigo-950/50 border-2 border-blue-500/30 text-xs space-y-3.5 shadow-lg shadow-blue-950/50">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                                <CreditCard size={15} />
                              </div>
                              <span className="font-black text-sm text-white tracking-wide">
                                {paymentConfig.bankName || 'Bank BRI'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                              Rekening Resmi
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 block font-medium">Nomor Rekening Tujuan:</span>
                            <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/10">
                              <span className="font-mono font-black text-base sm:text-lg text-cyan-300 tracking-wider">
                                {paymentConfig.bankAccount || '0123-01-001234-56-7'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy((paymentConfig.bankAccount || '012301001234567').replace(/[^0-9]/g, ''), 'BANK')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                              >
                                <Copy size={13} />
                                <span>{copiedBank === 'BANK' ? 'Tersalin!' : 'Salin Rekening'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-400">Atas Nama Rekening:</span>
                            <span className="font-bold text-white uppercase">{paymentConfig.bankHolder || 'SMK GARUDA MAHADHIKA'}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                            <span className="text-slate-400">Nominal Transfer Pas:</span>
                            <span className="font-mono font-black text-cyan-400 text-sm sm:text-base">
                              Rp {(getTrackConfig(paymentConfig, jalur).totalAmount || 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                            💡 <em>Setelah transfer berhasil, harap simpan struk atau tangkap layar (screenshot) bukti transfer lalu unggah di bawah ini:</em>
                          </div>
                        </div>

                        <div>
                          <FileUpload
                            name="paymentProof"
                            label="Unggah Struk Bukti Transfer (Wajib)"
                            colorTheme="blue"
                            helperText="Screenshot m-banking atau foto struk ATM (Maks: 4.5MB)"
                            required={true}
                            onChange={(url: string) => setTransferProofUrl(url)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handlePayTransfer}
                          disabled={isSubmitting || !transferProofUrl}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          <span>Konfirmasi Pembayaran Transfer</span>
                        </button>
                      </div>
                    )}

                    {/* Mode QRIS */}
                    {payMethod === 'QRIS' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-lg text-center space-y-3">
                          {/* QRIS Header Banner */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-mono text-[10px] font-black tracking-widest">
                                QRIS
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                Standar Pembayaran Nasional
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                              GPN
                            </span>
                          </div>

                          {/* Barcode Display */}
                          <div className="py-2 flex flex-col items-center justify-center">
                            {paymentConfig.qrisImageUrl ? (
                              <div className="flex flex-col items-center">
                                <img
                                  src={paymentConfig.qrisImageUrl}
                                  alt="QRIS SMK Garuda Mahadhika"
                                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl border-2 border-slate-200 p-2 bg-white shadow-sm"
                                />
                                <a
                                  href={paymentConfig.qrisImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 text-xs text-purple-700 hover:underline font-bold inline-flex items-center gap-1"
                                >
                                  <Download size={13} /> Buka / Simpan Gambar Barcode QRIS &rarr;
                                </a>
                              </div>
                            ) : (
                              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-4 flex flex-col items-center justify-center relative shadow-inner">
                                <QrCode size={100} className="text-slate-800" />
                                <div className="mt-2 text-center">
                                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                    {paymentConfig.qrisMerchantName || 'SMK GARUDA MAHADHIKA'}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    NMID: {paymentConfig.qrisNmid || 'ID1020000000000'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Detail Merchant & Tagihan Pas */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Merchant / Akun:</span>
                              <span className="font-bold text-slate-900">{paymentConfig.qrisMerchantName || 'SMK GARUDA MAHADHIKA'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Nominal Tagihan Pas:</span>
                              <span className="font-mono font-black text-rose-600 text-base">
                                Rp {(getTrackConfig(paymentConfig, jalur).totalAmount || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          {/* Supported Banks & E-Wallets Info */}
                          <div className="pt-1 text-[10px] text-slate-500 leading-relaxed">
                            Bisa di-scan dari <strong>BCA Mobile, Livin&apos; Mandiri, BRImo, BNI, GoPay, OVO, DANA, ShopeePay, LinkAja</strong> &amp; semua aplikasi perbankan digital.
                          </div>
                        </div>

                        <div>
                          <FileUpload
                            name="paymentProof"
                            label="Unggah Tangkapan Layar (Screenshot) Bukti QRIS (Wajib)"
                            colorTheme="purple"
                            helperText="Screenshot status transaksi berhasil dari aplikasi e-wallet / m-banking (Maks: 4.5MB)"
                            required={true}
                            onChange={(url: string) => setTransferProofUrl(url)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handlePayQRIS}
                          disabled={isSubmitting || !transferProofUrl}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          <span>Konfirmasi Pembayaran QRIS</span>
                        </button>
                      </div>
                    )}

                    {/* Mode Tunai */}
                    {payMethod === 'CASH' && (
                      <div className="space-y-4">
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/50 border-2 border-emerald-500/30 text-xs space-y-3 shadow-lg shadow-emerald-950/50">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                                <Banknote size={15} />
                              </div>
                              <span className="font-black text-sm text-white tracking-wide">
                                Pembayaran Tunai (Loket Kasir)
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                              Loket PPDB
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 block font-medium">KODE BOOKING LOKET:</span>
                            <div className="bg-black/50 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider">
                                CASH-{applicantData?.id?.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                Tunjukkan ke Kasir
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 text-slate-300 text-[11px] pt-1.5 border-t border-emerald-500/20">
                            <p><strong>Lokasi:</strong> {paymentConfig.cashLocation || 'Ruang Panitia PPDB / Loket Kasir Gedung Utama SMK GaMa'}</p>
                            <p><strong>Jam Layanan:</strong> {paymentConfig.cashHours || 'Senin s/d Sabtu, pukul 08.00 - 14.00 WIB'}</p>
                            <p className="text-emerald-200">
                              Tunjukkan kode ini ke petugas loket kasir SMK Garuda Mahadhika dalam waktu 3x24 jam untuk pelunasan biaya sebesar <strong>Rp {(getTrackConfig(paymentConfig, jalur).totalAmount || 0).toLocaleString('id-ID')}</strong>.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayCash}
                          disabled={isSubmitting}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          <span>Konfirmasi Bayar Tunai di Loket</span>
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-xl font-black text-white">Pendaftaran Berhasil Diproses!</h3>
                    <p className="text-xs text-slate-400">
                      Mengarahkan Anda ke lembar tanda bukti pendaftaran...
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </main>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className={`relative z-20 w-full px-6 py-6 border-t text-xs transition-colors ${
        isDarkMode 
          ? 'border-white/10 bg-slate-950/60 text-slate-400' 
          : 'border-slate-200 bg-white/70 text-slate-500'
      }`}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>SMK Garuda Mahadhika</strong>. Panitia Penerimaan Peserta Didik Baru (PPDB).
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] border backdrop-blur-md shadow-xs transition-all"
               style={{
                 borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                 backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.85)',
               }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="opacity-75">Created by</span>
            <span className={`font-bold tracking-wide ${isDarkMode ? 'text-cyan-300' : 'text-slate-900'}`}>
              Abdul Rahman
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
