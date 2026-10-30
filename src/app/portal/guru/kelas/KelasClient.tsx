'use client';

import { useState } from 'react';
import { 
  Users, 
  Search, 
  GraduationCap, 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  ExternalLink, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileSpreadsheet,
  UserPlus,
  Key,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { createStudentByGuru, importStudentsByGuru } from './actions';

interface StudentItem {
  id: string;
  name: string;
  username: string;
  nisn: string | null;
  role: string;
  status: string;
  createdAt: Date | string;
}

export default function KelasClient({
  students: initialStudents,
  teacherName,
  classTargets = ['Semua Kelas', 'X RPL 1', 'XI RPL 1', 'XII RPL 1', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
}: {
  students: StudentItem[];
  teacherName: string;
  classTargets?: string[];
}) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formClass, setFormClass] = useState('XI RPL 1');

  // Import Field
  const [importText, setImportText] = useState('');

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const classOptions = [
    { id: 'ALL', label: 'Semua Kelas' },
    ...classTargets
      .filter((c) => c !== 'Semua Kelas')
      .map((c) => ({
        id: c,
        label: c.includes('XI RPL 1') ? `${c} (Wali Kelas)` : c,
      })),
  ];

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const handleOpenAddModal = () => {
    setFormName('');
    setFormNisn('');
    setFormUsername('');
    setFormPassword('');
    setFormClass(selectedClass !== 'ALL' ? selectedClass : 'XI RPL 1');
    setIsAddModalOpen(true);
  };

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

      if (res.error) {
        showNotify('error', res.error);
      } else if (res.data) {
        showNotify('success', `Siswa ${res.data.name} berhasil ditambahkan ke kelas ${formClass}!`);
        setStudents((prev) => [res.data as StudentItem, ...prev]);
        setIsAddModalOpen(false);
      }
    } catch {
      showNotify('error', 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      showNotify('error', 'Data impor tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      // Format: Nama Siswa, NISN
      const lines = importText.split('\n').filter((l) => l.trim() !== '');
      const parsedRows = lines.map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        const name = parts[0] || '';
        const nisn = parts[1] || '';
        return { name, nisn };
      }).filter((r) => r.name !== '');

      if (parsedRows.length === 0) {
        showNotify('error', 'Tidak ada data valid yang dapat diproses.');
        setLoading(false);
        return;
      }

      const res = await importStudentsByGuru(parsedRows);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Berhasil mengimpor ${res.count} siswa ke kelas!`);
        setIsImportModalOpen(false);
        setImportText('');
        // Refresh page data
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
            Wali Kelas: <strong className="text-gray-900 dark:text-white">{teacherName}</strong> (XI RPL 1)
          </p>
        </div>

        {/* Action Buttons for Guru */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

      {/* MODAL 1: TAMBAH SISWA BARU LANGSUNG OLEH GURU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
                    Target Kelas
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {classTargets.filter((c) => c !== 'Semua Kelas').map((c) => (
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
                  <Sparkles size={14} /> Otomatisasi Terintegrasi
                </div>
                <p className="text-[11px] leading-relaxed">
                  Akun siswa langsung aktif dan disinkronkan ke buku nilai mapel kelas Anda. Siswa dapat login dengan NISN atau username yang didaftarkan.
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

      {/* MODAL 2: IMPORT MASSAL SISWA */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
                  Format: Nama Siswa, NISN (Satu siswa per baris)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Contoh:\nAhmad Fauzi, 0081234567\nSiti Rahmawati, 0082345678\nBudi Santoso, 0083456789`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Petunjuk Cepat:</div>
                <p className="text-[11px] leading-relaxed">
                  Anda dapat menyalin kolom <strong>Nama</strong> dan <strong>NISN</strong> langsung dari tabel Microsoft Excel atau Google Spreadsheet, lalu menempelkannya di kotak teks di atas.
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
