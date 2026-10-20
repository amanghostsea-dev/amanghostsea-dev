'use client';

import { useState, useMemo } from 'react';
import { 
  Banknote, 
  CreditCard, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Receipt, 
  ArrowLeft, 
  Sparkles, 
  HelpCircle, 
  Eye, 
  ShieldCheck, 
  RefreshCw,
  Award,
  Users,
  HeartHandshake,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import { 
  PPDBPaymentConfig, 
  PPDBFeeItem, 
  PPDBTrackFeeConfig,
  DEFAULT_TRACK_REGULER,
  DEFAULT_TRACK_AFIRMASI,
  DEFAULT_TRACK_PRESTASI
} from '../types';
import { savePPDBPaymentConfig } from '../actions';

interface BiayaPPDBClientProps {
  initialConfig: PPDBPaymentConfig;
}

type ActiveTrackKey = 'reguler' | 'afirmasi' | 'prestasi';

export default function BiayaPPDBClient({ initialConfig }: BiayaPPDBClientProps) {
  // Ensure all 3 tracks are initialized
  const [config, setConfig] = useState<PPDBPaymentConfig>(() => ({
    ...initialConfig,
    reguler: initialConfig.reguler || DEFAULT_TRACK_REGULER,
    afirmasi: initialConfig.afirmasi || DEFAULT_TRACK_AFIRMASI,
    prestasi: initialConfig.prestasi || DEFAULT_TRACK_PRESTASI,
  }));

  const [activeTrack, setActiveTrack] = useState<ActiveTrackKey>('reguler');
  const [previewTrack, setPreviewTrack] = useState<ActiveTrackKey>('reguler');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Perhitungan total per jalur
  const regulerTotal = useMemo(() => {
    return (config.reguler?.feeItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [config.reguler?.feeItems]);

  const afirmasiTotal = useMemo(() => {
    return (config.afirmasi?.feeItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [config.afirmasi?.feeItems]);

  const prestasiTotal = useMemo(() => {
    return (config.prestasi?.feeItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [config.prestasi?.feeItems]);

  // Current active track config & total
  const currentTrackConfig: PPDBTrackFeeConfig = config[activeTrack] || {
    enabled: true,
    title: '',
    notes: '',
    feeItems: [],
    totalAmount: 0,
  };

  const currentTrackTotal = activeTrack === 'reguler' ? regulerTotal : activeTrack === 'afirmasi' ? afirmasiTotal : prestasiTotal;

  // Preset rekomendasi per jalur
  const trackPresets: Record<ActiveTrackKey, { name: string; amount: number }[]> = {
    reguler: [
      { name: 'Biaya Formulir Pendaftaran Online', amount: 100000 },
      { name: 'Tes Minat Bakat & Wawancara', amount: 50000 },
      { name: 'Tes Kesehatan & Bebas Narkoba/Buta Warna', amount: 35000 },
      { name: 'Paket Atribut & Kartu Pelajar Digital', amount: 65000 },
      { name: 'Uang Pangkal / Registrasi Ulang', amount: 250000 },
    ],
    afirmasi: [
      { name: 'Biaya Administrasi Berkas KIP/SKTM', amount: 25000 },
      { name: 'Tes Minat Bakat Bersubsidi (Afirmasi)', amount: 25000 },
      { name: 'Biaya Verifikasi Lapangan & Survei Rumah', amount: 30000 },
      { name: 'Penyusunan Berkas Bantuan Pendidikan', amount: 20000 },
      { name: 'Bebaskan Biaya (Rp 0)', amount: 0 },
    ],
    prestasi: [
      { name: 'Biaya Formulir & Uji Portofolio Prestasi', amount: 50000 },
      { name: 'Tes Wawancara & Uji Bakat Jalur Prestasi', amount: 25000 },
      { name: 'Verifikasi Keabsahan Piagam / Sertifikat Juara', amount: 25000 },
      { name: 'Subsidi Seleksi Prestasi Unggulan', amount: 50000 },
    ],
  };

  // Helper untuk update track aktif
  const updateActiveTrack = (updater: (prevTrack: PPDBTrackFeeConfig) => PPDBTrackFeeConfig) => {
    setConfig(prev => ({
      ...prev,
      [activeTrack]: updater(prev[activeTrack] || DEFAULT_TRACK_REGULER),
    }));
  };

  // Tambah item rincian pada track aktif
  const handleAddItem = (defaultName = '', defaultAmount = 0) => {
    const newItem: PPDBFeeItem = {
      id: `fee-${activeTrack}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: defaultName || 'Komponen Biaya Baru',
      amount: defaultAmount,
    };
    updateActiveTrack(prev => ({
      ...prev,
      feeItems: [...(prev.feeItems || []), newItem],
    }));
  };

  // Hapus item rincian
  const handleRemoveItem = (id: string) => {
    updateActiveTrack(prev => ({
      ...prev,
      feeItems: (prev.feeItems || []).filter(item => item.id !== id),
    }));
  };

  // Update field pada item
  const handleUpdateItem = (id: string, field: 'name' | 'amount', value: any) => {
    updateActiveTrack(prev => ({
      ...prev,
      feeItems: (prev.feeItems || []).map(item => {
        if (item.id === id) {
          if (field === 'amount') {
            const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
            return { ...item, amount: isNaN(parsed) ? 0 : parsed };
          }
          return { ...item, [field]: value };
        }
        return item;
      }),
    }));
  };

  // Simpan seluruh konfigurasi ke server
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const payload: PPDBPaymentConfig = {
        ...config,
        reguler: {
          ...config.reguler,
          totalAmount: regulerTotal,
        },
        afirmasi: {
          ...config.afirmasi,
          totalAmount: afirmasiTotal,
        },
        prestasi: {
          ...config.prestasi,
          totalAmount: prestasiTotal,
        },
        // Backward-compat fallback
        title: config.reguler?.title || DEFAULT_TRACK_REGULER.title,
        notes: config.reguler?.notes || DEFAULT_TRACK_REGULER.notes,
        feeItems: config.reguler?.feeItems || DEFAULT_TRACK_REGULER.feeItems,
        totalAmount: regulerTotal,
      };

      const res = await savePPDBPaymentConfig(payload);

      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan konfigurasi rincian biaya PPDB.');
    } finally {
      setIsSaving(false);
    }
  };

  // Data preview yang sedang disorot
  const previewConfig = config[previewTrack] || DEFAULT_TRACK_REGULER;
  const previewTotal = previewTrack === 'reguler' ? regulerTotal : previewTrack === 'afirmasi' ? afirmasiTotal : prestasiTotal;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-800">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1.5 uppercase tracking-wider">
            <Link href="/admin" className="hover:underline text-slate-500">Admin</Link>
            <span>/</span>
            <Link href="/admin/settings" className="hover:underline text-slate-500">Pengaturan</Link>
            <span>/</span>
            <span>Rincian Biaya PPDB Multi-Jalur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Banknote size={26} />
            </span>
            Rincian Biaya PPDB & Rekening Pembayaran
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola rincian nominal pembayaran pendaftaran untuk semua jalur seleksi (<strong>Reguler</strong>, <strong>Afirmasi/KIP</strong>, dan <strong>Prestasi/Beasiswa</strong>) sesuai kebijakan sekolah hingga ke ranah total otomatis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ppdb"
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft size={16} /> Ke Modul PPDB
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Menyimpan...
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-300" /> Tersimpan!
              </>
            ) : (
              <>
                <Save size={16} /> Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Pengaturan Biaya Multi-Jalur Berhasil Disimpan!</p>
              <p className="text-xs text-emerald-700">Rincian biaya untuk Jalur Reguler, Afirmasi, dan Prestasi kini aktif secara real-time pada formulir pendaftaran, struk registrasi, dan portal status siswa.</p>
            </div>
          </div>
          <button onClick={() => setSavedSuccess(false)} className="text-xs text-emerald-700 hover:underline">Tutup</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm">Gagal Menyimpan:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Jalur Reguler */}
        <div 
          onClick={() => { setActiveTrack('reguler'); setPreviewTrack('reguler'); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTrack === 'reguler' 
              ? 'bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl ring-2 ring-blue-500' 
              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              activeTrack === 'reguler' ? 'text-blue-300' : 'text-blue-600'
            }`}>
              <Users size={14} /> Jalur Reguler
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              {config.reguler?.feeItems?.length || 0} Item
            </span>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${activeTrack === 'reguler' ? 'text-white' : 'text-slate-900'}`}>
            Rp {regulerTotal.toLocaleString('id-ID')}
          </div>
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${activeTrack === 'reguler' ? 'text-blue-200/80' : 'text-slate-500'}`}>
            <Sparkles size={12} className="text-yellow-400" />
            {config.reguler?.enabled !== false ? 'Wajib Dibayar' : 'Bebas Biaya'}
          </p>
        </div>

        {/* Metric 2: Jalur Afirmasi (KIP / SKTM) */}
        <div 
          onClick={() => { setActiveTrack('afirmasi'); setPreviewTrack('afirmasi'); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTrack === 'afirmasi' 
              ? 'bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900 text-white shadow-xl ring-2 ring-teal-500' 
              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              activeTrack === 'afirmasi' ? 'text-teal-300' : 'text-teal-600'
            }`}>
              <ShieldCheck size={14} /> Jalur Afirmasi (KIP)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
              {config.afirmasi?.feeItems?.length || 0} Item
            </span>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${activeTrack === 'afirmasi' ? 'text-white' : 'text-slate-900'}`}>
            Rp {afirmasiTotal.toLocaleString('id-ID')}
          </div>
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${activeTrack === 'afirmasi' ? 'text-teal-200/80' : 'text-slate-500'}`}>
            <HeartHandshake size={12} className="text-teal-400" />
            Tarif khusus kebijakan sekolah
          </p>
        </div>

        {/* Metric 3: Jalur Prestasi / Beasiswa */}
        <div 
          onClick={() => { setActiveTrack('prestasi'); setPreviewTrack('prestasi'); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTrack === 'prestasi' 
              ? 'bg-gradient-to-br from-amber-900 via-purple-950 to-slate-900 text-white shadow-xl ring-2 ring-amber-500' 
              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              activeTrack === 'prestasi' ? 'text-amber-300' : 'text-amber-600'
            }`}>
              <Award size={14} /> Jalur Prestasi
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {config.prestasi?.feeItems?.length || 0} Item
            </span>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${activeTrack === 'prestasi' ? 'text-white' : 'text-slate-900'}`}>
            Rp {prestasiTotal.toLocaleString('id-ID')}
          </div>
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${activeTrack === 'prestasi' ? 'text-amber-200/80' : 'text-slate-500'}`}>
            <Sparkles size={12} className="text-amber-400" />
            Tarif uji bakat & portofolio
          </p>
        </div>

        {/* Metric 4: Rekening & Loket */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pusat Penerimaan Kas
            </span>
            <div className="text-sm font-bold text-slate-800 mt-1">
              {config.bankName || 'Bank BRI'} &amp; Kasir Loket
            </div>
          </div>
          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span>Status Sistem:</span>
            <span className={`font-bold ${config.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {config.enabled ? 'Pembayaran ON' : 'Pembayaran OFF'}
            </span>
          </div>
        </div>

      </div>

      {/* Track Selection Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-slate-200/70 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTrack('reguler'); setPreviewTrack('reguler'); }}
            className={`px-5 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTrack === 'reguler'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/80 hover:bg-white text-slate-700'
            }`}
          >
            <Users size={16} />
            <span>Jalur Reguler</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTrack === 'reguler' ? 'bg-blue-800 text-blue-200' : 'bg-slate-200 text-slate-700'
            }`}>
              Rp {regulerTotal.toLocaleString('id-ID')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTrack('afirmasi'); setPreviewTrack('afirmasi'); }}
            className={`px-5 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTrack === 'afirmasi'
                ? 'bg-teal-700 text-white shadow-md shadow-teal-600/20'
                : 'bg-white/80 hover:bg-white text-slate-700'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Jalur Afirmasi (KIP / SKTM)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTrack === 'afirmasi' ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-700'
            }`}>
              Rp {afirmasiTotal.toLocaleString('id-ID')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTrack('prestasi'); setPreviewTrack('prestasi'); }}
            className={`px-5 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTrack === 'prestasi'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white/80 hover:bg-white text-slate-700'
            }`}
          >
            <Award size={16} />
            <span>Jalur Prestasi / Beasiswa</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTrack === 'prestasi' ? 'bg-amber-800 text-amber-200' : 'bg-slate-200 text-slate-700'
            }`}>
              Rp {prestasiTotal.toLocaleString('id-ID')}
            </span>
          </button>
        </div>

        <div className="px-3 text-right">
          <span className="text-[11px] font-bold text-slate-500">
            Sedang Mengedit: <strong className="text-slate-900 uppercase">{activeTrack}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Builder Rincian Biaya & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Item Breakdown Builder (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Track Identity & Status */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                Identitas Pembayaran &amp; Kebijakan {activeTrack === 'reguler' ? 'Jalur Reguler' : activeTrack === 'afirmasi' ? 'Jalur Afirmasi' : 'Jalur Prestasi'}
              </h2>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTrackConfig.enabled !== false}
                  onChange={(e) => updateActiveTrack(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {currentTrackConfig.enabled !== false ? 'Wajib Bayar' : 'Bebas Biaya (Rp 0)'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Judul Tagihan / Label Pembayaran ({activeTrack.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentTrackConfig.title}
                onChange={(e) => updateActiveTrack(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Contoh: Biaya Pendaftaran & Seleksi Masuk"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Judul ini akan tampil di bagian atas formulir pembayaran dan tanda bukti pendaftar jalur ini.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Keterangan / Kebijakan Khusus Jalur Ini
              </label>
              <textarea
                value={currentTrackConfig.notes || ''}
                onChange={(e) => updateActiveTrack(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Contoh: Biaya pendaftaran disubsidi sekolah khusus pemegang kartu KIP/SKTM."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Section: Itemized Table Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Banknote size={18} className="text-blue-600" />
                  Rincian Komponen Biaya ({activeTrack.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tulis nama rincian dan nominalnya. Total keseluruhan akan terkalkulasi otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} /> Tambah Item
              </button>
            </div>

            {/* Preset Buttons for Active Track */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Pilih Cepat Rekomendasi Jalur {activeTrack.toUpperCase()}:
              </span>
              <div className="flex flex-wrap gap-2">
                {trackPresets[activeTrack].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddItem(preset.name, preset.amount)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> {preset.name} (Rp {preset.amount.toLocaleString('id-ID')})
                  </button>
                ))}
              </div>
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {currentTrackConfig.feeItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-blue-300 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-3 group"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Nama komponen pembayaran..."
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:w-56">
                    <span className="text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleUpdateItem(item.id, 'amount', e.target.value)}
                      placeholder="0"
                      min={0}
                      step={5000}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm font-black font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Hapus komponen ini"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Row Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider block">
                  Total Tagihan {activeTrack.toUpperCase()}:
                </span>
                <span className="text-xs text-slate-400">
                  (Dihitung otomatis dari akumulasi {currentTrackConfig.feeItems.length} rincian di atas)
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
                  Rp {currentTrackTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

          </div>

          {/* Section: Rekening Bank & Kasir Loket (Berlaku Global untuk semua jalur) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard size={18} className="text-blue-600" />
              Rekening Bank &amp; Kasir Loket (Penerimaan Global)
            </h2>

            {/* Transfer Bank */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
                <CreditCard size={15} /> 1. Rekening Tujuan Transfer / QRIS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={config.bankName}
                    onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                    placeholder="Contoh: Bank BRI / Bank BCA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={config.bankAccount}
                    onChange={(e) => setConfig({ ...config, bankAccount: e.target.value })}
                    placeholder="Contoh: 0123-01-001234-56-7"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama (A.N)</label>
                  <input
                    type="text"
                    value={config.bankHolder}
                    onChange={(e) => setConfig({ ...config, bankHolder: e.target.value })}
                    placeholder="Contoh: SMK GARUDA MAHADHIKA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Loket Tunai */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <Building2 size={15} /> 2. Loket Kasir Pembayaran Tunai
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Loket Kasir</label>
                  <input
                    type="text"
                    value={config.cashLocation}
                    onChange={(e) => setConfig({ ...config, cashLocation: e.target.value })}
                    placeholder="Ruang Panitia PPDB / Loket Kasir Gedung Utama"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Operasional Layanan</label>
                  <input
                    type="text"
                    value={config.cashHours}
                    onChange={(e) => setConfig({ ...config, cashHours: e.target.value })}
                    placeholder="Senin s/d Sabtu, pukul 08.00 - 14.00 WIB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* QRIS Section */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-800 uppercase tracking-wider">
                  <QrCode size={15} /> 3. Pembayaran QRIS (Quick Response Code)
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.qrisEnabled !== false}
                    onChange={(e) => setConfig({ ...config, qrisEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    {config.qrisEnabled !== false ? 'QRIS Aktif' : 'QRIS Nonaktif'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Merchant / Akun QRIS</label>
                  <input
                    type="text"
                    value={config.qrisMerchantName || ''}
                    onChange={(e) => setConfig({ ...config, qrisMerchantName: e.target.value })}
                    placeholder="Contoh: SMK GARUDA MAHADHIKA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NMID / ID Merchant (Opsional)</label>
                  <input
                    type="text"
                    value={config.qrisNmid || ''}
                    onChange={(e) => setConfig({ ...config, qrisNmid: e.target.value })}
                    placeholder="Contoh: ID1020000000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL / Link Gambar Barcode QRIS Sekolah (Bisa Di-scan Siswa)
                </label>
                <input
                  type="text"
                  value={config.qrisImageUrl || ''}
                  onChange={(e) => setConfig({ ...config, qrisImageUrl: e.target.value })}
                  placeholder="Contoh: /images/qris.png atau https://link-gambar-qris.png"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Jika dikosongkan, sistem menyediakan tampilan barcode QRIS digital interaktif lengkap dengan logo QRIS nasional.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="sticky top-6 space-y-6">
            
            {/* Live Preview Container */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-cyan-400" />
                  <span className="font-extrabold text-sm tracking-wide">Pratinjau Siswa (Live Preview)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME SYNC
                </span>
              </div>

              {/* Preview Track Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTrack('reguler')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    previewTrack === 'reguler' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Reguler
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTrack('afirmasi')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    previewTrack === 'afirmasi' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Afirmasi
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTrack('prestasi')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    previewTrack === 'prestasi' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Prestasi
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Tampilan modal tagihan saat pendaftar <strong>Jalur {previewTrack.toUpperCase()}</strong> menekan tombol &ldquo;Lanjutkan Pembayaran&rdquo;.
              </p>

              {/* Preview Card Body: Mirip Modal PPDB Siswa */}
              <div className="bg-slate-950 rounded-2xl border border-white/10 p-5 space-y-4 text-xs">
                
                {/* Header Preview */}
                <div className="border-b border-white/10 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      {previewConfig.title || `Tagihan Jalur ${previewTrack.toUpperCase()}`}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      previewTrack === 'reguler' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      previewTrack === 'afirmasi' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      JALUR {previewTrack.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-white">Total Tagihan Masuk</span>
                    <span className="text-xl font-black font-mono text-cyan-400">
                      Rp {previewTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Table of fee items */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex justify-between">
                    <span>Komponen Rincian</span>
                    <span>Nominal</span>
                  </div>
                  {previewConfig.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-none">
                      <span className="text-slate-300 truncate max-w-[200px]">{item.name}</span>
                      <span className="font-mono font-bold text-white">
                        Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between font-bold text-xs text-cyan-300">
                    <span>Total Nominal Tagihan</span>
                    <span className="font-mono text-sm">Rp {previewTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Transfer Info Preview */}
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 font-bold">{config.bankName || 'Bank BRI'}:</span>
                    <span className="font-mono font-bold text-white">{config.bankAccount || '-'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">A.N. {config.bankHolder || '-'}</div>
                </div>

                {/* QRIS Info Preview */}
                {config.qrisEnabled !== false && (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300 font-bold flex items-center gap-1.5">
                        <QrCode size={14} /> QRIS Nasional:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        Scan &amp; Pay
                      </span>
                    </div>
                    <div className="text-[11px] text-white font-semibold">
                      {config.qrisMerchantName || 'SMK GARUDA MAHADHIKA'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay
                    </div>
                  </div>
                )}

                {/* Cash Info Preview */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                  <div className="text-emerald-300 font-bold">Loket Kasir Tunai:</div>
                  <div className="text-[11px] text-slate-300">{config.cashLocation || '-'}</div>
                  <div className="text-[10px] text-slate-400">{config.cashHours || '-'}</div>
                </div>

                {/* Notes Preview */}
                {previewConfig.notes && (
                  <div className="text-[11px] text-slate-400 italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                    &ldquo;{previewConfig.notes}&rdquo;
                  </div>
                )}

              </div>

              {/* Bottom Info */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                <HelpCircle size={14} className="text-blue-400 flex-shrink-0" />
                <span>Admin dapat mengubah rincian biaya kapan saja tanpa memengaruhi pendaftar yang sudah diverifikasi lunas sebelumnya.</span>
              </div>

            </div>

            {/* Quick Save Card */}
            <div className="p-5 bg-blue-50 rounded-3xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Siap Menerapkan Kebijakan?</span>
                <span className="text-xs text-blue-700">Perubahan tarif ketiga jalur langsung aktif seketika setelah disimpan.</span>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Sekarang'}
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
