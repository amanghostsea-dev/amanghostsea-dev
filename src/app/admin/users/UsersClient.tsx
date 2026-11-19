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
  Layers,
  Copy,
  Filter,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Key,
  RefreshCw,
  Lock
} from 'lucide-react';
import { createUser, updateUser, deleteUser, deleteBulkUsers, createBulkStudents, updateStudentClass, updateBulkStudentsClass, BulkStudentItem } from './actions';
import ConfirmModal from '@/components/ConfirmModal';
import { normalizeReligion, RELIGION_OPTIONS } from '@/lib/cbt-religion';

// Helper: Generator password acak bersih & unik (menghindari karakter ambigu 0, O, 1, l, I)
function generateCleanRandomPassword(key: string, seed: number = 0): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let hash = 5381;
  const str = `${key}_${seed}_smkweb2026`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  hash = Math.abs(hash);

  let result = '';
  for (let i = 0; i < 8; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    result += chars.charAt(hash % chars.length);
  }
  return result;
}

interface ParsedBulkStudent {
  name: string;
  nisn: string;
  studentClass?: string;
  isClassRecognized?: boolean;
  religion?: string;
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

// Helper: Normalisasi penulisan kelas & jurusan agar kebal typo (misal: "10 rpl 1" -> "X RPL 1", "x-tjkt-1" -> "X TJKT 1", dll.)
function normalizeStudentClass(
  rawClass: string,
  validClasses: string[],
  jurusans: JurusanOption[]
): { normalized: string; isRecognized: boolean } {
  if (!rawClass || !rawClass.trim()) {
    return { normalized: '', isRecognized: false };
  }

  const cleaned = rawClass.trim();

  // 1. Cek pencocokan langsung (case-insensitive)
  const exactMatch = validClasses.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  if (exactMatch) {
    return { normalized: exactMatch, isRecognized: true };
  }

  // 2. Normalisasi format: ubah angka 10/11/12 ke Romawi X/XI/XII, ganti pemisah strip/titik dengan spasi
  let formatted = cleaned.toUpperCase().replace(/[-_.]+/g, ' ');

  // Ubah 10 -> X, 11 -> XI, 12 -> XII jika di awal kata
  formatted = formatted.replace(/^10\b/i, 'X');
  formatted = formatted.replace(/^11\b/i, 'XI');
  formatted = formatted.replace(/^12\b/i, 'XII');

  // Pisahkan jika huruf tingkat menempel dengan kode jurusan: "XRPL" -> "X RPL", "XIIRPL" -> "XII RPL"
  formatted = formatted.replace(/\b(XII|XI|X)([A-Z]+)\b/i, '$1 $2');
  // Pisahkan jika kode jurusan menempel dengan angka rombel: "RPL1" -> "RPL 1"
  formatted = formatted.replace(/\b([A-Z]+)(\d+)\b/i, '$1 $2');
  formatted = formatted.replace(/\s+/g, ' ').trim();

  // Cek apakah hasil perbaikan cocok dengan kelas resmi
  const reformattedMatch = validClasses.find((c) => c.toUpperCase() === formatted);
  if (reformattedMatch) {
    return { normalized: reformattedMatch, isRecognized: true };
  }

  // 3. Jika hanya kode jurusan dan rombel (misal "RPL 1" atau "TJKT 1"), cocokkan dengan kelas yang ada
  const parts = formatted.split(' ');
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    const code = parts[0];
    const rombel = parts[1];
    const foundWithLevel = validClasses.find((c) => c.toUpperCase().includes(`${code} ${rombel}`));
    if (foundWithLevel) {
      return { normalized: foundWithLevel, isRecognized: true };
    }
  }

  // 4. Cek apakah ada kode jurusan yang cocok
  const matchedJurusan = jurusans.find((j) => {
    const code = (j.code || '').trim().toUpperCase();
    return code && formatted.includes(code);
  });

  return {
    normalized: formatted,
    isRecognized: !!matchedJurusan,
  };
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
    studentClass: classTargets.find(c => c !== 'Semua Kelas' && !c.includes('Semua Jurusan')) || 'XI TJKT 1',
    religion: 'ISLAM',
  });
  const [selectedJurusanCode, setSelectedJurusanCode] = useState(jurusans[0]?.code || 'TJKT');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Delete State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedUserIds);
      const res = await deleteBulkUsers(idsToDelete);
      if (res?.success) {
        setUsers(prev => prev.filter(u => !selectedUserIds.has(u.id)));
        setSelectedUserIds(new Set());
        setIsBulkDeleteModalOpen(false);
        if (res.skippedSelf) {
          alert(`Berhasil menghapus ${res.deletedCount} akun pengguna.\nCatatan: Akun Super Admin yang sedang aktif Anda gunakan tidak ikut dihapus demi keamanan.`);
        }
      } else {
        alert(res?.error || 'Gagal menghapus akun terpilih.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat menghapus data massal.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk Assign Class State (Khusus Siswa)
  const [isBulkClassModalOpen, setIsBulkClassModalOpen] = useState(false);
  const [bulkTargetClass, setBulkTargetClass] = useState<string>('');
  const [isBulkClassUpdating, setIsBulkClassUpdating] = useState(false);

  const handleConfirmBulkClass = async () => {
    if (selectedUserIds.size === 0 || !bulkTargetClass) return;
    setIsBulkClassUpdating(true);
    try {
      const ids = Array.from(selectedUserIds);
      const res = await updateBulkStudentsClass(ids, bulkTargetClass);
      if (res?.success) {
        setUsers(prev => prev.map(u => {
          if (selectedUserIds.has(u.id) && u.role === 'Siswa') {
            return { ...u, studentClass: bulkTargetClass };
          }
          return u;
        }));
        for (const id of ids) {
          studentClassMap[id] = bulkTargetClass;
        }
        setIsBulkClassModalOpen(false);
        setSelectedUserIds(new Set());
        alert(`Berhasil memperbarui kelas & jurusan untuk ${res.count} siswa ke "${bulkTargetClass}".`);
      } else {
        alert(res?.error || 'Gagal memperbarui kelas siswa.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setIsBulkClassUpdating(false);
    }
  };

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('siswa123');
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'default' | 'nisn' | 'random'>('default');
  const [randomSeed, setRandomSeed] = useState(0);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [copiedSingleIdx, setCopiedSingleIdx] = useState<number | null>(null);
  const [bulkClass, setBulkClass] = useState(classTargets.find(c => c !== 'Semua Kelas' && !c.includes('Semua Jurusan')) || 'XI TJKT 1');
  const [bulkReligion, setBulkReligion] = useState<string>('ISLAM');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: boolean;
    createdCount: number;
    skippedCount: number;
    skipped: { name: string; nisn: string; reason: string }[];
    errors: string[];
    createdUsers?: Array<{
      id: string;
      name: string;
      nisn?: string | null;
      username: string;
      password?: string | null;
      studentClass?: string | null;
      role: string;
    }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedClass, setCopiedClass] = useState<string | null>(null);

  const handleCopyClass = (className: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(className);
      setCopiedClass(className);
      setTimeout(() => setCopiedClass(null), 2500);
    }
  };

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
    const defaultJurusan = jurusans[0]?.code || 'TJKT';
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
      religion: 'ISLAM',
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: User) => {
    const defaultFallback = classTargets.find(c => c !== 'Semua Kelas' && !c.includes('Semua Jurusan')) || 'XI TJKT 1';
    const userClass = (item as any).studentClass || studentClassMap[item.id] || studentClassMap[item.name] || (item.nisn && studentClassMap[item.nisn]) || defaultFallback;
    const matchedJurusan = jurusans.find(j => userClass.toUpperCase().includes(j.code.toUpperCase()))?.code || jurusans[0]?.code || 'TJKT';
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
      religion: (item as any).religion || 'ISLAM',
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

    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !l.toLowerCase().startsWith('sep='));
    if (lines.length === 0) return [];

    const results: ParsedBulkStudent[] = [];
    const seenNisns = new Set<string>();
    const seenUsernames = new Set<string>();

    let nisnCol = -1;
    let nameCol = -1;
    let classCol = -1;
    let religionCol = -1;
    let userCol = -1;
    let passCol = -1;
    let startIndex = 0;

    // Deteksi jika baris pertama adalah baris header (NISN, Nama, Kelas, Agama, Username, Password)
    const line0Tokens = parseDelimitedLine(lines[0]);
    const lowerTokens = line0Tokens.map(t => t.toLowerCase());

    const hasHeaderNisn = lowerTokens.some(t => t.includes('nisn'));
    const hasHeaderName = lowerTokens.some(t => t.includes('nama') || t.includes('name'));

    if (hasHeaderNisn || hasHeaderName) {
      startIndex = 1;
      nisnCol = lowerTokens.findIndex(t => t.includes('nisn'));
      nameCol = lowerTokens.findIndex(t => t.includes('nama') || t.includes('name'));
      classCol = lowerTokens.findIndex(t => t.includes('kelas') || t.includes('class') || t.includes('rombel'));
      religionCol = lowerTokens.findIndex(t => t.includes('agama') || t.includes('relig'));
      userCol = lowerTokens.findIndex(t => t.includes('user'));
      passCol = lowerTokens.findIndex(t => t.includes('pass'));
    }

    for (let index = startIndex; index < lines.length; index++) {
      const line = lines[index];
      // Abaikan baris komentar panduan yang diawali #, //, ===, ---
      if (line.startsWith('#') || line.startsWith('//') || line.startsWith('===') || line.startsWith('---')) {
        continue;
      }

      const parts = parseDelimitedLine(line);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      let nisn = '';
      let name = '';
      let studentClass = '';
      let religion = '';
      let username = '';
      let password = '';

      if (startIndex === 1) {
        // Ambil data berdasarkan indeks kolom header yang terdeteksi
        if (nisnCol !== -1 && parts[nisnCol]) nisn = parts[nisnCol];
        if (nameCol !== -1 && parts[nameCol]) name = parts[nameCol];
        if (classCol !== -1 && parts[classCol]) studentClass = parts[classCol];
        if (religionCol !== -1 && parts[religionCol]) religion = parts[religionCol];
        if (userCol !== -1 && parts[userCol]) username = parts[userCol];
        if (passCol !== -1 && parts[passCol]) password = parts[passCol];
      } else {
        // Pemetaan posisi jika tanpa baris header
        if (parts.length >= 6) {
          nisn = parts[0];
          name = parts[1];
          studentClass = parts[2];
          religion = parts[3];
          username = parts[4];
          password = parts[5];
        } else if (parts.length === 5) {
          // Cek apakah kolom 3 adalah agama (Islam, Kristen, dll.) atau username
          const p3Upper = (parts[3] || '').toUpperCase();
          const isP3Religion = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KHONGHUCU', 'PROTESTAN'].some(r => p3Upper.includes(r));
          if (isP3Religion) {
            nisn = parts[0];
            name = parts[1];
            studentClass = parts[2];
            religion = parts[3];
            password = parts[4];
          } else {
            nisn = parts[0];
            name = parts[1];
            studentClass = parts[2];
            username = parts[3];
            password = parts[4];
          }
        } else if (parts.length === 4) {
          const p3Upper = (parts[3] || '').toUpperCase();
          const isP3Religion = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KHONGHUCU', 'PROTESTAN'].some(r => p3Upper.includes(r));
          if (isP3Religion) {
            nisn = parts[0];
            name = parts[1];
            studentClass = parts[2];
            religion = parts[3];
          } else {
            nisn = parts[0];
            name = parts[1];
            studentClass = parts[2];
            username = parts[3];
          }
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

      // Bersihkan dan normalisasi nama kelas dengan auto-corrector anti typo
      nisn = nisn.replace(/[^\d]/g, '');
      let isClassRecognized = true;
      if (studentClass && studentClass.trim()) {
        const norm = normalizeStudentClass(studentClass, classTargets, jurusans);
        studentClass = norm.normalized || studentClass.trim();
        isClassRecognized = norm.isRecognized;
      } else {
        studentClass = bulkClass;
      }

      // Normalisasi Agama Siswa
      const rawRel = religion?.trim() || bulkReligion || 'ISLAM';
      const normRel = normalizeReligion(rawRel);
      const assignedReligion = normRel !== 'ALL' ? normRel : (bulkReligion || 'ISLAM');

      if (!username) username = nisn || name.toLowerCase().replace(/\s+/g, '');
      if (!password) {
        if (bulkPasswordMode === 'random') {
          password = generateCleanRandomPassword(nisn || name || `row_${index}`, randomSeed);
        } else if (bulkPasswordMode === 'nisn') {
          password = nisn || 'siswa123';
        } else {
          password = bulkDefaultPassword;
        }
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
        isClassRecognized,
        religion: assignedReligion,
        username,
        password,
        isValid,
        error,
      });
    }

    return results;
  }, [bulkText, bulkClass, bulkReligion, bulkPasswordMode, bulkDefaultPassword, randomSeed, classTargets, jurusans]);

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

  // Unduh template CSV resmi sesuai kriteria lengkap data Siswa SMK dengan contoh per jurusan
  const handleDownloadCsvTemplate = () => {
    const validSpecificClasses = classTargets.filter(c => !c.toLowerCase().startsWith('semua'));
    
    // Ambil daftar jurusan resmi sekolah
    const activeJurusans = jurusans.length > 0 ? jurusans : [
      { id: '1', code: 'TJKT', name: 'Teknik Jaringan Komputer & Telekomunikasi', kuota: 36, description: '' },
      { id: '2', code: 'DKV', name: 'Desain Komunikasi Visual', kuota: 36, description: '' },
      { id: '3', code: 'MPLB', name: 'Manajemen Perkantoran & Layanan Bisnis', kuota: 36, description: '' },
    ];

    const sampleStudents = [
      { name: 'Ahmad Fauzi Pratama', religion: 'ISLAM' },
      { name: 'Budi Santoso', religion: 'ISLAM' },
      { name: 'Citra Dewi Lestari', religion: 'ISLAM' },
      { name: 'Daniel Christian Situmorang', religion: 'KRISTEN' },
      { name: 'Maria Fransiska', religion: 'KATOLIK' },
      { name: 'I Made Dharmawan', religion: 'HINDU' },
      { name: 'William Tan', religion: 'BUDDHA' },
      { name: 'Kevin Liem', religion: 'KHONGHUCU' },
    ];

    const sampleRows: string[][] = [];
    let nisnCounter = 81234501;

    activeJurusans.forEach((j, jIdx) => {
      const code = (j.code || '').trim().toUpperCase();
      // Cari kelas resmi untuk jurusan ini
      const matching = validSpecificClasses.filter(c => c.toUpperCase().includes(code));
      const targetClass1 = matching[0] || `X ${code} 1`;
      const targetClass2 = matching[1] || `XI ${code} 1`;

      const st1 = sampleStudents[(jIdx * 2) % sampleStudents.length];
      const nisn1 = `00${nisnCounter++}`;
      sampleRows.push([nisn1, st1.name, targetClass1, st1.religion, nisn1, 'siswa123']);

      if (sampleRows.length < 8) {
        const st2 = sampleStudents[(jIdx * 2 + 1) % sampleStudents.length];
        const nisn2 = `00${nisnCounter++}`;
        sampleRows.push([nisn2, st2.name, targetClass2, st2.religion, nisn2, 'siswa123']);
      }
    });

    const headers = ['NISN', 'Nama Lengkap', 'Kelas', 'Agama', 'Username', 'Password'];

    // Panduan & Contoh Format Resmi di bawah file CSV (diawali tanda # sehingga otomatis diabaikan sistem impor)
    const guideLines = [
      '',
      '# =========================================================================================',
      '# PETUNJUK RESMI TEMPLATE IMPOR DATA SISWA (SMK GARUDA MAHADHIKA):',
      '# Format Kolom Standar (6 Kolom Sesuai Kebutuhan Dapodik & CBT):',
      '# 1. NISN          : Wajib (8-12 angka). Berfungsi sebagai ID siswa & username login utama.',
      '# 2. Nama Lengkap  : Wajib (Nama resmi siswa). Ditampilkan di kartu peserta, CBT, dan buku nilai rapor.',
      '# 3. Kelas         : Format [Tingkat] [KODE JURUSAN] [Rombel], misal: X TJKT 1, XI DKV 1, XII MPLB 1.',
      '# 4. Agama         : Wajib untuk CBT! Pilihan: ISLAM, KRISTEN, KATOLIK, HINDU, BUDDHA, KHONGHUCU.',
      '#                    *Sistem CBT otomatis menyajikan varian paket ujian agama paralel (PAI, PAK, dll.) sesuai kolom ini.',
      '# 5. Username      : Opsional (jika kosong, otomatis memakai NISN).',
      '# 6. Password      : Opsional (jika kosong, otomatis memakai password default seperti siswa123).',
      '#',
      '# PANDUAN PENULISAN FORMAT JURUSAN & KELAS RESMI (MENCEGAH TYPO / SALAH KETIK):',
      '# Format Standar Penulisan: [Tingkat: X / XI / XII] [KODE JURUSAN] [Nomor Rombel]',
      '# Contoh Format Resmi Berdasarkan Jurusan Yang Terdaftar di Sekolah:',
      ...activeJurusans.map(j => `# - ${j.code} (${j.name}) -> Contoh: X ${j.code} 1, XI ${j.code} 1, XII ${j.code} 1`),
      '#',
      '# CONTOH PENULISAN ANTI-TYPO (SISTEM OTOMATIS MEMPERBAIKI FORMAT):',
      '# - "x tjkt 1" atau "10 tjkt 1" atau "x-tjkt-1" -> Otomatis dinormalisasi menjadi "X TJKT 1"',
      '# - "11 tjkt 1" atau "xi-tjkt-1"              -> Otomatis dinormalisasi menjadi "XI TJKT 1"',
      '# - "12 dkv 1" atau "xii-dkv-1"              -> Otomatis dinormalisasi menjadi "XII DKV 1"',
      '#',
      '# CATATAN PENTING:',
      '# 1. Baris yang diawali tanda pagar (#) adalah catatan panduan dan otomatis dilewati saat impor.',
      '# 2. Kolom Kelas opsional: jika kosong, siswa otomatis mengikuti "Target Kelas Cadangan".',
      '# 3. Kolom Agama opsional: jika kosong, siswa otomatis mengikuti "Agama Cadangan" (default: ISLAM).',
      '# 4. Kolom Username & Password opsional: jika kosong, otomatis memakai NISN / password default.',
      '# =========================================================================================',
    ];

    // Gunakan UTF-8 BOM (\uFEFF) dan pemisah titik koma ';' agar Microsoft Excel di Windows langsung membuka CSV dengan kolom terpisah rapi
    const delimiter = ';';
    const csvContent = '\uFEFF' + [
      'sep=;',
      headers.join(delimiter),
      ...sampleRows.map(r => r.map(val => val.includes(delimiter) || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val).join(delimiter)),
      ...guideLines
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

  // Muat contoh data demo dengan aneka jurusan
  const handleLoadSampleData = () => {
    const validSpecificClasses = classTargets.filter(c => !c.toLowerCase().startsWith('semua'));
    const activeJurusans = jurusans.length > 0 ? jurusans : [
      { id: '1', code: 'TJKT', name: 'Teknik Jaringan Komputer & Telekomunikasi', kuota: 36, description: '' },
      { id: '2', code: 'DKV', name: 'Desain Komunikasi Visual', kuota: 36, description: '' },
      { id: '3', code: 'MPLB', name: 'Manajemen Perkantoran & Layanan Bisnis', kuota: 36, description: '' },
    ];

    const lines: string[] = ['NISN\tNama Lengkap\tKelas\tAgama\tUsername\tPassword'];
    const sampleStudents = [
      { name: 'Aditia Pratama Putra', religion: 'ISLAM' },
      { name: 'Annisa Bella Safitri', religion: 'ISLAM' },
      { name: 'Daniel Christian Situmorang', religion: 'KRISTEN' },
      { name: 'Maria Fransiska', religion: 'KATOLIK' },
      { name: 'I Made Dharmawan', religion: 'HINDU' },
      { name: 'William Tan', religion: 'BUDDHA' },
    ];

    let nisnCounter = 81122331;
    sampleStudents.forEach((s, idx) => {
      const code = (activeJurusans[idx % activeJurusans.length].code || '').trim().toUpperCase();
      const matching = validSpecificClasses.filter(c => c.toUpperCase().includes(code));
      const targetClass = matching[idx % (matching.length || 1)] || `XI ${code} 1`;
      const nisn = `00${nisnCounter++}`;
      lines.push(`${nisn}\t${s.name}\t${targetClass}\t${s.religion}\t${nisn}\tsiswa123`);
    });

    setBulkText(lines.join('\n'));
    setBulkResult(null);
  };

  const handleCloseBulkModal = () => {
    setIsBulkModalOpen(false);
    setBulkResult(null);
    setBulkText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetBulkImport = () => {
    setBulkResult(null);
    setBulkText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper: Salin semua kredensial akun yang baru dibuat ke clipboard
  const handleCopyCredentials = () => {
    if (!bulkResult?.createdUsers || bulkResult.createdUsers.length === 0) return;
    
    const lines = [
      'DAFTAR KREDENSIAL LOGIN AKUN SISWA - SMK NEGERI 1',
      `Tanggal Dibuat: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
      '---------------------------------------------------------------------------------',
      'No | Nama Lengkap | Kelas | Agama | NISN / Username | Password',
      '---------------------------------------------------------------------------------',
    ];

    bulkResult.createdUsers.forEach((u, i) => {
      lines.push(`${i + 1}. ${u.name} | ${u.studentClass || '-'} | ${(u as any).religion || '-'} | ${u.nisn || u.username} | ${u.password || '-'}`);
    });

    lines.push('---------------------------------------------------------------------------------');
    lines.push('Catatan: Siswa dapat login di portal /ujian menggunakan NISN/Username dan Password di atas.');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    }
  };

  // Helper: Unduh kredensial dalam bentuk CSV
  const handleDownloadCredentialsCsv = () => {
    if (!bulkResult?.createdUsers || bulkResult.createdUsers.length === 0) return;

    const headers = ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'Agama', 'Username', 'Password', 'Peran', 'Status'];
    const rows = bulkResult.createdUsers.map((u, i) => [
      String(i + 1),
      `"${u.nisn || ''}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${(u.studentClass || '').replace(/"/g, '""')}"`,
      `"${((u as any).religion || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.password || '').replace(/"/g, '""')}"`,
      `"${u.role}"`,
      '"Aktif"'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kredensial_akun_siswa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySingleCredential = (u: any, idx: number) => {
    const text = `Akun Siswa: ${u.name} | Kelas: ${u.studentClass || '-'} | Agama: ${(u as any).religion || '-'} | NISN: ${u.nisn || u.username} | Password: ${u.password || '-'}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSingleIdx(idx);
      setTimeout(() => setCopiedSingleIdx(null), 2000);
    }
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
      const payload: BulkStudentItem[] = validStudents.map((s, idx) => ({
        name: s.name,
        nisn: s.nisn,
        username: s.username,
        password: s.password || (
          bulkPasswordMode === 'random'
            ? generateCleanRandomPassword(s.nisn || s.name || `row_${idx}`, randomSeed)
            : bulkPasswordMode === 'nisn'
              ? s.nisn
              : bulkDefaultPassword
        ),
        studentClass: s.studentClass || bulkClass,
        religion: s.religion || bulkReligion,
      }));

      const res = await createBulkStudents(payload, {
        defaultPassword: bulkDefaultPassword,
        useNisnAsPassword: bulkPasswordMode === 'nisn',
        generateRandomPassword: bulkPasswordMode === 'random',
        useNisnAsUsername: false,
        studentClass: bulkClass,
        religion: bulkReligion,
      });

      if (res?.success) {
        setBulkResult({
          success: true,
          createdCount: res.createdCount || 0,
          skippedCount: res.skippedCount || 0,
          skipped: res.skipped || [],
          errors: res.errors || [],
          createdUsers: res.createdUsers || [],
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterJurusan, setFilterJurusan] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Helper untuk mendapatkan kelas siswa
  const getUserClass = (u: User) => {
    if (u.role !== 'Siswa') return '';
    return (u as any).studentClass || studentClassMap[u.id] || studentClassMap[u.name] || (u.nisn && studentClassMap[u.nisn]) || '';
  };

  // Helper: Dapatkan objek Jurusan dari nama kelas siswa
  const getStudentJurusan = (cls: string) => {
    if (!cls) return null;
    const upper = cls.toUpperCase();
    for (const j of jurusans) {
      const code = (j.code || '').trim().toUpperCase();
      if (code && (upper.includes(code) || new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i').test(upper))) {
        return j;
      }
    }
    return null;
  };

  // Hitung jumlah siswa yang belum diplot kelas
  const unassignedSiswaCount = useMemo(() => {
    return (users || []).filter(u => u.role === 'Siswa' && !getUserClass(u)).length;
  }, [users, studentClassMap]);

  // Daftar seluruh kelas resmi & rombel yang ada
  const allClassOptions = useMemo(() => {
    const set = new Set<string>();
    (classTargets || []).forEach(c => {
      const trimmed = c.trim();
      if (trimmed && !trimmed.toLowerCase().startsWith('semua')) {
        set.add(trimmed);
      }
    });
    Object.values(studentClassMap || {}).forEach(c => {
      const trimmed = c.trim();
      if (trimmed && !trimmed.toLowerCase().startsWith('semua')) {
        set.add(trimmed);
      }
    });
    return Array.from(set).sort((a, b) => {
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
  }, [classTargets, studentClassMap]);

  // Hitung jumlah siswa per kelas
  const studentCountByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    (users || []).forEach(u => {
      if (u.role === 'Siswa') {
        const cls = getUserClass(u);
        if (cls) {
          counts[cls] = (counts[cls] || 0) + 1;
        }
      }
    });
    return counts;
  }, [users, studentClassMap]);

  // Hitung jumlah siswa per tingkat
  const gradeLevelCounts = useMemo(() => {
    let x = 0, xi = 0, xii = 0;
    (users || []).forEach(u => {
      if (u.role === 'Siswa') {
        const cls = getUserClass(u);
        if (cls) {
          if (/^(X|10)\b/i.test(cls) && !/^(XI|XII|11|12)\b/i.test(cls)) x++;
          else if (/^(XI|11)\b/i.test(cls) && !/^(XII|12)\b/i.test(cls)) xi++;
          else if (/^(XII|12)\b/i.test(cls)) xii++;
        }
      }
    });
    return { x, xi, xii };
  }, [users, studentClassMap]);

  // Daftar opsi Jurusan tersinkronisasi dari master data Jurusan Admin Utama
  const allJurusanOptions = useMemo(() => {
    const list: Array<{ code: string; name: string; count: number }> = [];
    const addedCodes = new Set<string>();

    // 1. Dari master Jurusan Admin Utama
    (jurusans || []).forEach(j => {
      const code = (j.code || '').trim().toUpperCase();
      if (code && !addedCodes.has(code)) {
        addedCodes.add(code);
        const count = (users || []).filter(u => {
          if (u.role !== 'Siswa') return false;
          const userClass = getUserClass(u);
          const regex = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i');
          return regex.test(userClass) || userClass.toUpperCase().includes(code);
        }).length;
        list.push({ code, name: j.name, count });
      }
    });

    // 2. Tambahan dari rombel siswa jika ada kode belum terdaftar
    allClassOptions.forEach(cls => {
      const match = cls.match(/\b(?:XII|XI|X|12|11|10)\s+([A-Za-z]+)\b/i);
      if (match) {
        const code = match[1].toUpperCase();
        if (code && !addedCodes.has(code) && !/^\d+$/.test(code)) {
          addedCodes.add(code);
          const count = (users || []).filter(u => {
            if (u.role !== 'Siswa') return false;
            const userClass = getUserClass(u);
            return userClass.toUpperCase().includes(code);
          }).length;
          list.push({ code, name: code, count });
        }
      }
    });

    return list;
  }, [jurusans, users, allClassOptions, studentClassMap]);

  // Daftar opsi Peran (Role) dan jumlah pengguna
  const allRoleOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    (users || []).forEach(u => {
      const r = u.role || 'Siswa';
      counts[r] = (counts[r] || 0) + 1;
    });

    const standardRoles = ['Siswa', 'Guru', 'Super Admin', 'Panitia PPDB', 'Admin BKK'];
    const result: Array<{ role: string; count: number }> = [];
    const seenRoles = new Set<string>();

    standardRoles.forEach(r => {
      if (counts[r] !== undefined) {
        result.push({ role: r, count: counts[r] });
        seenRoles.add(r);
      }
    });

    Object.keys(counts).forEach(r => {
      if (!seenRoles.has(r)) {
        result.push({ role: r, count: counts[r] });
      }
    });

    return result;
  }, [users]);

  // Hitung jumlah status akun
  const statusCounts = useMemo(() => {
    let aktif = 0;
    let nonaktif = 0;
    (users || []).forEach(u => {
      const s = (u.status || 'Aktif').toLowerCase();
      if (s === 'aktif') aktif++;
      else nonaktif++;
    });
    return { aktif, nonaktif };
  }, [users]);

  // Filter kelas yang relevan jika jurusan dipilih
  const filteredClassOptions = useMemo(() => {
    if (filterJurusan === 'ALL') return allClassOptions;
    const code = filterJurusan.toUpperCase();
    const regex = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i');
    return allClassOptions.filter(cls => regex.test(cls) || cls.toUpperCase().includes(code));
  }, [allClassOptions, filterJurusan]);

  // Handler pergantian filter Jurusan
  const handleJurusanFilterChange = (newJurusan: string) => {
    setFilterJurusan(newJurusan);
    if (newJurusan !== 'ALL' && filterClass !== 'ALL' && !filterClass.startsWith('LEVEL_')) {
      const code = newJurusan.toUpperCase();
      const regex = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i');
      if (!regex.test(filterClass) && !filterClass.toUpperCase().includes(code)) {
        setFilterClass('ALL');
      }
    }
  };

  // Handler pergantian filter Role
  const handleRoleFilterChange = (newRole: string) => {
    setFilterRole(newRole);
    if (newRole !== 'ALL' && newRole !== 'Siswa') {
      // Jika peran selain Siswa (misal Guru/Admin), reset filter Kelas & Jurusan
      setFilterClass('ALL');
      setFilterJurusan('ALL');
    }
  };

  // Cek apakah ada filter yang aktif
  const isAnyFilterActive = 
    filterClass !== 'ALL' || 
    filterJurusan !== 'ALL' || 
    filterRole !== 'ALL' || 
    filterStatus !== 'ALL' || 
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterClass('ALL');
    setFilterJurusan('ALL');
    setFilterRole('ALL');
    setFilterStatus('ALL');
    setSearchQuery('');
  };

  // Hasil filter akun pengguna
  const filteredUsers = useMemo(() => {
    return (users || []).filter((item: User) => {
      const userClass = getUserClass(item);

      // 1. Filter Role
      if (filterRole !== 'ALL' && item.role !== filterRole) {
        return false;
      }

      // 2. Filter Status
      if (filterStatus !== 'ALL') {
        const itemStatus = (item.status || 'Aktif').toLowerCase();
        if (itemStatus !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // 3. Filter Kelas (khusus role Siswa)
      if (filterClass !== 'ALL') {
        if (item.role !== 'Siswa') return false;

        if (filterClass === 'UNASSIGNED') {
          if (userClass) return false;
        } else if (filterClass === 'LEVEL_X') {
          if (!/^(X|10)\b/i.test(userClass) || /^(XI|XII|11|12)\b/i.test(userClass)) {
            return false;
          }
        } else if (filterClass === 'LEVEL_XI') {
          if (!/^(XI|11)\b/i.test(userClass) || /^(XII|12)\b/i.test(userClass)) {
            return false;
          }
        } else if (filterClass === 'LEVEL_XII') {
          if (!/^(XII|12)\b/i.test(userClass)) {
            return false;
          }
        } else {
          if (userClass !== filterClass) {
            return false;
          }
        }
      }

      // 4. Filter Jurusan (khusus role Siswa)
      if (filterJurusan !== 'ALL') {
        if (item.role !== 'Siswa') return false;
        const code = filterJurusan.toUpperCase();
        const regex = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i');
        if (!regex.test(userClass) && !userClass.toUpperCase().includes(code)) {
          return false;
        }
      }

      // 5. Search Query (Nama, Username, NISN, Role, Kelas)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const userMatch = item.username?.toLowerCase().includes(q);
        const roleMatch = item.role?.toLowerCase().includes(q);
        const nisnMatch = item.nisn && item.nisn.toLowerCase().includes(q);
        const classMatch = userClass.toLowerCase().includes(q);
        if (!nameMatch && !userMatch && !roleMatch && !nisnMatch && !classMatch) {
          return false;
        }
      }

      return true;
    });
  }, [users, filterRole, filterStatus, filterClass, filterJurusan, searchQuery, studentClassMap]);

  // Kalkulasi data akun terpilih untuk aksi massal
  const selectedUsers = useMemo(() => {
    return (users || []).filter(u => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  const selectedBreakdown = useMemo(() => {
    let siswa = 0, guru = 0, admin = 0, others = 0;
    selectedUsers.forEach(u => {
      if (u.role === 'Siswa') siswa++;
      else if (u.role === 'Guru') guru++;
      else if (u.role === 'Super Admin') admin++;
      else others++;
    });
    return { siswa, guru, admin, others, total: selectedUsers.length };
  }, [selectedUsers]);

  const visibleUserIds = useMemo(() => filteredUsers.map(u => u.id), [filteredUsers]);

  const isAllVisibleSelected = useMemo(() => {
    if (visibleUserIds.length === 0) return false;
    return visibleUserIds.every(id => selectedUserIds.has(id));
  }, [visibleUserIds, selectedUserIds]);

  const isSomeVisibleSelected = useMemo(() => {
    if (visibleUserIds.length === 0) return false;
    const some = visibleUserIds.some(id => selectedUserIds.has(id));
    return some && !isAllVisibleSelected;
  }, [visibleUserIds, selectedUserIds, isAllVisibleSelected]);

  const handleToggleSelectAllVisible = () => {
    if (visibleUserIds.length === 0) return;
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        visibleUserIds.forEach(id => next.delete(id));
      } else {
        visibleUserIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

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
            {/* Tombol Hapus Kolektif Cepat di Header jika ada akun dipilih */}
            {selectedUserIds.size > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer animate-in fade-in"
              >
                <Trash2 size={18} /> Hapus Kolektif ({selectedUserIds.size})
              </button>
            )}

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
          {/* 🔍 PANEL FILTER & PENCARIAN MODERN */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 space-y-4">
            {/* Baris 1: Pencarian dan Status Total */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NISN, kelas, atau username..." 
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                />
                <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Hapus pencarian"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {isAnyFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Reset Filter
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700/60">
                  <Filter size={14} className="text-indigo-500" />
                  <span>Menampilkan <strong className="text-gray-900 dark:text-white font-bold">{filteredUsers.length}</strong> dari {users.length} akun</span>
                </div>
              </div>
            </div>

            {/* Baris 2: Grid 4 Filter (Kelas, Jurusan, Role, Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
              {/* 1. Filter Kelas / Rombel */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-purple-500" />
                    Filter Kelas:
                  </span>
                  {filterRole !== 'ALL' && filterRole !== 'Siswa' && (
                    <span className="text-[10px] text-gray-400 italic">Khusus Siswa</span>
                  )}
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  disabled={filterRole !== 'ALL' && filterRole !== 'Siswa'}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <option value="ALL">Semua Kelas ({totalSiswa} Siswa)</option>
                  {unassignedSiswaCount > 0 && (
                    <option value="UNASSIGNED">⚠️ Belum Diplot Kelas ({unassignedSiswaCount} Siswa)</option>
                  )}
                  <optgroup label="Tingkat Kelas">
                    <option value="LEVEL_X">Semua Tingkat X ({gradeLevelCounts.x} Siswa)</option>
                    <option value="LEVEL_XI">Semua Tingkat XI ({gradeLevelCounts.xi} Siswa)</option>
                    <option value="LEVEL_XII">Semua Tingkat XII ({gradeLevelCounts.xii} Siswa)</option>
                  </optgroup>
                  <optgroup label="Rombel / Kelas Spesifik">
                    {filteredClassOptions.map((cls) => {
                      const count = studentCountByClass[cls] || 0;
                      return (
                        <option key={cls} value={cls}>
                          {cls} ({count} Siswa)
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* 2. Filter Jurusan Keahlian */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-500" />
                    Filter Jurusan:
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    ✓ Sinkron Master
                  </span>
                </label>
                <select
                  value={filterJurusan}
                  onChange={(e) => handleJurusanFilterChange(e.target.value)}
                  disabled={filterRole !== 'ALL' && filterRole !== 'Siswa'}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <option value="ALL">
                    Semua Jurusan {allJurusanOptions.length > 0 ? `(${allJurusanOptions.length} Terdaftar)` : ''}
                  </option>
                  {allJurusanOptions.map((j) => (
                    <option key={j.code} value={j.code}>
                      Jurusan {j.code} - {j.name} ({j.count} Siswa)
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Filter Peran (Role) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Filter Peran (Role):
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => handleRoleFilterChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="ALL">Semua Peran ({users.length} Akun)</option>
                  {allRoleOptions.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role} ({r.count} Akun)
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Filter Status Akun */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-amber-500" />
                  Filter Status:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                >
                  <option value="ALL">Semua Status ({users.length} Akun)</option>
                  <option value="Aktif">Status Aktif ({statusCounts.aktif} Akun)</option>
                  <option value="Nonaktif">Status Nonaktif ({statusCounts.nonaktif} Akun)</option>
                </select>
              </div>
            </div>

            {/* Baris 3: Active Filters Pills / Badges */}
            {isAnyFilterActive && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs border-t border-gray-100 dark:border-gray-800/60">
                <span className="text-gray-400 dark:text-gray-500 font-medium text-[11px]">Filter aktif:</span>
                {filterClass !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold">
                    <GraduationCap size={12} />
                    Kelas: {filterClass === 'UNASSIGNED' ? 'Belum Diplot' : filterClass.replace('LEVEL_', 'Tingkat ')}
                    <button onClick={() => setFilterClass('ALL')} className="hover:text-purple-900 dark:hover:text-purple-100 transition-colors cursor-pointer" title="Hapus filter kelas"><X size={12} /></button>
                  </span>
                )}
                {filterJurusan !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                    <Layers size={12} />
                    Jurusan: {filterJurusan}
                    <button onClick={() => setFilterJurusan('ALL')} className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors cursor-pointer" title="Hapus filter jurusan"><X size={12} /></button>
                  </span>
                )}
                {filterRole !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                    <ShieldCheck size={12} />
                    Role: {filterRole}
                    <button onClick={() => setFilterRole('ALL')} className="hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors cursor-pointer" title="Hapus filter role"><X size={12} /></button>
                  </span>
                )}
                {filterStatus !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                    <CheckCircle2 size={12} />
                    Status: {filterStatus}
                    <button onClick={() => setFilterStatus('ALL')} className="hover:text-amber-900 dark:hover:text-amber-100 transition-colors cursor-pointer" title="Hapus filter status"><X size={12} /></button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-semibold">
                    <Search size={12} />
                    Pencarian: &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery('')} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer" title="Hapus kata kunci"><X size={12} /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Banner Aksi Hapus Kolektif jika ada akun yang dicentang */}
          {selectedUserIds.size > 0 && (
            <div className="mx-6 my-4 p-3.5 px-4 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{selectedUserIds.size} Akun Terpilih</span>
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full">
                      {[
                        selectedBreakdown.siswa > 0 ? `${selectedBreakdown.siswa} Siswa` : null,
                        selectedBreakdown.guru > 0 ? `${selectedBreakdown.guru} Guru` : null,
                        selectedBreakdown.admin > 0 ? `${selectedBreakdown.admin} Admin` : null,
                      ].filter(Boolean).join(' • ') || 'Akun'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Klik tombol Hapus Kolektif untuk menghapus {selectedUserIds.size} akun yang dicentang secara permanen.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                {selectedBreakdown.siswa > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const fallbackCls = classTargets.find(c => c !== 'Semua Kelas' && !c.includes('Semua Jurusan')) || 'XI TJKT 1';
                      setBulkTargetClass(fallbackCls);
                      setIsBulkClassModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <GraduationCap size={14} />
                    Atur Kelas ({selectedBreakdown.siswa} Siswa)
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleSelectAllVisible}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  {isAllVisibleSelected ? 'Batal Pilih di Layar' : `Pilih Semua di Layar (${filteredUsers.length})`}
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Hapus Kolektif ({selectedUserIds.size})
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={handleToggleSelectAllVisible}
                      aria-label="Pilih semua akun di layar"
                      className="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 cursor-pointer transition-all"
                    />
                  </th>
                  <th className="p-4">Nama Lengkap & NISN</th>
                  <th className="p-4">Kelas & Jurusan</th>
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
                    <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                          <Filter size={24} />
                        </div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Tidak ada akun pengguna yang cocok dengan kriteria filter atau pencarian
                        </div>
                        <p className="text-xs text-gray-400 max-w-md">
                          Coba sesuaikan kata kunci pencarian, kelas, jurusan, peranan, atau status akun yang dipilih.
                        </p>
                        {isAnyFilterActive && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                          >
                            <RotateCcw size={14} />
                            Reset Semua Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item: User) => {
                    const isSelected = selectedUserIds.has(item.id);
                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/50' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(item.id)}
                            aria-label={`Pilih akun ${item.name}`}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 cursor-pointer transition-all"
                          />
                        </td>
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
                            </div>
                          ) : null}
                        </td>
                        <td className="p-4">
                          {item.role === 'Siswa' ? (() => {
                            const userClass = getUserClass(item);
                            const matchedJurusan = getStudentJurusan(userClass);

                            if (userClass) {
                              return (
                                <div className="flex flex-col gap-1 items-start">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs">
                                      <GraduationCap size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                      <span>{userClass}</span>
                                    </span>
                                    {(item as any).religion && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Agama: ${(item as any).religion}`}>
                                        {(item as any).religion}
                                      </span>
                                    )}
                                  </div>
                                  {matchedJurusan ? (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 max-w-[210px] truncate" 
                                      title={`${matchedJurusan.code} • ${matchedJurusan.name}`}
                                    >
                                      <Layers size={11} className="text-indigo-500 shrink-0" />
                                      <span className="truncate">{matchedJurusan.code} • {matchedJurusan.name}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                      <Layers size={11} className="text-gray-400 shrink-0" />
                                      <span>Jurusan Terpaut</span>
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer group"
                                title="Klik untuk memplot kelas & jurusan siswa ini"
                              >
                                <AlertCircle size={13} className="text-amber-500 shrink-0" />
                                <span>Belum Diatur</span>
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 underline ml-0.5 group-hover:text-amber-700">Atur</span>
                              </button>
                            );
                          })() : (
                            <span className="text-gray-300 dark:text-gray-600 font-mono text-xs pl-2" title="Bukan role siswa">-</span>
                          )}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Single Add / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden text-gray-900 dark:text-white transition-all my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-xs">
                    {isEditing ? <Edit2 size={18} /> : <UserPlus size={18} />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isEditing ? 'Perbarui data akun dan hak akses pengguna' : 'Buat akun login baru untuk pengguna sistem'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body - Scrollable */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium" 
                      placeholder="Contoh: Ahmad Fauzi Pratama"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">Role (Peran) *</label>
                      <select 
                        required 
                        value={formData.role} 
                        onChange={e => setFormData({...formData, role: e.target.value})} 
                        className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold cursor-pointer"
                      >
                        <option value="Siswa">Siswa</option>
                        <option value="Guru">Guru</option>
                        <option value="Panitia PPDB">Panitia PPDB</option>
                        <option value="Admin BKK">Admin BKK</option>
                        <option value="Super Admin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">Status Akun</label>
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})} 
                        className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold cursor-pointer"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Nonaktif">Nonaktif</option>
                      </select>
                    </div>
                  </div>

                  {/* NISN & Jurusan Khusus Siswa */}
                  {formData.role === 'Siswa' && (
                    <div className="p-3.5 sm:p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                          <GraduationCap size={15} className="text-purple-600" /> NISN Siswa (Nomor Induk Siswa Nasional)
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
                            className="text-purple-600 dark:text-purple-300 hover:underline font-bold cursor-pointer"
                          >
                            Gunakan sebagai username
                          </button>
                        )}
                      </div>

                      {/* Dropdown Jurusan & Rombel Kelas untuk Siswa */}
                      <div className="pt-2.5 border-t border-purple-200/80 dark:border-purple-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                        <div className="sm:col-span-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
                          <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Sparkles size={13} className="text-purple-600" /> Agama Siswa (Routing Otomatis CBT) *
                            </span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                              Untuk ujian agama serentak 1 token
                            </span>
                          </label>
                          <select
                            value={formData.religion || 'ISLAM'}
                            onChange={(e) => setFormData(prev => ({ ...prev, religion: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                          >
                            <option value="ISLAM">☪️ Islam (Pendidikan Agama Islam & Budi Pekerti)</option>
                            <option value="KRISTEN">✝️ Kristen (Pendidikan Agama Kristen & Budi Pekerti)</option>
                            <option value="KATOLIK">⛪ Katolik (Pendidikan Agama Katolik & Budi Pekerti)</option>
                            <option value="HINDU">🕉️ Hindu (Pendidikan Agama Hindu & Budi Pekerti)</option>
                            <option value="BUDDHA">☸️ Buddha (Pendidikan Agama Buddha & Budi Pekerti)</option>
                            <option value="KHONGHUCU">☯️ Khonghucu (Pendidikan Agama Khonghucu & Budi Pekerti)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">Username Login *</label>
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Password
                      </label>
                      <input 
                        type="text" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        placeholder={isEditing ? 'Biarkan kosong jika tetap' : (formData.nisn ? 'Kosong = NISN' : 'Kosong = Acak')} 
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Modal Footer */}
                <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 sm:px-5 sm:py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2 sm:px-6 sm:py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check size={17} /> {isEditing ? 'Simpan Perubahan' : 'Simpan Pengguna'}
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
                  <div className={`w-10 h-10 rounded-2xl ${bulkResult ? 'bg-emerald-600 shadow-emerald-600/25' : 'bg-indigo-600 shadow-indigo-600/25'} text-white flex items-center justify-center shadow-md`}>
                    {bulkResult ? <CheckCircle2 size={22} /> : <UserPlus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {bulkResult ? 'Hasil Import Siswa Kolektif' : 'Tambah Siswa Kolektif (Massal)'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {bulkResult 
                        ? 'Laporan sinkronisasi akun siswa ke sistem Dapodik SMK & CBT'
                        : 'Import puluhan akun siswa sekaligus menggunakan format template standar Dapodik & CBT'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseBulkModal} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              {/* JIKA BERHASIL (bulkResult != null), TAMPILKAN NOTIFIKASI CANGGIH & ELEGAN (TANPA MENAMPILKAN FORM LAGI) */}
              {bulkResult ? (
                <>
                  <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                    {/* Hero Success Badge & Heading */}
                    <div className="text-center py-2 space-y-3">
                      <div className="relative inline-flex items-center justify-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-50 dark:ring-emerald-950/40 animate-in zoom-in-75 duration-300">
                          <CheckCircle2 size={44} className="stroke-[2.5]" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-6 w-6">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 text-white items-center justify-center text-[11px] font-bold">✓</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                          Import Akun Siswa Berhasil!
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                          Sebanyak <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{bulkResult.createdCount} akun siswa baru</strong> telah berhasil dibuat, disinkronkan ke buku rapor kelas, dan langsung siap digunakan.
                        </p>
                      </div>
                    </div>

                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Card 1: Akun Dibuat */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Akun Berhasil Dibuat</span>
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                            <UserCheck size={16} />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          {bulkResult.createdCount} <span className="text-xs font-sans font-semibold text-emerald-600/80">Siswa</span>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                          Status: Aktif & tersimpan di database
                        </p>
                      </div>

                      {/* Card 2: Data Dilewati / Duplikat */}
                      <div className={`p-4 rounded-2xl border shadow-xs space-y-1.5 ${
                        bulkResult.skippedCount > 0 
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300' 
                          : 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-200/80 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Data Dilewati</span>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            bulkResult.skippedCount > 0 
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' 
                              : 'bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            <AlertCircle size={16} />
                          </div>
                        </div>
                        <div className="text-2xl font-black font-mono">
                          {bulkResult.skippedCount} <span className="text-xs font-sans font-semibold opacity-80">Baris</span>
                        </div>
                        <p className="text-[11px] opacity-80">
                          {bulkResult.skippedCount > 0 ? 'Duplikat NISN / Username' : 'Tidak ada duplikat data'}
                        </p>
                      </div>

                      {/* Card 3: Integrasi CBT & Rapor */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-950/40 dark:to-indigo-950/20 border border-purple-200/80 dark:border-purple-800/60 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">Sinkronisasi</span>
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                            <Layers size={16} />
                          </div>
                        </div>
                        <div className="text-sm font-black text-purple-900 dark:text-purple-200 pt-1">
                          100% Terhubung
                        </div>
                        <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80">
                          Siap CBT & cetak kartu peserta
                        </p>
                      </div>
                    </div>

                    {/* Rincian Baris yang Dilewati (Jika ada) */}
                    {bulkResult.skippedCount > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle size={15} className="text-amber-600" />
                            Rincian Data yang Dilewati ({bulkResult.skipped.length} Siswa):
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300">
                            Tidak diimpor ulang agar tidak tumpang tindih
                          </span>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {bulkResult.skipped.map((s, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/50">
                              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="text-gray-400 font-mono text-[11px]">{idx + 1}.</span>
                                <span>{s.name}</span>
                                {s.nisn && s.nisn !== '-' && (
                                  <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                    NISN: {s.nisn}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-1 sm:mt-0">
                                {s.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rincian Error Sistem (Jika ada) */}
                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 space-y-1">
                        <div className="font-bold">Terjadi kendala pada beberapa baris data:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {bulkResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Daftar Kredensial Akun yang Baru Dibuat */}
                    {bulkResult.createdUsers && bulkResult.createdUsers.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <Key size={15} className="text-indigo-600" />
                              <span>Kredensial Akun Siswa Baru ({bulkResult.createdUsers.length} Siswa):</span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              Simpan atau bagikan kredensial login (NISN & Password) ini kepada siswa untuk keperluan ujian dan rapor.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyCredentials}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                                copiedCredentials
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              {copiedCredentials ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              <span>{copiedCredentials ? 'Kredensial Disalin!' : 'Salin Semua Kredensial'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDownloadCredentialsCsv}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-purple-600/25 active:scale-95 cursor-pointer"
                            >
                              <Download size={13} />
                              <span>Unduh CSV Kredensial</span>
                            </button>
                          </div>
                        </div>

                        {/* Tabel Kredensial */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-800">
                              <tr>
                                <th className="p-2 pl-3 w-10 text-center">No</th>
                                <th className="p-2">Nama Siswa</th>
                                <th className="p-2 font-mono">NISN / Username</th>
                                <th className="p-2">Kelas</th>
                                <th className="p-2">Agama</th>
                                <th className="p-2 font-mono">Password</th>
                                <th className="p-2 pr-3 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                              {bulkResult.createdUsers.map((u, idx) => (
                                <tr key={u.id || idx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20">
                                  <td className="p-2 pl-3 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                                  <td className="p-2 font-bold text-gray-900 dark:text-white">{u.name}</td>
                                  <td className="p-2 font-mono text-gray-700 dark:text-gray-300">{u.nisn || u.username}</td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      {u.studentClass || '-'}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      {(u as any).religion || 'ISLAM'}
                                    </span>
                                  </td>
                                  <td className="p-2 font-mono">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      <Key size={11} className="text-indigo-500" />
                                      {u.password || '-'}
                                    </span>
                                  </td>
                                  <td className="p-2 pr-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleCopySingleCredential(u, idx)}
                                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                                      title="Salin kredensial baris ini"
                                    >
                                      {copiedSingleIdx === idx ? (
                                        <Check size={13} className="text-emerald-600" />
                                      ) : (
                                        <Copy size={13} />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Petunjuk Langkah Selanjutnya */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 text-xs space-y-2">
                      <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-indigo-600" />
                        Langkah Selanjutnya yang Bisa Dilakukan Admin:
                      </div>
                      <ul className="space-y-1 text-indigo-900/90 dark:text-indigo-300/90 text-[11.5px] leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span><strong>Periksa Akun Siswa:</strong> Semua akun baru sudah tampil di tabel pengguna dan dapat difilter per kelas/jurusan.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span><strong>Cetak Kartu Ujian CBT:</strong> Buka menu <em>CBT & Ujian Online</em> lalu klik <strong>&quot;Cetak Kartu Peserta&quot;</strong> untuk mencetak kartu login format A4 presisi (6 kartu per lembar).</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span><strong>Login Siswa:</strong> Siswa dapat langsung login di alamat <code>/ujian</code> dengan NISN/username dan password yang telah ditentukan.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Modal Footer (Success State) */}
                  <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button
                      type="button"
                      onClick={handleResetBulkImport}
                      className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={16} />
                      Upload File Lain / Import Lagi
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseBulkModal}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Selesai & Lihat Data Pengguna</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Modal Body Scrollable (Form Input) */}
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">

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
                    <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">6 Kolom Standar (Dapodik & CBT)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
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
                      <span className="text-gray-500 text-[10px]">Misal: XI TJKT 1</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/40">
                      <span className="block font-bold text-blue-700 dark:text-blue-300">4. Agama</span>
                      <span className="text-blue-600 dark:text-blue-400 text-[10px] font-semibold">CBT (ISLAM/KRISTEN..)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">5. Username</span>
                      <span className="text-gray-500 text-[10px]">Opsional (Otomatis NISN)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-bold text-gray-900 dark:text-white">6. Password</span>
                      <span className="text-gray-500 text-[10px]">Opsional (Default / Acak)</span>
                    </div>
                  </div>
                </div>

                {/* 🏫 PANDUAN & CONTOH FORMAT JURUSAN & KELAS (ANTI-TYPO) */}
                <div className="p-3.5 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 text-xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <Sparkles size={15} className="text-purple-600" />
                      <span>Contoh Format Penulisan Jurusan & Kelas (Bebas Typo):</span>
                    </div>
                    <span className="text-[11px] text-purple-700/80 dark:text-purple-400 font-medium">
                      Standar: <strong className="font-mono text-purple-900 dark:text-purple-200">[Tingkat] [Kode] [Rombel]</strong> • Klik untuk salin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {jurusans.map((j) => {
                      const code = j.code.trim().toUpperCase();
                      const sampleClasses = classTargets
                        .filter(c => !c.toLowerCase().startsWith('semua') && c.toUpperCase().includes(code))
                        .slice(0, 3);
                      const fallbackClasses = sampleClasses.length > 0 ? sampleClasses : [`X ${code} 1`, `XI ${code} 1`, `XII ${code} 1`];

                      return (
                        <div key={j.id} className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/50 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-mono text-[10px]">
                                {code}
                              </span>
                              <span className="truncate max-w-[200px]" title={j.name}>{j.name}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {fallbackClasses.map((cls) => (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => handleCopyClass(cls)}
                                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                                  copiedClass === cls
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-300 border-slate-200 dark:border-slate-700'
                                }`}
                                title={`Klik untuk menyalin "${cls}"`}
                              >
                                <span>{cls}</span>
                                {copiedClass === cls ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={10} className="text-slate-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-purple-700 dark:text-purple-300 border-t border-purple-200/60 dark:border-purple-900/40">
                    <span>💡 <em>Sistem memiliki auto-normalizer yang otomatis mengoreksi huruf kecil, tanda hubung, atau angka romawi (misal: &quot;10 tjkt 1&quot; atau &quot;x-tjkt-1&quot; otomatis menjadi &quot;X TJKT 1&quot;).</em></span>
                    {copiedClass && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 ml-2">
                        <Check size={12} /> Disalin: {copiedClass}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pilihan Target Kelas & Agama Cadangan untuk Impor Massal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col justify-between gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                        <Layers size={14} className="text-purple-600" />
                        Target Kelas Cadangan (Fallback):
                      </label>
                      <p className="text-[11px] text-purple-700/80 dark:text-purple-400">
                        Digunakan jika kolom Kelas pada file/paste kosong. Siswa dengan kelas di baris data akan tetap terdaftar di kelasnya masing-masing.
                      </p>
                    </div>
                    <select
                      value={bulkClass}
                      onChange={(e) => setBulkClass(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      {classTargets.filter(c => c !== 'Semua Kelas').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col justify-between gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-600" />
                        Agama Cadangan (Fallback CBT):
                      </label>
                      <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
                        Digunakan untuk filter paket ujian agama CBT jika kolom Agama di baris data kosong.
                      </p>
                    </div>
                    <select
                      value={bulkReligion}
                      onChange={(e) => setBulkReligion(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      {RELIGION_OPTIONS.filter(r => r.code !== 'ALL').map((r) => (
                        <option key={r.code} value={r.code}>{r.code} - {r.shortLabel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Textarea Input */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      Data Siswa: NISN, Nama Lengkap, Kelas, Agama, Username, Password
                    </label>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Bisa copy langsung dari Excel / CSV (Tab / Titik Koma / Koma)</span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Contoh format CSV / Excel (6 Kolom):&#10;NISN,Nama Lengkap,Kelas,Agama,Username,Password&#10;0081234501,Ahmad Fauzi Pratama,XI TJKT 1,ISLAM,0081234501,siswa123&#10;0081234502,Daniel Situmorang,XI DKV 1,KRISTEN,0081234502,siswa123&#10;0081234503,Citra Dewi Lestari,XI MPLB 1,ISLAM,0081234503,siswa123"
                    className="w-full p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Password Setting Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5">
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
                      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={bulkPasswordMode === 'random'}
                          onChange={() => setBulkPasswordMode('random')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span>Generate password acak unik untuk setiap siswa</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                            Lebih Aman
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {bulkPasswordMode === 'default' && (
                    <div className="flex flex-col justify-center bg-white dark:bg-gray-900/80 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Password Default:
                      </label>
                      <input
                        type="text"
                        value={bulkDefaultPassword}
                        onChange={e => setBulkDefaultPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="siswa123"
                      />
                      <p className="text-[11px] text-gray-500 mt-1.5">Semua siswa dengan kolom password kosong akan memiliki password ini.</p>
                    </div>
                  )}

                  {bulkPasswordMode === 'nisn' && (
                    <div className="flex flex-col justify-center text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900/80 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                      <p className="font-bold text-indigo-950 dark:text-indigo-200">Mode NISN sebagai Password:</p>
                      <p className="text-[11px] leading-relaxed">
                        Setiap akun siswa otomatis memiliki password yang persis sama dengan nomor NISN masing-masing (misal NISN: <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">0081234501</code> → Password: <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">0081234501</code>).
                      </p>
                    </div>
                  )}

                  {bulkPasswordMode === 'random' && (
                    <div className="flex flex-col justify-between text-xs bg-white dark:bg-gray-900/80 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <Key size={14} className="text-indigo-600" />
                            Password Acak Unik (8 Karakter):
                          </span>
                          <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                            Alfanumerik Bersih
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                          Sistem meng-generate password acak 8 karakter unik untuk setiap siswa tanpa karakter ambigu (bebas huruf 0, O, I, 1, l) agar mudah dibaca pada kartu ujian.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10.5px] text-gray-500">Ingin kombinasi lain?</span>
                        <button
                          type="button"
                          onClick={() => setRandomSeed(prev => prev + 1)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="Generate ulang kombinasi password acak untuk semua baris"
                        >
                          <RefreshCw size={12} />
                          <span>Acak Ulang Password</span>
                        </button>
                      </div>
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
                            <th className="p-2.5">Agama</th>
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
                                <div className="inline-flex items-center gap-1">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[10px] border ${
                                    s.isClassRecognized !== false
                                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  }`}>
                                    {s.studentClass || bulkClass}
                                  </span>
                                  {s.isClassRecognized !== false ? (
                                    <span className="text-[10px] text-emerald-600 font-bold" title="Format kelas valid & terdaftar di sistem">✓</span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 font-bold" title="Format kelas tidak terdaftar di jurusan resmi, mohon periksa">⚠️</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {s.religion || bulkReligion}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-gray-700 dark:text-gray-300">{s.username || '-'}</td>
                              <td className="p-2.5 font-mono">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                  bulkPasswordMode === 'random'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {bulkPasswordMode === 'random' && <Key size={11} className="text-indigo-500" />}
                                  {s.password || '-'}
                                </span>
                              </td>
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
            </>
          )}

            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Single) */}
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

        {/* Modal Konfirmasi Hapus Kolektif (Bulk Delete) */}
        <ConfirmModal
          isOpen={isBulkDeleteModalOpen}
          title={`Hapus ${selectedUserIds.size} Akun Pengguna Terpilih?`}
          message={
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus sebanyak <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedUserIds.size} akun</strong> ini secara permanen?
              </p>
              {selectedBreakdown.siswa > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ Terdapat <strong>{selectedBreakdown.siswa} akun siswa</strong> dalam daftar yang dipilih. Menghapus akun siswa juga akan membersihkan riwayat nilai rapor terkait.
                </div>
              )}
              {selectedBreakdown.guru > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                  ℹ️ Terdapat <strong>{selectedBreakdown.guru} akun guru</strong> dalam daftar yang dipilih.
                </div>
              )}
              <p className="text-xs text-gray-500">
                Tindakan ini tidak dapat dibatalkan dan semua data akun yang terhapus tidak dapat dipulihkan.
              </p>
            </div>
          }
          confirmText={`Ya, Hapus ${selectedUserIds.size} Akun`}
          cancelText="Batal"
          isLoading={isBulkDeleting}
          variant="danger"
          onConfirm={handleConfirmBulkDelete}
          onClose={() => setIsBulkDeleteModalOpen(false)}
        />

        {/* Modal Atur Kelas & Jurusan Kolektif (Bulk Assign Class) */}
        {isBulkClassModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden text-gray-900 dark:text-white transition-all my-auto">
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Atur Kelas & Jurusan Siswa</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Plotting massal untuk {selectedBreakdown.siswa} akun siswa terpilih</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBulkClassModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-purple-600" />
                    {selectedBreakdown.siswa} Siswa Terpilih
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    Siswa yang dipilih akan langsung dihubungkan ke kelas dan jurusan baru. Nilai dan jadwal pelajaran siswa akan otomatis disinkronkan.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                    Pilih Kelas & Jurusan Target
                  </label>
                  <select
                    value={bulkTargetClass}
                    onChange={(e) => setBulkTargetClass(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Kelas & Jurusan --</option>
                    {allClassOptions.map(cls => {
                      const j = getStudentJurusan(cls);
                      return (
                        <option key={cls} value={cls}>
                          {cls} {j ? `(${j.code} - ${j.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {bulkTargetClass && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                    <div className="text-gray-500 font-medium">Ringkasan Pengaturan:</div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <GraduationCap size={14} className="text-purple-600" />
                      Kelas: <span className="font-bold text-purple-600 dark:text-purple-400">{bulkTargetClass}</span>
                    </div>
                    {getStudentJurusan(bulkTargetClass) && (
                      <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Layers size={14} className="text-indigo-600" />
                        Jurusan: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{getStudentJurusan(bulkTargetClass)?.code}</span> - {getStudentJurusan(bulkTargetClass)?.name}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBulkClassModalOpen(false)}
                  disabled={isBulkClassUpdating}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!bulkTargetClass || isBulkClassUpdating}
                  onClick={handleConfirmBulkClass}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isBulkClassUpdating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Memperbarui Kelas...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Simpan Kelas ({selectedBreakdown.siswa} Siswa)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
