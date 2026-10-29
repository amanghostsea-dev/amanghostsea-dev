'use client';
import { Users, Settings, Database, Activity, LogOut, BookOpen, Network, LayoutDashboard, TrendingUp, Briefcase, ExternalLink, CheckSquare, Banknote, MonitorPlay, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SchoolLogo from '@/components/SchoolLogo';
import { logoutAction } from '@/app/login/actions';

interface AdminSidebarProps {
  logoUrl?: string | null;
  userRole?: string;
  userName?: string;
}

export default function AdminSidebar({ logoUrl, userRole = 'Super Admin', userName = 'Admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const isPPDBPanitia = userRole === 'Panitia PPDB' || userRole === 'Verifikator PPDB';
  const isBKK = userRole === 'Admin BKK' || userRole === 'BKK';
  const isGuru = userRole === 'Guru';

  const isActive = (path: string) => {
    if (path === '/admin' && pathname !== '/admin') return false;
    return pathname?.startsWith(path);
  };

  const superAdminMenuItems = [
    { name: 'Dashboard Utama', path: '/admin', icon: <Activity size={20} /> },
    { name: 'Ujian Online (CBT)', path: '/admin/cbt', icon: <MonitorPlay size={20} /> },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={20} /> },
    { name: 'Modul PPDB', path: '/admin/ppdb', icon: <Database size={20} /> },
    { name: 'Rincian Biaya PPDB', path: '/admin/settings/biaya-ppdb', icon: <Banknote size={20} /> },
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={20} /> },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={20} /> },
    { name: 'Manajemen Akun', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Manajemen Jurusan', path: '/admin/jurusan', icon: <BookOpen size={20} /> },
    { name: 'Manajemen Konten', path: '/admin/berita', icon: <LayoutDashboard size={20} /> },
    { name: 'Kelola Sambutan', path: '/admin/sambutan', icon: <Users size={20} /> },
    { name: 'Struktur Organisasi', path: '/admin/struktur', icon: <Network size={20} /> },
    { name: 'Pengaturan Web', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const panitiaMenuItems = [
    { name: 'Verifikasi PPDB', path: '/admin/ppdb', icon: <CheckSquare size={20} /> },
  ];

  const bkkMenuItems = [
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={20} /> },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={20} /> },
  ];

  const guruMenuItems = [
    { name: 'Dashboard Guru', path: '/portal/guru', icon: <LayoutDashboard size={20} /> },
    { name: 'Ujian Online (CBT)', path: '/admin/cbt', icon: <MonitorPlay size={20} /> },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={20} /> },
  ];

  const menuItems = isPPDBPanitia ? panitiaMenuItems : isBKK ? bkkMenuItems : isGuru ? guruMenuItems : superAdminMenuItems;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 hidden md:flex flex-shrink-0 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <SchoolLogo logoUrl={logoUrl} />
          <div>
            <span className="font-bold text-lg tracking-tight block">
              {isPPDBPanitia ? 'Panitia PPDB' : isBKK ? 'Pengelola BKK' : isGuru ? 'Portal Guru' : 'SuperAdmin'}
            </span>
            <span className="text-xs text-blue-400 block font-normal truncate max-w-[140px]">
              {isPPDBPanitia ? 'Verifikator Berkas' : isBKK ? 'Bursa Kerja Khusus' : isGuru ? `${userName}` : userName}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon} {item.name}
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-slate-800 space-y-1">
        <Link href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-blue-400 hover:bg-slate-800 rounded-lg font-medium transition-colors">
          <ExternalLink size={20} /> Lihat Website
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg font-medium transition-colors text-left">
            <LogOut size={20} /> Keluar
          </button>
        </form>
      </div>
      <div className="px-5 py-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between bg-slate-950/40">
        <span className="text-slate-400">Created by</span>
        <span className="font-bold text-slate-200">Abdul Rahman</span>
      </div>
    </aside>
  );
}
