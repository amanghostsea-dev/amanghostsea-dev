'use client';

import { useState } from 'react';
import { Search, MapPin, DollarSign, Clock, Filter, Briefcase } from 'lucide-react';

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

export default function JobsListClient({ initialJobs }: { initialJobs: JobListing[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = initialJobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Eksplor Lowongan</h1>
            <p className="text-gray-600 dark:text-gray-400">Temukan karir yang sesuai dengan passion dan keahlianmu.</p>
          </div>
          
          <div className="w-full md:w-auto flex gap-2">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Cari lowongan atau perusahaan..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm text-gray-700 dark:text-gray-300">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              {job.isHot && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-400 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-sm">
                  HOT Loker
                </div>
              )}
              
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-xl font-bold text-gray-400 group-hover:scale-110 transition-transform">
                  {job.company.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{job.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium text-sm line-clamp-1">{job.company}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-6 flex justify-center"><MapPin size={16} className="text-gray-400" /></div>
                  {job.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-6 flex justify-center"><DollarSign size={16} className="text-gray-400" /></div>
                  {job.salary || 'Menyesuaikan'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-6 flex justify-center"><Clock size={16} className="text-gray-400" /></div>
                  {job.type}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {job.tags.split(',').map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                    {tag.trim()}
                  </span>
                ))}
              </div>

              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm group-hover:shadow-blue-500/25">
                Lamar Sekarang
              </button>
            </div>
          ))}
          
          {filteredJobs.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              <Briefcase className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tidak ada lowongan ditemukan</h3>
              <p>Coba gunakan kata kunci pencarian yang lain.</p>
            </div>
          )}
        </div>
      </main>
  );
}
