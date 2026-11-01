'use client';
import { useState, useEffect } from 'react';
import { Users, Settings, Database, Activity, LogOut, BookOpen, Network, LayoutDashboard, TrendingUp, Briefcase, ExternalLink, CheckSquare, Banknote, MonitorPlay, FileText, Calendar, Menu, X, Layers, Award, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SchoolLogo from '@/components/SchoolLogo';
import { logoutAction } from '@/app/login/actions';

interface AdminSidebarProps {
  logoUrl?: string | null;
  userRole?: string;
  userName?: string;
}

interface SubMenuItem {
  name: string;
  tab: string;
  href: string;
  badge?: string | null;
  dotColor: string;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  isDropdown?: boolean;
  subItems?: SubMenuItem[];
}

export default function AdminSidebar({ logoUrl, userRole = 'Super Admin', userName = 'Admin' }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [jurusanDropdownOpen, setJurusanDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('jurusan');

  useEffect(() => {
    if (pathname?.startsWith('/admin/jurusan')) {
      setJurusanDropdownOpen(true);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'kelas') setActiveTab('kelas');
        else setActiveTab('jurusan');
      }
    }
  }, [pathname]);

  const isPPDBPanitia = userRole === 'Panitia PPDB' || userRole === 'Verifikator PPDB';
  const isBKK = userRole === 'Admin BKK' || userRole === 'BKK';
  const isGuru = userRole === 'Guru';

  const isActive = (path: string) => {
    if (path === '/admin' && pathname !== '/admin') return false;
    if (path === '/portal/guru' && pathname !== '/portal/guru') return false;
    return pathname?.startsWith(path);
  };

  const superAdminMenuItems: MenuItem[] = [
    { name: 'Dashboard Utama', path: '/admin', icon: <Activity size={20} /> },
    { name: 'Plotting & Mapel', path: '/admin/mapel', icon: <BookOpen size={20} /> },
    { name: 'Ujian Online & Jadwal (CBT)', path: '/admin/cbt', icon: <MonitorPlay size={20} /> },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={20} /> },
    { name: 'Modul PPDB', path: '/admin/ppdb', icon: <Database size={20} /> },
    { name: 'Rincian Biaya PPDB', path: '/admin/settings/biaya-ppdb', icon: <Banknote size={20} /> },
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={20} /> },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={20} /> },
    { name: 'Manajemen Akun', path: '/admin/users', icon: <Users size={20} /> },
    { 
      name: 'Jurusan & Rombel', 
      path: '/admin/jurusan', 
      icon: <Layers size={20} />,
      isDropdown: true,
      subItems: [
        { name: 'Program Jurusan', tab: 'jurusan', href: '/admin/jurusan?tab=jurusan', badge: null, dotColor: 'bg-blue-400' },
        { name: 'Manajemen Kelas & Rombel', tab: 'kelas', href: '/admin/jurusan?tab=kelas', badge: 'Baru', dotColor: 'bg-emerald-400' }
      ]
    },
    { name: 'Manajemen Konten', path: '/admin/berita', icon: <LayoutDashboard size={20} /> },
    { name: 'Kelola Sambutan', path: '/admin/sambutan', icon: <Users size={20} /> },
    { name: 'Struktur Organisasi', path: '/admin/struktur', icon: <Network size={20} /> },
    { name: 'Pengaturan Web', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const panitiaMenuItems: MenuItem[] = [
    { name: 'Verifikasi PPDB', path: '/admin/ppdb', icon: <CheckSquare size={20} /> },
  ];

  const bkkMenuItems: MenuItem[] = [
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={20} /> },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={20} /> },
  ];

  const guruMenuItems: MenuItem[] = [
    { name: 'Jadwal & Dashboard', path: '/portal/guru', icon: <Calendar size={20} /> },
    { name: 'Smart CBT & Jadwal Ujian', path: '/admin/cbt', icon: <MonitorPlay size={20} /> },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={20} /> },
    { name: 'Penilaian Siswa', path: '/portal/guru/nilai', icon: <Award size={20} /> },
    { name: 'Kelas & Siswa', path: '/portal/guru/kelas', icon: <Users size={20} /> },
    { name: 'Presensi Siswa', path: '/portal/guru/presensi', icon: <CheckSquare size={20} /> },
  ];

  const menuItems = isPPDBPanitia ? panitiaMenuItems : isBKK ? bkkMenuItems : isGuru ? guruMenuItems : superAdminMenuItems;

  const roleTitle = isPPDBPanitia ? 'Panitia PPDB' : isBKK ? 'Pengelola BKK' : isGuru ? 'Portal Guru' : 'SuperAdmin';
  const roleSubtitle = isPPDBPanitia ? 'Verifikator Berkas' : isBKK ? 'Bursa Kerja Khusus' : isGuru ? `${userName}` : userName;

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <SchoolLogo logoUrl={logoUrl} />
          <div>
            <span className="font-bold text-sm tracking-tight block">
              {roleTitle}
            </span>
            <span className="text-[11px] text-blue-400 block font-normal truncate max-w-[160px]">
              {roleSubtitle}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none"
          aria-label="Buka Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 border-r border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SchoolLogo logoUrl={logoUrl} />
                <div>
                  <span className="font-bold text-base tracking-tight block">{roleTitle}</span>
                  <span className="text-xs text-blue-400 block font-normal truncate max-w-[130px]">{roleSubtitle}</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => {
                if (item.isDropdown && item.subItems) {
                  const isParentActive = pathname?.startsWith(item.path);
                  return (
                    <div key={item.path} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setJurusanDropdownOpen(!jurusanDropdownOpen)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                          isParentActive
                            ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            jurusanDropdownOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'
                          }`}
                        />
                      </button>
                      {jurusanDropdownOpen && (
                        <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-slate-700/70 ml-4 my-1">
                          {item.subItems.map((sub) => {
                            const isSubActive = isParentActive && activeTab === sub.tab;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                prefetch={true}
                                onClick={() => {
                                  setActiveTab(sub.tab);
                                  setMobileOpen(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${sub.dotColor}`} />
                                  <span>{sub.name}</span>
                                </div>
                                {sub.badge && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    {sub.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    prefetch={true}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon} {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-800 space-y-1">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-2.5 text-blue-400 hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors"
              >
                <ExternalLink size={18} /> Lihat Website
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-red-400 hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors text-left"
                >
                  <LogOut size={18} /> Keluar
                </button>
              </form>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between bg-slate-950/40">
              <span className="text-slate-400">Created by</span>
              <span className="font-bold text-slate-200">Abdul Rahman</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 hidden md:flex flex-shrink-0 shadow-xl border-r border-slate-800/80">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <SchoolLogo logoUrl={logoUrl} />
            <div>
              <span className="font-bold text-lg tracking-tight block">
                {roleTitle}
              </span>
              <span className="text-xs text-blue-400 block font-normal truncate max-w-[140px]">
                {roleSubtitle}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            if (item.isDropdown && item.subItems) {
              const isParentActive = pathname?.startsWith(item.path);
              return (
                <div key={item.path} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setJurusanDropdownOpen(!jurusanDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-150 ${
                      isParentActive
                        ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${
                        jurusanDropdownOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'
                      }`}
                    />
                  </button>
                  {jurusanDropdownOpen && (
                    <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-slate-700/80 ml-5 my-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = isParentActive && activeTab === sub.tab;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            prefetch={true}
                            onClick={() => setActiveTab(sub.tab)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              isSubActive
                                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${sub.dotColor}`} />
                              <span>{sub.name}</span>
                            </div>
                            {sub.badge && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-150 ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon} {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-blue-400 hover:bg-slate-800 rounded-lg font-medium transition-colors"
          >
            <ExternalLink size={20} /> Lihat Website
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg font-medium transition-colors text-left"
            >
              <LogOut size={20} /> Keluar
            </button>
          </form>
        </div>

        <div className="px-5 py-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between bg-slate-950/40">
          <span className="text-slate-400">Created by</span>
          <span className="font-bold text-slate-200">Abdul Rahman</span>
        </div>
      </aside>
    </>
  );
}
