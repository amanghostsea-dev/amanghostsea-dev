'use client';

import { useState } from 'react';
import { 
  Sparkles, Upload, FileText, Briefcase, CheckCircle, ArrowRight, 
  Bot, AlertCircle, Loader2, Target, Check, RefreshCw, Star, BookOpen
} from 'lucide-react';
import JobDetailModal, { JobListing } from '@/components/bkk/JobDetailModal';
import Link from 'next/link';

const QUICK_SKILLS = [
  'HTML & CSS', 'JavaScript', 'React', 'Next.js', 'PHP / Laravel', 
  'Mikrotik', 'Cisco Networking', 'Fiber Optik', 'Linux Server',
  'Tune Up Otomotif', 'Kelistrikan Mesin', 'CAD / Solidworks', 'Las Listrik',
  'Desain Grafis (Photoshop/Canva)', 'Video Editing (Premiere)',
  'Microsoft Excel', 'Akuntansi Keuangan', 'Administrasi Perkantoran'
];

export default function AiMatcherClient() {
  const [skillsText, setSkillsText] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const toggleQuickSkill = (skill: string) => {
    const list = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    if (list.includes(skill)) {
      setSkillsText(list.filter(s => s !== skill).join(', '));
    } else {
      setSkillsText(list.length > 0 ? `${skillsText}, ${skill}` : skill);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert('Ukuran berkas maksimal 4.5MB.');
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        // Prepend file info to skills text
        setSkillsText(prev => {
          const note = `[Berkas CV: ${file.name}]`;
          return prev ? `${note} ${prev}` : note;
        });
      }
    } catch (err) {
      // Continue anyway with filename
    } finally {
      setIsUploading(false);
    }
  };

  const handleScan = async () => {
    setErrorMsg('');
    if (!skillsText.trim() && !uploadedFileName) {
      setErrorMsg('Harap masukkan keahlian atau unggah berkas CV Anda terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch('/api/bkk/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skillsText,
          department: selectedDept,
          rawText: skillsText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memproses analisis AI.');
        return;
      }

      setResults(data.results || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi gangguan jaringan.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 mb-4">
          <Sparkles size={16} /> BKK Smart Career Matcher
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
          AI CV Matcher & Analisis Peluang Karir
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Unggah CV atau pilih keahlianmu. Kecerdasan buatan kami akan menganalisis kecocokan profilmu dengan lowongan pekerjaan mitra industri yang aktif.
        </p>
      </div>

      {/* INPUT FORM (If no results yet) */}
      {!results && (
        <div className="bg-white dark:bg-gray-900 p-6 md:p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 space-y-8 animate-in fade-in">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-center hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Unggah Dokumen CV (PDF / Gambar)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Maksimal 4.5MB. Sistem otomatis mendeteksi kualifikasi dari berkas Anda.
            </p>

            <label className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm">
              <FileText size={16} />
              {isUploading ? 'Sedang Memproses...' : uploadedFileName ? `Berkas: ${uploadedFileName}` : 'Pilih Berkas CV'}
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading || isScanning}
              />
            </label>
            {uploadedFileName && (
              <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center justify-center gap-1">
                <Check size={14} /> Berkas {uploadedFileName} terdeteksi
              </p>
            )}
          </div>

          {/* Quick Skill Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Target size={14} /> Pilih Cepat Keahlian Utama:
              </label>
              <span className="text-[11px] text-gray-400">Klik untuk menambahkan</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_SKILLS.map((skill) => {
                const isSelected = skillsText.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleQuickSkill(skill)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {isSelected && <Check size={12} className="inline mr-1" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Area for detailed skills / CV summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Keahlian Tambahan / Ringkasan Pengalaman Magang
            </label>
            <textarea
              rows={4}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Contoh: Menguasai pembuatan aplikasi web dengan React, Tailwind CSS. Berpengalaman magang 6 bulan di PT Teknologi. Mampu mengoperasikan Linux Server..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>

          {/* Jurusan Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Jurusan / Program Keahlian
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="">Semua Program Keahlian</option>
                <option value="RPL">RPL (Rekayasa Perangkat Lunak)</option>
                <option value="TKJ">TKJ (Teknik Komputer & Jaringan)</option>
                <option value="TKR">TKR / Otomotif</option>
                <option value="Akuntansi">Akuntansi & Keuangan</option>
                <option value="DKV">DKV (Desain Komunikasi Visual)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-8 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Menganalisis Kecocokan AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Mulai Analisis Kecocokan Karir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Result Alert Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center gap-3 font-bold text-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="text-base font-black">Analisis Selesai!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Menemukan {results.length} lowongan yang telah dinilai berdasarkan profil keahlian Anda.
                </p>
              </div>
            </div>
            <button
              onClick={() => setResults(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} /> Analisis Ulang
            </button>
          </div>

          {/* Job Matches Cards */}
          <div className="space-y-6">
            {results.map((job) => (
              <div 
                key={job.id} 
                className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  
                  {/* Job & Company Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                        {job.company.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-2">
                          <Briefcase size={14} /> {job.company} • {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Matched Skills Pill */}
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 mr-1">Keahlian Cocok:</span>
                        {job.matchedSkills.map((ms: string, idx: number) => (
                          <span 
                            key={idx} 
                            className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1"
                          >
                            <Check size={11} /> {ms}
                          </span>
                        ))}
                      </div>

                      {job.missingSkills && job.missingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-gray-400 mr-1">Saran Peningkatan:</span>
                          {job.missingSkills.map((mis: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold rounded-lg border border-amber-200 dark:border-amber-800/40"
                            >
                              + {mis}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AI Advice Box */}
                    {job.aiAdvice && (
                      <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
                        <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Analisis Rekomendasi Karir:</strong>{' '}
                          {job.aiAdvice}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Match Percentage & Action */}
                  <div className="flex lg:flex-col items-center justify-between w-full lg:w-auto gap-4 lg:text-right pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
                    <div className="flex items-center lg:flex-col gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-lg font-black">{job.matchPercentage}%</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">Cocok</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedJob(job)}
                      className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white px-6 py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                    >
                      Lamar Sekarang <ArrowRight size={14} />
                    </button>
                  </div>

                </div>
              </div>
            ))}

            {results.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
                <Bot className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Belum Ada Lowongan Aktif
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Saat ini belum ada data lowongan pekerjaan di database yang dapat dianalisis.
                </p>
                <Link
                  href="/bkk/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Buka Halaman Lowongan
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JOB DETAIL & APPLICATION MODAL */}
      <JobDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </main>
  );
}
