'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import SchoolLogo from '@/components/SchoolLogo';

export default function NavbarClient(props: { settings?: any }) {
  const settings = props.settings || { schoolName: 'SMK GaMa', logoUrl: null };
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 border-b ${
      isScrolled 
        ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-gray-200 dark:border-gray-800 shadow-sm py-2' 
        : 'bg-transparent border-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <SchoolLogo logoUrl={settings?.logoUrl} />
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white flex items-center">
              {settings?.schoolName?.split(' ')[0]} <span className="ml-1.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 animate-[pulse_3s_ease-in-out_infinite] group-hover:from-purple-600 group-hover:via-pink-500 group-hover:to-orange-500 transition-all duration-700">{settings?.schoolName?.split(' ').slice(1).join(' ')}</span>
            </span>
          </div>
          <div className="hidden md:flex space-x-6 lg:space-x-8 items-center">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Beranda</Link>
            
            {/* Dropdown Profil */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors py-2">
                Profil <ChevronDown size={16} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <div className="py-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
                  <Link href="/profil/sambutan" className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                    Sambutan Kepala Sekolah
                  </Link>
                  <Link href="/profil/struktur" className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                    Struktur Organisasi
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/berita" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Berita</Link>
            <Link href="/bkk" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors relative">
              BKK (Karir)
              <span className="absolute -top-3 -right-4 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">New</span>
            </Link>
            <Link href="/portofolio" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Karya Siswa</Link>
            <Link href="/ppdb" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">PPDB</Link>
            <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Login Portal</Link>
          </div>
          <div className="flex gap-4">
            <Link href="/ppdb" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 hover:-translate-y-0.5">
              Daftar PPDB
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
