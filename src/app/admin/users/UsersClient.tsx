'use client';

import { useState, useMemo, useRef } from 'react';
import type { User } from '@prisma/client';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search, 
  Shield, 
  Briefcase, 
  CheckSquare, 
  Loader2, 
  UserPlus, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { createUser, updateUser, deleteUser, createBulkStudents, BulkStudentItem } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

interface ParsedBulkStudent {
  name: string;
  nisn: string;
  username: string;
  password?: string;
  isValid: boolean;
  error?: string;
}

export default function UsersCRUD({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    username: '', 
    role: 'Siswa', 
    status: 'Aktif', 
    password: '',
    nisn: '' 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('siswa123');
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'default' | 'nisn'>('default');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: boolean;
    createdCount: number;
    skippedCount: number;
    skipped: { name: string; nisn: string; reason: string }[];
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    setFormData({ id: '', name: '', username: '', role: 'Siswa', status: 'Aktif', password: '', nisn: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: User) => {
    setFormData({ 
      id: item.id,
      name: item.name,
      username: item.username,
      role: item.role,
      status: item.status,
      password: '',
      nisn: item.nisn || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(deleteTarget.id);
      if (res?.success) {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res?.error || 'Gagal menghapus pengguna.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        const res = await updateUser(formData.id, formData);
        if (res?.success && res.data) {
          setUsers(users.map(u => u.id === formData.id ? res.data : u));
          setIsModalOpen(false);
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      } else {
        const res = await createUser(formData);
        if (res?.success && res.data) {
          setUsers([res.data, ...users]);
          setIsModalOpen(false);
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Parse bulk raw text into parsed student preview list
  const parsedBulkStudents = useMemo<ParsedBulkStudent[]>(() => {
    if (!bulkText.trim()) return [];

    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results: ParsedBulkStudent[] = [];
    const seenNisns = new Set<string>();

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      
      // Skip header lines like "NISN,Nama" or "Nama,NISN"
      if (index === 0 && (line.toLowerCase().includes('nisn') || line.toLowerCase().includes('nama'))) {
        continue;
      }

      // Detect separator: Tab, Semicolon, Comma, Pipe
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        // Space separated if only 2 parts (NISN and Name)
        const match = line.match(/^(\d{8,12})\s+(.+)$/);
        if (match) {
          parts = [match[1], match[2]];
        } else {
          parts = [line];
        }
      }

      parts = parts.map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;

      let nisn = '';
      let name = '';
      let customPassword = '';

      if (parts.length === 1) {
        // Only one piece of data
        if (/^\d{8,12}$/.test(parts[0])) {
          nisn = parts[0];
          name = '';
        } else {
          name = parts[0];
        }
      } else if (parts.length === 2) {
        // E.g. [0071234567, "Ahmad Fauzi"] or ["Ahmad Fauzi", 0071234567]
        if (/^\d{6,14}$/.test(parts[0])) {
          nisn = parts[0];
          name = parts[1];
        } else if (/^\d{6,14}$/.test(parts[1])) {
          name = parts[0];
          nisn = parts[1];
        } else {
          nisn = parts[0];
          name = parts[1];
        }
      } else {
        // 3 or more parts: [NISN, Name, Password] or [Name, NISN, Password]
        if (/^\d{6,14}$/.test(parts[0])) {
          nisn = parts[0];
          name = parts[1];
          customPassword = parts[2] || '';
        } else {
          name = parts[0];
          nisn = parts[1];
          customPassword = parts[2] || '';
        }
      }

      // Validation
      let isValid = true;
      let error = '';

      if (!name) {
        isValid = false;
        error = 'Nama siswa kosong';
      } else if (!nisn) {
        isValid = false;
        error = 'NISN kosong';
      } else if (!/^\d{8,12}$/.test(nisn)) {
        isValid = false;
        error = 'Format NISN harus angka (8-12 digit)';
      } else if (seenNisns.has(nisn)) {
        isValid = false;
        error = 'Duplikat NISN dalam daftar';
      } else {
        seenNisns.add(nisn);
      }

      results.push({
        name,
        nisn,
        username: nisn,
        password: customPassword,
        isValid,
        error,
      });
    }

    return results;
  }, [bulkText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkText(content);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = 
      "NISN,Nama Siswa,Password (Opsional)\n" +
      "0071234501,Ahmad Fauzi Pratama,siswa123\n" +
      "0071234502,Budi Santoso,siswa123\n" +
      "0071234503,Citra Dewi Lestari,siswa123\n" +
      "0071234504,Dimas Wahyu Ramadhan,siswa123\n" +
      "0071234505,Eka Putri Maharani,siswa123";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Siswa_SMK.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSampleData = () => {
    setBulkText(
      "0071234501\tAhmad Fauzi Pratama\n" +
      "0071234502\tBudi Santoso\n" +
      "0071234503\tCitra Dewi Lestari\n" +
      "0071234504\tDimas Wahyu Ramadhan\n" +
      "0071234505\tEka Putri Maharani"
    );
  };

  const handleExecuteBulkImport = async () => {
    const validStudents = parsedBulkStudents.filter(s => s.isValid);
    if (validStudents.length === 0) {
      alert('Tidak ada data siswa valid untuk diimpor. Periksa kembali nama dan NISN.');
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);

    try {
      const payload: BulkStudentItem[] = validStudents.map(s => ({
        name: s.name,
        nisn: s.nisn,
        username: s.username,
        password: s.password || (bulkPasswordMode === 'nisn' ? s.nisn : bulkDefaultPassword),
      }));

      const res = await createBulkStudents(payload, {
        defaultPassword: bulkDefaultPassword,
        useNisnAsPassword: bulkPasswordMode === 'nisn',
        useNisnAsUsername: true,
      });

      if (res?.success) {
        setBulkResult({
          success: true,
          createdCount: res.createdCount || 0,
          skippedCount: res.skippedCount || 0,
          skipped: res.skipped || [],
          errors: res.errors || [],
        });
        if (res.createdUsers && res.createdUsers.length > 0) {
          setUsers(prev => [...(res.createdUsers as User[]), ...prev]);
        }
      } else {
        alert(res?.error || 'Gagal melakukan import siswa.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setBulkLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = (users || []).filter((item: User) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nisn && item.nisn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalSiswa = users.filter(u => u.role === 'Siswa').length;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600 dark:text-indigo-400" /> Manajemen Akun Pengguna
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Kelola data login siswa, guru, dan administrator SMK ({totalSiswa} akun siswa terdaftar)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Tombol Kolektif Tambah Siswa */}
            <button
              onClick={() => {
                setBulkResult(null);
                setIsBulkModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all text-sm shadow-md shadow-indigo-600/20"
            >
              <UserPlus size={18} /> Tambah Siswa Kolektif
            </button>

            {/* Tombol Tambah Pengguna Reguler */}
            <button 
              onClick={handleAdd} 
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all text-sm shadow-sm shadow-indigo-600/30"
            >
              <Plus size={18} /> Tambah Pengguna
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NISN, atau username..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
              />
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Menampilkan <strong className="text-gray-900 dark:text-white">{filteredUsers.length}</strong> dari {users.length} akun</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-sm">
                  <th className="p-4 font-semibold">Nama Lengkap & NISN</th>
                  <th className="p-4 font-semibold">Username Login</th>
                  <th className="p-4 font-semibold">Password</th>
                  <th className="p-4 font-semibold">Role (Peran)</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item: User) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                        {item.nisn ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            NISN: {item.nisn}
                          </div>
                        ) : item.role === 'Siswa' ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono block mt-0.5">NISN: Belum diisi</span>
                        ) : null}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300 font-mono text-sm font-medium">
                        {item.username}
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                        {item.password}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {item.role === 'Super Admin' && <Shield size={14} className="text-red-500"/>}
                          {item.role === 'Admin BKK' && <Briefcase size={14} className="text-amber-500"/>}
                          {item.role === 'Panitia PPDB' && <CheckSquare size={14} className="text-blue-500"/>}
                          {item.role === 'Siswa' && <GraduationCap size={14} className="text-purple-500"/>}
                          {item.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'Aktif' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteTarget(item)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Hapus"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Single Add / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden text-gray-900 dark:text-white transition-all">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Contoh: Ahmad Fauzi Pratama"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role (Peran)</label>
                    <select 
                      required 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Siswa">Siswa</option>
                      <option value="Guru">Guru</option>
                      <option value="Panitia PPDB">Panitia PPDB</option>
                      <option value="Admin BKK">Admin BKK</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status Akun</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                {/* NISN Input Khusus Siswa */}
                {formData.role === 'Siswa' && (
                  <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                        <GraduationCap size={15} /> NISN Siswa (Nomor Induk Siswa Nasional)
                      </label>
                      <span className="text-[10px] bg-purple-200 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full font-bold">Wajib Siswa</span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={12}
                      value={formData.nisn} 
                      onChange={e => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setFormData(prev => ({
                          ...prev, 
                          nisn: val,
                          username: (!prev.username || prev.username === prev.nisn) ? val : prev.username
                        }));
                      }} 
                      placeholder="Contoh: 0071234567" 
                      className="w-full px-3.5 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-sm font-semibold"
                    />
                    <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-400">
                      <span>Format 10 digit angka resmi Dapodik</span>
                      {formData.nisn && formData.username !== formData.nisn && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, username: prev.nisn }))}
                          className="text-purple-600 dark:text-purple-300 hover:underline font-bold"
                        >
                          Gunakan sebagai username
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username Login</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
                      placeholder="username atau NISN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Password
                    </label>
                    <input 
                      type="text" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder={isEditing ? 'Biarkan kosong jika tidak diubah' : (formData.nisn ? 'Kosong = NISN' : 'Kosong = Acak')} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm">Batal</button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-sm shadow-indigo-600/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Simpan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Siswa Kolektif (Bulk Import) */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl overflow-hidden text-gray-900 dark:text-white transition-all my-8 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tambah Siswa Kolektif (Massal)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Import puluhan akun siswa sekaligus dalam hitungan detik menggunakan NISN
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBulkModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* Result Alert if available */}
                {bulkResult && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                      Import Selesai: Berhasil membuat {bulkResult.createdCount} akun siswa!
                    </div>
                    {bulkResult.skippedCount > 0 && (
                      <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50 space-y-1">
                        <div className="font-semibold">{bulkResult.skippedCount} data dilewati (duplikat atau tidak valid):</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {bulkResult.skipped.slice(0, 5).map((s, idx) => (
                            <li key={idx}>{s.name} ({s.nisn}): {s.reason}</li>
                          ))}
                          {bulkResult.skipped.length > 5 && (
                            <li>...dan {bulkResult.skipped.length - 5} lainnya</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/80 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept=".csv,.txt" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <Upload size={14} /> Upload File CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <Download size={14} /> Unduh Format Template
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles size={14} /> Muat Contoh Data
                  </button>
                </div>

                {/* Textarea Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      Paste Data Siswa (Format: NISN [Tab/Koma] Nama Lengkap)
                    </label>
                    <span className="text-xs text-gray-500">Bisa copy langsung dari kolom Excel / Google Sheets</span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Contoh:&#10;0071234501	Ahmad Fauzi Pratama&#10;0071234502	Budi Santoso&#10;0071234503	Citra Dewi Lestari"
                    className="w-full p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Password Setting Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Pengaturan Password Akun:
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={bulkPasswordMode === 'default'}
                          onChange={() => setBulkPasswordMode('default')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Gunakan password default yang sama</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={bulkPasswordMode === 'nisn'}
                          onChange={() => setBulkPasswordMode('nisn')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Gunakan masing-masing NISN sebagai password</span>
                      </label>
                    </div>
                  </div>

                  {bulkPasswordMode === 'default' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Password Default:
                      </label>
                      <input
                        type="text"
                        value={bulkDefaultPassword}
                        onChange={e => setBulkDefaultPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="siswa123"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Siswa dapat mengganti password setelah berhasil login.</p>
                    </div>
                  )}
                </div>

                {/* Live Preview Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-indigo-600" />
                      Pratinjau Akun ({parsedBulkStudents.length} baris terdeteksi)
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-bold rounded-lg text-xs">
                        {parsedBulkStudents.filter(s => s.isValid).length} Valid
                      </span>
                      {parsedBulkStudents.filter(s => !s.isValid).length > 0 && (
                        <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold rounded-lg text-xs">
                          {parsedBulkStudents.filter(s => !s.isValid).length} Tidak Valid
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 z-10">
                        <tr>
                          <th className="p-3 font-bold w-12 text-center">No</th>
                          <th className="p-3 font-bold">NISN</th>
                          <th className="p-3 font-bold">Nama Lengkap Siswa</th>
                          <th className="p-3 font-bold">Username Login</th>
                          <th className="p-3 font-bold">Password</th>
                          <th className="p-3 font-bold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                        {parsedBulkStudents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400 font-sans">
                              Belum ada data. Silakan paste baris nama dan NISN di kotak atas atau klik &quot;Muat Contoh Data&quot;.
                            </td>
                          </tr>
                        ) : (
                          parsedBulkStudents.map((item, idx) => (
                            <tr key={idx} className={item.isValid ? "hover:bg-gray-50/60 dark:hover:bg-gray-800/40" : "bg-red-50/50 dark:bg-red-950/20"}>
                              <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                              <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{item.nisn || '-'}</td>
                              <td className="p-3 font-sans font-medium text-gray-900 dark:text-white">{item.name || '-'}</td>
                              <td className="p-3 text-gray-600 dark:text-gray-400">{item.username || '-'}</td>
                              <td className="p-3 text-gray-500">
                                {item.password || (bulkPasswordMode === 'nisn' ? item.nisn : bulkDefaultPassword)}
                              </td>
                              <td className="p-3 text-center font-sans">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-[11px]">
                                    <Check size={14} /> Siap
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px]" title={item.error}>
                                    <AlertCircle size={14} /> {item.error}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={bulkLoading || parsedBulkStudents.filter(s => s.isValid).length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md shadow-indigo-600/30 transition-all"
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Sedang Mengimpor...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Simpan {parsedBulkStudents.filter(s => s.isValid).length} Akun Siswa Sekarang
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modern 3D Confirm Modal */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Hapus Akun Pengguna?"
          message={
            <span>
              Apakah Anda yakin ingin menghapus akun pengguna{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {deleteTarget?.name} (@{deleteTarget?.username})
              </strong>
              {deleteTarget?.nisn && <span> dengan NISN <strong className="font-mono">{deleteTarget.nisn}</strong></span>}
              ? Pengguna ini tidak akan dapat login lagi ke dalam sistem.
            </span>
          }
          confirmText="Ya, Hapus Akun"
          cancelText="Batalkan"
          variant="danger"
        />
      </div>
    </div>
  );
}
