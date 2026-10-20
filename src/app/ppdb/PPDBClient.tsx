'use client';

import { useState } from 'react';
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
  QrCode, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  ChevronRight,
  Layers,
  ArrowLeft,
  Copy,
  Banknote,
  Building,
  AlertCircle,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Search
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';

export interface JurusanItem {
  id?: string;
  name: string;
  code: string;
  kuota?: number;
  description?: string;
}

export default function PPDBClient({ 
  schoolName = "SMK GaMa",
  jurusanList = []
}: { 
  schoolName?: string;
  jurusanList?: JurusanItem[];
}) {
  const router = useRouter();
  const [jalur, setJalur] = useState<'normal' | 'afirmasi' | 'beasiswa'>('normal');
  const [afirmasiType, setAfirmasiType] = useState<'kip' | 'sktm' | 'both'>('kip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [applicantData, setApplicantData] = useState<any>(null);

  // Metode Pembayaran State (Transfer vs Cash)
  const [payMethod, setPayMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [transferProofUrl, setTransferProofUrl] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Validasi Dokumen Wajib per Jalur Khusus (Jalur reguler tidak mewajibkan unggah berkas awal)
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
        alert(result.error || 'Terjadi kesalahan');
        setIsSubmitting(false);
        return;
      }

      setApplicantData(result.applicant);
      setIsSubmitting(false);

      if (jalur === 'normal') {
        setShowPayment(true);
      } else {
        router.push(`/ppdb/success?id=${result.applicant.id}&name=${encodeURIComponent(result.applicant.fullName)}`);
      }
    } catch (error) {
      alert('Gagal menghubungi server');
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

  return (
    <div className="min-h-screen bg-slate-100/90 font-sans py-10 sm:py-16 relative overflow-hidden text-slate-800">
      
      {/* 3D Ambient Lighting & Spatial Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/15 blur-[120px] rounded-full pointer-events-none -z-0" />
      <div className="absolute top-[550px] -left-28 w-[450px] h-[450px] bg-blue-300/15 blur-[110px] rounded-full pointer-events-none -z-0" />
      <div className="absolute top-[950px] -right-28 w-[450px] h-[450px] bg-indigo-300/15 blur-[110px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header */}
        <div className="text-center mb-10">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <a 
              href="https://smkgama.sch.id" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 font-semibold text-sm shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-200 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Beranda</span>
            </a>

            <Link 
              href="/ppdb/status" 
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              <Search size={16} />
              <span>Cek Status & Verifikasi Pendaftaran</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold tracking-wider uppercase mb-3 shadow-sm">
            <Sparkles size={14} className="text-blue-500 animate-pulse" />
            PPDB ONLINE 2026/2027
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 drop-shadow-sm">
            Pendaftaran Peserta Didik Baru
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6">
            Selamat datang di portal pendaftaran resmi <span className="font-semibold text-slate-800">{schoolName}</span>. Silakan lengkapi formulir di bawah ini dengan data yang sah dan valid.
          </p>

          {/* Quick Status Check Callout & Help */}
          <div className="max-w-xl mx-auto flex flex-col gap-2.5">
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-left">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg flex-shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <span>Sudah pernah mendaftar? Pantau verifikasi berkas & kelulusan Anda.</span>
              </div>
              <Link
                href="/ppdb/status"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl whitespace-nowrap shadow-sm transition-all"
              >
                Cek Status &rarr;
              </Link>
            </div>

            <div className="text-center">
              <a
                href="https://wa.me/6282246464677?text=Halo%20Panitia%20PPDB%20SMK%20GaMa,%20saya%20ingin%20bertanya%20mengenai%20pendaftaran%20PPDB."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white px-3.5 py-1.5 rounded-full border border-emerald-200 transition-all shadow-xs"
              >
                <Phone size={13} className="text-emerald-600" />
                <span>Bantuan Panitia PPDB (WhatsApp): <strong>0822-4646-4677</strong></span>
              </a>
            </div>
          </div>
        </div>

        {/* 3D Floating Sheet ("Lembar Form") */}
        <div className="relative bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(15,23,42,0.18),0_10px_30px_-5px_rgba(15,23,42,0.06),0_0_0_1px_rgba(255,255,255,1)_inset] border border-slate-200/80 ring-1 ring-slate-900/[0.05] overflow-hidden transition-all duration-300">
          
          {/* Top 3D Accent Line */}
          <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 shadow-sm" />

          {/* Form Hero Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                    <ShieldCheck size={20} className="text-blue-100" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Lembar Formulir Pendaftaran</h2>
                </div>
                <p className="text-blue-100 text-sm">Pastikan data NISN, nama lengkap, dan dokumen sesuai ijazah asli</p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full font-semibold text-xs sm:text-sm text-white shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Gelombang 1 : Dibuka</span>
              </div>
            </div>
          </div>

          {/* 3D Interactive Jalur Selection Cards */}
          <div className="p-6 sm:px-10 pt-8 pb-8 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" />
                  PILIH JALUR PENDAFTARAN
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Tentukan jalur yang sesuai dengan kualifikasi pendaftar</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200/60 text-slate-600">
                Pilih 1 Jalur
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Jalur Reguler */}
              <button 
                type="button"
                onClick={() => setJalur('normal')}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group cursor-pointer ${
                  jalur === 'normal' 
                    ? 'border-blue-600 bg-gradient-to-b from-blue-50/90 via-white to-blue-50/30 shadow-[0_14px_30px_-6px_rgba(37,99,235,0.25),0_4px_10px_rgba(37,99,235,0.08)] ring-2 ring-blue-500/20 -translate-y-1' 
                    : 'border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    jalur === 'normal' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-200' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}>
                    <User size={22} />
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    jalur === 'normal'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border-2 border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {jalur === 'normal' ? <Check size={14} className="stroke-[3]" /> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black text-base ${jalur === 'normal' ? 'text-blue-700' : 'text-slate-800'}`}>
                    Reguler
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Umum
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Jalur umum menggunakan nilai rapor & wawancara. Tanpa syarat upload berkas awal.
                </p>
              </button>

              {/* Jalur Afirmasi */}
              <button 
                type="button"
                onClick={() => setJalur('afirmasi')}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group cursor-pointer ${
                  jalur === 'afirmasi' 
                    ? 'border-emerald-600 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 shadow-[0_14px_30px_-6px_rgba(16,185,129,0.25),0_4px_10px_rgba(16,185,129,0.08)] ring-2 ring-emerald-500/20 -translate-y-1' 
                    : 'border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    jalur === 'afirmasi' 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-200' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                  }`}>
                    <HeartHandshake size={22} />
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    jalur === 'afirmasi'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border-2 border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {jalur === 'afirmasi' ? <Check size={14} className="stroke-[3]" /> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black text-base ${jalur === 'afirmasi' ? 'text-emerald-700' : 'text-slate-800'}`}>
                    Afirmasi
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Bantuan
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Khusus pemegang SKTM dari yang berwenang atau kartu KIP / PKH (Bebas biaya pendaftaran).
                </p>
              </button>

              {/* Jalur Prestasi / Beasiswa */}
              <button 
                type="button"
                onClick={() => setJalur('beasiswa')}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group cursor-pointer ${
                  jalur === 'beasiswa' 
                    ? 'border-purple-600 bg-gradient-to-b from-purple-50/90 via-white to-purple-50/30 shadow-[0_14px_30px_-6px_rgba(147,51,234,0.25),0_4px_10px_rgba(147,51,234,0.08)] ring-2 ring-purple-500/20 -translate-y-1' 
                    : 'border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-purple-400 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    jalur === 'beasiswa' 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-200' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-600'
                  }`}>
                    <Award size={22} />
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    jalur === 'beasiswa'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'border-2 border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {jalur === 'beasiswa' ? <Check size={14} className="stroke-[3]" /> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black text-base ${jalur === 'beasiswa' ? 'text-purple-700' : 'text-slate-800'}`}>
                    Prestasi/Beasiswa
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Khusus
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Jalur prestasi akademik (ranking raport) & non-akademik (piagam penghargaan/sertifikat).
                </p>
              </button>

            </div>
          </div>

          {/* Form Content */}
          <form className="p-6 sm:p-10 space-y-10" onSubmit={handleSubmit}>
            <input type="hidden" name="jalur" value={jalur} />
            <input type="hidden" name="jalurPendaftaran" value={jalur} />
            
            {/* Section 01: Data Pribadi */}
            <section className="relative">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-50 shrink-0">
                  01
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <User className="text-blue-600" size={20} /> Data Pribadi Calon Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Isi data identitas diri sesuai dengan kartu keluarga dan akta kelahiran</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <User size={18} />
                    </div>
                    <input 
                      required 
                      type="text" 
                      name="fullName" 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200" 
                      placeholder="Masukkan nama lengkap sesuai ijazah" 
                    />
                  </div>
                </div>

                {/* NISN */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    NISN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <CreditCard size={18} />
                    </div>
                    <input 
                      required 
                      type="number" 
                      name="nisn" 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200" 
                      placeholder="Nomor Induk Siswa Nasional (10 digit)" 
                    />
                  </div>
                </div>

                {/* Tempat, Tanggal Lahir */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tempat, Tanggal Lahir <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Calendar size={18} />
                    </div>
                    <input 
                      required 
                      type="text" 
                      name="birthInfo" 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200" 
                      placeholder="Contoh: Jakarta, 12 Agustus 2010" 
                    />
                  </div>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <User size={18} />
                    </div>
                    <select 
                      required 
                      name="gender" 
                      defaultValue=""
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200"
                    >
                      <option value="" disabled>Pilih Jenis Kelamin</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Alamat Lengkap Domisili <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none text-slate-400">
                      <MapPin size={18} />
                    </div>
                    <textarea 
                      required 
                      name="address" 
                      rows={3} 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200 resize-none" 
                      placeholder="Masukkan nama jalan, RT/RW, kelurahan, kecamatan, dan kota/kabupaten"
                    ></textarea>
                  </div>
                </div>

              </div>
            </section>

            {/* Section 02: Syarat Khusus Jalur (Conditional) */}
            {(jalur === 'afirmasi' || jalur === 'beasiswa') && (
              <section className={`p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 shadow-sm ${
                jalur === 'afirmasi' 
                  ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-300/80 shadow-emerald-500/5' 
                  : 'bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border-purple-300/80 shadow-purple-500/5'
              }`}>
                <div className="flex items-center gap-3.5 mb-6">
                  <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-sm shadow-md shrink-0 ${
                    jalur === 'afirmasi' 
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/30 ring-4 ring-emerald-100' 
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30 ring-4 ring-purple-100'
                  }`}>
                    02
                  </div>
                  <div>
                    <h3 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                      jalur === 'afirmasi' ? 'text-emerald-800' : 'text-purple-800'
                    }`}>
                      {jalur === 'afirmasi' ? <HeartHandshake size={20} /> : <Award size={20} />} 
                      Syarat Khusus Jalur {jalur === 'afirmasi' ? 'Afirmasi' : 'Prestasi & Beasiswa'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {jalur === 'afirmasi' 
                        ? 'Lampirkan berkas Kartu Indonesia Pintar (KIP / PIP) atau Surat Keterangan Tidak Mampu (SKTM) resmi' 
                        : 'Lampirkan berkas bukti prestasi, seperti surat keterangan ranking kelas, piagam penghargaan, atau sertifikat kejuaraan'}
                    </p>
                  </div>
                </div>
                
                {jalur === 'afirmasi' && (
                  <div className="space-y-5">
                    {/* Pemilih Dokumen Afirmasi: KIP vs SKTM vs Lengkap */}
                    <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Pilih Dokumen Afirmasi yang Dilampirkan:
                        </label>
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100/70 px-2.5 py-0.5 rounded-full w-fit">
                          Bebas Biaya Formulir (100% Gratis)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAfirmasiType('kip')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                            afirmasiType === 'kip'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-300 -translate-y-0.5'
                              : 'bg-white text-slate-700 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${afirmasiType === 'kip' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs sm:text-sm">Kartu KIP / PIP</div>
                            <div className={`text-[11px] ${afirmasiType === 'kip' ? 'text-emerald-100' : 'text-slate-400'}`}>Kartu Indonesia Pintar</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAfirmasiType('sktm')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                            afirmasiType === 'sktm'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-300 -translate-y-0.5'
                              : 'bg-white text-slate-700 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${afirmasiType === 'sktm' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs sm:text-sm">Surat SKTM / PKH</div>
                            <div className={`text-[11px] ${afirmasiType === 'sktm' ? 'text-emerald-100' : 'text-slate-400'}`}>Kelurahan / Desa</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAfirmasiType('both')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                            afirmasiType === 'both'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-300 -translate-y-0.5'
                              : 'bg-white text-slate-700 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${afirmasiType === 'both' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            <Layers size={18} />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs sm:text-sm">KIP & SKTM</div>
                            <div className={`text-[11px] ${afirmasiType === 'both' ? 'text-emerald-100' : 'text-slate-400'}`}>Lampirkan Keduanya</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Mode KIP */}
                    {afirmasiType === 'kip' && (
                      <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-xs animate-fade-in">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-100">
                          <CreditCard size={18} className="text-emerald-600" />
                          <h4 className="font-bold text-sm text-emerald-950">Berkas Kartu Indonesia Pintar (KIP / PIP Kemdikbud)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Nomor KIP (Kartu Indonesia Pintar) / PIP <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <CreditCard size={18} />
                              </div>
                              <input 
                                required 
                                type="text" 
                                name="kipNumber" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-emerald-300/80 bg-white text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all duration-200 text-sm" 
                                placeholder="Contoh: KIP-8921820 atau no. seri kartu KIP/PIP" 
                              />
                            </div>
                            <p className="text-[11px] text-emerald-700/80 mt-1.5 font-medium">
                              Ketikkan nomor identitas yang tertera pada kartu KIP fisik atau KIP Digital resmi
                            </p>
                          </div>
                          <div>
                            <FileUpload
                              name="documentKip"
                              label="Unggah Berkas / Foto Kartu KIP (Wajib)"
                              colorTheme="green"
                              helperText="Foto asli kartu KIP fisik atau tangkapan layar KIP Digital (PDF, JPG, PNG Maks 4.5MB)"
                              required={true}
                            />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Punya surat SKTM juga dari Kelurahan/Desa?
                          </p>
                          <button
                            type="button"
                            onClick={() => setAfirmasiType('both')}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                          >
                            + Lampirkan juga Berkas SKTM
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode SKTM */}
                    {afirmasiType === 'sktm' && (
                      <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-xs animate-fade-in">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-100">
                          <FileText size={18} className="text-emerald-600" />
                          <h4 className="font-bold text-sm text-emerald-950">Surat Keterangan Tidak Mampu (SKTM / PKH / KKS)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Nomor Surat SKTM / Kartu PKH / KKS <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <FileText size={18} />
                              </div>
                              <input 
                                required 
                                type="text" 
                                name="afirmasiNumber" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-emerald-300/80 bg-white text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all duration-200 text-sm" 
                                placeholder="Nomor surat SKTM dari kelurahan/desa atau no. kartu PKH/KKS" 
                              />
                            </div>
                            <p className="text-[11px] text-emerald-700/80 mt-1.5 font-medium">
                              Nomor surat resmi dari Kelurahan/Desa atau nomor kartu bansos pemerintah
                            </p>
                          </div>
                          <div>
                            <FileUpload
                              name="documentAfirmasi"
                              label="Unggah Berkas Surat SKTM / PKH (Wajib)"
                              colorTheme="green"
                              helperText="Scan/foto surat keterangan dari kelurahan/desa atau kartu bansos (Maks 4.5MB)"
                              required={true}
                            />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Punya kartu KIP (Kartu Indonesia Pintar) juga?
                          </p>
                          <button
                            type="button"
                            onClick={() => setAfirmasiType('both')}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                          >
                            + Lampirkan juga Berkas KIP
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode Keduanya (KIP & SKTM) */}
                    {afirmasiType === 'both' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Box 1: KIP */}
                        <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-xs">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-100">
                            <CreditCard size={18} className="text-emerald-600" />
                            <h4 className="font-bold text-sm text-emerald-950">1. Berkas Kartu Indonesia Pintar (KIP / PIP)</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Nomor KIP (Kartu Indonesia Pintar) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                  <CreditCard size={18} />
                                </div>
                                <input 
                                  required 
                                  type="text" 
                                  name="kipNumber" 
                                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-emerald-300/80 bg-white text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all duration-200 text-sm" 
                                  placeholder="Contoh: KIP-8921820" 
                                />
                              </div>
                              <p className="text-[11px] text-emerald-700/80 mt-1.5 font-medium">
                                Nomor tercantum pada fisik KIP atau identitas resmi KIP Digital
                              </p>
                            </div>
                            <div>
                              <FileUpload
                                name="documentKip"
                                label="Unggah Berkas / Foto Kartu KIP (Wajib)"
                                colorTheme="green"
                                helperText="Foto/scan kartu KIP fisik atau screenshot KIP Digital (PDF/JPG/PNG Maks 4.5MB)"
                                required={true}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Box 2: SKTM */}
                        <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-xs">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-100">
                            <FileText size={18} className="text-emerald-600" />
                            <h4 className="font-bold text-sm text-emerald-950">2. Surat Keterangan Tidak Mampu (SKTM / PKH)</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Nomor Surat SKTM / PKH / KKS <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                  <FileText size={18} />
                                </div>
                                <input 
                                  required 
                                  type="text" 
                                  name="afirmasiNumber" 
                                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-emerald-300/80 bg-white text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all duration-200 text-sm" 
                                  placeholder="Nomor SKTM dari kelurahan/desa" 
                                />
                              </div>
                              <p className="text-[11px] text-emerald-700/80 mt-1.5 font-medium">
                                Nomor surat dari instansi berwenang (Kelurahan/Desa)
                              </p>
                            </div>
                            <div>
                              <FileUpload
                                name="documentAfirmasi"
                                label="Unggah Berkas Surat SKTM / PKH (Wajib)"
                                colorTheme="green"
                                helperText="Scan atau foto surat SKTM berstempel resmi dari Kelurahan/Desa (Maks 4.5MB)"
                                required={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {jalur === 'beasiswa' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Kategori & Rincian Prestasi <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Award size={18} />
                        </div>
                        <input 
                          required 
                          type="text" 
                          name="prestasiType" 
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-purple-300/80 bg-white text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 outline-none transition-all duration-200" 
                          placeholder="Contoh: Ranking 1 Kelas IX SMP / Juara 1 FLS2N / Piagam O2SN" 
                        />
                      </div>
                      <p className="text-[11px] text-purple-700/80 mt-1.5 font-medium">
                        Tuliskan perolehan ranking kelas raport atau bidang kejuaraan perlombaan yang pernah diraih
                      </p>
                    </div>
                    <div>
                      <FileUpload
                        name="documentPrestasi"
                        label="Unggah Berkas Prestasi (Bisa Beberapa File)"
                        colorTheme="purple"
                        helperText="Dapat mengunggah lebih dari 1 file (sertifikat, piagam, ranking raport)"
                        required={true}
                        multiple={true}
                        maxFiles={10}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Section: Data Akademik */}
            <section className="relative">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-50 shrink-0">
                  {jalur === 'normal' ? '02' : '03'}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <School className="text-blue-600" size={20} /> Data Akademik & Pilihan Jurusan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tentukan program keahlian kejuruan yang ingin dipelajari</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Asal Sekolah */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Asal Sekolah (SMP/MTs) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <School size={18} />
                    </div>
                    <input 
                      required 
                      type="text" 
                      name="previousSchool" 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200" 
                      placeholder="Contoh: SMP Negeri 1 Jakarta" 
                    />
                  </div>
                </div>

                {/* Pilihan Jurusan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pilihan Jurusan Prioritas <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <BookOpen size={18} />
                    </div>
                    <select 
                      required 
                      name="major" 
                      defaultValue=""
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200"
                    >
                      <option value="" disabled>Pilih Program Keahlian</option>
                      {jurusanList && jurusanList.length > 0 ? (
                        jurusanList.map((j) => {
                          const displayName = j.code && !j.name.includes(`(${j.code})`)
                            ? `${j.name} (${j.code})`
                            : j.name;
                          return (
                            <option key={j.id || j.code} value={j.code || j.name}>
                              {displayName}
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="RPL">Rekayasa Perangkat Lunak (RPL)</option>
                          <option value="TKJ">Teknik Komputer & Jaringan (TKJ)</option>
                          <option value="MM">Multimedia (Desain Komunikasi Visual)</option>
                          <option value="AK">Akuntansi & Keuangan Lembaga</option>
                          <option value="OTKP">Otomatisasi & Tata Kelola Perkantoran</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

              </div>
            </section>

            {/* Section: Kontak Calon Siswa */}
            <section className="relative">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30 ring-4 ring-blue-50 shrink-0">
                  {jalur === 'normal' ? '03' : '04'}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="text-blue-600" size={20} /> Informasi Kontak Calon Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Nomor WhatsApp aktif digunakan untuk konfirmasi status pendaftaran & pengumuman seleksi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Telepon */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nomor WhatsApp / Telepon Aktif <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Phone size={18} />
                    </div>
                    <input 
                      required 
                      type="tel" 
                      name="phone" 
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-[0_4px_20px_rgba(37,99,235,0.12)] outline-none transition-all duration-200" 
                      placeholder="Contoh: 081234567890" 
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    Pastikan nomor WhatsApp aktif untuk menerima bukti pendaftaran & jadwal tes seleksi
                  </p>
                </div>

                {/* Callout Info Jalur & Berkas */}
                <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/80 border border-blue-200/70 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 text-blue-950 font-bold text-sm">
                    <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                    <span>Konfirmasi Layanan PPDB</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {jalur === 'normal' 
                      ? 'Calon siswa jalur Reguler tidak perlu mengunggah berkas pada formulir ini. Berkas fisik dapat dibawa saat tahap verifikasi dan wawancara.'
                      : jalur === 'afirmasi'
                      ? 'Pastikan Surat Keterangan Tidak Mampu (SKTM) dari pihak berwenang atau kartu bantuan telah diunggah dengan jelas pada bagian Syarat Khusus di atas.'
                      : 'Pastikan berkas bukti prestasi (surat ranking kelas, piagam penghargaan, atau sertifikat juara) telah diunggah pada bagian Syarat Khusus di atas.'}
                  </p>
                </div>

              </div>
            </section>

            {/* Checkbox Persetujuan (3D Card) */}
            <div className="flex items-start gap-3.5 p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/80 rounded-2xl border border-blue-200/70 shadow-sm">
              <input 
                required 
                type="checkbox" 
                id="terms" 
                className="mt-1 w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer" 
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-slate-700 leading-relaxed cursor-pointer select-none">
                Saya menyatakan bahwa seluruh data yang diisikan adalah benar dan dapat dipertanggungjawabkan. Saya bersedia mengikuti seluruh tahapan seleksi PPDB di <span className="font-bold text-slate-900">{schoolName}</span> sesuai dengan ketentuan yang berlaku untuk jalur <span className="font-bold text-blue-700 uppercase">[{jalur === 'normal' ? 'Reguler' : jalur}]</span>.
              </label>
            </div>

            {/* Submit Button Area */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-emerald-600" />
                Data dienkripsi secara aman & rahasia
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 disabled:opacity-60 text-white rounded-2xl font-bold shadow-[0_12px_28px_-6px_rgba(37,99,235,0.4),0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_16px_36px_-6px_rgba(37,99,235,0.5),0_6px_14px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 text-base sm:text-lg cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    <span>Sedang Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={22} className="text-blue-100" />
                    <span>Kirim Formulir Pendaftaran</span>
                    <ChevronRight size={18} className="opacity-70" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Modern 3D Payment Hub Modal (Cash & Transfer) */}
          {showPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.35)] border border-slate-100 w-full max-w-xl overflow-hidden my-8 animate-zoom-in">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                        Tahap 2: Pembayaran Formulir
                      </span>
                      <h3 className="font-extrabold text-xl text-white mt-1.5">Metode Pembayaran PPDB</h3>
                      <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                        {applicantData?.fullName} • NISN: {applicantData?.nisn}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowPayment(false)} 
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {!paymentSuccess ? (
                  <div className="p-6">
                    {/* Ringkasan Tagihan */}
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-100/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biaya Pendaftaran & Verifikasi</div>
                        <div className="text-2xl font-black text-blue-900 mt-0.5">Rp 150.000</div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Kode Tagihan:</span>
                        <span className="text-xs font-mono font-bold bg-white text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm">
                          INV-{applicantData?.id?.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Tab Switcher: Transfer vs Cash */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
                      <button
                        type="button"
                        onClick={() => setPayMethod('TRANSFER')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          payMethod === 'TRANSFER'
                            ? 'bg-white text-blue-700 shadow-md shadow-blue-500/10'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CreditCard size={18} />
                        <span>Transfer / QRIS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMethod('CASH')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          payMethod === 'CASH'
                            ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/10'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Banknote size={18} />
                        <span>Tunai di Loket</span>
                      </button>
                    </div>

                    {/* OPSI 1: TRANSFER BANK & QRIS */}
                    {payMethod === 'TRANSFER' && (
                      <div className="space-y-4">
                        <div className="text-xs text-slate-500 font-medium">
                          Silakan transfer ke salah satu rekening resmi panitia PPDB berikut:
                        </div>

                        {/* Rekening BCA */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white shadow-sm flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                              BCA
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm font-mono tracking-wide">8735-0918-2231</div>
                              <div className="text-xs text-slate-500">a.n SMK GaMa Official</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('873509182231', 'BCA')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedBank === 'BCA' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            {copiedBank === 'BCA' ? 'Tersalin' : 'Salin'}
                          </button>
                        </div>

                        {/* Rekening BRI */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white shadow-sm flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-800 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                              BRI
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm font-mono tracking-wide">0341-0100-2918-538</div>
                              <div className="text-xs text-slate-500">a.n Panitia PPDB SMK GaMa</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('034101002918538', 'BRI')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedBank === 'BRI' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            {copiedBank === 'BRI' ? 'Tersalin' : 'Salin'}
                          </button>
                        </div>

                        {/* QRIS Box */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                              <QrCode size={22} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">QRIS All Payment</div>
                              <div className="text-[11px] text-slate-500">GoPay, Dana, OVO, ShopeePay, BCA/Mandiri Mobile</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                            Auto Check
                          </span>
                        </div>

                        {/* Upload Bukti Struk */}
                        <div className="pt-2">
                          <FileUpload
                            name="paymentProof"
                            label="Upload Bukti Transfer / Struk / Screenshot (Wajib)"
                            required={true}
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            value={transferProofUrl}
                            onChange={(url) => setTransferProofUrl(url)}
                            colorTheme="blue"
                            helperText="Format JPG, PNG, atau PDF (Maks 10MB)"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Pemilik Rekening / Bank Pengirim (Opsional)
                          </label>
                          <input
                            type="text"
                            value={transferNotes}
                            onChange={(e) => setTransferNotes(e.target.value)}
                            placeholder="Contoh: BCA a.n Hendra Wijaya"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handlePayTransfer}
                          disabled={isSubmitting || !transferProofUrl}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4 text-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin" /> Sedang Mengirim Bukti...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} /> Kirim Bukti Transfer & Selesaikan
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* OPSI 2: BAYAR TUNAI DI LOKET (CASH) */}
                    {payMethod === 'CASH' && (
                      <div className="space-y-4">
                        {/* Kupon Slip Booking Tunai 3D */}
                        <div className="border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                            <Banknote size={16} /> Slip Booking Pembayaran Tunai
                          </div>
                          
                          <div className="text-2xl font-black font-mono text-emerald-950 tracking-wider">
                            CASH-{applicantData?.id?.slice(-6).toUpperCase()}
                          </div>
                          <p className="text-xs text-emerald-700 mt-1">
                            Tunjukkan kode ini kepada kasir/panitia saat melakukan pembayaran di sekolah.
                          </p>

                          <div className="mt-4 pt-4 border-t border-emerald-200/60 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500 block text-[11px]">Nominal Tunai:</span>
                              <span className="font-bold text-slate-900 text-sm">Rp 150.000</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">Batas Waktu:</span>
                              <span className="font-bold text-slate-900">3x24 Jam</span>
                            </div>
                          </div>
                        </div>

                        {/* Petunjuk Loket */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                          <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                            <Building size={16} className="text-blue-600" />
                            Lokasi & Waktu Layanan Loket:
                          </div>
                          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                            <li><strong>Lokasi:</strong> Ruang Panitia PPDB & Kasir Gedung Utama SMK GaMa.</li>
                            <li><strong>Hari & Jam:</strong> Senin s/d Sabtu, pukul 08.00 – 14.00 WIB.</li>
                            <li><strong>Alur:</strong> Serahkan uang tunai pas & kode booking kepada petugas, Anda akan menerima bukti kwitansi fisik bertanda tangan panitia dan status langsung diubah menjadi <strong>LUNAS (PAID)</strong>.</li>
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayCash}
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mt-4 text-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin" /> Memproses...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} /> Konfirmasi Pilih Bayar Tunai di Loket
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-zoom-in shadow-inner">
                      <CheckCircle2 size={44} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Pendaftaran & Pembayaran Diproses!</h3>
                    <p className="text-slate-600 text-sm mb-6">
                      {payMethod === 'TRANSFER'
                        ? 'Bukti transfer berhasil dikirim. Panitia PPDB akan memverifikasi berkas dan pembayaran Anda.'
                        : 'Metode bayar tunai di loket telah tercatat. Silakan kunjungi ruang panitia PPDB untuk pelunasan.'}
                    </p>
                    <div className="text-xs text-blue-600 font-semibold animate-pulse flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Menyiapkan kartu bukti pendaftaran...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
        
      </div>
    </div>
  );
}

