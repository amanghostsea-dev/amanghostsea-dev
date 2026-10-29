'use client';

import { useState } from 'react';
import { Users, Search, GraduationCap, ShieldCheck, UserCheck, Plus, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface StudentItem {
  id: string;
  name: string;
  username: string;
  nisn: string | null;
  role: string;
  status: string;
  createdAt: Date | string;
}

export default function KelasClient({ students, teacherName }: { students: StudentItem[]; teacherName: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');

  const classOptions = [
    { id: 'ALL', label: 'Semua Kelas' },
    { id: 'XI RPL 1', label: 'XI RPL 1 (Wali Kelas)' },
    { id: 'XI RPL 2', label: 'XI RPL 2' },
    { id: 'XII TKJ 1', label: 'XII TKJ 1' },
    { id: 'X DKV 1', label: 'X DKV 1' },
  ];

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

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
            Wali Kelas: <strong className="text-gray-900 dark:text-white">{teacherName}</strong> (XI RPL 1)
          </p>
        </div>

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-500/25 transition-all"
        >
          <Plus size={16} /> Tambah / Import Siswa
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{students.length} Siswa</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Siswa Terdaftar</div>
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
            <div className="text-2xl font-bold text-gray-900 dark:text-white">XI RPL 1</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kelas Utama Wali</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, NISN, atau username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {classOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedClass === c.id
                  ? 'bg-amber-600 text-white shadow-sm'
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
                    Tidak ada siswa ditemukan.
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
                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium">
                      {selectedClass === 'ALL' ? 'XI RPL 1' : selectedClass}
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
