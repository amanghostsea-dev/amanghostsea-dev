'use client';
import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Settings, 
  Database, 
  Activity, 
  LogOut, 
  BookOpen, 
  Network, 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  ExternalLink, 
  CheckSquare, 
  Banknote, 
  MonitorPlay, 
  FileText, 
  Calendar, 
  Menu, 
  X, 
  Layers, 
  Award, 
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles
} from 'lucide-react';
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
  category: string;
  badge?: string | null;
  isDropdown?: boolean;
  subItems?: SubMenuItem[];
}

export default function AdminSidebar({ logoUrl, userRole = 'Super Admin', userName = 'Admin' }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const [jurusanDropdownOpen, setJurusanDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('jurusan');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('admin_sidebar_collapsed', String(next));
    } catch {}
  };

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
    // 🎓 Akademik & CBT
    { name: 'Dashboard Utama', path: '/admin', icon: <Activity size={18} />, category: 'Akademik & CBT' },
    { name: 'Plotting & Mapel', path: '/admin/mapel', icon: <BookOpen size={18} />, category: 'Akademik & CBT' },
    { name: 'Ujian Online & Jadwal (CBT)', path: '/admin/cbt', icon: <MonitorPlay size={18} />, category: 'Akademik & CBT', badge: 'Smart CBT' },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={18} />, category: 'Akademik & CBT' },

    // 💼 PPDB & BKK
    { name: 'Modul PPDB', path: '/admin/ppdb', icon: <Database size={18} />, category: 'Kesiswaan & BKK' },
    { name: 'Rincian Biaya PPDB', path: '/admin/settings/biaya-ppdb', icon: <Banknote size={18} />, category: 'Kesiswaan & BKK' },
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={18} />, category: 'Kesiswaan & BKK' },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={18} />, category: 'Kesiswaan & BKK' },

    // ⚙️ Manajemen & Master Data
    { name: 'Manajemen Akun', path: '/admin/users', icon: <Users size={18} />, category: 'Master Data & Sistem' },
    { 
      name: 'Jurusan & Rombel', 
      path: '/admin/jurusan', 
      icon: <Layers size={18} />,
      category: 'Master Data & Sistem',
      isDropdown: true,
      subItems: [
        { name: 'Program Jurusan', tab: 'jurusan', href: '/admin/jurusan?tab=jurusan', badge: null, dotColor: 'bg-blue-400' },
        { name: 'Manajemen Kelas & Rombel', tab: 'kelas', href: '/admin/jurusan?tab=kelas', badge: 'Baru', dotColor: 'bg-emerald-400' }
      ]
    },

    // 🌐 Konten & Pengaturan Web
    { name: 'Manajemen Konten', path: '/admin/berita', icon: <LayoutDashboard size={18} />, category: 'Konten & Portal Web' },
    { name: 'Kelola Sambutan', path: '/admin/sambutan', icon: <Users size={18} />, category: 'Konten & Portal Web' },
    { name: 'Struktur Organisasi', path: '/admin/struktur', icon: <Network size={18} />, category: 'Konten & Portal Web' },
    { name: 'Pengaturan Web', path: '/admin/settings', icon: <Settings size={18} />, category: 'Konten & Portal Web' },
  ];

  const panitiaMenuItems: MenuItem[] = [
    { name: 'Verifikasi PPDB', path: '/admin/ppdb', icon: <CheckSquare size={18} />, category: 'PPDB Online' },
  ];

  const bkkMenuItems: MenuItem[] = [
    { name: 'BKK Lowongan', path: '/admin/bkk/jobs', icon: <Briefcase size={18} />, category: 'Bursa Kerja & Alumni' },
    { name: 'Tracer Study', path: '/admin/bkk/tracer-study', icon: <TrendingUp size={18} />, category: 'Bursa Kerja & Alumni' },
  ];

  const guruMenuItems: MenuItem[] = [
    { name: 'Jadwal & Dashboard', path: '/portal/guru', icon: <Calendar size={18} />, category: 'Pembelajaran & CBT' },
    { name: 'Mata Pelajaran & Jadwal', path: '/admin/mapel', icon: <BookOpen size={18} />, category: 'Pembelajaran & CBT' },
    { name: 'Smart CBT & Jadwal Ujian', path: '/admin/cbt', icon: <MonitorPlay size={18} />, category: 'Pembelajaran & CBT', badge: 'CBT' },
    { name: 'Tugas Siswa', path: '/admin/tugas', icon: <FileText size={18} />, category: 'Pembelajaran & CBT' },
    { name: 'Penilaian Siswa', path: '/portal/guru/nilai', icon: <Award size={18} />, category: 'Kelas & Penilaian' },
    { name: 'Kelas & Siswa', path: '/portal/guru/kelas', icon: <Users size={18} />, category: 'Kelas & Penilaian' },
    { name: 'Presensi Siswa', path: '/portal/guru/presensi', icon: <CheckSquare size={18} />, category: 'Kelas & Penilaian' },
  ];

  const menuItems = isPPDBPanitia ? panitiaMenuItems : isBKK ? bkkMenuItems : isGuru ? guruMenuItems : superAdminMenuItems;

  // Filter pencarian menu
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase();
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [menuItems, searchQuery]);

  // Kelompokkan menu berdasarkan kategori
  const categorizedMenus = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    filteredMenuItems.forEach(item => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return Array.from(map.entries());
  }, [filteredMenuItems]);

  const roleTitle = isPPDBPanitia ? 'Panitia PPDB' : isBKK ? 'Pengelola BKK' : isGuru ? 'Portal Guru' : 'SuperAdmin';
  const roleSubtitle = isPPDBPanitia ? 'Verifikator Berkas' : isBKK ? 'Bursa Kerja Khusus' : isGuru ? `${userName}` : userName;

  return (
    <>
      {/* 📱 Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800 shadow-lg w-full max-w-full">
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
          className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer"
          aria-label="Buka Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 📱 Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 border-r border-slate-800">
            {/* Header Mobile Drawer */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <SchoolLogo logoUrl={logoUrl} />
                <div>
                  <span className="font-bold text-base tracking-tight block">{roleTitle}</span>
                  <span className="text-xs text-blue-400 block font-normal truncate max-w-[130px]">{roleSubtitle}</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu List Mobile */}
            <div className="p-3 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
              {categorizedMenus.map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-2 pb-0.5">
                    {category}
                  </div>
                  {items.map((item) => {
                    const isItemActive = isActive(item.path);

                    if (item.isDropdown && item.subItems) {
                      const isParentActive = pathname?.startsWith(item.path);
                      return (
                        <div key={item.path} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setJurusanDropdownOpen(!jurusanDropdownOpen)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                              isParentActive
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isParentActive ? 'bg-white/20' : 'bg-slate-800/80 text-slate-400'}`}>
                                {item.icon}
                              </div>
                              <span>{item.name}</span>
                            </div>
                            <ChevronDown
                              size={15}
                              className={`transition-transform duration-200 ${
                                jurusanDropdownOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'
                              }`}
                            />
                          </button>
                          {jurusanDropdownOpen && (
                            <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-700/70 ml-4 my-1">
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
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                          isItemActive
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-blue-500/25'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isItemActive ? 'bg-white/20' : 'bg-slate-800/80 text-slate-400'}`}>
                            {item.icon}
                          </div>
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            isItemActive 
                              ? 'bg-white/25 text-white' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer Mobile Drawer */}
            <div className="p-3 border-t border-slate-800 space-y-1 bg-slate-950/40">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-2.5 text-blue-400 hover:bg-slate-800 rounded-xl font-medium text-sm transition-colors"
              >
                <ExternalLink size={17} /> Lihat Website
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-red-400 hover:bg-slate-800 rounded-xl font-medium text-sm transition-colors text-left cursor-pointer"
                >
                  <LogOut size={17} /> Keluar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 🖥️ Desktop Persistent Sidebar (Modern, Fluid & Penuh Animasi Canggih) */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-72'
        } bg-slate-900/95 backdrop-blur-xl text-white flex flex-col h-screen sticky top-0 hidden md:flex flex-shrink-0 shadow-2xl border-r border-slate-800/80 transition-all duration-300 ease-in-out z-30 select-none relative overflow-hidden`}
      >
        {/* Subtle Ambient Background Light */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── HEADER SIDEBAR: Logo Sekolah & Profil Pengguna ── */}
        <div className={`border-b border-slate-800/80 transition-all duration-300 relative z-10 ${
          isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4 sm:p-4.5 flex items-center justify-between'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group">
              <SchoolLogo logoUrl={logoUrl} />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Online" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight block truncate text-slate-100">
                    {roleTitle}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block font-normal truncate max-w-[145px]" title={roleSubtitle}>
                  {roleSubtitle}
                </span>
              </div>
            )}
          </div>

          {/* Tombol Collapse / Expand Sidebar */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all duration-200 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
            title={isCollapsed ? 'Buka Sidebar Penuh' : 'Ciutkan Sidebar (Mode Ringkas)'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* ── PENCARIAN CEPAT MENU (Ketika Tidak Diciutkan) ── */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 relative z-10">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari menu fitur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DAFTAR MENU BERKATEGORI DENGAN ANIMASI FLUID ── */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${
          isCollapsed ? 'p-2 space-y-3' : 'p-3 space-y-4'
        }`}>
          {categorizedMenus.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Tidak ada menu &quot;{searchQuery}&quot;
            </div>
          ) : (
            categorizedMenus.map(([category, items]) => (
              <div key={category} className="space-y-1">
                {/* Judul Kategori Elegan */}
                {!isCollapsed && !searchQuery.trim() && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500/90 px-3 pt-1 pb-1 flex items-center justify-between select-none">
                    <span>{category}</span>
                    <span className="w-6 h-px bg-slate-800/80" />
                  </div>
                )}

                {/* Items Menu */}
                {items.map((item) => {
                  const isItemActive = isActive(item.path);

                  // ── Mode Diciutkan (Rail View) ──
                  if (isCollapsed) {
                    return (
                      <div key={item.path} className="relative group flex justify-center">
                        <Link
                          href={item.path}
                          prefetch={true}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                            isItemActive
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:scale-105'
                          }`}
                        >
                          {item.icon}
                        </Link>
                        {/* Tooltip Mengambang dengan Animasi Halus */}
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 pointer-events-none z-50 flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1 rounded bg-blue-500/30 text-blue-300 font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // ── Dropdown Item (Jurusan & Rombel) ──
                  if (item.isDropdown && item.subItems) {
                    const isParentActive = pathname?.startsWith(item.path);
                    return (
                      <div key={item.path} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setJurusanDropdownOpen(!jurusanDropdownOpen)}
                          className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            isParentActive
                              ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30 shadow-2xs'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white hover:translate-x-1'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                              isParentActive 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-slate-800/70 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 group-hover:scale-110'
                            }`}>
                              {item.icon}
                            </div>
                            <span className="tracking-tight">{item.name}</span>
                          </div>
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${
                              jurusanDropdownOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'
                            }`}
                          />
                        </button>
                        {jurusanDropdownOpen && (
                          <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-slate-700/80 ml-4 my-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            {item.subItems.map((sub) => {
                              const isSubActive = isParentActive && activeTab === sub.tab;
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  prefetch={true}
                                  onClick={() => setActiveTab(sub.tab)}
                                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                                    isSubActive
                                      ? 'bg-blue-600 text-white shadow-sm font-bold translate-x-1'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:translate-x-1'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${sub.dotColor}`} />
                                    <span>{sub.name}</span>
                                  </div>
                                  {sub.badge && (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-semibold">
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

                  // ── Standar Menu Item (Dengan Efek Active Glow & Hover Slide) ──
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={true}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer overflow-hidden ${
                        isItemActive
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 border border-blue-400/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80 hover:translate-x-1'
                      }`}
                    >
                      {/* Left glowing active accent bar */}
                      {isItemActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                      )}

                      {/* Shimmer sweep effect on hover */}
                      <span className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />

                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon Container with interactive animation */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isItemActive 
                            ? 'bg-white/20 text-white shadow-2xs group-hover:scale-105' 
                            : 'bg-slate-800/70 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 group-hover:scale-110'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="truncate tracking-tight">{item.name}</span>
                      </div>

                      {/* Trailing: Badge or Interactive Hover Arrow */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        {item.badge ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                            isItemActive 
                              ? 'bg-white/25 text-white' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 group-hover:border-blue-400'
                          }`}>
                            {item.badge}
                          </span>
                        ) : isItemActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse" />
                        ) : (
                          <ChevronRight 
                            size={14} 
                            className="text-slate-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" 
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── FOOTER SIDEBAR: Aksi Cepat & Tombol Keluar ── */}
        <div className={`border-t border-slate-800/80 space-y-1 relative z-10 bg-slate-950/40 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="space-y-1.5 flex flex-col items-center">
              <div className="relative group">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-400 hover:bg-slate-800 hover:text-blue-300 hover:scale-105 transition-all"
                >
                  <ExternalLink size={17} />
                </Link>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Lihat Website
                </div>
              </div>

              <form action={logoutAction} className="w-full flex justify-center">
                <div className="relative group">
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:bg-slate-800 hover:text-red-300 hover:scale-105 transition-all cursor-pointer"
                  >
                    <LogOut size={17} />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Keluar Sistem
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tombol Lihat Website */}
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between px-3.5 py-2 text-blue-400 hover:bg-blue-950/30 hover:text-blue-300 border border-transparent hover:border-blue-900/40 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-950/50 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200">
                    <ExternalLink size={14} />
                  </div>
                  <span>Lihat Website</span>
                </div>
                <ChevronRight size={13} className="text-blue-400/50 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Tombol Keluar */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="group w-full flex items-center justify-between px-3.5 py-2 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 border border-transparent hover:border-rose-900/40 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-950/50 text-rose-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform duration-200">
                      <LogOut size={14} />
                    </div>
                    <span>Keluar Sistem</span>
                  </div>
                  <span className="text-[10px] text-rose-500/70 font-mono">Exit</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── FOOTER KREDIT PENGEMBANG ── */}
        <div className={`border-t border-slate-800/80 font-mono text-slate-400 bg-slate-950/60 relative z-10 ${
          isCollapsed ? 'py-2.5 text-center text-[10px]' : 'px-4 py-2.5 text-[11px] flex items-center justify-between'
        }`}>
          {isCollapsed ? (
            <span className="font-bold text-slate-300" title="Created by Abdul Rahman">AR</span>
          ) : (
            <>
              <span className="text-slate-500 flex items-center gap-1">
                <Sparkles size={11} className="text-purple-400" />
                <span>Created by</span>
              </span>
              <span className="font-bold text-slate-200 hover:text-white transition-colors">
                Abdul Rahman
              </span>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
