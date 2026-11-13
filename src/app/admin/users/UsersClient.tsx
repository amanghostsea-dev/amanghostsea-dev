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
  GraduationCap,
  Layers
} from 'lucide-react';
import { createUser, updateUser, deleteUser, createBulkStudents, BulkStudentItem } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

interface ParsedBulkStudent {
  name: string;
  nisn: string;
  studentClass?: string;
  username: string;
  password?: string;
  isValid: boolean;
  error?: string;
}

// Helper: Parser baris CSV / TSV yang mendukung tanda kutip dan aneka delimiter (tab, koma, titik koma)
function parseDelimitedLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  // Prioritas pemisah tab jika hasil copy-paste dari spreadsheet (Excel / Google Sheets)
  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  }

  // Tentukan pemisah (titik koma atau koma)
  const sep = trimmed.includes(';') ? ';' : ',';
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      tokens.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim().replace(/^["']|["']$/g, ''));
  return tokens;
}

export interface JurusanOption {
  id: string;
  name: string;
  code: string;
  kuota: number;
  description: string;
}

export interface UsersCRUDProps {
  initialUsers: User[];
  jurusans?: JurusanOption[];
  classTargets?: string[];
  studentClassMap?: Record<string, string>;
}

export default function UsersCRUD({ 
  initialUsers,
  jurusans = [],
  classTargets = [],
  studentClassMap = {},
}: UsersCRUDProps) {
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    username: '', 
    role: 'Siswa', 
    status: 'Aktif', 
    password: '',
    nisn: '',
    studentClass: 'XI RPL 1',
  });
  const [selectedJurusanCode, setSelectedJurusanCode] = useState(jurusans[0]?.code || 'RPL');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('siswa123');
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'default' | 'nisn'>('default');
  const [bulkClass, setBulkClass] = useState('XI RPL 1');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: boolean;
    createdCount: number;
    skippedCount: number;
    skipped: { name: string; nisn: string; reason: string }[];
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available classes for selected jurusan
  const availableClassesForJurusan = useMemo(() => {
    const filtered = classTargets.filter(c => 
      c !== 'Semua Kelas' && c.toUpperCase().includes(selectedJurusanCode.toUpperCase())
    );
    if (filtered.length > 0) return filtered;
    return [`X ${selectedJurusanCode} 1`, `XI ${selectedJurusanCode} 1`, `XII ${selectedJurusanCode} 1`];
  }, [classTargets, selectedJurusanCode]);

  const handleJurusanChange = (code: string) => {
    setSelectedJurusanCode(code);
    const matchedClass = classTargets.find(c => c !== 'Semua Kelas' && c.toUpperCase().includes(code.toUpperCase())) || `XI ${code} 1`;
    setFormData(prev => ({ ...prev, studentClass: matchedClass }));
  };

  const handleAdd = () => {
    const defaultJurusan = jurusans[0]?.code || 'RPL';
    setSelectedJurusanCode(defaultJurusan);
    const defaultClass = classTargets.find(c => c !== 'Semua Kelas' && c.toUpperCase().includes(defaultJurusan.toUpperCase())) || `XI ${defaultJurusan} 1`;
    setFormData({ 
      id: '', 
      name: '', 
      username: '', 
      role: 'Siswa', 
      status: 'Aktif', 
      password: '', 
      nisn: '',
      studentClass: defaultClass,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: User) => {
    const userClass = studentClassMap[item.name] || (item.nisn && studentClassMap[item.nisn]) || 'XI RPL 1';
    const matchedJurusan = jurusans.find(j => userClass.toUpperCase().includes(j.code.toUpperCase()))?.code || jurusans[0]?.code || 'RPL';
    setSelectedJurusanCode(matchedJurusan);

    setFormData({ 
      id: item.id,
      name: item.name,
      username: item.username,
      role: item.role,
      status: item.status,
      password: '',
      nisn: item.nisn || '',
      studentClass: userClass,
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
          if (formData.role === 'Siswa' && formData.studentClass) {
            studentClassMap[formData.name] = formData.studentClass;
            if (formData.nisn) studentClassMap[formData.nisn] = formData.studentClass;
          }
          setIsModalOpen(false);
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      } else {
        const res = await createUser(formData);
        if (res?.success && res.data) {
          setUsers([res.data, ...users]);
          if (formData.role === 'Siswa' && formData.studentClass) {
            studentClassMap[formData.name] = formData.studentClass;
            if (formData.nisn) studentClassMap[formData.nisn] = formData.studentClass;
          }
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
    if (lines.length === 0) return [];

    const results: ParsedBulkStudent[] = [];
    const seenNisns = new Set<string>();
    const seenUsernames = new Set<string>();

    let nisnCol = -1;
    let nameCol = -1;
    let classCol = -1;
    let userCol = -1;
    let passCol = -1;
    let startIndex = 0;

    // Deteksi jika baris pertama adalah baris header (NISN, Nama, Kelas, Username, Password)
    const line0Tokens = parseDelimitedLine(lines[0]);
    const lowerTokens = line0Tokens.map(t => t.toLowerCase());

    const hasHeaderNisn = lowerTokens.some(t => t.includes('nisn'));
    const hasHeaderName = lowerTokens.some(t => t.includes('nama') || t.includes('name'));

    if (hasHeaderNisn || hasHeaderName) {
      startIndex = 1;
      nisnCol = lowerTokens.findIndex(t => t.includes('nisn'));
      nameCol = lowerTokens.findIndex(t => t.includes('nama') || t.includes('name'));
      classCol = lowerTokens.findIndex(t => t.includes('kelas') || t.includes('class') || t.includes('rombel'));
      userCol = lowerTokens.findIndex(t => t.includes('user'));
      passCol = lowerTokens.findIndex(t => t.includes('pass'));
    }

    for (let index = startIndex; index < lines.length; index++) {
      const line = lines[index];
      const parts = parseDelimitedLine(line);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      let nisn = '';
      let name = '';
      let studentClass = '';
      let username = '';
      let password = '';

      if (startIndex === 1) {
        // Ambil data berdasarkan indeks kolom header yang terdeteksi
        if (nisnCol !== -1 && parts[nisnCol]) nisn = parts[nisnCol];
        if (nameCol !== -1 && parts[nameCol]) name = parts[nameCol];
        if (classCol !== -1 && parts[classCol]) studentClass = parts[classCol];
        if (userCol !== -1 && parts[userCol]) username = parts[userCol];
        if (passCol !== -1 && parts[passCol]) password = parts[passCol];
      } else {
        // Pemetaan posisi jika tanpa baris header
        if (parts.length >= 5) {
          nisn = parts[0];
          name = parts[1];
          studentClass = parts[2];
          username = parts[3];
          password = parts[4];
        } else if (parts.length === 4) {
          nisn = parts[0];
          name = parts[1];
          studentClass = parts[2];
          username = parts[3];
        } else if (parts.length === 3) {
          nisn = parts[0];
          name = parts[1];
          studentClass = parts[2];
        } else if (parts.length === 2) {
          if (/^\d+$/.test(parts[0])) {
            nisn = parts[0];
            name = parts[1];
          } else if (/^\d+$/.test(parts[1])) {
            nisn = parts[1];
            name = parts[0];
          } else {
            nisn = parts[0];
            name = parts[1];
          }
        } else if (parts.length === 1) {
          const match = parts[0].match(/^(\d{8,12})\s+(.+)$/);
          if (match) {
            nisn = match[1];
            name = match[2];
          } else {
            name = parts[0];
          }
        }
      }

      // Bersihkan dan tetapkan nilai default fallback
      nisn = nisn.replace(/[^\d]/g, '');
      if (!studentClass) studentClass = bulkClass;
      if (!username) username = nisn || name.toLowerCase().replace(/\s+/g, '');
      if (!password) {
        password = bulkPasswordMode === 'nisn' ? (nisn || 'siswa123') : bulkDefaultPassword;
      }

      let isValid = true;
      let error = '';

      if (!name) {
        isValid = false;
        error = 'Nama tidak boleh kosong';
      } else if (!nisn) {
        isValid = false;
        error = 'NISN tidak boleh kosong';
      } else if (!/^\d{8,12}$/.test(nisn)) {
        isValid = false;
        error = 'NISN harus 8-12 angka';
      } else if (seenNisns.has(nisn)) {
        isValid = false;
        error = 'Duplikat NISN dalam daftar impor';
      } else if (seenUsernames.has(username.toLowerCase())) {
        isValid = false;
        error = `Username "${username}" duplikat dalam daftar`;
      }

      if (nisn) seenNisns.add(nisn);
      if (username) seenUsernames.add(username.toLowerCase());

      results.push({
        name,
        nisn,
        studentClass,
        username,
        password,
        isValid,
        error,
      });
    }

    return results;
  }, [bulkText, bulkClass, bulkPasswordMode, bulkDefaultPassword]);

  const validStudentsCount = parsedBulkStudents.filter(s => s.isValid).length;
  const invalidStudentsCount = parsedBulkStudents.length - validStudentsCount;

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkText(content);
        setBulkResult(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Unduh template CSV resmi sesuai kriteria lengkap data Siswa SMK
  const handleDownloadCsvTemplate = () => {
    const defaultSampleClass = classTargets.find(c => c !== 'Semua Kelas') || 'XI RPL 1';
    const sampleClass2 = classTargets.find(c => c !== 'Semua Kelas' && c !== defaultSampleClass) || 'XI TJKT 1';
    const sampleClass3 = classTargets.find(c => c !== 'Semua Kelas' && c !== defaultSampleClass && c !== sampleClass2) || 'X DKV 1';

    const headers = ['NISN', 'Nama Lengkap', 'Kelas', 'Username', 'Password'];
    const rows = [
      ['0081234501', 'Ahmad Fauzi Pratama', defaultSampleClass, '0081234501', 'siswa123'],
      ['0081234502', 'Budi Santoso', defaultSampleClass, '0081234502', 'siswa123'],
      ['0081234503', 'Citra Dewi Lestari', sampleClass2, '0081234503', 'siswa123'],
      ['0081234504', 'Dwi Kurniawan', sampleClass2, '0081234504', 'siswa123'],
      ['0081234505', 'Eka Putri Rahayu', sampleClass3, '0081234505', 'siswa123'],
    ];

    // Gunakan UTF-8 BOM (\uFEFF) agar Microsoft Excel di Windows langsung membuka CSV dengan kolom terpisah rapi
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.map(val => val.includes(',') ? `"${val}"` : val).join(','))
    ].join('\r\n') + '\r\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_siswa_smk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Muat contoh data demo
  const handleLoadSampleData = () => {
    const defaultSampleClass = classTargets.find(c => c !== 'Semua Kelas') || 'XI RPL 1';
    const sampleClass2 = classTargets.find(c => c !== 'Semua Kelas' && c !== defaultSampleClass) || 'XI TJKT 1';
    const sampleClass3 = classTargets.find(c => c !== 'Semua Kelas' && c !== defaultSampleClass && c !== sampleClass2) || 'X DKV 1';

    const sample = `NISN\tNama Lengkap\tKelas\tUsername\tPassword
0081122331\tAditia Pratama Putra\t${defaultSampleClass}\t0081122331\tsiswa123
0081122332\tAnnisa Bella Safitri\t${defaultSampleClass}\t0081122332\tsiswa123
0081122333\tBagas Arya Yudha\t${sampleClass2}\t0081122333\tsiswa123
0081122334\tCantika Putri Wulandari\t${sampleClass2}\t0081122334\tsiswa123
0081122335\tDimas Wahyu Nugroho\t${sampleClass3}\t0081122335\tsiswa123`;
    setBulkText(sample);
    setBulkResult(null);
  };

  // Process Bulk Submit
  const handleBulkSubmit = async () => {
    const validStudents = parsedBulkStudents.filter(s => s.isValid);
    if (validStudents.length === 0) {
      alert('Tidak ada data siswa yang valid untuk diimpor.');
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
        studentClass: s.studentClass || bulkClass,
      }));

      const res = await createBulkStudents(payload, {
        defaultPassword: bulkDefaultPassword,
        useNisnAsPassword: bulkPasswordMode === 'nisn',
        useNisnAsUsername: false,
        studentClass: bulkClass,
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
          setUsers(prev => [...(res.createdUsers as unknown as User[]), ...prev]);
          for (const u of res.createdUsers) {
            const assignedClass = (u as any).studentClass || bulkClass;
            studentClassMap[u.name] = assignedClass;
            if (u.nisn) studentClassMap[u.nisn] = assignedClass;
          }
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
              <Users size={14} /> Hak Akses & Akun Pengguna
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Akun</h1>
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
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                  <th className="p-4">Nama Lengkap & NISN</th>
                  <th className="p-4">Username Login</th>
                  <th className="p-4">Password Awal</th>
                  <th className="p-4">Peran (Role)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                      Tidak ada akun pengguna yang cocok dengan pencarian
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item: User) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                        {item.role === 'Siswa' ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.nisn ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                NISN: {item.nisn}
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">NISN: Belum diisi</span>
                            )}
                            {(studentClassMap[item.name] || (item.nisn && studentClassMap[item.nisn])) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {studentClassMap[item.name] || (item.nisn && studentClassMap[item.nisn])}
                              </span>
                            )}
                          </div>
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

                {/* NISN & Jurusan Khusus Siswa */}
                {formData.role === 'Siswa' && (
                  <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3">
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

                    {/* Dropdown Jurusan & Rombel Kelas untuk Siswa */}
                    <div className="pt-3 border-t border-purple-200/80 dark:border-purple-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 mb-1 flex items-center gap-1">
                          <Layers size={13} className="text-purple-600" /> Program Keahlian (Jurusan) *
                        </label>
                        <select
                          value={selectedJurusanCode}
                          onChange={(e) => handleJurusanChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                        >
                          {jurusans.map((j) => (
                            <option key={j.id} value={j.code}>
                              {j.code} - {j.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 mb-1 flex items-center gap-1">
                          <GraduationCap size={13} className="text-purple-600" /> Target Kelas Siswa *
                        </label>
                        <select
                          value={formData.studentClass}
                          onChange={(e) => setFormData(prev => ({ ...prev, studentClass: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                        >
                          {availableClassesForJurusan.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
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
                      Import puluhan akun siswa sekaligus menggunakan format template standar Dapodik & CBT
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
                      className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <Upload size={14} /> Upload File CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-purple-600/25 cursor-pointer"
                    >
                      <Download size={14} /> Unduh Format Template
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Muat Contoh Data
                  </button>
                </div>

                {/* Panduan Format Kolom */}
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                      <FileSpreadsheet size={15} className="text-blue-600" /> Kriteria Data Kolom Tambah User Siswa:
                    </span>
                    <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">5 Kolom Standar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">1. NISN</span>
                      <span className="text-gray-500 text-[10px]">Wajib (8-12 angka)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">2. Nama Lengkap</span>
                      <span className="text-gray-500 text-[10px]">Wajib (Nama Siswa)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">3. Kelas</span>
                      <span className="text-gray-500 text-[10px]">Misal: XI RPL 1</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">4. Username</span>
                      <span className="text-gray-500 text-[10px]">Opsional (Otomatis NISN)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">5. Password</span>
                      <span className="text-gray-500 text-[10px]">Opsional (Default: siswa123)</span>
                    </div>
                  </div>
                </div>

                {/* Pilihan Target Kelas untuk Impor Massal */}
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                      <Layers size={14} className="text-purple-600" />
                      Target Kelas Cadangan (Fallback):
                    </label>
                    <p className="text-[11px] text-purple-700/80 dark:text-purple-400">
                      Digunakan jika kolom Kelas pada file/paste kosong. Siswa yang memiliki kolom Kelas di file akan otomatis terdaftar sesuai kelasnya masing-masing.
                    </p>
                  </div>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    className="px-3.5 py-2 bg-white dark:bg-gray-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    {classTargets.filter(c => c !== 'Semua Kelas').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Textarea Input */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      Data Siswa: NISN, Nama Lengkap, Kelas, Username, Password
                    </label>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Bisa copy langsung dari Excel / CSV</span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Contoh format CSV / Excel:&#10;NISN,Nama Lengkap,Kelas,Username,Password&#10;0081234501,Ahmad Fauzi Pratama,XI RPL 1,0081234501,siswa123&#10;0081234502,Budi Santoso,XI RPL 1,0081234502,siswa123&#10;0081234503,Citra Dewi Lestari,XI TJKT 1,0081234503,siswa123"
                    className="w-full p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Password Setting Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Pengaturan Password Akun (Jika Kolom Password Kosong):
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
                    </div>
                  )}
                </div>

                {/* Live Preview parsed table */}
                {parsedBulkStudents.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-purple-600" />
                        <span>Pratinjau Data ({parsedBulkStudents.length} baris terdeteksi)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                          {validStudentsCount} Valid
                        </span>
                        {invalidStudentsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-semibold font-mono">
                            {invalidStudentsCount} Error
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="p-2.5 pl-4 w-10 text-center">No</th>
                            <th className="p-2.5">Nama Siswa</th>
                            <th className="p-2.5 font-mono">NISN</th>
                            <th className="p-2.5">Kelas</th>
                            <th className="p-2.5 font-mono">Username</th>
                            <th className="p-2.5 font-mono">Password</th>
                            <th className="p-2.5 pr-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {parsedBulkStudents.map((s, idx) => (
                            <tr key={idx} className={s.isValid ? 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30' : 'bg-red-50/40 dark:bg-red-950/20'}>
                              <td className="p-2.5 pl-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                              <td className="p-2.5 font-semibold text-gray-900 dark:text-white">{s.name || '-'}</td>
                              <td className="p-2.5 font-mono text-gray-700 dark:text-gray-300">{s.nisn || '-'}</td>
                              <td className="p-2.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px]">
                                  {s.studentClass || bulkClass}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-gray-700 dark:text-gray-300">{s.username || '-'}</td>
                              <td className="p-2.5 font-mono text-gray-500 dark:text-gray-400">{s.password || '-'}</td>
                              <td className="p-2.5 pr-4 text-right">
                                {s.isValid ? (
                                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                    <Check size={13} /> Siap
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center justify-end gap-1" title={s.error}>
                                    <AlertCircle size={13} /> {s.error}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Batal
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {validStudentsCount > 0 ? `${validStudentsCount} siswa siap diimport` : 'Isi data terlebih dahulu'}
                  </span>
                  <button
                    type="button"
                    disabled={validStudentsCount === 0 || bulkLoading}
                    onClick={handleBulkSubmit}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {bulkLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Memproses Import...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} /> Import {validStudentsCount > 0 ? `${validStudentsCount} Siswa` : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Pengguna"
          message={`Apakah Anda yakin ingin menghapus akun "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Ya, Hapus"
          isLoading={isDeleting}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    </div>
  );
}
