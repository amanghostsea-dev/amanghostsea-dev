'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Search, 
  Plus, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Award, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  GraduationCap, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { saveSubject, plotTeacher, deleteSubject } from './actions';

interface TeacherItem {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface StudentItem {
  id: string;
  name: string;
  username: string;
  nisn: string | null;
}

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  category: string;
  classTarget: string;
  teacherId: string | null;
  teacherName: string | null;
  day: string | null;
  time: string | null;
  room: string | null;
  kkm: number;
  credits: number;
  status: string;
  _count: {
    grades: number;
  };
}

interface MapelClientProps {
  initialSubjects: SubjectItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  classTargets?: string[];
}

export default function MapelClient({
  initialSubjects,
  teachers,
  students,
  classTargets = ['Semua Kelas', 'X RPL 1', 'XI RPL 1', 'XII RPL 1', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
}: MapelClientProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [plottingSubject, setPlottingSubject] = useState<SubjectItem | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [customTeacherName, setCustomTeacherName] = useState('');

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Muatan Kejuruan');
  const [formClassTarget, setFormClassTarget] = useState('XI RPL 1');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formDay, setFormDay] = useState('Senin');
  const [formTime, setFormTime] = useState('07:30 - 10:00');
  const [formRoom, setFormRoom] = useState('Lab Komputer 1');
  const [formKkm, setFormKkm] = useState(78);
  const [formCredits, setFormCredits] = useState(3);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Filtered List
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(search.toLowerCase()));

    const matchesClass = selectedClass === 'ALL' || s.classTarget === selectedClass;
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;

    return matchesSearch && matchesClass && matchesCategory;
  });

  // Stats calculation
  const totalSubjects = subjects.length;
  const plottedCount = subjects.filter((s) => Boolean(s.teacherName)).length;
  const totalCredits = subjects.reduce((acc, curr) => acc + (curr.credits || 0), 0);
  const avgKkm = totalSubjects > 0 ? Math.round(subjects.reduce((acc, c) => acc + c.kkm, 0) / totalSubjects) : 75;

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormCode(`MAPEL-${subjects.length + 1}`);
    setFormName('');
    setFormCategory('Muatan Kejuruan');
    setFormClassTarget('XI RPL 1');
    setFormTeacherId(teachers[0]?.id || '');
    setFormTeacherName(teachers[0]?.name || 'Abdul Rahman');
    setFormDay('Senin');
    setFormTime('07:30 - 10:00');
    setFormRoom('Lab Komputer 1');
    setFormKkm(78);
    setFormCredits(3);
    setIsFormModalOpen(true);
  };

  const openEditModal = (subject: SubjectItem) => {
    setEditingSubject(subject);
    setFormCode(subject.code);
    setFormName(subject.name);
    setFormCategory(subject.category);
    setFormClassTarget(subject.classTarget);
    setFormTeacherId(subject.teacherId || '');
    setFormTeacherName(subject.teacherName || '');
    setFormDay(subject.day || 'Senin');
    setFormTime(subject.time || '07:30 - 10:00');
    setFormRoom(subject.room || 'Lab Komputer 1');
    setFormKkm(subject.kkm);
    setFormCredits(subject.credits);
    setIsFormModalOpen(true);
  };

  const openPlotModal = (subject: SubjectItem) => {
    setPlottingSubject(subject);
    setSelectedTeacherId(subject.teacherId || '');
    setCustomTeacherName(subject.teacherName || '');
    setIsPlotModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showNotify('error', 'Kode dan Nama Mata Pelajaran wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      // Tentukan teacherName dari dropdown atau custom
      let finalTeacherName = formTeacherName;
      if (formTeacherId) {
        const found = teachers.find((t) => t.id === formTeacherId);
        if (found) finalTeacherName = found.name;
      }

      const res = await saveSubject({
        id: editingSubject?.id,
        code: formCode,
        name: formName,
        category: formCategory,
        classTarget: formClassTarget,
        teacherId: formTeacherId || null,
        teacherName: finalTeacherName || null,
        day: formDay,
        time: formTime,
        room: formRoom,
        kkm: formKkm,
        credits: formCredits,
      });

      if (res.error) {
        showNotify('error', res.error);
      } else if (res.subject) {
        showNotify('success', editingSubject ? 'Mata pelajaran berhasil diperbarui!' : 'Mata pelajaran baru berhasil ditambahkan!');
        setIsFormModalOpen(false);

        // Update local state
        if (editingSubject) {
          setSubjects((prev) =>
            prev.map((item) =>
              item.id === res.subject!.id
                ? { ...item, ...res.subject!, _count: item._count }
                : item
            )
          );
        } else {
          setSubjects((prev) => [
            ...prev,
            { ...res.subject!, _count: { grades: students.length } } as SubjectItem,
          ]);
        }
      }
    } catch (err) {
      showNotify('error', 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlotting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingSubject) return;

    let finalName = customTeacherName.trim();
    if (selectedTeacherId) {
      const match = teachers.find((t) => t.id === selectedTeacherId);
      if (match) finalName = match.name;
    }

    if (!finalName) {
      showNotify('error', 'Pilih atau ketikkan nama guru pengampu.');
      return;
    }

    setLoading(true);
    try {
      const res = await plotTeacher(plottingSubject.id, selectedTeacherId || null, finalName);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Guru pengampu ${plottingSubject.name} berhasil diplotting ke: ${finalName}!`);
        setIsPlotModalOpen(false);

        setSubjects((prev) =>
          prev.map((item) =>
            item.id === plottingSubject.id
              ? { ...item, teacherId: selectedTeacherId || null, teacherName: finalName }
              : item
          )
        );
      }
    } catch {
      showNotify('error', 'Gagal memproses plotting guru.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subject: SubjectItem) => {
    if (!confirm(`Yakin ingin menghapus mata pelajaran "${subject.name}"? Semua data nilai siswa terkait akan terhapus.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await deleteSubject(subject.id);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Mata pelajaran "${subject.name}" berhasil dihapus.`);
        setSubjects((prev) => prev.filter((item) => item.id !== subject.id));
      }
    } catch {
      showNotify('error', 'Gagal menghapus mata pelajaran.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
            <BookOpen size={14} /> Sinkronisasi Kurikulum & Plotting Guru Pengampu
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Plotting & Manajemen Mata Pelajaran (Mapel)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
            Atur kurikulum, jadwal pelajaran mingguan, dan tentukan guru pengampu untuk setiap mata pelajaran. Data ini tersinkronisasi langsung ke Portal Siswa dan Portal Guru.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/guru/nilai"
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Award size={16} className="text-indigo-600" /> Buka Penilaian Guru
          </Link>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Tambah Mapel Baru
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{totalSubjects} Mapel</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Mata Pelajaran</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {plottedCount} / {totalSubjects}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Guru Terplotting</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{totalCredits} JP</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Beban Mengajar / Minggu</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{avgKkm} Poin</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rata-rata Standar KKM</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <input
            type="text"
            placeholder="Cari mapel, kode, atau guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Filter Berdasarkan Target Kelas"
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Kelas</option>
            {classTargets.filter((c) => c !== 'Semua Kelas').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter Berdasarkan Kategori Kurikulum"
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Muatan Kejuruan">Muatan Kejuruan</option>
            <option value="Muatan Umum">Muatan Umum</option>
            <option value="Muatan Lokal">Muatan Lokal</option>
          </select>
        </div>
      </div>

      {/* Main Subjects Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers size={20} />
            </span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                Daftar Mata Pelajaran & Plotting Pengampu
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Menampilkan {filteredSubjects.length} mata pelajaran terdaftar
              </p>
            </div>
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <BookOpen size={40} className="mx-auto opacity-40 text-gray-400" />
            <p className="text-sm font-medium">Tidak ada mata pelajaran yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider">No</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider">Mata Pelajaran & Kode</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider">Target Kelas</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider">Guru Pengampu</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider">Jadwal & Ruang</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider text-center">KKM & JP</th>
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredSubjects.map((s, index) => {
                  const hasTeacher = Boolean(s.teacherName);

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-4 px-6 text-gray-400 font-semibold text-xs">
                        {index + 1}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {s.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold">
                              {s.code}
                            </span>
                            <span className="text-[11px] text-gray-400">•</span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {s.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                          <GraduationCap size={13} className="text-blue-500" />
                          {s.classTarget}
                        </span>
                      </td>

                      {/* GURU PENGAMPU CELL */}
                      <td className="py-4 px-6">
                        {hasTeacher ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                {s.teacherName ? s.teacherName[0]?.toUpperCase() : 'G'}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white text-xs block">
                                  {s.teacherName}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Akun Guru Terhubung
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPlotModal(s)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Ganti
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg">
                              <ShieldAlert size={13} /> Belum Diplotting
                            </span>
                            <button
                              type="button"
                              onClick={() => openPlotModal(s)}
                              className="px-3 py-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all cursor-pointer"
                            >
                              Plot Guru
                            </button>
                          </div>
                        )}
                      </td>

                      {/* JADWAL & RUANG CELL */}
                      <td className="py-4 px-6 text-xs text-gray-600 dark:text-gray-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                            <Calendar size={13} className="text-blue-500" />
                            <span>{s.day || 'Senin'}, {s.time || '07:30 - 10:00'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <MapPin size={13} className="text-red-400" />
                            <span>{s.room || 'Lab Komputer'}</span>
                          </div>
                        </div>
                      </td>

                      {/* KKM & JP */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-black text-xs text-gray-900 dark:text-white px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            KKM: {s.kkm}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1 font-semibold">
                            {s.credits} Jam/Minggu
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            title="Edit Mata Pelajaran"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(s)}
                            title="Hapus Mata Pelajaran"
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: PLOTTING GURU PENGAMPU */}
      {isPlotModalOpen && plottingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                  <UserCheck size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Plotting Guru Pengampu
                  </h3>
                  <p className="text-xs text-gray-500">{plottingSubject.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlotModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlotting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Pilih Guru Terdaftar (Akun Sistem)
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    const match = teachers.find((t) => t.id === e.target.value);
                    if (match) setCustomTeacherName(match.name);
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Guru dari Akun Sistem --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role} - @{t.username})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Guru yang dipilih dapat langsung mengakses dan memberi nilai di Portal Guru.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Atau Nama Guru Pengampu (Custom/Gelar)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Ahmad ST, M.Kom"
                  value={customTeacherName}
                  onChange={(e) => setCustomTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Sinkronisasi Otomatis
                </div>
                <p className="text-[11px] leading-relaxed">
                  Guru ini akan otomatis tampil di jadwal pelajaran siswa kelas <strong>{plottingSubject.classTarget}</strong> dan memiliki wewenang menginput nilai tugas, UTS, dan UAS.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsPlotModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Plotting Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM CREATE / EDIT SUBJECT */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                  <BookOpen size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-xs text-gray-500">Lengkapi informasi kurikulum & guru pengampu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubject} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kode Mapel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PWM-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kategori Kurikulum
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Muatan Kejuruan">Muatan Kejuruan</option>
                    <option value="Muatan Umum">Muatan Umum</option>
                    <option value="Muatan Kewilayahan">Muatan Kewilayahan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemrograman Web & Mobile"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Target Kelas
                  </label>
                  <select
                    value={formClassTarget}
                    onChange={(e) => setFormClassTarget(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {classTargets.filter((c) => c !== 'Semua Kelas').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Guru Pengampu
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => {
                      setFormTeacherId(e.target.value);
                      const t = teachers.find((item) => item.id === e.target.value);
                      if (t) setFormTeacherName(t.name);
                    }}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Hari
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Jam Belajar
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="07:30 - 10:00"
                    className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Ruang / Lab
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="Lab Komputer 1"
                    className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Standar KKM (Minimal)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={formKkm}
                    onChange={(e) => setFormKkm(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Beban Jam (JP / SKS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formCredits}
                    onChange={(e) => setFormCredits(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : editingSubject ? 'Simpan Perubahan' : 'Buat Mapel & Sinkronkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

