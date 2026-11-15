'use client';

import { useState, useMemo } from 'react';
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
  Sparkles,
  CheckSquare,
  FileSpreadsheet,
  PlusCircle,
  Copy,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { 
  saveSubject, 
  plotTeacher, 
  deleteSubject, 
  deleteSubjectsBulk, 
  saveSubjectsBulk, 
  BulkSubjectInput 
} from './actions';

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

interface JurusanItem {
  id: string;
  name: string;
  code: string;
  kuota: number;
  description: string;
}

interface CurrentUserItem {
  role: string;
  name: string;
  id?: string;
  isSuperAdmin: boolean;
}

interface MapelClientProps {
  initialSubjects: SubjectItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  classTargets?: string[];
  jurusans?: JurusanItem[];
  currentUser?: CurrentUserItem;
}

export default function MapelClient({
  initialSubjects,
  teachers,
  students,
  classTargets = ['Semua Kelas', 'X TJKT 1', 'XI TJKT 1', 'XII TJKT 1', 'X DKV 1', 'XI DKV 1', 'XII DKV 1', 'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
  jurusans = [],
  currentUser,
}: MapelClientProps) {
  const isSuperAdmin = currentUser?.isSuperAdmin ?? true;

  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTeacher, setSelectedTeacher] = useState('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [plottingSubject, setPlottingSubject] = useState<SubjectItem | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [customTeacherName, setCustomTeacherName] = useState('');

  // Bulk Selection & Action States (Khusus Super Admin)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Bulk Add States (Khusus Super Admin)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<'table' | 'text'>('table');
  const [bulkRows, setBulkRows] = useState<BulkSubjectInput[]>([]);
  const [bulkTextPaste, setBulkTextPaste] = useState('');

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Muatan Kejuruan');
  const [formJurusan, setFormJurusan] = useState(jurusans[0]?.code || 'TJKT');
  const [formClassTarget, setFormClassTarget] = useState(classTargets.find((c) => c !== 'Semua Kelas') || 'XI TJKT 1');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formDay, setFormDay] = useState('Senin');
  const [formTime, setFormTime] = useState('07:30 - 10:00');
  const [formRoom, setFormRoom] = useState('Lab Komputer 1');
  const [formKkm, setFormKkm] = useState(78);
  const [formCredits, setFormCredits] = useState(3);

  const handleFormJurusanChange = (code: string) => {
    setFormJurusan(code);
    if (code === 'ALL') {
      setFormClassTarget('Semua Kelas');
    } else {
      const match = classTargets.find((c) => c !== 'Semua Kelas' && c.toUpperCase().includes(code.toUpperCase())) || `XI ${code} 1`;
      setFormClassTarget(match);
    }
  };

  const modalClassOptions = useMemo(() => {
    if (formJurusan === 'ALL') {
      return classTargets;
    }
    const filtered = classTargets.filter((c) => 
      c !== 'Semua Kelas' && c.toUpperCase().includes(formJurusan.toUpperCase())
    );
    if (filtered.length > 0) return filtered;
    return [`X ${formJurusan} 1`, `XI ${formJurusan} 1`, `XII ${formJurusan} 1`];
  }, [classTargets, formJurusan]);

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
    const matchesTeacher =
      !isSuperAdmin ||
      selectedTeacher === 'ALL' ||
      s.teacherId === selectedTeacher ||
      s.teacherName === selectedTeacher;

    return matchesSearch && matchesClass && matchesCategory && matchesTeacher;
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
    const defaultJurusan = jurusans[0]?.code || 'TJKT';
    setFormJurusan(defaultJurusan);
    const defaultClass = classTargets.find((c) => c !== 'Semua Kelas' && c.toUpperCase().includes(defaultJurusan.toUpperCase())) || `XI ${defaultJurusan} 1`;
    setFormClassTarget(defaultClass);

    if (!isSuperAdmin) {
      setFormTeacherId(currentUser?.id || '');
      setFormTeacherName(currentUser?.name || 'Guru Pengampu');
    } else {
      setFormTeacherId(teachers[0]?.id || '');
      setFormTeacherName(teachers[0]?.name || 'Abdul Rahman');
    }

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
    const matchedJurusan = jurusans.find((j) => subject.classTarget.toUpperCase().includes(j.code.toUpperCase()))?.code || (subject.classTarget === 'Semua Kelas' ? 'ALL' : (jurusans[0]?.code || 'TJKT'));
    setFormJurusan(matchedJurusan);

    if (!isSuperAdmin) {
      setFormTeacherId(currentUser?.id || subject.teacherId || '');
      setFormTeacherName(currentUser?.name || subject.teacherName || '');
    } else {
      setFormTeacherId(subject.teacherId || '');
      setFormTeacherName(subject.teacherName || '');
    }

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
      let finalTeacherName = formTeacherName;
      let finalTeacherId = formTeacherId;

      if (!isSuperAdmin) {
        finalTeacherName = currentUser?.name || formTeacherName;
        finalTeacherId = currentUser?.id || formTeacherId;
      } else if (formTeacherId) {
        const found = teachers.find((t) => t.id === formTeacherId);
        if (found) finalTeacherName = found.name;
      }

      const res = await saveSubject({
        id: editingSubject?.id,
        code: formCode,
        name: formName,
        category: formCategory,
        classTarget: formClassTarget,
        teacherId: finalTeacherId || null,
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

  // ==========================================
  // BULK ACTIONS (KHUSUS SUPER ADMIN)
  // ==========================================

  const openBulkAddModal = () => {
    const defaultJurusan = jurusans[0]?.code || 'TJKT';
    const defaultClass = classTargets.find((c) => c !== 'Semua Kelas' && c.toUpperCase().includes(defaultJurusan.toUpperCase())) || 'XI TJKT 1';
    const initial: BulkSubjectInput[] = [
      {
        code: `MAPEL-${subjects.length + 1}`,
        name: '',
        category: 'Muatan Kejuruan',
        classTarget: defaultClass,
        teacherId: teachers[0]?.id || null,
        teacherName: teachers[0]?.name || null,
        day: 'Senin',
        time: '07:30 - 10:00',
        room: 'Lab Komputer 1',
        kkm: 78,
        credits: 3,
      },
      {
        code: `MAPEL-${subjects.length + 2}`,
        name: '',
        category: 'Muatan Kejuruan',
        classTarget: defaultClass,
        teacherId: teachers[0]?.id || null,
        teacherName: teachers[0]?.name || null,
        day: 'Selasa',
        time: '07:30 - 10:00',
        room: 'Lab Komputer 1',
        kkm: 78,
        credits: 3,
      },
      {
        code: `MAPEL-${subjects.length + 3}`,
        name: '',
        category: 'Muatan Umum',
        classTarget: 'Semua Kelas',
        teacherId: teachers[1]?.id || teachers[0]?.id || null,
        teacherName: teachers[1]?.name || teachers[0]?.name || null,
        day: 'Rabu',
        time: '07:30 - 10:00',
        room: 'Ruang Teori 1',
        kkm: 75,
        credits: 2,
      },
    ];
    setBulkRows(initial);
    setBulkTextPaste('');
    setBulkTab('table');
    setIsBulkAddModalOpen(true);
  };

  const addBulkRow = () => {
    const defaultJurusan = jurusans[0]?.code || 'TJKT';
    const defaultClass = classTargets.find((c) => c !== 'Semua Kelas' && c.toUpperCase().includes(defaultJurusan.toUpperCase())) || 'XI TJKT 1';
    setBulkRows((prev) => [
      ...prev,
      {
        code: `MAPEL-${subjects.length + prev.length + 1}`,
        name: '',
        category: 'Muatan Kejuruan',
        classTarget: defaultClass,
        teacherId: teachers[0]?.id || null,
        teacherName: teachers[0]?.name || null,
        day: 'Senin',
        time: '07:30 - 10:00',
        room: 'Lab Komputer 1',
        kkm: 78,
        credits: 3,
      },
    ]);
  };

  const addMultipleBulkRows = (count: number) => {
    const defaultJurusan = jurusans[0]?.code || 'TJKT';
    const defaultClass = classTargets.find((c) => c !== 'Semua Kelas' && c.toUpperCase().includes(defaultJurusan.toUpperCase())) || 'XI TJKT 1';
    const newRows: BulkSubjectInput[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        code: `MAPEL-${subjects.length + bulkRows.length + i + 1}`,
        name: '',
        category: 'Muatan Kejuruan',
        classTarget: defaultClass,
        teacherId: teachers[0]?.id || null,
        teacherName: teachers[0]?.name || null,
        day: 'Senin',
        time: '07:30 - 10:00',
        room: 'Lab Komputer 1',
        kkm: 78,
        credits: 3,
      });
    }
    setBulkRows((prev) => [...prev, ...newRows]);
  };

  const updateBulkRow = (index: number, field: keyof BulkSubjectInput, value: any) => {
    setBulkRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeBulkRow = (index: number) => {
    if (bulkRows.length <= 1) {
      showNotify('error', 'Minimal harus ada 1 baris input mata pelajaran.');
      return;
    }
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  };

  const applyClassToAllRows = (targetClass: string) => {
    if (!targetClass) return;
    setBulkRows((prev) => prev.map((r) => ({ ...r, classTarget: targetClass })));
    showNotify('success', `Berhasil menerapkan target kelas "${targetClass}" ke semua baris.`);
  };

  const applyTeacherToAllRows = (teacherId: string) => {
    const found = teachers.find((t) => t.id === teacherId);
    if (!found) return;
    setBulkRows((prev) => prev.map((r) => ({ ...r, teacherId: found.id, teacherName: found.name })));
    showNotify('success', `Berhasil menerapkan guru "${found.name}" ke semua baris.`);
  };

  const applyCategoryToAllRows = (category: string) => {
    if (!category) return;
    setBulkRows((prev) => prev.map((r) => ({ ...r, category })));
    showNotify('success', `Berhasil menerapkan kategori "${category}" ke semua baris.`);
  };

  const parseTextPaste = () => {
    if (!bulkTextPaste.trim()) {
      showNotify('error', 'Silakan tempel teks mata pelajaran terlebih dahulu.');
      return;
    }

    const lines = bulkTextPaste.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: BulkSubjectInput[] = [];

    lines.forEach((line, idx) => {
      let parts = line.split(';');
      if (parts.length < 2) parts = line.split('\t');
      if (parts.length < 2) parts = line.split('|');

      const code = parts[0]?.trim() || `MAPEL-${subjects.length + idx + 1}`;
      const name = parts[1]?.trim() || '';
      const classTarget = parts[2]?.trim() || 'Semua Kelas';
      const teacherStr = parts[3]?.trim() || '';
      const category = parts[4]?.trim() || 'Muatan Kejuruan';
      const kkm = Number(parts[5]?.trim()) || 75;
      const credits = Number(parts[6]?.trim()) || 3;

      let teacherId: string | null = null;
      let teacherName: string | null = teacherStr || null;
      if (teacherStr) {
        const found = teachers.find(
          (t) =>
            t.name.toLowerCase().includes(teacherStr.toLowerCase()) ||
            t.username.toLowerCase() === teacherStr.toLowerCase()
        );
        if (found) {
          teacherId = found.id;
          teacherName = found.name;
        }
      }

      if (name) {
        parsed.push({
          code: code.toUpperCase(),
          name,
          category,
          classTarget,
          teacherId,
          teacherName,
          day: 'Senin',
          time: '07:30 - 10:00',
          room: 'Lab Komputer 1',
          kkm,
          credits,
        });
      }
    });

    if (parsed.length === 0) {
      showNotify('error', 'Format teks tidak sesuai. Pastikan tiap baris minimal memiliki Kode dan Nama Mapel.');
      return;
    }

    setBulkRows(parsed);
    setBulkTab('table');
    showNotify('success', `Berhasil mengonversi ${parsed.length} baris mata pelajaran.`);
  };

  const handleSaveBulkSubjects = async () => {
    const validRows = bulkRows.filter((r) => r.name.trim() && r.code.trim());
    if (validRows.length === 0) {
      showNotify('error', 'Harap isi minimal satu baris dengan Kode dan Nama Mapel.');
      return;
    }

    setLoading(true);
    try {
      const res = await saveSubjectsBulk(validRows);
      if (res.error) {
        showNotify('error', res.error);
      } else if (res.subjects) {
        showNotify('success', `Berhasil menambahkan ${res.count} mata pelajaran secara kolektif!`);
        const newItems = res.subjects.map((s) => ({
          ...s,
          _count: { grades: students.length },
        })) as SubjectItem[];
        setSubjects((prev) => [...prev, ...newItems]);
        setIsBulkAddModalOpen(false);
      }
    } catch {
      showNotify('error', 'Terjadi kesalahan sistem saat menyimpan mata pelajaran secara kolektif.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    try {
      const res = await deleteSubjectsBulk(selectedIds);
      if (res.error) {
        showNotify('error', res.error);
      } else {
        showNotify('success', `Berhasil menghapus ${selectedIds.length} mata pelajaran secara kolektif.`);
        setSubjects((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setIsBulkDeleteConfirmOpen(false);
      }
    } catch {
      showNotify('error', 'Gagal menghapus mata pelajaran secara kolektif.');
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
            <BookOpen size={14} />{' '}
            {isSuperAdmin
              ? 'Sinkronisasi Kurikulum & Plotting Guru Pengampu'
              : `Mata Pelajaran Pengampu • ${currentUser?.name || 'Guru'}`}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isSuperAdmin ? 'Plotting & Manajemen Mata Pelajaran (Mapel)' : 'Mata Pelajaran Saya'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
            {isSuperAdmin
              ? 'Atur kurikulum sekolah, jadwal pelajaran mingguan, dan tentukan guru pengampu untuk setiap mata pelajaran. Data ini tersinkronisasi langsung ke Portal Siswa dan Portal Guru.'
              : 'Kelola mata pelajaran dan jadwal belajar yang Anda ampu di kelas. Seluruh data mapel ini tersinkronisasi otomatis dengan Portal Siswa, Bank Soal CBT, Tugas, dan Buku Penilaian.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/portal/guru/nilai"
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Award size={16} className="text-indigo-600" /> Buka Penilaian Guru
          </Link>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={openBulkAddModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Layers size={16} /> Tambah Kolektif
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
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
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isSuperAdmin ? 'Total Mata Pelajaran Sekolah' : 'Mata Pelajaran Saya'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {isSuperAdmin
                ? `${plottedCount} / ${totalSubjects}`
                : `${new Set(subjects.map((s) => s.classTarget)).size} Rombel`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isSuperAdmin ? 'Guru Terplotting' : 'Kelas Yang Diajar'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{totalCredits} JP</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isSuperAdmin ? 'Beban Mengajar / Minggu' : 'Beban Mengajar Saya / Minggu'}
            </div>
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

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Guru Filter for Super Admin */}
          {isSuperAdmin && (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              aria-label="Filter Berdasarkan Guru Pengampu"
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Guru Pengampu</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

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
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                {isSuperAdmin && selectedIds.length > 0 && (
                  <span className="font-bold text-blue-600 dark:text-blue-400 ml-1.5">
                    • {selectedIds.length} dipilih
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Bulk Delete Bar for Super Admin */}
          {isSuperAdmin && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold transition-colors cursor-pointer"
              >
                Batal Pilihan
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={14} /> Hapus Kolektif ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <BookOpen size={40} className="mx-auto opacity-40 text-gray-400" />
            {subjects.length === 0 ? (
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Belum ada mata pelajaran terdaftar</p>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  Seluruh data dummy bawaan telah dibersihkan. Silakan input mata pelajaran resmi melalui tombol &quot;+ Tambah Mapel Baru&quot; atau &quot;+ Tambah Kolektif&quot;.
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium">Tidak ada mata pelajaran yang cocok dengan filter atau pencarian Anda.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {isSuperAdmin && (
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredSubjects.length > 0 &&
                          filteredSubjects.every((s) => selectedIds.includes(s.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const visibleIds = filteredSubjects.map((s) => s.id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                          } else {
                            const visibleIdSet = new Set(filteredSubjects.map((s) => s.id));
                            setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
                          }
                        }}
                        aria-label="Pilih Semua Mata Pelajaran"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </th>
                  )}
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
                  const isSelected = selectedIds.includes(s.id);

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40'
                          : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40'
                      }`}
                    >
                      {isSuperAdmin && (
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            aria-label={`Pilih ${s.name}`}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>
                      )}
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
                        {isSuperAdmin ? (
                          hasTeacher ? (
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
                          )
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200">
                              {currentUser?.name ? currentUser.name[0]?.toUpperCase() : 'G'}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white text-xs block">
                                {s.teacherName || currentUser?.name}
                              </span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} /> Anda Sendiri (Pengampu)
                              </span>
                            </div>
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

              {/* Program Keahlian (Jurusan) & Target Kelas */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-950 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-600" /> Program Keahlian (Jurusan) *
                    </label>
                    <select
                      value={formJurusan}
                      onChange={(e) => handleFormJurusanChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">Semua Jurusan (Muatan Umum)</option>
                      {jurusans.map((j) => (
                        <option key={j.id} value={j.code}>
                          {j.code} - {j.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-950 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                      <GraduationCap size={13} className="text-blue-600" /> Target Kelas / Rombel *
                    </label>
                    <select
                      value={formClassTarget}
                      onChange={(e) => setFormClassTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      {modalClassOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                  <span>💡</span>
                  <span>
                    {formJurusan === 'ALL'
                      ? 'Cocok untuk mapel umum lintas jurusan (seperti Agama, Bhs Indonesia, Matematika Terapan).'
                      : `Target kelas otomatis disaring khusus untuk program keahlian ${formJurusan}.`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Guru Pengampu
                </label>
                {isSuperAdmin ? (
                  <select
                    value={formTeacherId}
                    onChange={(e) => {
                      setFormTeacherId(e.target.value);
                      const t = teachers.find((item) => item.id === e.target.value);
                      if (t) setFormTeacherName(t.name);
                    }}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Guru Pengampu --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        {currentUser?.name ? currentUser.name[0]?.toUpperCase() : 'G'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          {currentUser?.name || 'Guru Pengampu'}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Otomatis terhubung sebagai pengampu mata pelajaran ini
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      Akun Anda
                    </span>
                  </div>
                )}
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

      {/* FLOATING ACTION BAR: BULK DELETE FOR SUPER ADMIN */}
      {isSuperAdmin && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">Mata pelajaran dipilih</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => setIsBulkDeleteConfirmOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Trash2 size={15} />
            <span>Hapus Kolektif ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI HAPUS KOLEKTIF */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle size={24} />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Hapus {selectedIds.length} Mata Pelajaran?
                </h3>
                <p className="text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Mata pelajaran terpilih dan seluruh data nilai siswa yang terkait akan dihapus secara permanen dari database:
            </p>

            <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-1.5 border border-gray-200/60 dark:border-gray-700/60">
              {subjects
                .filter((s) => selectedIds.includes(s.id))
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate pr-2">
                      {s.name}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-800">
                      {s.code}
                    </span>
                  </div>
                ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              ⚠️ Perhatian: Jika mapel ini telah digunakan pada CBT atau jadwal siswa, data tersebut juga akan dibersihkan.
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={loading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/25 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{loading ? 'Menghapus...' : `Ya, Hapus Semua (${selectedIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH MATA PELAJARAN SECARA KOLEKTIF */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                  <Layers size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                      Tambah Mata Pelajaran Secara Kolektif (Massal)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      Admin Utama
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Input banyak mata pelajaran sekaligus ke database kurikulum sekolah dan sinkronkan ke portal siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAddModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="px-6 pt-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBulkTab('table')}
                className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  bulkTab === 'table'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <PlusCircle size={15} /> Input Tabel Multi-Baris ({bulkRows.length} Baris)
              </button>
              <button
                type="button"
                onClick={() => setBulkTab('text')}
                className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  bulkTab === 'text'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileSpreadsheet size={15} /> Tempel Teks Cepat (Format Teks/Excel)
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {bulkTab === 'table' ? (
                <div className="space-y-4">
                  {/* Quick Appliers / Batch Controls */}
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        ⚡ Alat Cepat:
                      </span>
                      <button
                        type="button"
                        onClick={addBulkRow}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus size={13} /> Tambah 1 Baris
                      </button>
                      <button
                        type="button"
                        onClick={() => addMultipleBulkRows(3)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus size={13} /> +3 Baris
                      </button>
                      <button
                        type="button"
                        onClick={() => addMultipleBulkRows(5)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus size={13} /> +5 Baris
                      </button>
                    </div>

                    {/* Batch Field Setters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        onChange={(e) => {
                          applyClassToAllRows(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        aria-label="Setel Target Kelas untuk Semua Baris"
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                      >
                        <option value="" disabled>Setel Target Kelas Semua...</option>
                        {classTargets.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      <select
                        onChange={(e) => {
                          applyTeacherToAllRows(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        aria-label="Setel Guru Pengampu untuk Semua Baris"
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                      >
                        <option value="" disabled>Setel Guru Semua...</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      <select
                        onChange={(e) => {
                          applyCategoryToAllRows(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        aria-label="Setel Kategori untuk Semua Baris"
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                      >
                        <option value="" disabled>Setel Kategori Semua...</option>
                        <option value="Muatan Kejuruan">Muatan Kejuruan</option>
                        <option value="Muatan Umum">Muatan Umum</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                      </select>
                    </div>
                  </div>

                  {/* Multi-Row Table */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="w-full text-left text-xs min-w-[900px]">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 font-bold">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">No</th>
                            <th className="py-2.5 px-3 w-28">Kode Mapel *</th>
                            <th className="py-2.5 px-3 w-48">Nama Mata Pelajaran *</th>
                            <th className="py-2.5 px-3 w-36">Target Kelas *</th>
                            <th className="py-2.5 px-3 w-40">Guru Pengampu</th>
                            <th className="py-2.5 px-3 w-32">Kategori</th>
                            <th className="py-2.5 px-3 w-28">Hari & Ruang</th>
                            <th className="py-2.5 px-3 w-20 text-center">KKM/JP</th>
                            <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {bulkRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                              <td className="py-2.5 px-3 text-center text-gray-400 font-bold text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Kode Mapel */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="text"
                                  value={row.code}
                                  onChange={(e) => updateBulkRow(idx, 'code', e.target.value.toUpperCase())}
                                  placeholder="MAPEL-01"
                                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>

                              {/* Nama Mapel */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => updateBulkRow(idx, 'name', e.target.value)}
                                  placeholder="Contoh: Pemrograman Web"
                                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>

                              {/* Target Kelas */}
                              <td className="py-2.5 px-2">
                                <select
                                  value={row.classTarget}
                                  onChange={(e) => updateBulkRow(idx, 'classTarget', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  {classTargets.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Guru Pengampu */}
                              <td className="py-2.5 px-2">
                                <select
                                  value={row.teacherId || ''}
                                  onChange={(e) => {
                                    const t = teachers.find((item) => item.id === e.target.value);
                                    updateBulkRow(idx, 'teacherId', e.target.value || null);
                                    updateBulkRow(idx, 'teacherName', t ? t.name : null);
                                  }}
                                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  <option value="">-- Tanpa Guru --</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Kategori */}
                              <td className="py-2.5 px-2">
                                <select
                                  value={row.category}
                                  onChange={(e) => updateBulkRow(idx, 'category', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 outline-none"
                                >
                                  <option value="Muatan Kejuruan">Kejuruan</option>
                                  <option value="Muatan Umum">Umum</option>
                                  <option value="Muatan Lokal">Mulok</option>
                                </select>
                              </td>

                              {/* Hari & Ruang */}
                              <td className="py-2.5 px-2">
                                <div className="space-y-1">
                                  <select
                                    value={row.day || 'Senin'}
                                    onChange={(e) => updateBulkRow(idx, 'day', e.target.value)}
                                    className="w-full px-1.5 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[11px]"
                                  >
                                    <option value="Senin">Senin</option>
                                    <option value="Selasa">Selasa</option>
                                    <option value="Rabu">Rabu</option>
                                    <option value="Kamis">Kamis</option>
                                    <option value="Jumat">Jumat</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={row.room || ''}
                                    onChange={(e) => updateBulkRow(idx, 'room', e.target.value)}
                                    placeholder="Lab / Ruang"
                                    className="w-full px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px]"
                                  />
                                </div>
                              </td>

                              {/* KKM & JP */}
                              <td className="py-2.5 px-2 text-center">
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    min={60}
                                    max={100}
                                    value={row.kkm}
                                    onChange={(e) => updateBulkRow(idx, 'kkm', Number(e.target.value))}
                                    title="KKM Minimal"
                                    className="w-12 text-center px-1 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-bold text-xs"
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={row.credits}
                                    onChange={(e) => updateBulkRow(idx, 'credits', Number(e.target.value))}
                                    title="Jam Pelajaran (JP)"
                                    className="w-10 text-center px-1 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-bold text-xs"
                                  />
                                </div>
                              </td>

                              {/* Aksi Hapus Baris */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeBulkRow(idx)}
                                  title="Hapus baris ini"
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Quick Text Paste */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl text-xs space-y-2 text-emerald-900 dark:text-emerald-300">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles size={15} /> Format Tempel Teks Cepat
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Ketik atau tempel baris data dengan pemisah titik koma (<code className="font-bold bg-white/70 dark:bg-black/30 px-1 py-0.5 rounded">;</code>) atau tab dari Microsoft Excel / Google Sheets:
                    </p>
                    <div className="p-2.5 bg-white dark:bg-gray-900 rounded-xl font-mono text-[11px] text-gray-700 dark:text-gray-300 border border-emerald-200 dark:border-emerald-800/60">
                      KODE; NAMA MAPEL; TARGET KELAS; NAMA GURU; KATEGORI; KKM; JP
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Tempel Data Mapel Anda di Bawah Ini:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = `WEB-101; Pemrograman Web Lanjut; XI TJKT 1; ${teachers[0]?.name || 'Guru 1'}; Muatan Kejuruan; 78; 4\nAI-201; Kecerdasan Buatan Terapan; XI TJKT 1; ${teachers[0]?.name || 'Guru 1'}; Muatan Kejuruan; 80; 3\nAGM-101; Pendidikan Agama Islam; Semua Kelas; ${teachers[1]?.name || teachers[0]?.name || 'Guru 2'}; Muatan Umum; 75; 2`;
                        setBulkTextPaste(sample);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={13} /> Masukkan Format Contoh
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={bulkTextPaste}
                    onChange={(e) => setBulkTextPaste(e.target.value)}
                    placeholder={`Contoh:\nWEB-101; Pemrograman Web Lanjut; XI TJKT 1; Abdul Rahman; Muatan Kejuruan; 78; 4\nAI-201; Kecerdasan Buatan Terapan; XI TJKT 1; Abdul Rahman; Muatan Kejuruan; 80; 3`}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-mono text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={parseTextPaste}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Sparkles size={14} /> Konversi ke Tabel Multi-Baris
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 font-medium">
                📊{' '}
                <strong className="text-gray-900 dark:text-white">
                  {bulkRows.filter((r) => r.name.trim() && r.code.trim()).length}
                </strong>{' '}
                dari {bulkRows.length} baris mata pelajaran valid dan siap disimpan.
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsBulkAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkSubjects}
                  disabled={loading || bulkRows.filter((r) => r.name.trim() && r.code.trim()).length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Layers size={15} />
                  <span>
                    {loading
                      ? 'Menyimpan Semua...'
                      : `Simpan ${bulkRows.filter((r) => r.name.trim() && r.code.trim()).length} Mapel Kolektif`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

