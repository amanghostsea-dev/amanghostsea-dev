'use client';

import { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search, 
  ArrowLeft, 
  Loader2, 
  Layers, 
  GraduationCap, 
  Users, 
  MapPin, 
  UserCheck, 
  Sparkles,
  School,
  Building,
  CheckCircle2
} from 'lucide-react';
import { createJurusan, updateJurusan, deleteJurusan, saveClassAction, deleteClassAction } from './actions';
import { SchoolClassItem } from '@/lib/kelas-service';
import ConfirmModal from '@/components/ConfirmModal';

interface TeacherOption {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface JurusanClientProps {
  initialJurusan: any[];
  initialClasses?: SchoolClassItem[];
  teachers?: TeacherOption[];
  studentCountMap?: Record<string, number>;
  initialTab?: 'jurusan' | 'kelas';
}

export default function JurusanClient({
  initialJurusan,
  initialClasses = [],
  teachers = [],
  studentCountMap = {},
  initialTab = 'jurusan',
}: JurusanClientProps) {
  const [activeTab, setActiveTab] = useState<'jurusan' | 'kelas'>(initialTab);

  // 🏢 State Manajemen Jurusan
  const [jurusan, setJurusan] = useState(initialJurusan);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '', kuota: 36 });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 🎓 State Manajemen Kelas & Rombel
  const [classes, setClasses] = useState<SchoolClassItem[]>(initialClasses);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [classForm, setClassForm] = useState<{
    id?: string;
    level: 'X' | 'XI' | 'XII';
    jurusanCode: string;
    rombel: number;
    waliKelas: string;
    waliKelasId: string;
    room: string;
    capacity: number;
  }>({
    level: 'X',
    jurusanCode: initialJurusan[0]?.code || 'RPL',
    rombel: 1,
    waliKelas: '',
    waliKelasId: '',
    room: 'Lab Komputer 1',
    capacity: 36,
  });
  const [classSearch, setClassSearch] = useState('');
  const [filterClassJurusan, setFilterClassJurusan] = useState('ALL');
  const [filterClassLevel, setFilterClassLevel] = useState('ALL');
  const [deleteClassTarget, setDeleteClassTarget] = useState<SchoolClassItem | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [classLoading, setClassLoading] = useState(false);

  // Stats calculation
  const totalRombel = classes.length;
  const totalSiswaTerdaftar = Object.values(studentCountMap).reduce((a, b) => a + b, 0);
  const totalKuota = jurusan.reduce((sum, j) => sum + (j.kuota || 0), 0);

  // 🏢 Handlers Jurusan
  const handleAdd = () => {
    setFormData({ id: '', name: '', code: '', description: '', kuota: 36 });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description,
      kuota: item.kuota || 36
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteJurusan(deleteTarget.id);
    if (res.success) {
      setJurusan(jurusan.filter(j => j.id !== deleteTarget.id));
      setClasses(classes.filter(c => c.jurusanCode.toUpperCase() !== deleteTarget.code.toUpperCase()));
      setDeleteTarget(null);
    } else {
      alert(res.error || 'Gagal menghapus jurusan.');
    }
    setIsDeleting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isEditing) {
      const res = await updateJurusan(formData.id, formData);
      if (res.success) {
        setJurusan(jurusan.map(j => j.id === formData.id ? res.data : j));
        setIsModalOpen(false);
      } else {
        alert(res.error);
      }
    } else {
      const res = await createJurusan(formData);
      if (res.success) {
        setJurusan([...jurusan, res.data]);
        // Auto-seed kelas untuk jurusan baru
        const code = (res.data.code || '').toUpperCase();
        const newClasses: SchoolClassItem[] = ['X', 'XI', 'XII'].map(lvl => ({
          id: `cls-${lvl.toLowerCase()}-${code.toLowerCase()}-1`,
          name: `${lvl} ${code} 1`,
          level: lvl as any,
          jurusanCode: code,
          rombel: 1,
          waliKelas: 'Guru Pengampu',
          room: `Ruang ${code} ${lvl}`,
          capacity: 36,
        }));
        setClasses(prev => [...prev, ...newClasses]);
        setIsModalOpen(false);
      } else {
        alert(res.error);
      }
    }
    setLoading(false);
  };

  const filteredJurusan = jurusan.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 🎓 Handlers Kelas / Rombel
  const handleOpenAddClass = () => {
    const defaultJurusan = jurusan[0]?.code || 'RPL';
    setClassForm({
      level: 'X',
      jurusanCode: defaultJurusan,
      rombel: 1,
      waliKelas: teachers[0]?.name || '',
      waliKelasId: teachers[0]?.id || '',
      room: `Lab ${defaultJurusan}`,
      capacity: 36,
    });
    setIsEditingClass(false);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (c: SchoolClassItem) => {
    setClassForm({
      id: c.id,
      level: c.level,
      jurusanCode: c.jurusanCode,
      rombel: c.rombel,
      waliKelas: c.waliKelas || '',
      waliKelasId: c.waliKelasId || '',
      room: c.room || '',
      capacity: c.capacity || 36,
    });
    setIsEditingClass(true);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassLoading(true);

    try {
      const res = await saveClassAction(classForm);
      if (res?.success && res.data) {
        if (isEditingClass) {
          setClasses(classes.map(c => c.id === res.data.id ? res.data : c));
        } else {
          setClasses([...classes, res.data]);
        }
        setIsClassModalOpen(false);
      } else {
        alert(res?.error || 'Gagal menyimpan data kelas.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setClassLoading(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!deleteClassTarget) return;
    setIsDeletingClass(true);
    try {
      const res = await deleteClassAction(deleteClassTarget.id);
      if (res?.success) {
        setClasses(classes.filter(c => c.id !== deleteClassTarget.id));
        setDeleteClassTarget(null);
      } else {
        alert(res?.error || 'Gagal menghapus kelas.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kelas.');
    } finally {
      setIsDeletingClass(false);
    }
  };

  // Preview generated class name in modal
  const previewClassName = `${classForm.level} ${classForm.jurusanCode} ${classForm.rombel}`;

  const filteredClasses = classes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      (c.waliKelas && c.waliKelas.toLowerCase().includes(classSearch.toLowerCase())) ||
      (c.room && c.room.toLowerCase().includes(classSearch.toLowerCase()));

    const matchesJurusan = filterClassJurusan === 'ALL' || c.jurusanCode.toUpperCase() === filterClassJurusan.toUpperCase();
    const matchesLevel = filterClassLevel === 'ALL' || c.level === filterClassLevel;

    return matchesSearch && matchesJurusan && matchesLevel;
  });

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
              <Layers size={14} /> Struktur Akademik & Rombongan Belajar
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Jurusan & Manajemen Kelas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Atur program keahlian, pembagian rombongan belajar (rombel), dan wali kelas terintegrasi
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="text-xs text-gray-400 font-medium">Total Jurusan</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{jurusan.length} Program</div>
            </div>
            <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="text-xs text-gray-400 font-medium">Total Rombel</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalRombel} Kelas</div>
            </div>
          </div>
        </div>

        {/* 🎛️ Segmented Top Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl w-full sm:w-fit border border-gray-200 dark:border-gray-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('jurusan')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'jurusan'
                ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BookOpen size={16} />
            <span>Data Program Jurusan</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">
              {jurusan.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kelas')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'kelas'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/10'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap size={16} />
            <span>Manajemen Rombel & Kelas</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
              {totalRombel}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: DATA PROGRAM JURUSAN                               */}
        {/* ========================================================= */}
        {activeTab === 'jurusan' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari program jurusan atau kode..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all" 
                />
                <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              </div>

              <button 
                onClick={handleAdd} 
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/30 text-sm cursor-pointer"
              >
                <Plus size={18} /> Tambah Program Jurusan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4">Nama Program Keahlian</th>
                    <th className="p-4">Kode Singkat</th>
                    <th className="p-4">Rombel Aktif</th>
                    <th className="p-4">Deskripsi Singkat</th>
                    <th className="p-4">Kuota Siswa</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {filteredJurusan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400">
                        Tidak ada data jurusan yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredJurusan.map(item => {
                      const jurusanClasses = classes.filter(c => c.jurusanCode.toUpperCase() === item.code.toUpperCase());
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Program Keahlian Terakreditasi</div>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-bold font-mono">
                              {item.code}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {jurusanClasses.length > 0 ? (
                                jurusanClasses.map(c => (
                                  <span key={c.id} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-900/40">
                                    {c.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-amber-500 font-semibold">Belum ada rombel</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                            {item.description || '-'}
                          </td>
                          <td className="p-4 font-bold text-gray-700 dark:text-gray-300">
                            {item.kuota} Kursi
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={16} /></button>
                              <button onClick={() => setDeleteTarget(item)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Hapus"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MANAJEMEN KELAS & ROMBEL                           */}
        {/* ========================================================= */}
        {activeTab === 'kelas' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in space-y-4">
            
            {/* Filter & Action Toolbar */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input 
                    type="text" 
                    value={classSearch}
                    onChange={e => setClassSearch(e.target.value)}
                    placeholder="Cari kelas, wali kelas, ruang..." 
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                </div>

                <select
                  value={filterClassJurusan}
                  onChange={e => setFilterClassJurusan(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                >
                  <option value="ALL">Semua Jurusan</option>
                  {jurusan.map(j => (
                    <option key={j.id} value={j.code}>{j.code} - {j.name}</option>
                  ))}
                </select>

                <select
                  value={filterClassLevel}
                  onChange={e => setFilterClassLevel(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                >
                  <option value="ALL">Semua Tingkat</option>
                  <option value="X">Kelas X (10)</option>
                  <option value="XI">Kelas XI (11)</option>
                  <option value="XII">Kelas XII (12)</option>
                </select>
              </div>

              <button 
                onClick={handleOpenAddClass} 
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/30 text-sm cursor-pointer"
              >
                <Plus size={18} /> Tambah Kelas / Rombel Baru
              </button>
            </div>

            {/* Grid of Classes Cards */}
            <div className="p-6">
              {filteredClasses.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                  <GraduationCap className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">
                    Tidak ada kelas yang cocok dengan kriteria filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClasses.map((item) => {
                    const studentCount = studentCountMap[item.name] || 0;
                    const isFull = studentCount >= (item.capacity || 36);

                    return (
                      <div 
                        key={item.id}
                        className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight block">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                                Tingkat {item.level}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-mono">
                                {item.jurusanCode}
                              </span>
                              <span className="text-[11px] text-gray-400 font-semibold">
                                Rombel #{item.rombel}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditClass(item)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Kelas"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteClassTarget(item)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Wali Kelas & Ruang Info */}
                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                          <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-blue-500 shrink-0" />
                            <span className="text-gray-400">Wali Kelas:</span>
                            <span className="font-bold text-gray-900 dark:text-white truncate">
                              {item.waliKelas || 'Belum Ditentukan'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-red-400 shrink-0" />
                            <span className="text-gray-400">Ruangan:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {item.room || 'Ruang Teori'}
                            </span>
                          </div>
                        </div>

                        {/* Live Student Enrollment Counter */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <Users size={14} className="text-indigo-500" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Siswa Terdaftar:</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                              {studentCount} / {item.capacity}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-medium">
                              {isFull ? 'Kapasitas Penuh' : `Sisa ${item.capacity - studentCount} Kursi`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: ADD / EDIT JURUSAN                               */}
        {/* ========================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden text-gray-900 dark:text-white">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                    <BookOpen size={20} />
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isEditing ? 'Edit Program Jurusan' : 'Tambah Program Jurusan Baru'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap Jurusan *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="Contoh: Pengembangan Perangkat Lunak & Gim"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Kode Singkatan *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none" 
                      placeholder="RPL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Kuota Siswa (Kursi)</label>
                    <input 
                      required 
                      type="number" 
                      value={formData.kuota} 
                      onChange={e => setFormData({...formData, kuota: parseInt(e.target.value) || 0})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Deskripsi Singkat</label>
                  <textarea 
                    rows={3}
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="Jelaskan keunggulan kompetensi keahlian ini..."
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl text-xs font-semibold">Batal</button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Program Jurusan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: ADD / EDIT KELAS & ROMBEL                        */}
        {/* ========================================================= */}
        {isClassModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden text-gray-900 dark:text-white">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                    <GraduationCap size={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {isEditingClass ? 'Edit Rombel Kelas' : 'Tambah Rombel Kelas Baru'}
                    </h3>
                    <p className="text-xs text-gray-400">Atur jenjang, nomor rombel, dan wali kelas</p>
                  </div>
                </div>
                <button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveClass} className="p-6 space-y-4">
                
                {/* Live Preview Name Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                      Nama Kelas Resmi Terbentuk:
                    </span>
                    <span className="text-2xl font-black text-blue-900 dark:text-white font-mono tracking-tight">
                      {previewClassName}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-600/30">
                    Rombel #{classForm.rombel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Jurusan Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-500" /> Program Jurusan *
                    </label>
                    <select
                      value={classForm.jurusanCode}
                      onChange={e => setClassForm(prev => ({ ...prev, jurusanCode: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      {jurusan.map(j => (
                        <option key={j.id} value={j.code}>
                          {j.code} - {j.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Jenjang Tingkat */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Tingkat Jenjang *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['X', 'XI', 'XII'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setClassForm(prev => ({ ...prev, level: lvl }))}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            classForm.level === lvl
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Nomor Rombel *
                    </label>
                    <input 
                      required 
                      type="number" 
                      min={1}
                      max={10}
                      value={classForm.rombel} 
                      onChange={e => setClassForm(prev => ({ ...prev, rombel: Math.max(1, parseInt(e.target.value) || 1) }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Misal: 1 untuk {classForm.level} {classForm.jurusanCode} 1</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Kapasitas Maksimal Siswa
                    </label>
                    <input 
                      required 
                      type="number" 
                      min={1}
                      max={50}
                      value={classForm.capacity} 
                      onChange={e => setClassForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 36 }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                </div>

                {/* Wali Kelas Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <UserCheck size={13} className="text-blue-500" /> Wali Kelas Bimbingan
                  </label>
                  <select
                    value={classForm.waliKelasId}
                    onChange={e => {
                      const teacher = teachers.find(t => t.id === e.target.value);
                      setClassForm(prev => ({
                        ...prev,
                        waliKelasId: e.target.value,
                        waliKelas: teacher ? teacher.name : prev.waliKelas,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Guru Wali Kelas --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ruangan Kelas */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-400" /> Ruang / Lab Kelas
                  </label>
                  <input 
                    type="text" 
                    value={classForm.room} 
                    onChange={e => setClassForm(prev => ({ ...prev, room: e.target.value }))} 
                    placeholder="Contoh: Lab Komputer 1, Studio DKV"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl text-xs font-semibold">Batal</button>
                  <button 
                    type="submit" 
                    disabled={classLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {classLoading ? 'Menyimpan...' : 'Simpan Rombel Kelas'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal for Jurusan */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Program Jurusan"
          message={`Apakah Anda yakin ingin menghapus program keahlian "${deleteTarget?.name}"? Seluruh rombel kelas terkait juga akan dibersihkan.`}
          confirmText="Ya, Hapus"
          isLoading={isDeleting}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />

        {/* Delete Confirmation Modal for Kelas */}
        <ConfirmModal
          isOpen={!!deleteClassTarget}
          title="Hapus Rombel Kelas"
          message={`Apakah Anda yakin ingin menghapus kelas "${deleteClassTarget?.name}"? Tindakan ini akan menghapus opsi kelas dari seluruh modul.`}
          confirmText="Ya, Hapus"
          isLoading={isDeletingClass}
          variant="danger"
          onConfirm={handleConfirmDeleteClass}
          onClose={() => setDeleteClassTarget(null)}
        />
      </div>
    </div>
  );
}
