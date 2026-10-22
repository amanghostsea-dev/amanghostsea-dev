'use client';

import { 
  Users, Building2, BookOpen, Rocket, Briefcase, 
  TrendingUp, Download, Search, Filter 
} from 'lucide-react';
import { useState } from 'react';

type TracerStudy = {
  status: string;
  companyName: string | null;
  university: string | null;
};

type Alumni = {
  id: string;
  fullName: string;
  major: string;
  graduationYear: number;
  tracerStudy: TracerStudy | null;
};

export default function TracerDashboard({ initialAlumni }: { initialAlumni: Alumni[] }) {
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Data
  const filteredAlumni = initialAlumni.filter(a => {
    const matchYear = filterTahun === 'Semua' || a.graduationYear.toString() === filterTahun;
    const matchSearch = a.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchYear && matchSearch;
  });

  const respondedAlumni = filteredAlumni.filter(a => a.tracerStudy !== null);

  // Stats for visualization
  const stats = {
    totalAlumni: filteredAlumni.length,
    responded: respondedAlumni.length,
    bekerja: respondedAlumni.filter(a => a.tracerStudy?.status === 'BEKERJA').length,
    kuliah: respondedAlumni.filter(a => a.tracerStudy?.status === 'KULIAH').length,
    wirausaha: respondedAlumni.filter(a => a.tracerStudy?.status === 'WIRAUSAHA').length,
    mencari: respondedAlumni.filter(a => a.tracerStudy?.status === 'MENCARI_KERJA').length
  };

  const responseRate = stats.totalAlumni === 0 ? 0 : Math.round((stats.responded / stats.totalAlumni) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BEKERJA': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'KULIAH': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'WIRAUSAHA': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const safePercent = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Dashboard Tracer Study
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pemetaan keterserapan alumni di industri dan perguruan tinggi.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Angkatan</option>
            <option value="2025">Lulusan 2025</option>
            <option value="2024">Lulusan 2024</option>
            <option value="2023">Lulusan 2023</option>
            <option value="2022">Lulusan 2022</option>
          </select>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-md"
          >
            <Download size={16} /> Export / Cetak
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-full">{responseRate}% Respon</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{stats.responded}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Responden (dari {stats.totalAlumni})</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">{safePercent(stats.bekerja, stats.responded)}%</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{stats.bekerja}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Alumni Bekerja</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
              <BookOpen size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">{safePercent(stats.kuliah, stats.responded)}%</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{stats.kuliah}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Melanjutkan Kuliah</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
              <Rocket size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">{safePercent(stats.wirausaha, stats.responded)}%</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{stats.wirausaha}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Wirausaha / Mandiri</p>
        </div>
      </div>

      {/* Advanced Visualizer Bar */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Distribusi Keterserapan Alumni {filterTahun}</h3>
        
        {/* Horizontal Stacked Bar */}
        <div className="w-full h-8 flex rounded-full overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
          {stats.responded > 0 ? (
            <>
              <div style={{ width: `${safePercent(stats.bekerja, stats.responded)}%` }} className="bg-blue-500 h-full hover:opacity-80 transition-opacity relative group cursor-pointer">
                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity">
                  Bekerja: {stats.bekerja} ({safePercent(stats.bekerja, stats.responded)}%)
                </div>
              </div>
              <div style={{ width: `${safePercent(stats.kuliah, stats.responded)}%` }} className="bg-purple-500 h-full hover:opacity-80 transition-opacity relative group cursor-pointer">
                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity">
                  Kuliah: {stats.kuliah} ({safePercent(stats.kuliah, stats.responded)}%)
                </div>
              </div>
              <div style={{ width: `${safePercent(stats.wirausaha, stats.responded)}%` }} className="bg-orange-500 h-full hover:opacity-80 transition-opacity relative group cursor-pointer">
                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity">
                  Wirausaha: {stats.wirausaha} ({safePercent(stats.wirausaha, stats.responded)}%)
                </div>
              </div>
              <div style={{ width: `${safePercent(stats.mencari, stats.responded)}%` }} className="bg-gray-400 dark:bg-gray-600 h-full hover:opacity-80 transition-opacity relative group cursor-pointer">
                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity">
                  Mencari: {stats.mencari} ({safePercent(stats.mencari, stats.responded)}%)
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
              Belum ada data responden
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-medium">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Bekerja ({safePercent(stats.bekerja, stats.responded)}%)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Kuliah ({safePercent(stats.kuliah, stats.responded)}%)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Wirausaha ({safePercent(stats.wirausaha, stats.responded)}%)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600"></div> Mencari Kerja ({safePercent(stats.mencari, stats.responded)}%)</div>
        </div>
      </div>


      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Data Responden Terbaru</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Cari nama alumni..." className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <Filter size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-medium">Nama Lengkap</th>
                <th className="p-4 font-medium">Jurusan</th>
                <th className="p-4 font-medium">Tahun Lulus</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Instansi / Keterangan</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {respondedAlumni.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{item.fullName}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{item.major}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{item.graduationYear}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getStatusColor(item.tracerStudy?.status || '')}`}>
                      {item.tracerStudy?.status || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {item.tracerStudy?.companyName || item.tracerStudy?.university || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Lihat Semua Data ({respondedAlumni.length})
          </button>
        </div>
      </div>
    </div>
  );
}
