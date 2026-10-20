'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Printer, 
  FileText, 
  Banknote, 
  RefreshCw,
  Phone,
  ExternalLink
} from 'lucide-react';

import { PPDBPaymentConfig } from '@/app/admin/settings/types';

interface ApplicantData {
  id: string;
  regId: string;
  cashCode: string;
  fullName: string;
  nisn: string;
  gender: string;
  birthInfo: string;
  address: string;
  previousSchool: string;
  major: string;
  jalur: string;
  afirmasiNumber?: string | null;
  kipNumber?: string | null;
  prestasiType?: string | null;
  documentKk?: string | null;
  documentAfirmasi?: string | null;
  documentKip?: string | null;
  documentPrestasi?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  paymentStatus: 'UNPAID' | 'PENDING_TRANSFER' | 'PENDING_CASH' | 'PAID' | 'REJECTED' | string;
  paymentMethod: string | null;
  paymentProof: string | null;
  paymentAmount: number | null;
  paymentDate: string | null;
  paymentNotes: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatusClientProps {
  schoolName: string;
  contactPhone?: string;
  paymentConfig?: PPDBPaymentConfig;
}

export default function StatusClient({ schoolName, contactPhone = '082246464677', paymentConfig }: StatusClientProps) {
  const ppdbPhone = contactPhone || '082246464677';
  const displayPhone = '0822-4646-4677';

  const getWhatsAppLink = (text: string) => {
    let clean = ppdbPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const searchParams = useSearchParams();
  const initialNisn = searchParams.get('nisn') || searchParams.get('id') || '';

  const [searchQuery, setSearchQuery] = useState(initialNisn);
  const [loading, setLoading] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async (query: string) => {
    if (!query.trim()) {
      setErrorMessage('Silakan masukkan NISN atau Nomor Registrasi Anda.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/ppdb/status?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setApplicant(null);
        setErrorMessage(data.error || 'Data pendaftar tidak ditemukan.');
      } else {
        setApplicant(data.data);
      }
    } catch {
      setApplicant(null);
      setErrorMessage('Terjadi gangguan jaringan atau server. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialNisn) {
      const timer = setTimeout(() => {
        void fetchStatus(initialNisn);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialNisn]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchStatus(searchQuery);
  };

  const handleReset = () => {
    setApplicant(null);
    setErrorMessage(null);
    setSearchQuery('');
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 font-sans py-10 sm:py-16 relative overflow-hidden text-slate-800">
      
      {/* 3D Ambient Lighting & Spatial Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-emerald-400/20 via-blue-400/15 to-indigo-400/15 blur-[120px] rounded-full pointer-events-none -z-0" />
      <div className="absolute top-[550px] -left-28 w-[450px] h-[450px] bg-teal-300/15 blur-[110px] rounded-full pointer-events-none -z-0" />
      <div className="absolute top-[950px] -right-28 w-[450px] h-[450px] bg-blue-300/15 blur-[110px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <a 
              href="https://smkgama.sch.id" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 font-semibold text-sm shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-200 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Beranda</span>
            </a>

            <Link 
              href="/ppdb" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-blue-600 font-semibold text-sm shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-200"
            >
              <FileText size={16} />
              <span>Formulir Pendaftaran Baru</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-wider uppercase mb-3 shadow-sm">
            <Sparkles size={14} className="text-emerald-500 animate-pulse" />
            PORTAL MONITORING PPDB ONLINE
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3 drop-shadow-sm">
            Cek Status & Verifikasi Pendaftaran
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Periksa status verifikasi berkas, konfirmasi pembayaran, dan hasil seleksi penerimaan peserta didik baru <span className="font-semibold text-slate-800">{schoolName}</span> secara real-time.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] border border-slate-200/90 p-6 sm:p-8 mb-8">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              Masukkan Nomor Induk Siswa Nasional (NISN) atau No. Registrasi:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Contoh: 0071234567 atau PPDB-ABCDEF"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-base"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Cari Data</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Sistem akan mencocokkan data resmi pendaftaran yang tersimpan di basis data PPDB {schoolName}.
            </p>
          </form>
        </div>

        {/* Error / Not Found Message */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-8 mb-8 text-center animate-fade-in shadow-sm">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <XCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-rose-950 mb-1">Data Tidak Ditemukan</h3>
            <p className="text-sm text-rose-800 max-w-xl mx-auto mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-800 font-semibold rounded-xl text-xs transition-all shadow-sm"
              >
                Coba Cari Lagi
              </button>
              <Link
                href="/ppdb"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <FileText size={14} /> Daftar Sekarang
              </Link>
              <a
                href={getWhatsAppLink('Halo Panitia PPDB SMK GaMa, saya membutuhkan bantuan terkait pengecekan status pendaftaran.')}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Phone size={14} /> Bantuan Panitia (0822-4646-4677)
              </a>
            </div>
          </div>
        )}

        {/* Applicant Result Card */}
        {applicant && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. SELECTION STATUS BANNER (HASIL SELEKSI KELULUSAN) */}
            <div className={`rounded-3xl p-6 sm:p-8 border-2 shadow-lg transition-all ${
              applicant.status === 'APPROVED' 
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-emerald-400/80 shadow-emerald-500/10'
                : applicant.status === 'REJECTED'
                ? 'bg-gradient-to-br from-rose-50 via-red-50 to-white border-rose-400/80 shadow-rose-500/10'
                : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-blue-400/80 shadow-blue-500/10'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl text-white shadow-md ${
                    applicant.status === 'APPROVED' ? 'bg-emerald-600' : applicant.status === 'REJECTED' ? 'bg-rose-600' : 'bg-blue-600'
                  }`}>
                    {applicant.status === 'APPROVED' ? (
                      <CheckCircle2 size={30} />
                    ) : applicant.status === 'REJECTED' ? (
                      <XCircle size={30} />
                    ) : (
                      <Clock size={30} />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Hasil Seleksi Penerimaan Siswa
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {applicant.status === 'APPROVED' && 'SELAMAT! ANDA DINYATAKAN DITERIMA'}
                      {applicant.status === 'REJECTED' && 'MOHON MAAF, ANDA BELUM DITERIMA'}
                      {applicant.status === 'PENDING' && 'DATA DALAM PROSES SELEKSI PPDB'}
                    </h2>
                  </div>
                </div>

                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
                  applicant.status === 'APPROVED' 
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : applicant.status === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-blue-600 text-white border-blue-700'
                }`}>
                  {applicant.status === 'APPROVED' ? 'LULUS / DITERIMA' : applicant.status === 'REJECTED' ? 'TIDAK DITERIMA' : 'PROSES SELEKSI'}
                </span>
              </div>

              <div className="mt-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {applicant.status === 'APPROVED' && (
                  <p>
                    Selamat! Anda telah lolos tahap seleksi berkas dan penerimaan di <strong>{schoolName}</strong> pada kompetensi keahlian <strong>{applicant.major}</strong>. Silakan segera melakukan proses daftar ulang dengan membawa kelengkapan berkas fisik dan bukti registrasi ke sekretariat PPDB sekolah.
                  </p>
                )}
                {applicant.status === 'REJECTED' && (
                  <p>
                    Berdasarkan verifikasi data dan pertimbangan kuota pendaftar, kami sampaikan bahwa Anda belum dapat diterima pada periode seleksi ini. Terima kasih atas partisipasi dan minat Anda terhadap {schoolName}.
                  </p>
                )}
                {applicant.status === 'PENDING' && (
                  <p>
                    Formulir dan berkas pendaftaran Anda telah berhasil terdata dalam sistem. Tim panitia seleksi PPDB {schoolName} sedang melakukan verifikasi keabsahan dokumen serta penilaian berkala. Silakan pantau halaman ini secara berkala.
                  </p>
                )}
              </div>
            </div>

            {/* 2. PAYMENT & FILE VERIFICATION STATUS */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Status Pembayaran & Verifikasi Berkas</h3>
              </div>

              {applicant.paymentStatus === 'PAID' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-base">Pembayaran Lunas & Terverifikasi Sah (PAID)</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      {applicant.jalur === 'normal' 
                        ? 'Biaya pendaftaran dan administrasi formulir telah diterima dan disahkan panitia bendahara.'
                        : 'Pendaftaran jalur Beasiswa/Afirmasi telah diverifikasi dan bebas biaya pendaftaran.'}
                    </p>
                    {applicant.verifiedBy && (
                      <p className="text-[11px] font-semibold text-emerald-900 mt-2">
                        Diverifikasi oleh: <span className="underline">{applicant.verifiedBy}</span>
                      </p>
                    )}
                    {applicant.paymentNotes && (
                      <div className="mt-2 text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                        <strong>Catatan Panitia:</strong> {applicant.paymentNotes}
                      </div>
                    )}
                  </div>
                </div>
              ) : applicant.paymentStatus === 'PENDING_TRANSFER' ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0">
                    <Clock size={22} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-base">Menunggu Verifikasi Bukti Transfer</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Bukti transfer yang Anda kirimkan telah masuk ke antrean pengecekan panitia keuangan. Verifikasi berlangsung maksimal 1x24 jam kerja.
                    </p>
                    {applicant.paymentProof && (
                      <div className="mt-2.5">
                        <a 
                          href={applicant.paymentProof} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-blue-600 font-bold underline hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          Lihat Bukti Transfer yang Diunggah &rarr;
                        </a>
                      </div>
                    )}
                    {applicant.paymentNotes && (
                      <div className="mt-2 text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                        <strong>Catatan Panitia:</strong> {applicant.paymentNotes}
                      </div>
                    )}
                  </div>
                </div>
              ) : applicant.paymentStatus === 'PENDING_CASH' ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-dashed border-emerald-300">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                    <Banknote size={18} /> Menunggu Pembayaran Tunai di Loket PPDB
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Kode Booking Pembayaran Tunai:</span>
                      <span className="text-2xl font-black font-mono text-emerald-950 tracking-wider">
                        {applicant.cashCode}
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 block">Nominal Tunai Pas:</span>
                      <span className="text-xl font-black text-emerald-800">
                        Rp {(applicant.paymentAmount || paymentConfig?.totalAmount || 150000).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {paymentConfig?.feeItems && paymentConfig.feeItems.length > 0 && (
                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 my-2 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rincian Komponen Biaya:</span>
                      {paymentConfig.feeItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between py-0.5 text-slate-700">
                          <span>{item.name}</span>
                          <span className="font-mono font-semibold">Rp {Number(item.amount || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-emerald-200 mt-2 space-y-1">
                    <p><strong>Lokasi:</strong> {paymentConfig?.cashLocation || 'Ruang Panitia PPDB / Loket Kasir Gedung Utama SMK GaMa'}</p>
                    <p><strong>Jam Layanan:</strong> {paymentConfig?.cashHours || 'Senin s/d Sabtu, pukul 08.00 - 14.00 WIB'}</p>
                    <p>Tunjukkan kode booking ini kepada petugas kasir untuk mendapatkan kwitansi fisik bertanda tangan & cap resmi.</p>
                  </div>
                  {applicant.paymentNotes && (
                    <div className="mt-2 text-xs bg-emerald-100/50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                      <strong>Catatan Petugas:</strong> {applicant.paymentNotes}
                    </div>
                  )}
                </div>
              ) : applicant.paymentStatus === 'REJECTED' ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
                  <div className="p-2 bg-rose-600 text-white rounded-xl flex-shrink-0">
                    <XCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-rose-950 text-base">Verifikasi Pembayaran Ditolak</h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Bukti pembayaran atau transfer yang diunggah tidak valid atau tidak terbaca oleh panitia.
                    </p>
                    {applicant.paymentNotes && (
                      <div className="mt-2 text-xs bg-white/90 p-2.5 rounded-xl border border-rose-200 text-rose-900">
                        <strong>Catatan Panitia:</strong> {applicant.paymentNotes}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 mt-2">
                      Silakan hubungi panitia PPDB untuk melakukan konfirmasi ulang atau pembayaran ulang di loket.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="p-2 bg-slate-500 text-white rounded-xl flex-shrink-0">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">Belum Menyelesaikan Pembayaran Formulir</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Silakan selesaikan pembayaran biaya formulir pendaftaran agar berkas Anda dapat diproses ke seleksi PPDB.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. DETAILED APPLICANT DATA (BIODATA CARD) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Rincian Data Calon Siswa</h3>
                  <p className="text-xs text-slate-500">Identitas resmi yang didaftarkan pada sistem PPDB</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">No. Registrasi</span>
                  <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 text-sm">
                    {applicant.regId}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Nama Lengkap</span>
                  <span className="font-bold text-slate-900 text-base">{applicant.fullName}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Nomor Induk Siswa Nasional (NISN)</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{applicant.nisn}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Pilihan Kompetensi Keahlian (Jurusan)</span>
                  <span className="font-bold text-blue-700">{applicant.major}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Jalur Pendaftaran</span>
                  <span className="font-bold text-slate-900 capitalize">{applicant.jalur}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Asal Sekolah (SMP/MTs)</span>
                  <span className="font-bold text-slate-900">{applicant.previousSchool}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium">Waktu Registrasi Masuk</span>
                  <span className="font-bold text-slate-900">{formatDate(applicant.createdAt)}</span>
                </div>

                {applicant.jalur === 'afirmasi' && (
                  <>
                    {applicant.kipNumber && (
                      <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-100 sm:col-span-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-teal-700/80 block text-xs font-medium">Nomor Kartu Indonesia Pintar (KIP / PIP)</span>
                            <span className="font-mono font-bold text-teal-950 text-base">{applicant.kipNumber}</span>
                          </div>
                          {applicant.documentKip && (
                            <a
                              href={applicant.documentKip}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-teal-700 bg-white hover:bg-teal-100/70 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors w-fit flex items-center gap-1.5"
                            >
                              <ExternalLink size={13} />
                              <span>Lihat Berkas KIP</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {applicant.afirmasiNumber && (
                      <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 sm:col-span-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-emerald-700/80 block text-xs font-medium">Nomor Surat SKTM / Bantuan</span>
                            <span className="font-mono font-bold text-emerald-950 text-base">{applicant.afirmasiNumber}</span>
                          </div>
                          {applicant.documentAfirmasi && (
                            <a
                              href={applicant.documentAfirmasi}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors w-fit flex items-center gap-1.5"
                            >
                              <ExternalLink size={13} />
                              <span>Lihat Berkas SKTM</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 4. ACTIONS & PRINT LINK */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href={`/ppdb/success?id=${applicant.id}`}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Printer size={16} />
                  <span>Lihat & Cetak Bukti Registrasi</span>
                </Link>

                <button
                  onClick={handleReset}
                  className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={15} />
                  <span>Cari NISN Lain</span>
                </button>
              </div>

              <a
                href={getWhatsAppLink(`Halo Panitia PPDB SMK GaMa, saya ingin bertanya mengenai status pendaftaran dengan NISN ${applicant.nisn} atas nama ${applicant.fullName}.`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-300 transition-all shadow-sm"
              >
                <Phone size={14} className="text-emerald-600" />
                <span>Bantuan Panitia PPDB (WhatsApp: {displayPhone})</span>
              </a>
            </div>

          </div>
        )}

        {/* Informative Guidance Section if Not Searched Yet */}
        {!applicant && !errorMessage && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cek Status Verifikasi</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ketahui apakah bukti pembayaran transfer Anda sudah dikonfirmasi lunas oleh bendahara atau kode booking tunai aktif.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-3">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Hasil Seleksi Penerimaan</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pantau langsung keputusan kelulusan seleksi PPDB (Diterima / Proses Seleksi / Tidak Diterima) secara terbuka dan transparan.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-3">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cetak Ulang Bukti Registrasi</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kehilangan lembar kartu registrasi? Anda dapat mengunduh dan mencetak kembali kartu pendaftaran resmi kapan pun.
              </p>
            </div>
          </div>
        )}

        {/* Help Banner at the bottom */}
        <div className="mt-8 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/90 border border-slate-200 shadow-sm text-xs text-slate-600">
            <span>Butuh informasi pendaftaran atau bantuan verifikasi berkas?</span>
            <a
              href={getWhatsAppLink('Halo Panitia PPDB SMK GaMa, saya ingin berkonsultasi mengenai pendaftaran PPDB.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 underline"
            >
              <Phone size={13} />
              <span>Bantuan Panitia PPDB (WhatsApp: {displayPhone})</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
