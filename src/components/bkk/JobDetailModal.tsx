'use client';

import { useState } from 'react';
import { 
  Building2, MapPin, DollarSign, Clock, X, Check, 
  Send, Phone, Mail, Share2, Bookmark, BookmarkCheck, 
  FileText, Upload, Sparkles, AlertCircle, Loader2, ExternalLink
} from 'lucide-react';

export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  description: string;
  requirements?: string | null;
  tags: string;
  department?: string | null;
  contactEmail?: string | null;
  contactWa?: string | null;
  isHot: boolean;
};

interface JobDetailModalProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (jobId: string) => void;
}

export default function JobDetailModal({
  job,
  isOpen,
  onClose,
  isBookmarked = false,
  onToggleBookmark
}: JobDetailModalProps) {
  const [activeView, setActiveView] = useState<'detail' | 'apply' | 'success'>('detail');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [applicationResult, setApplicationResult] = useState<{
    code: string;
    waUrl?: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    nisn: '',
    lastEducation: 'SMK',
    graduationYear: new Date().getFullYear().toString(),
    resumeUrl: '',
    portfolioUrl: '',
    coverLetter: ''
  });
  const [formError, setFormError] = useState('');

  if (!isOpen || !job) return null;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/bkk/jobs#${job.id}` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lowongan ${job.title} di ${job.company}`,
          text: `Ada lowongan menarik untuk ${job.title} di ${job.company} melalui Portal BKK SMK!`,
          url
        });
      } catch (err) {
        // Fallback to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert('Ukuran file maksimal 4.5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormData(prev => ({ ...prev, resumeUrl: data.url }));
      } else {
        alert(data.error || 'Gagal mengunggah berkas CV.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat mengunggah CV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName || !formData.phone || !formData.email) {
      setFormError('Nama lengkap, nomor WhatsApp, dan email wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bkk/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          ...formData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal mengirim lamaran.');
        return;
      }

      // Generate WhatsApp Direct Confirmation Link if job has contactWa
      let waUrl = '';
      if (job.contactWa) {
        const cleanWa = job.contactWa.replace(/[^0-9]/g, '');
        const targetWa = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
        const msg = encodeURIComponent(
          `Halo HRD ${job.company},\n\nSaya telah mengirimkan lamaran untuk posisi *${job.title}* melalui Portal BKK SMK dengan nomor registrasi *${data.applicationCode}*.\n\nNama: ${formData.fullName}\nNo. WhatsApp: ${formData.phone}\n\nTerima kasih, mohon informasinya jika ada berkas yang perlu dilengkapi.`
        );
        waUrl = `https://wa.me/${targetWa}?text=${msg}`;
      }

      setApplicationResult({
        code: data.applicationCode,
        waUrl
      });
      setActiveView('success');
    } catch (err: any) {
      setFormError(err.message || 'Terjadi gangguan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDirectWhatsApp = () => {
    if (!job.contactWa) return;
    const cleanWa = job.contactWa.replace(/[^0-9]/g, '');
    const targetWa = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    const msg = encodeURIComponent(
      `Halo HRD ${job.company},\n\nSaya tertarik dengan lowongan kerja untuk posisi *${job.title}* yang dipublikasikan di Portal BKK SMK. Boleh kami mengetahui detail persyaratan lebih lanjut?\nTerima kasih.`
    );
    window.open(`https://wa.me/${targetWa}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
        
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex gap-4 items-start">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-md flex-shrink-0">
              {job.company.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {job.title}
                </h2>
                {job.isHot && (
                  <span className="px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold rounded-full shadow-sm">
                    HOT
                  </span>
                )}
              </div>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                {job.company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(job.id)}
                className={`p-2 rounded-xl transition-all ${
                  isBookmarked 
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800'
                }`}
                title={isBookmarked ? 'Hapus dari Tersimpan' : 'Simpan Lowongan'}
              >
                {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 transition-all relative"
              title="Bagikan Lowongan"
            >
              <Share2 size={20} />
              {copiedLink && (
                <span className="absolute -bottom-8 right-0 bg-gray-900 text-white text-[11px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  Tersalin!
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 transition-all ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* VIEW 1: DETAIL INFORMASI */}
          {activeView === 'detail' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Highlights Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                  <span className="font-semibold truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500 flex-shrink-0" />
                  <span className="font-semibold truncate">{job.salary || 'Sesuai UMR / Nego'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-purple-500 flex-shrink-0" />
                  <span className="font-semibold">{job.type}</span>
                </div>
              </div>

              {/* Department Target */}
              {job.department && (
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl">
                  <Sparkles size={16} />
                  Prioritas Jurusan: {job.department}
                </div>
              )}

              {/* Tags */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Keahlian Terkait</h4>
                <div className="flex flex-wrap gap-2">
                  {(job.tags || '').split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Deskripsi Pekerjaan</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Persyaratan & Kualifikasi</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl">
                    {job.requirements}
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs space-y-2">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Fasilitas & Jaminan Mitra BKK:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-700 dark:text-emerald-400">
                  <li className="flex items-center gap-1.5"><Check size={14} /> Terverifikasi Resmi Tim BKK Sekolah</li>
                  <li className="flex items-center gap-1.5"><Check size={14} /> Jalur Khusus Seleksi Siswa/Alumni</li>
                  <li className="flex items-center gap-1.5"><Check size={14} /> Perlindungan Hak Ketenagakerjaan</li>
                  <li className="flex items-center gap-1.5"><Check size={14} /> Pembekalan Interview Sebelum Kerja</li>
                </ul>
              </div>
            </div>
          )}

          {/* VIEW 2: FORMULIR PELAMARAN */}
          {activeView === 'apply' && (
            <form onSubmit={handleApplySubmit} className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-xs text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-3">
                <FileText size={20} className="flex-shrink-0" />
                <span>
                  Mengirim lamaran untuk posisi <strong className="font-bold">{job.title}</strong> di <strong>{job.company}</strong>. Berkas akan langsung masuk ke panel rekrutmen BKK.
                </span>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap *</label>
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="Contoh: Muhammad Fikri"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">No. WhatsApp Aktif *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="081234567890"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Aktif *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="nama@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jurusan / Keahlian</label>
                  <input
                    type="text"
                    value={formData.lastEducation}
                    onChange={e => setFormData({ ...formData, lastEducation: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="SMK Rekayasa Perangkat Lunak"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">NISN (Khusus Siswa/Alumni)</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="0051234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tahun Lulus</label>
                  <input
                    type="number"
                    value={formData.graduationYear}
                    onChange={e => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="2025"
                  />
                </div>
              </div>

              {/* Upload CV */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Unggah CV / Resume (PDF / Gambar, Maks 4.5MB)</label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-gray-200 dark:border-gray-700">
                    <Upload size={16} />
                    {isUploading ? 'Mengunggah...' : 'Pilih Berkas CV'}
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />
                  </label>
                  {formData.resumeUrl && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={16} /> Berkas CV Siap Dikirim
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={e => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="Atau tautan Portofolio / LinkedIn / Google Drive..."
                  />
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Catatan Tambahan / Pengantar Singkat</label>
                <textarea
                  rows={3}
                  value={formData.coverLetter}
                  onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="Ceritakan keahlian utama, pengalaman magang, atau motivasi melamar..."
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveView('detail')}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  &larr; Kembali ke Rincian
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Kirim Lamaran Sekarang
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: SUCCESS STATE */}
          {activeView === 'success' && applicationResult && (
            <div className="py-8 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check size={36} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  Lamaran Berhasil Terkirim!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Data Anda telah masuk ke sistem BKK untuk posisi <strong className="text-blue-600 font-bold">{job.title}</strong> di <strong>{job.company}</strong>.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl max-w-sm mx-auto border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Nomor Registrasi Lamaran</p>
                <p className="text-xl font-mono font-black text-gray-900 dark:text-white tracking-wider">
                  {applicationResult.code}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {applicationResult.waUrl && (
                  <a
                    href={applicationResult.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Phone size={18} />
                    Konfirmasi via WhatsApp HRD
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER (If in detail view) */}
        {activeView === 'detail' && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              {job.contactWa && (
                <button
                  onClick={openDirectWhatsApp}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
                >
                  <Phone size={14} /> Tanya HRD via WA
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveView('apply')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Send size={16} />
              Lamar Pekerjaan Ini
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
