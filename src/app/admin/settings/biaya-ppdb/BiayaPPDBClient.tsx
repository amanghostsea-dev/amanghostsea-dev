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
  Clock, 
  Receipt, 
  ArrowLeft, 
  Sparkles,
  HelpCircle,
  Eye,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { PPDBPaymentConfig, PPDBFeeItem } from '../types';
import { savePPDBPaymentConfig } from '../actions';

interface BiayaPPDBClientProps {
  initialConfig: PPDBPaymentConfig;
}

export default function BiayaPPDBClient({ initialConfig }: BiayaPPDBClientProps) {
  const [config, setConfig] = useState<PPDBPaymentConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Perhitungan ranah total secara real-time
  const computedTotal = useMemo(() => {
    return (config.feeItems || []).reduce((acc, item) => {
      const num = Number(item.amount) || 0;
      return acc + (num > 0 ? num : 0);
    }, 0);
  }, [config.feeItems]);

  // Tambah item rincian baru
  const handleAddItem = (defaultName = '', defaultAmount = 0) => {
    const newItem: PPDBFeeItem = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: defaultName || 'Komponen Biaya Baru',
      amount: defaultAmount,
    };
    setConfig(prev => ({
      ...prev,
      feeItems: [...prev.feeItems, newItem],
    }));
  };

  // Hapus item rincian
  const handleRemoveItem = (id: string) => {
    if (config.feeItems.length <= 1) {
      alert('Minimal harus ada 1 komponen rincian biaya pendaftaran.');
      return;
    }
    setConfig(prev => ({
      ...prev,
      feeItems: prev.feeItems.filter(item => item.id !== id),
    }));
  };

  // Update item rincian
  const handleUpdateItem = (id: string, field: 'name' | 'amount', value: any) => {
    setConfig(prev => ({
      ...prev,
      feeItems: prev.feeItems.map(item => {
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

  // Simpan konfigurasi ke server
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const payload: PPDBPaymentConfig = {
        ...config,
        totalAmount: computedTotal,
      };
      const res = await savePPDBPaymentConfig(payload);

      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan konfigurasi rincian biaya.');
    } finally {
      setIsSaving(false);
    }
  };

  const commonPresets = [
    { name: 'Biaya Formulir Pendaftaran Online', amount: 100000 },
    { name: 'Tes Minat Bakat & Wawancara', amount: 50000 },
    { name: 'Tes Kesehatan & Buta Warna', amount: 35000 },
    { name: 'Paket Atribut & Kartu Pelajar Digital', amount: 65000 },
    { name: 'Uang Pangkal / Registrasi Ulang', amount: 250000 },
  ];

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
            <span>Rincian Biaya PPDB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Banknote size={26} />
            </span>
            Rincian Biaya PPDB & Rekening
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola rincian nominal pembayaran pendaftaran secara mendalam hingga ke ranah total otomatis untuk siswa baru.
          </p>
        </div>

        {/* Action Button */}
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
              <p className="font-bold text-sm">Pengaturan Biaya Berhasil Disimpan!</p>
              <p className="text-xs text-emerald-700">Rincian nominal dan total biaya kini langsung aktif di formulir pendaftaran calon siswa dan struk registrasi.</p>
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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Ranah Nominal */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10 pointer-events-none">
            <Banknote size={110} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 block mb-1">
            Ranah Total Nominal
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
            Rp {computedTotal.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-blue-200/80 mt-1.5 flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-400" />
            Terhitung otomatis dari {config.feeItems.length} item rincian
          </p>
        </div>

        {/* Metric 2: Status Sistem */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Biaya PPDB</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              config.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {config.enabled ? 'AKTIF' : 'NONAKTIF'}
            </span>
          </div>
          <div className="mt-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-xs font-bold text-slate-700">
                {config.enabled ? 'Wajibkan Pembayaran (Reguler)' : 'Bebaskan Seluruh Biaya'}
              </span>
            </label>
          </div>
        </div>

        {/* Metric 3: Metode Tersedia */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Metode Pembayaran
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              <CreditCard size={13} /> {config.bankName || 'Transfer Bank'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Building2 size={13} /> Loket Kasir
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Calon siswa bebas memilih metode saat pendaftaran.</p>
        </div>

        {/* Metric 4: Proteksi Afirmasi */}
        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} className="text-emerald-600" /> Jalur Afirmasi & KIP
          </div>
          <div className="text-xl font-black text-emerald-900 font-mono">
            Rp 0 (100% Gratis)
          </div>
          <p className="text-[11px] text-emerald-700/90 mt-1">
            Sistem otomatis membebaskan biaya bagi pendaftar pemegang Kartu KIP & SKTM.
          </p>
        </div>

      </div>

      {/* Main Grid: Builder Rincian Biaya & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Item Breakdown Builder (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Title & Label */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt size={18} className="text-blue-600" />
              Identitas & Judul Pembayaran PPDB
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Judul Tagihan / Label Pembayaran
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Contoh: Biaya Pendaftaran & Seleksi Masuk (Jalur Reguler)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Judul ini akan tampil di bagian atas formulir pembayaran dan kop tanda bukti siswa.
              </span>
            </div>
          </div>

          {/* Section: Itemized Table Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Banknote size={18} className="text-blue-600" />
                  Rincian Item Pembayaran
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

            {/* Preset Buttons */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Pilih Cepat Komponen Umum:
              </span>
              <div className="flex flex-wrap gap-2">
                {commonPresets.map((preset, idx) => (
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
              {config.feeItems.map((item, index) => (
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
                  Total Tagihan Pembayaran:
                </span>
                <span className="text-xs text-slate-400">
                  (Dihitung otomatis dari akumulasi {config.feeItems.length} rincian di atas)
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
                  Rp {computedTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

          </div>

          {/* Section: Rekening Bank & Kasir Loket */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard size={18} className="text-blue-600" />
              Pengaturan Transfer Bank & Kasir Loket
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

            {/* Catatan / Keterangan */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Tambahan untuk Pendaftar (Tampil di Nota / Modal Pembayaran)
              </label>
              <textarea
                value={config.notes}
                onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                rows={2}
                placeholder="Contoh: Biaya berlaku khusus pendaftar Jalur Reguler. Jalur Afirmasi 100% Bebas Biaya Formulir."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

          </div>

        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="sticky top-6 space-y-6">
            
            {/* Live Preview Header */}
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
              <p className="text-xs text-slate-400 leading-relaxed">
                Beginilah tampilan rincian biaya yang akan dilihat oleh calon pendaftar di modal pembayaran pendaftaran & kartu bukti cetak.
              </p>

              {/* Preview Card Body: Mirip Modal PPDB Siswa */}
              <div className="bg-slate-950 rounded-2xl border border-white/10 p-5 space-y-4 text-xs">
                
                {/* Header Preview */}
                <div className="border-b border-white/10 pb-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                    {config.title || 'Rincian Biaya Pendaftaran'}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-white">Total Tagihan Siswa</span>
                    <span className="text-xl font-black font-mono text-cyan-400">
                      Rp {computedTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Table of fee items */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex justify-between">
                    <span>Komponen Biaya</span>
                    <span>Nominal</span>
                  </div>
                  {config.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-none">
                      <span className="text-slate-300 truncate max-w-[200px]">{item.name}</span>
                      <span className="font-mono font-bold text-white">
                        Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between font-bold text-xs text-cyan-300">
                    <span>Total Nominal</span>
                    <span className="font-mono text-sm">Rp {computedTotal.toLocaleString('id-ID')}</span>
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

                {/* Cash Info Preview */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                  <div className="text-emerald-300 font-bold">Loket Kasir Tunai:</div>
                  <div className="text-[11px] text-slate-300">{config.cashLocation || '-'}</div>
                  <div className="text-[10px] text-slate-400">{config.cashHours || '-'}</div>
                </div>

                {/* Notes Preview */}
                {config.notes && (
                  <div className="text-[11px] text-slate-400 italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                    &ldquo;{config.notes}&rdquo;
                  </div>
                )}

              </div>

              {/* Bottom Info */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                <HelpCircle size={14} className="text-blue-400 flex-shrink-0" />
                <span>Admin dapat mengubah rincian biaya kapan saja tanpa memengaruhi pendaftar yang sudah lunas sebelumnya.</span>
              </div>

            </div>

            {/* Quick Save Card */}
            <div className="p-5 bg-blue-50 rounded-3xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Siap Menerapkan?</span>
                <span className="text-xs text-blue-700">Perubahan langsung aktif seketika setelah disimpan.</span>
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
