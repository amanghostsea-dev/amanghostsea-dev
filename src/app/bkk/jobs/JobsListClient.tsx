'use client';

import { useState, useEffect } from 'react';
import { 
  Search, MapPin, DollarSign, Clock, Filter, Briefcase, 
  Sparkles, Bookmark, BookmarkCheck, ArrowUpDown, Building2, 
  ChevronRight, CheckCircle2, Flame, Award
} from 'lucide-react';
import JobDetailModal, { JobListing } from '@/components/bkk/JobDetailModal';
import Link from 'next/link';

export default function JobsListClient({ initialJobs }: { initialJobs: JobListing[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Semua');
  const [selectedDepartment, setSelectedDepartment] = useState('Semua');
  const [onlyHot, setOnlyHot] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'hot' | 'salary'>('newest');
  
  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // Modal state
  const [activeJob, setActiveJob] = useState<JobListing | null>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smk_bkk_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('smk_bkk_bookmarks', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Departments list for filter
  const departments = [
    'Semua',
    'RPL',
    'TKJ',
    'TKR / Otomotif',
    'Akuntansi',
    'DKV / Multimedia'
  ];

  // Types list
  const jobTypes = ['Semua', 'Full-time', 'Magang', 'Kontrak', 'Part-time'];

  // Filtering
  const filteredJobs = initialJobs.filter(job => {
    const matchSearch = 
      (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (job.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.tags || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = selectedType === 'Semua' || (job.type || '').toLowerCase() === selectedType.toLowerCase();
    
    const matchDept = selectedDepartment === 'Semua' || 
      (job.department && (
        job.department.toLowerCase().includes(selectedDepartment.toLowerCase()) ||
        job.department.toLowerCase().includes('semua')
      )) ||
      (job.tags || '').toLowerCase().includes(selectedDepartment.toLowerCase());


    const matchHot = !onlyHot || job.isHot;
    const matchBookmark = !onlyBookmarked || bookmarkedIds.includes(job.id);

    return matchSearch && matchType && matchDept && matchHot && matchBookmark;
  });

  // Sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'hot') {
      return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0);
    }
    // Newest is default
    return 0;
  });

  return (
    <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-200 dark:border-gray-800 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs mb-3">
            <Sparkles size={14} /> Portal Karir & Bursa Kerja Mitra
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            Eksplorasi Lowongan Kerja
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Peluang kerja & magang resmi khusus lulusan dan siswa SMK, bekerja sama dengan ratusan industri terpercaya.
          </p>
        </div>

        {/* Action Link to AI Matcher */}
        <Link 
          href="/bkk/ai-matcher"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-105 flex-shrink-0"
        >
          <Sparkles size={18} />
          Gunakan AI CV Matcher
        </Link>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari posisi kerja, nama perusahaan, keahlian, atau kota..." 
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
            >
              {jobTypes.map(t => (
                <option key={t} value={t}>Tipe: {t}</option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
            >
              {departments.map(d => (
                <option key={d} value={d}>Jurusan: {d}</option>
              ))}
            </select>

            <button
              onClick={() => setOnlyHot(!onlyHot)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                onlyHot 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              <Flame size={14} /> HOT Loker
            </button>

            <button
              onClick={() => setOnlyBookmarked(!onlyBookmarked)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                onlyBookmarked 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              <Bookmark size={14} /> Tersimpan ({bookmarkedIds.length})
            </button>
          </div>
        </div>

        {/* Results count & status */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span>Menampilkan <strong>{sortedJobs.length}</strong> lowongan tersedia</span>
          {(searchTerm || selectedType !== 'Semua' || selectedDepartment !== 'Semua' || onlyHot || onlyBookmarked) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('Semua');
                setSelectedDepartment('Semua');
                setOnlyHot(false);
                setOnlyBookmarked(false);
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* JOB LIST GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedJobs.map((job) => {
          const isSaved = bookmarkedIds.includes(job.id);
          return (
            <div 
              key={job.id} 
              id={job.id}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {job.isHot && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black px-4 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1">
                  <Flame size={12} /> HOT Loker
                </div>
              )}
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  {job.company.charAt(0)}
                </div>
                <button
                  onClick={() => toggleBookmark(job.id)}
                  className={`p-2 rounded-xl transition-all ${
                    isSaved 
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                      : 'text-gray-300 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                  title={isSaved ? 'Hapus dari Tersimpan' : 'Simpan Lowongan'}
                >
                  {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-blue-600 dark:text-blue-400 font-bold text-xs line-clamp-1 mb-4">
                  {job.company}
                </p>
              </div>

              <div className="space-y-2.5 mb-6 flex-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={15} className="text-emerald-500 flex-shrink-0" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    {job.salary || 'Sesuai UMR / Nego'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-purple-500 flex-shrink-0" />
                  <span>{job.type} • {job.department || 'Semua Jurusan'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {(job.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 3).map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-bold"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setActiveJob(job)}
                  className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold text-xs hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm text-center"
                >
                  Detail & Lamar
                </button>
              </div>
            </div>
          );
        })}
        
        {sortedJobs.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <Briefcase className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tidak ada lowongan ditemukan</h3>
            <p className="text-sm max-w-md mx-auto">
              Coba ganti kata kunci pencarian atau sesuaikan opsi filter untuk menemukan peluang karir yang sesuai.
            </p>
          </div>
        )}
      </div>

      {/* DETAIL & APPLICATION MODAL */}
      <JobDetailModal
        job={activeJob}
        isOpen={!!activeJob}
        onClose={() => setActiveJob(null)}
        isBookmarked={activeJob ? bookmarkedIds.includes(activeJob.id) : false}
        onToggleBookmark={toggleBookmark}
      />
    </main>
  );
}
