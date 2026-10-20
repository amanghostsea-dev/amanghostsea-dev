'use client';

import Navbar from '@/components/Navbar';
import { Briefcase, Search, Building2, MapPin, DollarSign, Clock, CheckCircle, ChevronRight, GraduationCap, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';

type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  description: string;
  tags: string;
  isHot: boolean;
};

export default function BKKLandingClient({ initialJobs, schoolName = "SMK GaMa" }: { initialJobs: JobListing[], schoolName?: string }) {
  const jobListings = initialJobs;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12 lg:py-20">
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium mb-6 text-sm">
              <Sparkles size={16} /> BKK {schoolName} Smart Career
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 leading-tight">
              Langkah Pertama Menuju <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Karir Impianmu</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
              Bursa Kerja Khusus (BKK) {schoolName} menghubungkan lulusan terbaik kami dengan ratusan perusahaan mitra terkemuka di seluruh Indonesia.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-900 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-2 max-w-4xl mx-auto relative z-10">
              <div className="flex-1 flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                <Search className="text-gray-400 mr-3" size={20} />
                <input type="text" placeholder="Posisi, keahlian, atau perusahaan..." className="w-full py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white" />
              </div>
              <div className="flex-1 flex items-center px-4">
                <MapPin className="text-gray-400 mr-3" size={20} />
                <input type="text" placeholder="Lokasi..." className="w-full py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white" />
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-md">
                Cari Lowongan
              </button>
            </div>
          </div>
        </section>

        {/* Highlight Stats */}
        <section className="border-y border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <h3 className="text-3xl font-extrabold text-blue-600 mb-2">150+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Perusahaan Mitra</p>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-purple-600 mb-2">450+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Lowongan Aktif</p>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-green-600 mb-2">95%</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Terserap Industri</p>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-orange-600 mb-2">12K+</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Alumni Sukses</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section (Conceptual Advanced System) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Fitur Canggih Portal BKK</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Sistem terintegrasi yang memudahkan pencari kerja dan perusahaan.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/bkk/ai-matcher" className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden block">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Baru</div>
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI CV Matcher</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Sistem cerdas yang secara otomatis mencocokkan profil dan keahlianmu dengan lowongan yang paling relevan. <span className="text-blue-600 font-semibold inline-block mt-2">Coba Sekarang &rarr;</span></p>
            </Link>
            <Link href="/bkk/tracer-study" className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden block">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Live</div>
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Tracer Study Real-time</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Pelacakan karir alumni secara komprehensif untuk pemetaan lulusan yang akurat dan berbasis data. <span className="text-blue-600 font-semibold inline-block mt-2">Isi Data Sekarang &rarr;</span></p>
            </Link>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Portal Mitra Industri</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Dashboard khusus bagi perusahaan untuk memposting lowongan, menyeleksi kandidat, dan mengatur jadwal wawancara.</p>
            </div>
          </div>
        </section>

        {/* Job Listings Preview */}
        <section className="bg-gray-100 dark:bg-gray-900/50 py-20 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lowongan Terbaru</h2>
                <p className="text-gray-600 dark:text-gray-400">Peluang karir menanti Anda hari ini.</p>
              </div>
              <Link href="/bkk/jobs" className="hidden md:flex items-center text-blue-600 hover:text-blue-700 font-medium group">
                Lihat Semua <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4">
              {jobListings.map((job) => (
                <div key={job.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                  {job.isHot && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  )}
                  <div className="flex gap-6 items-start">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-xl font-bold text-gray-400">
                      {job.company.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{job.title}</h3>
                        {job.isHot && <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold">HOT</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-3">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1.5"><MapPin size={16} /> {job.location}</span>
                        <span className="flex items-center gap-1.5"><DollarSign size={16} /> {job.salary}</span>
                        <span className="flex items-center gap-1.5"><Clock size={16} /> {job.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                      {job.tags.split(',').map(tag => (
                        <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                    <button className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-colors shadow-sm">
                      Lamar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-medium hover:border-blue-500 hover:text-blue-600 transition-colors md:hidden">
              Lihat Semua Lowongan
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
