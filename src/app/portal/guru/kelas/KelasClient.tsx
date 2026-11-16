'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  GraduationCap, 
  ShieldCheck, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileSpreadsheet,
  UserPlus,
  Sparkles,
  Edit3,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { createStudentByGuru, importStudentsByGuru, updateStudentByGuru } from './actions';

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
  students: initialStudents,
  teacherName,
  teacherWaliClass = 'XI TJKT 1',
  classTargets = ['Semua Kelas', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
  jurusans = [],
}: {
  students: StudentItem[];
  teacherName: string;
  teacherWaliClass?: string;
  classTargets?: string[];
  jurusans?: Array<{ id: string; name: string; code: string }>;
}) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields - Tambah
  const [formName, setFormName] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formClass, setFormClass] = useState(teacherWaliClass);

  // Form Fields - Edit
  const [editName, setEditName] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editClass, setEditClass] = useState('');

  // Import Fields
  const [importText, setImportText] = useState('');
  const [importClass, setImportClass] = useState(teacherWaliClass);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

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

  // Daftar kelas murni untuk dropdown form (tanpa opsi "Semua ...")
  const assignableClasses = useMemo(() => {
    return (classTargets || []).filter((c) => c && !c.toLowerCase().startsWith('semua'));
  }, [classTargets]);

  // Filter Siswa Akurat
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

  // Buka Modal Tambah
  const handleOpenAddModal = () => {
    setFormName('');
    setFormNisn('');
    setFormUsername('');
    setFormPassword('');
    const defaultCls = selectedClass !== 'ALL' && !selectedClass.startsWith('Semua') 
      ? selectedClass 
      : teacherWaliClass;
    setFormClass(defaultCls);
    setIsAddModalOpen(true);
  };

  // Buka Modal Edit Siswa
  const handleOpenEditModal = (s: StudentItem) => {
    setEditingStudent(s);
    setEditName(s.name);
    setEditNisn(s.nisn || '');
    setEditClass(s.studentClass || teacherWaliClass);
    setIsEditModalOpen(true);
  };

  // Simpan Tambah Siswa Baru
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotify('error', 'Nama lengkap siswa wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await createStudentByGuru({
        name: formName,
        nisn: formNisn,
        username: formUsername,
        password: formPassword,
        studentClass: formClass,
      });

      if (res?.error) {
        showNotify('error', res.error);
      } else {
        const studentCreated = res?.data;
        showNotify('success', `Siswa ${studentCreated?.name || formName} berhasil ditambahkan ke kelas ${formClass}!`);
        if (studentCreated) {
          setStudents((prev) => [studentCreated as StudentItem, ...prev]);
        }
        setIsAddModalOpen(false);
        setFormName('');
        setFormNisn('');
        setFormUsername('');
        setFormPassword('');
      }
    } catch {
      showNotify('error', 'Terjadi kesalahan sistem saat menyimpan siswa.');
    } finally {
      setLoading(false);
    }
  };

  // Simpan Edit / Pembaruan Kelas Siswa
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editName.trim()) {
      showNotify('error', 'Nama siswa tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      const res = await updateStudentByGuru({
        id: editingStudent.id,
        name: editName,
        nisn: editNisn,
        studentClass: editClass,
      });

      if (res?.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Data & kelas siswa ${editName} berhasil diperbarui ke ${editClass}!`);
        // Update state lokal
        setStudents((prev) =>
          prev.map((item) =>
            item.id === editingStudent.id
              ? {
                  ...item,
                  name: editName.trim(),
                  nisn: editNisn.trim() || null,
                  studentClass: editClass.trim() || null,
                }
              : item
          )
        );
        setIsEditModalOpen(false);
        setEditingStudent(null);
      }
    } catch {
      showNotify('error', 'Terjadi kesalahan sistem saat memperbarui siswa.');
    } finally {
      setLoading(false);
    }
  };

  // Proses Impor Siswa Massal
  const handleProcessImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      showNotify('error', 'Data impor tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      // Format: Nama Siswa, NISN [, Kelas]
      const lines = importText.split('\n').filter((l) => l.trim() !== '');
      const parsedRows = lines.map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        const name = parts[0] || '';
        const nisn = parts[1] || '';
        const studentClass = parts[2] || importClass;
        return { name, nisn, studentClass };
      }).filter((r) => r.name !== '');

      if (parsedRows.length === 0) {
        showNotify('error', 'Tidak ada data valid yang dapat diproses.');
        setLoading(false);
        return;
      }

      const res = await importStudentsByGuru(parsedRows, importClass);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Berhasil mengimpor ${res.count} siswa ke kelas ${importClass}!`);
        setIsImportModalOpen(false);
        setImportText('');
        window.location.reload();
      }
    } catch {
      showNotify('error', 'Gagal memproses impor data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner Alert / Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

        {/* Action Buttons for Guru */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const defaultCls = selectedClass !== 'ALL' && !selectedClass.startsWith('Semua') 
                ? selectedClass 
                : teacherWaliClass;
              setImportClass(defaultCls);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            <Upload size={16} className="text-amber-600" /> Import CSV/Excel
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus size={16} /> Tambah Siswa Baru
          </button>
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
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(s)}
                          className="text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                          title="Ubah Kelas / Edit Data Siswa"
                        >
                          <Edit3 size={13} /> Edit Kelas
                        </button>
                        <Link
                          href={`/portal/guru/presensi?nisn=${s.nisn || s.username}`}
                          className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-xs"
                        >
                          Lihat Absensi
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TAMBAH SISWA BARU LANGSUNG OLEH GURU */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                  <UserPlus size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Tambah Peserta Didik Baru
                  </h3>
                  <p className="text-xs text-gray-500">Daftarkan siswa ke kelas bimbingan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    NISN / NIS (10 Digit)
                  </label>
                  <input
                    type="text"
                    placeholder="0012345678"
                    value={formNisn}
                    onChange={(e) => {
                      setFormNisn(e.target.value);
                      if (!formUsername) setFormUsername(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    placeholder="Auto jika kosong"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().trim())}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Target Kelas Binaan
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {assignableClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Password Awal
                  </label>
                  <input
                    type="password"
                    placeholder="Default: NISN"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} /> Otomatisasi Terintegrasi Admin
                </div>
                <p className="text-[11px] leading-relaxed">
                  Akun siswa langsung tersinkronisasi ke database Admin Utama, portal CBT, dan buku nilai mapel secara real-time.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT / UBAH KELAS SISWA */}
      {isEditModalOpen && editingStudent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                  <Edit3 size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Ubah Data & Kelas Siswa
                  </h3>
                  <p className="text-xs text-gray-500">Sesuaikan kelas binaan peserta didik</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  NISN / NIS
                </label>
                <input
                  type="text"
                  placeholder="0012345678"
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Kelas Binaan (Resmi Admin)
                </label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {assignableClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT MASSAL SISWA */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsImportModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                  <FileSpreadsheet size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Import Data Siswa Kolektif
                  </h3>
                  <p className="text-xs text-gray-500">Salin & tempel daftar siswa dari Excel atau CSV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Kelas Default:
                </label>
                <select
                  value={importClass}
                  onChange={(e) => setImportClass(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  {assignableClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Format: Nama Siswa, NISN [, Kelas] (Satu siswa per baris)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Contoh:\nAhmad Fauzi, 0081234567\nSiti Rahmawati, 0082345678, X DKV 1\nBudi Santoso, 0083456789, XI TJKT 1`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Petunjuk Cepat:</div>
                <p className="text-[11px] leading-relaxed">
                  Jika kolom ke-3 (Kelas) kosong, sistem akan otomatis menetapkan kelas <strong>{importClass}</strong> untuk siswa tersebut. Data langsung sinkron dengan Admin Utama.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Memproses Impor...' : 'Proses Impor Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
