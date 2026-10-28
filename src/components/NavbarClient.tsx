'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X, Briefcase, Sparkles, GraduationCap, Building2, MonitorPlay } from 'lucide-react';
import SchoolLogo from '@/components/SchoolLogo';

export default function NavbarClient(props: { settings?: any }) {
  const settings = props.settings || { schoolName: 'SMK GaMa', logoUrl: null };
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bkkOpen, setBkkOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const bkkRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bkkRef.current && !bkkRef.current.contains(event.target as Node)) {
        setBkkOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 shadow-xs py-2 sm:py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <SchoolLogo logoUrl={settings?.logoUrl} />
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white flex items-center">
              {settings?.schoolName?.split(' ')[0]} <span className="ml-1.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 animate-[pulse_3s_ease-in-out_infinite] group-hover:from-purple-600 group-hover:via-pink-500 group-hover:to-orange-500 transition-all duration-700">{settings?.schoolName?.split(' ').slice(1).join(' ')}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-5 lg:space-x-7 items-center">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors whitespace-nowrap">Beranda</Link>
            
            {/* Dropdown Profil */}
            <div 
              ref={profileRef}
              className="relative group"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button 
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors py-2 whitespace-nowrap cursor-pointer"
              >
                Profil <ChevronDown size={16} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : 'group-hover:rotate-180'}`} />
              </button>
              <div className={`absolute top-full left-0 pt-2 w-56 z-50 transition-all duration-200 ${
                profileOpen
                  ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                  : 'opacity-0 invisible translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto'
              }`}>
                <div className="py-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
                  <Link 
                    href="/profil/sambutan" 
                    onClick={() => setProfileOpen(false)}
                    className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                  >
                    Sambutan Kepala Sekolah
                  </Link>
                  <Link 
                    href="/profil/struktur" 
                    onClick={() => setProfileOpen(false)}
                    className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                  >
                    Struktur Organisasi
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/berita" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors whitespace-nowrap">Berita</Link>
            
            {/* Dropdown BKK (Karir) */}
            <div 
              ref={bkkRef}
              className="relative group shrink-0"
              onMouseEnter={() => setBkkOpen(true)}
              onMouseLeave={() => setBkkOpen(false)}
            >
              <div className="flex items-center gap-1">
                <Link 
                  href="/bkk" 
                  onClick={() => setBkkOpen(false)}
                  className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors py-2 whitespace-nowrap cursor-pointer"
                >
                  <span>BKK (Karir)</span>
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                    New
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBkkOpen(!bkkOpen);
                  }}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                  aria-label="Buka Menu BKK"
                >
                  <ChevronDown size={15} className={`transition-transform duration-200 ${bkkOpen ? 'rotate-180' : 'group-hover:rotate-180'}`} />
                </button>
              </div>

              {/* Dropdown with seamless hover bridge (pt-2 instead of mt-2) */}
              <div className={`absolute top-full left-0 pt-2 w-64 z-50 transition-all duration-200 ${
                bkkOpen
                  ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                  : 'opacity-0 invisible translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto'
              }`}>
                <div className="p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
                  <Link 
                    href="/bkk" 
                    onClick={() => setBkkOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 flex items-center gap-3 group/item transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Portal Utama BKK</div>
                      <div className="text-[11px] text-gray-500">Beranda Pusat Karir</div>
                    </div>
                  </Link>

                  <Link 
                    href="/bkk/jobs" 
                    onClick={() => setBkkOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 flex items-center gap-3 group/item transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Bursa Lowongan Kerja</div>
                      <div className="text-[11px] text-gray-500">Mitra Industri Terverifikasi</div>
                    </div>
                  </Link>

                  <Link 
                    href="/bkk/ai-matcher" 
                    onClick={() => setBkkOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-800 dark:text-gray-200 flex items-center gap-3 group/item transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        AI Career Matcher <span className="text-[9px] px-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold rounded">AI</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Pencocokan CV Cerdas</div>
                    </div>
                  </Link>

                  <Link 
                    href="/bkk/tracer-study" 
                    onClick={() => setBkkOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-800 dark:text-gray-200 flex items-center gap-3 group/item transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Tracer Study Alumni</div>
                      <div className="text-[11px] text-gray-500">Penelusuran Jejak Karir</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/portofolio" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors whitespace-nowrap">Karya Siswa</Link>
            <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors whitespace-nowrap">Login Portal</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/ppdb" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg hidden sm:flex items-center gap-2 hover:-translate-y-0.5">
              Daftar PPDB
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pt-2 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-4">
          {/* Direct CBT Button in Mobile Menu */}
          <Link 
            href="/ujian" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/25 mb-1"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <MonitorPlay size={18} />
              </div>
              <div className="text-left">
                <div>Ruang Ujian Online (CBT)</div>
                <div className="text-[10px] text-purple-200 font-normal">Akses langsung soal & ujian aktif</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-400 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Aktif
            </span>
          </Link>

          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl font-bold text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            Beranda
          </Link>
          
          <div className="py-1 border-t border-gray-100 dark:border-gray-800">
            <div className="px-3 py-1.5 text-xs font-black uppercase text-blue-600 tracking-wider">
              BKK (Bursa Kerja Khusus)
            </div>
            <Link 
              href="/bkk" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              • Beranda BKK
            </Link>
            <Link 
              href="/bkk/jobs" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              • Lowongan Kerja Mitra
            </Link>
            <Link 
              href="/bkk/ai-matcher" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              • AI Career Matcher
            </Link>
            <Link 
              href="/bkk/tracer-study" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              • Tracer Study Alumni
            </Link>
          </div>

          <div className="py-1 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <Link 
              href="/berita" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
            >
              Berita Sekolah
            </Link>
            <Link 
              href="/portofolio" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
            >
              Karya & Portofolio Siswa
            </Link>
            <Link 
              href="/ppdb" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-200 font-bold text-blue-600"
            >
              Pendaftaran PPDB Online
            </Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
            >
              Login Portal
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

