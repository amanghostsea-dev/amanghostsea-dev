'use client'

import { useState } from 'react';
import type { PpdbApplicant } from '@prisma/client';
import { 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Banknote, 
  Eye, 
  AlertCircle, 
  X, 
  Check, 
  Loader2, 
  ShieldCheck, 
  ExternalLink, 
  Download
} from 'lucide-react';
import { updateSubmissionStatus, verifyPayment } from './actions';

function parseDocumentUrls(docStr: string | null | undefined): string[] {
  if (!docStr) return [];
  try {
    const trimmed = docStr.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch {}
  if (docStr.includes(',')) {
    return docStr.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [docStr.trim()].filter(Boolean);
}

export default function PPDBClient({ initialSubmissions }: { initialSubmissions: PpdbApplicant[] }) {
  const [submissions, setSubmissions] = useState<PpdbApplicant[]>(initialSubmissions || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING_TRANSFER' | 'PENDING_CASH' | 'PAID' | 'UNPAID'>('ALL');

  // Modal Verifikasi Pembayaran
  const [selectedPaymentApplicant, setSelectedPaymentApplicant] = useState<PpdbApplicant | null>(null);
  const [verifyingNotes, setVerifyingNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Modal Pratinjau Dokumen Berkas (Document Preview Modal)
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    url: string;
    studentName: string;
    nisn: string;
    studentId?: string;
    studentStatus?: string;
  } | null>(null);

  const [previewDocType, setPreviewDocType] = useState<'image' | 'pdf' | 'loading'>('loading');

  // Detect document type when previewDocument changes
  const openDocumentPreview = (doc: typeof previewDocument) => {
    if (!doc) {
      setPreviewDocument(null);
      return;
    }

    setPreviewDocument(doc);

    const lowerUrl = doc.url.toLowerCase();
    if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?')) {
      setPreviewDocType('pdf');
      return;
    }
    if (/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(lowerUrl)) {
      setPreviewDocType('image');
      return;
    }

    // For URLs like /api/files/[id], detect Content-Type via HEAD request
    setPreviewDocType('loading');
    fetch(doc.url, { method: 'HEAD' })
      .then(res => {
        const ct = res.headers.get('content-type') || '';
        setPreviewDocType(ct.includes('pdf') ? 'pdf' : 'image');
      })
      .catch(() => setPreviewDocType('image'));
  };

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await updateSubmissionStatus(id, status);
      if (res?.success && res.applicant) {
        setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerifyPayment = async (status: 'PAID' | 'REJECTED') => {
    if (!selectedPaymentApplicant) return;
    setIsVerifying(true);
    try {
      const res = await verifyPayment(selectedPaymentApplicant.id, status, verifyingNotes);
      if (res?.success && res.applicant) {
        setSubmissions(submissions.map(s => s.id === selectedPaymentApplicant.id ? { ...s, ...res.applicant } : s));
        setSelectedPaymentApplicant(null);
        setVerifyingNotes('');
      } else {
        alert(res?.error || 'Gagal memverifikasi pembayaran.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter Data
  const filteredSubmissions = submissions.filter((s: PpdbApplicant) => {
    const matchesSearch = 
      s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.major?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (paymentFilter === 'ALL') return true;
    if (paymentFilter === 'PENDING_TRANSFER') return s.paymentStatus === 'PENDING_TRANSFER';
    if (paymentFilter === 'PENDING_CASH') return s.paymentStatus === 'PENDING_CASH';
    if (paymentFilter === 'PAID') return s.paymentStatus === 'PAID';
    if (paymentFilter === 'UNPAID') return s.paymentStatus === 'UNPAID' || !s.paymentStatus;
    return true;
  });

  // Statistik
  const totalCount = submissions.length;
  const pendingTransferCount = submissions.filter((s: PpdbApplicant) => s.paymentStatus === 'PENDING_TRANSFER').length;
  const pendingCashCount = submissions.filter((s: PpdbApplicant) => s.paymentStatus === 'PENDING_CASH').length;
  const paidCount = submissions.filter((s: PpdbApplicant) => s.paymentStatus === 'PAID').length;

  return (
    <div className="p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Manajemen & Verifikasi PPDB
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Kelola data pendaftar dan verifikasi pembayaran formulir secara akurat (Transfer & Tunai).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center shadow-sm w-full md:w-72">
              <Search className="text-gray-400 mr-2 flex-shrink-0" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NISN, jurusan..." 
                className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 w-full" 
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pendaftar</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{totalCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cek Bukti Transfer</p>
              <h3 className="text-2xl font-black text-amber-600">{pendingTransferCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Banknote size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kasir Tunai Loket</p>
              <h3 className="text-2xl font-black text-teal-600">{pendingCashCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lunas (PAID)</p>
              <h3 className="text-2xl font-black text-emerald-600">{paidCount}</h3>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 custom-scrollbar text-xs font-bold">
          <button
            onClick={() => setPaymentFilter('ALL')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              paymentFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Semua ({submissions.length})
          </button>
          <button
            onClick={() => setPaymentFilter('PENDING_TRANSFER')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              paymentFilter === 'PENDING_TRANSFER'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 border border-amber-200 dark:border-amber-900/40'
            }`}
          >
            <CreditCard size={14} />
            Perlu Cek Bukti Transfer ({pendingTransferCount})
          </button>
          <button
            onClick={() => setPaymentFilter('PENDING_CASH')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              paymentFilter === 'PENDING_CASH'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 border border-teal-200 dark:border-teal-900/40'
            }`}
          >
            <Banknote size={14} />
            Menunggu Bayar di Loket ({pendingCashCount})
          </button>
          <button
            onClick={() => setPaymentFilter('PAID')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              paymentFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 border border-emerald-200 dark:border-emerald-900/40'
            }`}
          >
            <CheckCircle size={14} />
            Lunas / Terverifikasi ({paidCount})
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">ID Daftar</th>
                  <th className="py-4 px-6">Nama & NISN</th>
                  <th className="py-4 px-6">Jalur & Jurusan</th>
                  <th className="py-4 px-6">Berkas Dokumen</th>
                  <th className="py-4 px-6">Pembayaran</th>
                  <th className="py-4 px-6">Status PPDB</th>
                  <th className="py-4 px-6 text-right">Aksi Seleksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">Belum ada data pendaftar yang cocok.</td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub: PpdbApplicant) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          PPDB-{sub.id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-900 dark:text-white">{sub.fullName}</p>
                        <p className="text-xs text-gray-500 font-mono">NISN: {sub.nisn}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {sub.jalur}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{sub.major}</p>
                        {sub.jalur === 'afirmasi' && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.kipNumber && (
                              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 font-mono font-semibold">
                                KIP: {sub.kipNumber}
                              </span>
                            )}
                            {sub.afirmasiNumber && (
                              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 font-mono font-semibold">
                                SKTM: {sub.afirmasiNumber}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {sub.documentKk ? (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview({
                                title: 'Kartu Keluarga (KK)',
                                url: sub.documentKk!,
                                studentName: sub.fullName,
                                nisn: sub.nisn,
                                studentId: sub.id,
                                studentStatus: sub.status,
                              })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-xs active:scale-95 group"
                              title="Lihat Pratinjau Kartu Keluarga"
                            >
                              <Eye size={12} className="group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400" />
                              <span>KK</span>
                            </button>
                          ) : null}

                          {sub.documentKip ? (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview({
                                title: sub.kipNumber 
                                  ? `Kartu Indonesia Pintar (KIP) - No: ${sub.kipNumber}`
                                  : 'Berkas Kartu Indonesia Pintar (KIP)',
                                url: sub.documentKip!,
                                studentName: sub.fullName,
                                nisn: sub.nisn,
                                studentId: sub.id,
                                studentStatus: sub.status,
                              })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer shadow-xs active:scale-95 group"
                              title={sub.kipNumber ? `KIP No: ${sub.kipNumber}` : 'Lihat Pratinjau KIP'}
                            >
                              <Eye size={12} className="group-hover:scale-110 transition-transform text-teal-600 dark:text-teal-400" />
                              <span>KIP</span>
                            </button>
                          ) : null}

                          {sub.documentAfirmasi ? (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview({
                                title: sub.afirmasiNumber 
                                  ? `Surat Keterangan Tidak Mampu (SKTM) - No: ${sub.afirmasiNumber}`
                                  : 'Surat Keterangan Tidak Mampu (SKTM) / Kartu Bantuan',
                                url: sub.documentAfirmasi!,
                                studentName: sub.fullName,
                                nisn: sub.nisn,
                                studentId: sub.id,
                                studentStatus: sub.status,
                              })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 transition-all cursor-pointer shadow-xs active:scale-95 group"
                              title="Lihat Pratinjau SKTM / Bantuan"
                            >
                              <Eye size={12} className="group-hover:scale-110 transition-transform text-green-600 dark:text-green-400" />
                              <span>SKTM</span>
                            </button>
                          ) : null}

                          {sub.documentPrestasi && (() => {
                            const urls = parseDocumentUrls(sub.documentPrestasi);
                            if (urls.length === 0) return null;
                            if (urls.length === 1) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openDocumentPreview({
                                    title: 'Sertifikat / Berkas Prestasi',
                                    url: urls[0],
                                    studentName: sub.fullName,
                                    nisn: sub.nisn,
                                    studentId: sub.id,
                                    studentStatus: sub.status,
                                  })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-xs active:scale-95 group"
                                  title="Lihat Pratinjau Berkas Prestasi"
                                >
                                  <Eye size={12} className="group-hover:scale-110 transition-transform text-purple-600 dark:text-purple-400" />
                                  <span>Prestasi</span>
                                </button>
                              );
                            }
                            return urls.map((url: string, idx: number) => (
                              <button
                                key={url + idx}
                                type="button"
                                onClick={() => openDocumentPreview({
                                  title: `Sertifikat / Berkas Prestasi #${idx + 1}`,
                                  url,
                                  studentName: sub.fullName,
                                  nisn: sub.nisn,
                                  studentId: sub.id,
                                  studentStatus: sub.status,
                                })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-xs active:scale-95 group"
                                title={`Lihat Pratinjau Berkas Prestasi #${idx + 1}`}
                              >
                                <Eye size={12} className="group-hover:scale-110 transition-transform text-purple-600 dark:text-purple-400" />
                                <span>Prestasi {idx + 1}</span>
                              </button>
                            ));
                          })()}

                          {!sub.documentKk && !sub.documentAfirmasi && !sub.documentKip && (!sub.documentPrestasi || parseDocumentUrls(sub.documentPrestasi).length === 0) && (
                            <span className="text-xs text-gray-400 italic">
                              {sub.jalur === 'normal' ? 'Jalur Reguler (Tanpa Berkas)' : 'Tidak ada berkas'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Pembayaran & Tombol Verifikasi Canggih */}
                      <td className="py-4 px-6">
                        {sub.paymentStatus === 'PAID' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle size={12} /> LUNAS
                            </span>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {sub.paymentMethod === 'CASH' ? 'Tunai di Loket' : 'Transfer Bank'}
                              {sub.verifiedBy && ` • Verif: ${sub.verifiedBy}`}
                            </div>
                          </div>
                        ) : sub.paymentStatus === 'PENDING_TRANSFER' ? (
                          <div>
                            <button
                              onClick={() => {
                                setSelectedPaymentApplicant(sub);
                                setVerifyingNotes('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <CreditCard size={14} />
                              <span>Cek Bukti & Verif</span>
                            </button>
                            <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                              Bukti diunggah
                            </span>
                          </div>
                        ) : sub.paymentStatus === 'PENDING_CASH' ? (
                          <div>
                            <button
                              onClick={() => {
                                setSelectedPaymentApplicant(sub);
                                setVerifyingNotes('Kwitansi No: KW-');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <Banknote size={14} />
                              <span>Terima Kasir Loket</span>
                            </button>
                            <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-mono font-semibold mt-1">
                              CASH-{sub.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Belum Bayar
                          </span>
                        )}
                      </td>

                      {/* Status PPDB */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-bold ${
                          sub.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 
                          sub.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {sub.status === 'APPROVED' ? 'Diterima' : sub.status === 'REJECTED' ? 'Ditolak' : 'Proses Seleksi'}
                        </span>
                      </td>

                      {/* Aksi Seleksi */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          {sub.status === 'PENDING' ? (
                            <>
                              <button 
                                onClick={() => handleStatusChange(sub.id, 'APPROVED')} 
                                disabled={loadingId === sub.id} 
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold disabled:opacity-50 transition-all cursor-pointer"
                              >
                                {loadingId === sub.id ? '...' : 'Terima'}
                              </button>
                              <button 
                                onClick={() => handleStatusChange(sub.id, 'REJECTED')} 
                                disabled={loadingId === sub.id} 
                                className="text-xs bg-red-600 hover:bg-red-700 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold disabled:opacity-50 transition-all cursor-pointer"
                              >
                                {loadingId === sub.id ? '...' : 'Tolak'}
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(sub.id, 'PENDING')} 
                              disabled={loadingId === sub.id} 
                              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Inspeksi & Verifikasi Pembayaran (3D Inspect Modal) */}
        {selectedPaymentApplicant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.35)] border border-slate-200 dark:border-gray-800 w-full max-w-lg overflow-hidden my-8 animate-zoom-in text-slate-800 dark:text-slate-100">
              
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 uppercase tracking-wider">
                      Verifikasi Pembayaran
                    </span>
                    <h3 className="font-extrabold text-lg text-white mt-1">
                      {selectedPaymentApplicant.paymentMethod === 'CASH' 
                        ? 'Konfirmasi Pembayaran Kasir Loket (CASH)' 
                        : 'Pemeriksaan Bukti Transfer Bank'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 font-mono">
                      PPDB-{selectedPaymentApplicant.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedPaymentApplicant(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-5">
                
                {/* Rincian Pendaftar */}
                <div className="bg-slate-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-gray-700 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Calon Siswa:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedPaymentApplicant.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">NISN:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedPaymentApplicant.nisn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pilihan Jurusan:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedPaymentApplicant.major}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Tagihan:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">Rp 150.000</span>
                  </div>
                </div>

                {/* Bagian Khusus TRANSFER: Preview Bukti */}
                {selectedPaymentApplicant.paymentMethod === 'TRANSFER' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Lampiran Struk Bukti Transfer:
                    </label>

                    {selectedPaymentApplicant.paymentProof ? (
                      <div className="border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-800 relative group">
                        <img 
                          src={selectedPaymentApplicant.paymentProof} 
                          alt="Bukti Transfer" 
                          className="w-full max-h-64 object-contain mx-auto"
                        />
                        <div className="p-3 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                            {selectedPaymentApplicant.paymentNotes || 'Bukti transfer diunggah'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openDocumentPreview({
                              title: 'Bukti Transfer Pembayaran Formulir',
                              url: selectedPaymentApplicant.paymentProof!,
                              studentName: selectedPaymentApplicant.fullName,
                              nisn: selectedPaymentApplicant.nisn,
                              studentId: selectedPaymentApplicant.id,
                              studentStatus: selectedPaymentApplicant.status,
                            })}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={14} /> Pratinjau Penuh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle size={16} />
                        Pendaftar belum mengunggah file bukti transfer.
                      </div>
                    )}
                  </div>
                )}

                {/* Bagian Khusus CASH: Kode Loket */}
                {selectedPaymentApplicant.paymentMethod === 'CASH' && (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/60 dark:bg-teal-950/30 dark:border-teal-800">
                    <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-xs uppercase mb-1">
                      <Banknote size={16} /> Pembayaran Tunai di Loket Kasir
                    </div>
                    <div className="text-xl font-black font-mono text-teal-950 dark:text-teal-200">
                      CASH-{selectedPaymentApplicant.id.slice(-6).toUpperCase()}
                    </div>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
                      Pastikan calon siswa telah menyerahkan uang pas sebesar <strong>Rp 150.000</strong> ke bendahara sekolah sebelum menekan tombol konfirmasi lunas.
                    </p>
                  </div>
                )}

                {/* Input Catatan Verifikator / No Kwitansi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Catatan Verifikasi / No. Kwitansi Fisik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={verifyingNotes}
                    onChange={(e) => setVerifyingNotes(e.target.value)}
                    placeholder={
                      selectedPaymentApplicant.paymentMethod === 'CASH'
                        ? 'Contoh: No Kwitansi Kasir: KW-2026/048'
                        : 'Contoh: Mutasi rekening BCA cocok a.n Ahmad'
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentApplicant(null)}
                    disabled={isVerifying}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Tutup
                  </button>

                  {selectedPaymentApplicant.paymentMethod === 'TRANSFER' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyPayment('REJECTED')}
                      disabled={isVerifying}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <XCircle size={15} /> Tolak Bukti
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleVerifyPayment('PAID')}
                    disabled={isVerifying}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} /> Verifikasi Sah (Set Lunas)
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Modal Pratinjau Dokumen Berkas Lengkap (Full In-App Document Preview Modal) */}
        {previewDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-gray-800 w-full max-w-4xl overflow-hidden my-auto animate-zoom-in text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]">
              
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 px-6 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex-shrink-0">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 uppercase tracking-wider">
                        Pratinjau Berkas Dokumen
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        NISN: {previewDocument.nisn}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                      {previewDocument.title}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Nama Calon Siswa: <span className="font-bold text-white">{previewDocument.studentName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewDocument.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors border border-white/10"
                    title="Buka di Tab Baru"
                  >
                    <ExternalLink size={14} />
                    <span>Tab Baru</span>
                  </a>
                  <a
                    href={previewDocument.url}
                    download
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors border border-white/10"
                    title="Unduh File"
                  >
                    <Download size={14} />
                    <span>Unduh</span>
                  </a>
                  <button
                    onClick={() => setPreviewDocument(null)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-base cursor-pointer"
                    title="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body Modal (Document Viewer) */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-950/95 flex items-center justify-center min-h-[350px]">
                {previewDocType === 'loading' ? (
                  <div className="text-center py-12 text-slate-400">
                    <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm">Memuat pratinjau dokumen...</p>
                  </div>
                ) : previewDocType === 'pdf' ? (
                  <div className="w-full h-full flex flex-col items-center">
                    <iframe
                      src={previewDocument.url}
                      title={previewDocument.title}
                      className="w-full h-[65vh] rounded-2xl border border-slate-700 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">
                      Jika PDF tidak tampil otomatis, Anda dapat <a href={previewDocument.url} target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold">membukanya langsung di tab baru</a>.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center max-w-full">
                    <img
                      src={previewDocument.url}
                      alt={previewDocument.title}
                      className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="p-4 px-6 bg-slate-900 border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                <div className="text-xs text-slate-400 text-center sm:text-left">
                  <span>Periksa keabsahan berkas fisik atau digital sebelum menentukan keputusan seleksi.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {previewDocument.studentId && previewDocument.studentStatus === 'PENDING' && (
                    <>
                      <button
                        onClick={async () => {
                          await handleStatusChange(previewDocument.studentId!, 'APPROVED');
                          setPreviewDocument(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} /> Terima Siswa
                      </button>
                      <button
                        onClick={async () => {
                          await handleStatusChange(previewDocument.studentId!, 'REJECTED');
                          setPreviewDocument(null);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <X size={14} /> Tolak Siswa
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setPreviewDocument(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
