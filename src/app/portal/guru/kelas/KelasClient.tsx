'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  GraduationCap, 
  ShieldCheck, 
  Filter
} from 'lucide-react';
import Link from 'next/link';

export interface StudentItem {
  id: string;
  name: string;
  username: string;
  nisn: string | null;
  role: string;
  status: string;
  studentClass: string | null;
  createdAt: Date | string;
}

export default function KelasClient({
  students,
  teacherName,
  teacherWaliClass = 'XI TJKT 1',
  classTargets = ['Semua Kelas', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
}: {
  students: StudentItem[];
  teacherName: string;
  teacherWaliClass?: string;
  classTargets?: string[];
  jurusans?: Array<{ id: string; name: string; code: string }>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');

  // Kumpulan opsi kelas yang disinkronkan dengan Master Data Admin Utama
  const classOptions = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [
      { id: 'ALL', label: 'Semua Kelas' },
      { id: 'Semua Kelas X (Semua Jurusan)', label: 'Semua Kelas X (Semua Jurusan)' },
      { id: 'Semua Kelas XI (Semua Jurusan)', label: 'Semua Kelas XI (Semua Jurusan)' },
      { id: 'Semua Kelas XII (Semua Jurusan)', label: 'Semua Kelas XII (Semua Jurusan)' },
    ];

    const specificClasses = (classTargets || [])
      .filter((c) => c && !c.toLowerCase().startsWith('semua'))
      .sort((a, b) => {
        const order = (name: string) => {
          if (/^(X|10)\b/i.test(name)) return 1;
          if (/^(XI|11)\b/i.test(name)) return 2;
          if (/^(XII|12)\b/i.test(name)) return 3;
          return 4;
        };
        const diff = order(a) - order(b);
        if (diff !== 0) return diff;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

    specificClasses.forEach((c) => {
      const isWali = c.trim().toUpperCase() === teacherWaliClass.trim().toUpperCase();
      list.push({
        id: c,
        label: isWali ? `${c} (Wali Kelas)` : c,
      });
    });

    return list;
  }, [classTargets, teacherWaliClass]);

  // Filter Siswa Akurat Sesuai Data Sinkron Admin Utama
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const userClass = (s.studentClass || '').trim();

      // 1. Filter Berdasarkan Kelas / Jurusan yang Dipilih
      if (selectedClass !== 'ALL') {
        if (selectedClass === 'Semua Kelas X (Semua Jurusan)' || selectedClass === 'LEVEL_X') {
          if (!/^(X|10)\b/i.test(userClass) || /^(XI|XII|11|12)\b/i.test(userClass)) {
            return false;
          }
        } else if (selectedClass === 'Semua Kelas XI (Semua Jurusan)' || selectedClass === 'LEVEL_XI') {
          if (!/^(XI|11)\b/i.test(userClass) || /^(XII|12)\b/i.test(userClass)) {
            return false;
          }
        } else if (selectedClass === 'Semua Kelas XII (Semua Jurusan)' || selectedClass === 'LEVEL_XII') {
          if (!/^(XII|12)\b/i.test(userClass)) {
            return false;
          }
        } else {
          // Spesifik rombel (misal: "X DKV 1", "XI TJKT 1")
          if (userClass.toUpperCase() !== selectedClass.trim().toUpperCase()) {
            return false;
          }
        }
      }

      // 2. Filter Pencarian Teks
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchUser = (s.username || '').toLowerCase().includes(q);
        const matchNisn = s.nisn ? s.nisn.toLowerCase().includes(q) : false;
        const matchClass = userClass.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchNisn && !matchClass) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedClass, searchTerm]);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-2">
            <Users size={14} /> Data Kelas & Peserta Didik Bimbingan
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Daftar Kelas & Siswa
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Wali Kelas: <strong className="text-gray-900 dark:text-white">{teacherName}</strong> ({teacherWaliClass})
          </p>
        </div>

        {/* Info Sinkronisasi Admin Utama (Pengganti Tombol Tambah/Import) */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2 shadow-sm">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Master Data Siswa Terkelola Terpusat oleh Admin Utama</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredStudents.length} Siswa
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {selectedClass === 'ALL' ? 'Total Siswa Terdaftar' : `Tersaring: ${selectedClass}`}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">100% Aktif</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status Akun Belajar</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{teacherWaliClass}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kelas Utama Wali</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, NISN, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Filter size={14} className="text-amber-500" />
            <span>Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa</span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {classOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedClass === c.id
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-6 w-14 text-center">No</th>
                <th className="py-3.5 px-6">Nama Siswa</th>
                <th className="py-3.5 px-6">NISN / Username</th>
                <th className="py-3.5 px-6">Kelas Binaan</th>
                <th className="py-3.5 px-6">Status Belajar</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Tidak ada siswa ditemukan pada kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-4 px-6 text-center text-gray-500 font-mono text-xs">{idx + 1}</td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">ID: {s.id.slice(-6)}</div>
                    </td>
                    <td className="py-4 px-6">
                      {s.nisn ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          NISN: {s.nisn}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-gray-500">@{s.username}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {s.studentClass ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#5fa08d]/10 text-[#4d8675] dark:text-[#8bb79e] border border-[#5fa08d]/25">
                            {s.studentClass}
                          </span>
                          {s.studentClass.trim().toUpperCase() === teacherWaliClass.trim().toUpperCase() && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              Wali Kelas
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                          Belum Diplot
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/portal/guru/presensi?nisn=${s.nisn || s.username}`}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-xs"
                      >
                        Lihat Absensi
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
