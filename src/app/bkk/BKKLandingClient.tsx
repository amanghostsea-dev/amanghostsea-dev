'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Briefcase, Search, Building2, MapPin, DollarSign, Clock, 
  CheckCircle, ChevronRight, GraduationCap, TrendingUp, Sparkles,
  ArrowRight, ShieldCheck, Flame, Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JobDetailModal, { JobListing } from '@/components/bkk/JobDetailModal';

export default function BKKLandingClient({ 
  initialJobs, 
  schoolName = "SMK GaMa" 
}: { 
  initialJobs: JobListing[], 
  schoolName?: string 
}) {
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword) params.set('q', searchKeyword);
    if (searchLocation) params.set('location', searchLocation);
    router.push(`/bkk/jobs?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      
      <main className="pt-24 pb-20">
        {/* HERO SECTION */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12 lg:py-20">
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold mb-6 text-xs md:text-sm shadow-sm">
              <Sparkles size={16} /> Portal Resmi BKK {schoolName} Smart Career
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6 leading-tight">
              Gerbang Utama Menuju <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Karir Impianmu</span>
            </h1>
            
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Bursa Kerja Khusus (BKK) {schoolName} menghubungkan siswa dan alumni berprestasi kami langsung dengan ratusan perusahaan mitra industri terkemuka.
            </p>
            
            {/* Search Bar */}
            <form 
              onSubmit={handleSearchSubmit}
              className="bg-white dark:bg-gray-900 p-2.5 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-2 max-w-3xl mx-auto relative z-10"
            >
              <div className="flex-1 flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
                <Search className="text-gray-400 mr-3 flex-shrink-0" size={20} />
                <input 
                  type="text" 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Posisi, keahlian, atau nama perusahaan..." 
                  className="w-full py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm" 
                />
              </div>
              <div className="flex-1 flex items-center px-4">
                <MapPin className="text-gray-400 mr-3 flex-shrink-0" size={20} />
                <input 
                  type="text" 
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Kota / Lokasi penempatan..." 
                  className="w-full py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm" 
                />
              </div>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
              >
                Cari Lowongan
              </button>
            </form>

            {/* Popular Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Paling banyak dicari:</span>
              {['RPL / Developer', 'TJKT / Networking', 'MPLB / Perkantoran', 'DKV / Multimedia', 'Magang / PKL'].map((tag) => (
                <Link
                  key={tag}
                  href={`/bkk/jobs?q=${encodeURIComponent(tag.split(' ')[0])}`}
                  className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* HIGHLIGHT STATS */}
        <section className="border-y border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-blue-600 mb-1">150+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-xs md:text-sm">Mitra Industri Aktif</p>
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-indigo-600 mb-1">450+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-xs md:text-sm">Lowongan & Magang</p>
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-emerald-600 mb-1">94.8%</h3>
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-xs md:text-sm">Terserap Kerja & Kuliah</p>
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-amber-600 mb-1">12K+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-xs md:text-sm">Jaringan Alumni Vokasi</p>
              </div>
            </div>
          </div>
        </section>

        {/* FITUR UNGGULAN BKK */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
              Fitur Canggih Portal BKK
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
              Ekosistem karir terpadu yang memfasilitasi pelamar, alumni, dan HRD perusahaan secara real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link 
              href="/bkk/ai-matcher" 
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden block hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-bl-xl shadow-sm">
                AI Powered
              </div>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">AI CV Matcher</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                Sistem analisis berbasis AI yang mencocokkan keahlian dan riwayat CV Anda dengan lowongan yang paling relevan.
              </p>
              <span className="text-blue-600 font-bold text-xs inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Coba AI Matcher Sekarang &rarr;
              </span>
            </Link>

            <Link 
              href="/bkk/tracer-study" 
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden block hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-black px-4 py-1 rounded-bl-xl shadow-sm">
                Alumni Live
              </div>
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Tracer Study Terintegrasi</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                Pendataan keterserapan alumni di dunia kerja, wirausaha, dan perguruan tinggi untuk akreditasi dan evaluasi vokasi.
              </p>
              <span className="text-emerald-600 font-bold text-xs inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Isi Kuisioner Tracer Study &rarr;
              </span>
            </Link>

            <Link 
              href="/bkk/jobs" 
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden block hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Lowongan Resmi Terverifikasi</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                Seluruh peluang kerja melalui tahap verifikasi legalitas tim BKK sekolah, aman dari penipuan dan penahanan ijazah ilegal.
              </p>
              <span className="text-indigo-600 font-bold text-xs inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Eksplorasi Lowongan &rarr;
              </span>
            </Link>
          </div>
        </section>

        {/* LOWONGAN TERBARU PREVIEW */}
        <section className="bg-gray-100/70 dark:bg-gray-900/50 py-20 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                  Lowongan Terbaru Mitra Sekolah
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Segera ajukan lamaran sebelum batas kuota penerimaan terpenuhi.
                </p>
              </div>
              <Link 
                href="/bkk/jobs" 
                className="hidden md:inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-sm group"
              >
                Lihat Semua Lowongan 
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4">
              {initialJobs.slice(0, 5).map((job) => (
                <div 
                  key={job.id} 
                  className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group"
                >
                  {job.isHot && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-500 to-amber-500"></div>
                  )}

                  <div className="flex gap-5 items-start">
                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                      {(job.company || 'P').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </h3>
                        {job.isHot && (
                          <span className="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 text-[10px] px-2 py-0.5 rounded-full font-black">
                            HOT
                          </span>
                        )}
                      </div>
                      <p className="text-blue-600 dark:text-blue-400 font-bold text-xs mb-3">
                        {job.company}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                        <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary || 'Sesuai UMR'}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {job.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                      {(job.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm whitespace-nowrap"
                    >
                      Detail & Lamar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center md:hidden">
              <Link 
                href="/bkk/jobs" 
                className="inline-flex items-center justify-center w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md"
              >
                Lihat Semua Lowongan &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL DETAIL & APPLICATION */}
      <JobDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
