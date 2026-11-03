'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Image as ImageIcon, 
  Save, 
  Check, 
  ArrowLeft, 
  Upload, 
  Loader2, 
  Banknote, 
  ExternalLink,
  Printer,
  FileText,
  Award,
  Shield,
  MapPin,
  Phone,
  Mail,
  Globe,
  Sparkles,
  RefreshCw,
  Eye,
  Building,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

import { saveWebSettings } from './actions';
import { KopSuratConfig, DEFAULT_KOP_SURAT_CONFIG } from './types';
import { CbtOfficialKopSurat } from '@/components/cbt/CbtOfficialPrintComponents';

export default function SettingsClient(props: { initialData: any }) {
  const [formData, setFormData] = useState(props.initialData || {
    schoolName: 'SMK GaMa',
    tagline: 'Membangun Generasi Siap Kerja & Berprestasi',
    logoUrl: '',
    primaryColor: '#2563eb'
  });

  const [kopSurat, setKopSurat] = useState<KopSuratConfig>(() => {
    return {
      ...DEFAULT_KOP_SURAT_CONFIG,
      ...(props.initialData?.kopSurat || {}),
      logoLeftUrl: props.initialData?.kopSurat?.logoLeftUrl || props.initialData?.logoUrl || null,
    };
  });

  const [isSaved, setIsSaved] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(props.initialData?.logoUrl || null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = { 
      ...formData,
      kopSurat: {
        ...kopSurat,
        logoLeftUrl: kopSurat.logoLeftUrl || previewLogo || null,
      }
    };
    if (previewLogo) {
      dataToSave.logoUrl = previewLogo;
    }

    const res = await saveWebSettings(dataToSave);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewLogo(base64String);
        setFormData({ ...formData, logoUrl: file.name });
        // Automatically sync to kop surat left logo if empty
        if (!kopSurat.logoLeftUrl) {
          setKopSurat(prev => ({ ...prev, logoLeftUrl: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKopLogoLeftUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKopSurat(prev => ({ ...prev, logoLeftUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKopLogoRightUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKopSurat(prev => ({ ...prev, logoRightUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetKopToDefault = () => {
    if (confirm('Kembalikan seluruh teks & format kop surat ke data standar bawaan SMK TI GAMA 1 BEKASI?')) {
      setKopSurat(DEFAULT_KOP_SURAT_CONFIG);
    }
  };

  const syncLogoFromWeb = () => {
    if (previewLogo) {
      setKopSurat(prev => ({ ...prev, logoLeftUrl: previewLogo }));
    } else {
      alert('Belum ada logo utama website yang diunggah.');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-gray-600" /> Pengaturan Web & Identitas
            </h1>
            <p className="text-gray-500 text-sm">Sesuaikan nama sekolah, logo, dan tampilan website utama</p>
          </div>
        </div>

        {/* Banner Quick-link: Rincian Biaya PPDB */}
        <div className="mb-8 p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30 flex-shrink-0">
              <Banknote size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Kelola Rincian Biaya PPDB & Rekening</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Atur komponen biaya pendaftaran calon siswa (formulir, tes minat bakat, seragam) hingga ke ranah total otomatis.
              </p>
            </div>
          </div>
          <Link
            href="/admin/settings/biaya-ppdb"
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <span>Buka Pengaturan Biaya</span>
            <ExternalLink size={14} />
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden text-gray-900 dark:text-white">
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
            
            {/* Section: Identitas Sekolah */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Identitas Sekolah</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Sekolah</label>
                  <input 
                    type="text" 
                    value={formData.schoolName} 
                    onChange={e => setFormData({...formData, schoolName: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Contoh: SMKN 1 Probolinggo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tagline Utama</label>
                  <input 
                    type="text" 
                    value={formData.tagline} 
                    onChange={e => setFormData({...formData, tagline: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Mencetak Generasi Unggul & Berkarakter"
                  />
                </div>
              </div>
            </div>

            {/* Section: Logo Sekolah */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Logo Website</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Preview Logo */}
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <>
                      <ImageIcon className="text-gray-400 mb-2" size={32} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Belum ada logo</span>
                    </>
                  )}
                </div>

                {/* Upload Control */}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Unggah logo resmi sekolah. Logo ini akan ditampilkan di pojok kiri atas halaman utama (Navigation Bar) dan bagian Footer. Format yang didukung: PNG, JPG, SVG (Maks: 2MB).
                  </p>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <button type="button" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm">
                      <Upload size={18} /> Pilih File Logo Baru
                    </button>
                  </div>
                  {formData.logoUrl && <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">File terpilih: {formData.logoUrl}</p>}
                </div>
              </div>
            </div>

            {/* Section: Tema Tampilan Formulir PPDB (Canggih) */}
            <div>
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="text-blue-600" size={20} />
                    Tema Tampilan Formulir PPDB (Super Canggih)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Pilih desain tampilan formulir pendaftaran PPDB yang aktif untuk calon siswa
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  3 Tema Tersedia
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Opsi 1: Cyber-Cards */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ppdbTheme: 'cyber-cards' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                    (formData.ppdbTheme || 'cyber-cards') === 'cyber-cards'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">REKOMENDASI</span>
                    {(formData.ppdbTheme || 'cyber-cards') === 'cyber-cards' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">✓</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-1">
                    1. Cyber-Cards (3D Holo)
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Kartu jurusan interaktif 3D dengan logo transparan Garuda Mahadhika (DKV, MPLB, TJKT) & aura background reaktif.
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    <span>✨ Efek Paling Interaktif</span>
                  </div>
                </button>

                {/* Opsi 2: Multi-Step Stepper */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ppdbTheme: 'stepper' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                    formData.ppdbTheme === 'stepper'
                      ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-600 text-white">4 LANGKAH</span>
                    {formData.ppdbTheme === 'stepper' && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✓</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-1">
                    2. Futuristic Stepper
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Formulir bertahap 4 langkah futuristik dengan progress bar neon, header 3 hologram, dan navigasi terarah.
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    <span>📊 Progress Terstruktur</span>
                  </div>
                </button>

                {/* Opsi 3: Dark Glassmorphism */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ppdbTheme: 'dark-glass' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                    formData.ppdbTheme === 'dark-glass'
                      ? 'border-cyan-500 bg-slate-900 text-white shadow-md ring-2 ring-cyan-500/30'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500 text-black">DARK MODE</span>
                    {formData.ppdbTheme === 'dark-glass' && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-xs font-bold">✓</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-1">
                    3. Full Dark Glassmorphism
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Tema gelap siber & kaca tembus pandang yang 100% senada dengan gaya halaman Login.
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                    <span>⚡ Cyberpunk Dark Glass</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 4: Pengaturan Kop Surat & Dokumen Resmi (CBT & Rapor) */}
            <div id="kop-surat" className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Printer className="text-purple-600" size={22} />
                    Kop Surat & Identitas Dokumen Resmi (CBT & Rapor)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Sesuaikan logo, teks nama yayasan, legalitas (NSS/NPSN), akreditasi, alamat, dan pejabat penandatangan resmi untuk seluruh cetak CBT dan laporan sekolah.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetKopToDefault}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Kembalikan format ke default SMK TI GAMA 1"
                  >
                    <RefreshCw size={13} /> Reset Default
                  </button>
                </div>
              </div>

              {/* 🌟 LIVE INTERACTIVE KOP SURAT PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Eye size={14} className="text-blue-600" /> Pratinjau Langsung (Live Preview Kop Surat Cetak):
                  </span>
                  <span className="text-[11px] text-gray-400">Tampilan ini persis seperti yang akan tercetak di kertas A4</span>
                </div>
                <div className="p-6 rounded-2xl bg-white border-2 border-slate-300 shadow-md overflow-x-auto">
                  <div className="min-w-[600px]">
                    <CbtOfficialKopSurat
                      documentTitle="CONTOH DOKUMEN EVALUASI RESMI (PRATINJAU)"
                      documentNumber={`Nomor: 421.5 / CBT / ${new Date().getFullYear()} / CONTOH`}
                      subTitle="Pratinjau Hasil Konfigurasi Kop Surat Anda"
                      config={kopSurat}
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid: Logo Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
                {/* Logo Kiri (Logo Sekolah) */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    1. Logo Kiri (Lambang Sekolah)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                      {kopSurat.logoLeftUrl ? (
                        <img src={kopSurat.logoLeftUrl} alt="Logo Kiri" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-400 text-center font-bold">Vector Default</span>
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleKopLogoLeftUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs"
                        >
                          <Upload size={13} /> Unggah Logo Kiri
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={syncLogoFromWeb}
                        className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Gunakan Logo Website Utama
                      </button>
                      {kopSurat.logoLeftUrl && (
                        <button
                          type="button"
                          onClick={() => setKopSurat(prev => ({ ...prev, logoLeftUrl: null }))}
                          className="block text-[10px] text-red-500 hover:underline cursor-pointer"
                        >
                          Hapus (Kembalikan ke Vector Emblem)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo Kanan (Logo Akreditasi BAN-S/M) */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    2. Logo Kanan (Akreditasi / Sertifikasi)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                      {kopSurat.logoRightUrl ? (
                        <img src={kopSurat.logoRightUrl} alt="Logo Kanan" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center">
                          <div className="text-[8px] font-bold text-gray-500">BAN-S/M</div>
                          <div className="text-lg font-black text-blue-600 leading-tight">{kopSurat.akreditasi.charAt(0) || 'A'}</div>
                          <div className="text-[7px] text-gray-500">UNGGUL</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleKopLogoRightUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs"
                        >
                          <Upload size={13} /> Unggah Gambar Logo Kanan
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Biarkan kosong untuk menggunakan lambang Akreditasi BAN-S/M otomatis.
                      </p>
                      {kopSurat.logoRightUrl && (
                        <button
                          type="button"
                          onClick={() => setKopSurat(prev => ({ ...prev, logoRightUrl: null }))}
                          className="block text-[10px] text-red-500 hover:underline cursor-pointer"
                        >
                          Hapus (Kembalikan ke Badge BAN-S/M)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid: Teks & Identitas Sekolah */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nama Yayasan / Lembaga Induk
                  </label>
                  <input
                    type="text"
                    value={kopSurat.yayasanName}
                    onChange={(e) => setKopSurat({ ...kopSurat, yayasanName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: YAYASAN PENDIDIKAN KEJURUAN GAMA BEKASI"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nama Resmi Sekolah (Header Utama Kop)
                  </label>
                  <input
                    type="text"
                    value={kopSurat.schoolName}
                    onChange={(e) => setKopSurat({ ...kopSurat, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 dark:text-blue-300"
                    placeholder="Contoh: SMK TEKNOLOGI INFORMASI GAMA 1 BEKASI"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Daftar Kompetensi Keahlian / Konsentrasi
                  </label>
                  <input
                    type="text"
                    value={kopSurat.competencies}
                    onChange={(e) => setKopSurat({ ...kopSurat, competencies: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="KOMPETENSI KEAHLIAN: PPLG • TEKNIK JARINGAN (TJKT) • DKV • MANAJEMEN PERKANTORAN (MPLB)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor NSS
                  </label>
                  <input
                    type="text"
                    value={kopSurat.nss}
                    onChange={(e) => setKopSurat({ ...kopSurat, nss: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="322026501001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor NPSN
                  </label>
                  <input
                    type="text"
                    value={kopSurat.npsn}
                    onChange={(e) => setKopSurat({ ...kopSurat, npsn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="69752981"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Status Akreditasi & Predikat
                  </label>
                  <input
                    type="text"
                    value={kopSurat.akreditasi}
                    onChange={(e) => setKopSurat({ ...kopSurat, akreditasi: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="A (UNGGUL)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor SK Akreditasi
                  </label>
                  <input
                    type="text"
                    value={kopSurat.akreditasiSk}
                    onChange={(e) => setKopSurat({ ...kopSurat, akreditasiSk: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="No. 129/BAN-SM/2023"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Alamat Lengkap Kampus / Sekolah
                  </label>
                  <input
                    type="text"
                    value={kopSurat.address}
                    onChange={(e) => setKopSurat({ ...kopSurat, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Kampus: Jl. KH. Muchtar Tabrani No. 12, Kel. Perwira, Kec. Bekasi Utara, Kota Bekasi, Jawa Barat 17122"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor Telepon Sekolah
                  </label>
                  <input
                    type="text"
                    value={kopSurat.phone}
                    onChange={(e) => setKopSurat({ ...kopSurat, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="(021) 8898-7654"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Alamat Website Resmi
                  </label>
                  <input
                    type="text"
                    value={kopSurat.website}
                    onChange={(e) => setKopSurat({ ...kopSurat, website: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://smkgama.sch.id"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Alamat Email Resmi Sekolah
                  </label>
                  <input
                    type="email"
                    value={kopSurat.email}
                    onChange={(e) => setKopSurat({ ...kopSurat, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="info@smkgama.sch.id"
                  />
                </div>
              </div>

              {/* Form Grid: Pejabat Penandatangan Resmi */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-emerald-600" /> Pejabat Penandatangan Resmi Dokumen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={kopSurat.headmasterName}
                      onChange={(e) => setKopSurat({ ...kopSurat, headmasterName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Drs. H. M. Syarifudin, M.M."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={kopSurat.headmasterNip}
                      onChange={(e) => setKopSurat({ ...kopSurat, headmasterNip: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="19680514 199403 1 003"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Kota Kedudukan Penandatanganan
                    </label>
                    <input
                      type="text"
                      value={kopSurat.city}
                      onChange={(e) => setKopSurat({ ...kopSurat, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Kota Bekasi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Nama Koordinator / Proktor CBT
                    </label>
                    <input
                      type="text"
                      value={kopSurat.proctorName}
                      onChange={(e) => setKopSurat({ ...kopSurat, proctorName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ahmad Suhendar, M.Kom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      NIP Koordinator CBT
                    </label>
                    <input
                      type="text"
                      value={kopSurat.proctorNip}
                      onChange={(e) => setKopSurat({ ...kopSurat, proctorNip: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="19850412 201001 1 008"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              {isSaved && (
                <span className="flex items-center gap-2 text-green-600 font-medium mr-4 animate-pulse">
                  <Check size={18} /> Perubahan Disimpan!
                </span>
              )}
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shadow-blue-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Simpan Pengaturan
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
