'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, ArrowRight, Briefcase, GraduationCap, Trophy, 
  CheckCircle, ChevronRight, Laptop, Cpu, ShieldCheck, 
  Building2, Users, Star, Flame, Play, Bot, ArrowUpRight,
  TrendingUp, Compass, Award, ExternalLink
} from 'lucide-react';

interface ModernHeroProps {
  schoolName?: string;
  jurusans?: any[];
  hotJobs?: any[];
}

export default function ModernHeroSection({
  schoolName = "SMK GaMa",
  jurusans = [],
  hotJobs = []
}: ModernHeroProps) {
  const [activeTab, setActiveTab] = useState<'jurusan' | 'bkk' | 'ai' | 'fasilitas'>('jurusan');
  const [selectedMajorIndex, setSelectedMajorIndex] = useState(0);

  // AI Simulator State
  const [aiInterestInput, setAiInterestInput] = useState('');
  const [aiResult, setAiResult] = useState<{
    major: string;
    score: number;
    description: string;
    careers: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fallback Jurusan Data jika database belum terisi lengkap
  const displayJurusans = jurusans && jurusans.length > 0 ? jurusans : [
    {
      id: '1',
      name: 'Rekayasa Perangkat Lunak (RPL)',
      code: 'RPL',
      kuota: 72,
      description: 'Mencetak software engineer tangguh yang menguasai Web Development, Full-Stack Next.js, Mobile App, dan Implementasi AI terapan.',
      icon: 'Laptop',
      skills: ['Fullstack Web (React & Next.js)', 'Mobile Flutter/Android', 'Database & Cloud', 'AI Prompt Engineering'],
      careers: ['Frontend / Backend Developer', 'Mobile App Engineer', 'Software QA', 'IT Consultant'],
      partnerCompany: 'PT Telkom, GoTo, Cyber Solusindo'
    },
    {
      id: '2',
      name: 'Teknik Komputer & Jaringan (TKJ)',
      code: 'TKJ',
      kuota: 72,
      description: 'Fokus pada infrastruktur jaringan enterprise, cyber security, cloud architecture (AWS/GCP), dan administrasi server tingkat lanjut.',
      icon: 'Cpu',
      skills: ['MikroTik & Cisco CCNA', 'Cyber Security Defense', 'Linux Server Admin', 'Cloud Computing'],
      careers: ['Network Engineer', 'Cyber Security Analyst', 'System Administrator', 'DevOps Junior'],
      partnerCompany: 'Biznet, Telkomsel, CyberNet'
    },
    {
      id: '3',
      name: 'Teknik Kendaraan Ringan (TKR)',
      code: 'TKR',
      kuota: 72,
      description: 'Penguasaan teknologi mesin modern otomotif, sistem kelistrikan EFI, diagnostik komputer, hingga teknologi mobil listrik (EV).',
      icon: 'Flame',
      skills: ['Engine EFI Management', 'Sistem Rem ABS & Transmisi', 'Diagnostik Scanner Komputer', 'Teknologi Mobil Listrik'],
      careers: ['Service Advisor', 'Teknisi Ahli Otomotif', 'Quality Control Pabrikan', 'Wirausaha Bengkel Modern'],
      partnerCompany: 'Astra Honda, Toyota Auto2000, Daihatsu'
    },
    {
      id: '4',
      name: 'Akuntansi & Keuangan Lembaga (AKL)',
      code: 'AKL',
      kuota: 72,
      description: 'Pusat kompetensi pencatatan keuangan modern berbasis software cloud (Accurate, SAP, Zahir), perpajakan digital, dan perbankan syariah/konvensional.',
      icon: 'TrendingUp',
      skills: ['Software Accurate & MYOB', 'Perpajakan Digital (e-Faktur)', 'Financial Analysis', 'Perbankan & Kasir'],
      careers: ['Junior Auditor', 'Staff Akuntansi & Tax', 'Customer Service Bank', 'Fintech Specialist'],
      partnerCompany: 'Bank Mandiri, BCA, Kantor Akuntan Publik'
    },
    {
      id: '5',
      name: 'Desain Komunikasi Visual (DKV)',
      code: 'DKV',
      kuota: 72,
      description: 'Melahirkan desainer kreatif ahli animasi 3D, branding komersial, motion graphic, fotografi studio, dan video editing sinematik.',
      icon: 'Sparkles',
      skills: ['Adobe Creative Suite', '3D Blender Animation', 'Videografi & Color Grading', 'UI/UX Design'],
      careers: ['Motion Designer', 'Creative Director', 'Video Editor Profesional', 'UI/UX Designer'],
      partnerCompany: 'Transmedia, Studio Animasi, Digital Agency'
    }
  ];

  // Fallback Jobs jika belum ada data live
  const displayJobs = hotJobs && hotJobs.length > 0 ? hotJobs : [
    {
      id: 'j1',
      title: 'Junior Web Developer & IT Support',
      company: 'PT Cyber Solusindo Nusantara',
      location: 'Jakarta Barat / Hybrid',
      salary: 'Rp 5.2 - 7.5 Jt',
      type: 'Full-time',
      department: 'RPL / TKJ',
      isHot: true
    },
    {
      id: 'j2',
      title: 'Teknisi Servis Mesin & EFI',
      company: 'Auto2000 & Astra Partner',
      location: 'Tangerang & Serpong',
      salary: 'Rp 4.8 - 6.5 Jt',
      type: 'Full-time',
      department: 'TKR Otomotif',
      isHot: true
    },
    {
      id: 'j3',
      title: 'Staff Pajak & Finance Assistant',
      company: 'PT Prima Logistik Indonesia',
      location: 'Jakarta Pusat',
      salary: 'Rp 4.5 - 5.8 Jt',
      type: 'Kontrak',
      department: 'Akuntansi',
      isHot: false
    },
    {
      id: 'j4',
      title: 'Motion Graphic & Video Editor',
      company: 'Creative Media Agency',
      location: 'Jakarta Selatan',
      salary: 'Rp 5.0 - 7.0 Jt',
      type: 'Full-time',
      department: 'DKV / Multimedia',
      isHot: true
    }
  ];

  const handleSimulateAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInterestInput.trim()) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      const text = aiInterestInput.toLowerCase();
      let res = {
        major: 'Rekayasa Perangkat Lunak (RPL)',
        score: 96,
        description: 'Karakter Anda sangat analitis dan cocok untuk berkarir di dunia coding, pembuatan aplikasi web modern, dan kecerdasan buatan.',
        careers: ['Full-stack Engineer', 'Mobile App Creator', 'Tech Founder']
      };

      if (text.includes('mesin') || text.includes('motor') || text.includes('mobil') || text.includes('bengkel') || text.includes('otomotif') || text.includes('mekanik')) {
        res = {
          major: 'Teknik Kendaraan Ringan (TKR)',
          score: 97,
          description: 'Anda memiliki bakat kinestetik dan teknis tinggi. Sangat berpeluang jadi teknisi ahli otomotif modern dan industri kendaraan listrik!',
          careers: ['Teknisi Otomotif Astra', 'Diagnostic Specialist', 'Pengusaha Bengkel']
        };
      } else if (text.includes('jaringan') || text.includes('internet') || text.includes('hacker') || text.includes('server') || text.includes('security') || text.includes('rakit')) {
        res = {
          major: 'Teknik Komputer & Jaringan (TKJ)',
          score: 95,
          description: 'Minat Anda kuat pada arsitektur infrastruktur digital, cyber security, dan instalasi jaringan komputasi skala besar.',
          careers: ['Cyber Security Analyst', 'Network Administrator', 'Cloud Architect']
        };
      } else if (text.includes('uang') || text.includes('hitung') || text.includes('bank') || text.includes('bisnis') || text.includes('kantor') || text.includes('pajak')) {
        res = {
          major: 'Akuntansi & Keuangan Lembaga (AKL)',
          score: 94,
          description: 'Ketelitian dan kemampuan numerik Anda adalah aset berharga untuk menguasai manajemen finansial, perpajakan, dan perbankan digital.',
          careers: ['Financial Analyst', 'Staff Perbankan Nasional', 'Auditor Muda']
        };
      } else if (text.includes('gambar') || text.includes('video') || text.includes('animasi') || text.includes('foto') || text.includes('desain') || text.includes('kreatif')) {
        res = {
          major: 'Desain Komunikasi Visual (DKV)',
          score: 98,
          description: 'Imajinasi visual Anda sangat kaya! Sangat ideal untuk mendalami industri kreatif, motion graphic, 3D modelling, dan branding komersial.',
          careers: ['Motion Designer', 'Creative Director', 'UI/UX Visualist']
        };
      }

      setAiResult(res);
      setIsAnalyzing(false);
    }, 600);
  };

  const selectedMajor = displayJurusans[selectedMajorIndex] || displayJurusans[0];

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-blue-50/40 to-white dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950">
      {/* 1. Cyber Ambient Atmosphere & Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Futuristic Dot Matrix Pattern with Radial Mask */}
        <div 
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1.2px, transparent 0)`,
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)'
          }}
        />

        {/* Dynamic Multi-Color Glowing Mesh Aurora Orbs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-blue-500/25 via-indigo-500/20 to-purple-600/25 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-48 left-10 w-[380px] h-[380px] bg-sky-400/15 rounded-full blur-[100px] animate-float" />
        <div className="absolute top-60 right-10 w-[420px] h-[420px] bg-purple-500/15 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 2. Top Interactive Announcement Pill */}
        <div className="flex justify-center mb-6 animate-slide-up">
          <Link
            href="/ppdb"
            className="group relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-blue-200/80 dark:border-blue-800/80 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:border-blue-400 transition-all duration-300 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200 hover:scale-[1.02]"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
              PPDB 2026/2027 Resmi Dibuka
            </span>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-600">•</span>
            <span className="hidden sm:inline text-gray-600 dark:text-gray-400 font-medium">
              Jalur Prestasi & Beasiswa Tersedia
            </span>
            <ArrowRight size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3. Main Center Headline */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-950 dark:text-white tracking-tight leading-[1.12] mb-6 animate-slide-up">
            Membangun Generasi Vokasi <br className="hidden sm:block" />
            <span className="relative inline-block mt-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">
                Siap Kerja & Berprestasi Global
              </span>
              {/* Subtle underline glow */}
              <span className="absolute -bottom-2 left-0 w-full h-[6px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full blur-xs opacity-70"></span>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Selamat datang di ekosistem vokasi modern <strong className="font-bold text-gray-900 dark:text-white">{schoolName}</strong>. 
            Mengintegrasikan kurikulum industri masa depan, pembelajaran AI cerdas, dan jaminan kemitraan karir nyata.
          </p>

          {/* 4. Action Buttons (Ultra High-Tech Glow) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link 
              href="/ppdb" 
              className="w-full sm:w-auto relative group overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-8 py-4 rounded-2xl font-black text-base shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 text-center"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <Sparkles size={18} className="animate-spin-slow" />
              <span>Daftar PPDB Online</span>
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold ml-1">
                Gelombang 1
              </span>
              <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
            </Link>

            <Link 
              href="/bkk" 
              className="w-full sm:w-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-7 py-4 rounded-2xl font-bold text-base shadow-sm hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-400 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 text-center group"
            >
              <Briefcase size={18} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Portal Karir & BKK</span>
              <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded-full font-black">
                150+ Loker
              </span>
            </Link>

            <Link 
              href="/portofolio" 
              className="w-full sm:w-auto text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-5 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>Lihat Karya Siswa</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* 5. Trust Badges Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-10 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <ShieldCheck size={16} className="text-emerald-500" /> Akreditasi A Unggul
            </span>
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Building2 size={16} className="text-blue-500" /> 150+ Mitra Industri Resmi
            </span>
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Award size={16} className="text-amber-500" /> Sertifikasi Profesi BNSP
            </span>
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Bot size={16} className="text-purple-500" /> Kurikulum Vokasi AI-Ready
            </span>
          </div>
        </div>

        {/* 6. Quick Interactive Chips */}
        <div className="flex flex-wrap justify-center items-center gap-2.5 mb-10 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 mr-1">Eksplorasi Cepat:</span>
          <button 
            type="button"
            onClick={() => setActiveTab('jurusan')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'jurusan' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'
            }`}
          >
            ⚡ 5 Jurusan Unggulan
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('bkk')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bkk' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'
            }`}
          >
            💼 Bursa Kerja BKK Live
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' 
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-400'
            }`}
          >
            🤖 Coba AI Rekomendasi Jurusan
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('fasilitas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fasilitas' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-emerald-400'
            }`}
          >
            🏛️ Fasilitas Lab Modern
          </button>
        </div>

        {/* 7. HERO INTERACTIVE CONSOLE (Bento Showcase yang Bikin Betah!) */}
        <div className="relative max-w-5xl mx-auto">
          {/* Decorative Back Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur-xl opacity-20 dark:opacity-40 animate-pulse-glow pointer-events-none"></div>

          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xl overflow-hidden">
            {/* Header Console Bar */}
            <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="ml-2 text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                  {schoolName} Smart Portal Hub v2.6
                </span>
              </div>

              {/* Console Tabs */}
              <div className="flex items-center bg-gray-200/70 dark:bg-gray-800/70 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('jurusan')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'jurusan' ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  ⚡ Jurusan Vokasi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bkk')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'bkk' ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  💼 Loker BKK
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'ai' ? 'bg-white dark:bg-gray-900 text-purple-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  🤖 AI Advisor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fasilitas')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'fasilitas' ? 'bg-white dark:bg-gray-900 text-emerald-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  🏛️ Lab Spek Tinggi
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: JURUSAN INTERAKTIF */}
            {activeTab === 'jurusan' && (
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Selector List */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">
                      Pilih Program Keahlian:
                    </div>
                    {displayJurusans.map((j, idx) => {
                      const isSelected = selectedMajorIndex === idx;
                      return (
                        <button
                          key={j.id || idx}
                          type="button"
                          onClick={() => setSelectedMajorIndex(idx)}
                          className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between border cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-700 shadow-sm' 
                              : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}>
                              {j.code || `0${idx + 1}`}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{j.name}</div>
                              <div className="text-[11px] text-gray-500">Kuota Tersedia: {j.kuota || 72} Siswa</div>
                            </div>
                          </div>
                          <ChevronRight size={16} className={`transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Major Details Panel */}
                  <div className="lg:col-span-7 bg-gray-50 dark:bg-gray-950 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
                        <Sparkles size={14} /> Terkoneksi Standard Industri 4.0
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2">
                        {selectedMajor.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                        {selectedMajor.description}
                      </p>

                      {/* Skills Covered */}
                      <div className="mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Keahlian Yang Dipelajari:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedMajor.skills || ['Fullstack Coding', 'Troubleshooting', 'Cloud Server', 'Analisis Data']).map((skill: string, sIdx: number) => (
                            <span key={sIdx} className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold">
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Career Prospects */}
                      <div className="mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Peluang Profesi:</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {(selectedMajor.careers || ['Software Engineer', 'IT Specialist', 'Consultant']).join(' • ')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 mt-4">
                      <div className="text-xs text-gray-500">
                        Mitra: <strong className="text-gray-800 dark:text-gray-200">{selectedMajor.partnerCompany || 'Astra, Telkom, Bank Mandiri'}</strong>
                      </div>
                      <Link 
                        href="/ppdb" 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
                      >
                        Pilih Jurusan Ini <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: LIVE BURSA KERJA BKK */}
            {activeTab === 'bkk' && (
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="text-blue-600" size={20} /> Lowongan Mitra Industri Terverifikasi
                    </h3>
                    <p className="text-xs text-gray-500">Peluang karir langsung bagi siswa magang dan alumni sekolah.</p>
                  </div>
                  <Link href="/bkk/jobs" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Lihat Semua Lowongan ({displayJobs.length}+) <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayJobs.slice(0, 4).map((job) => (
                    <div 
                      key={job.id} 
                      className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-500 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            {job.department || 'Semua Jurusan'}
                          </span>
                          {job.isHot && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 flex items-center gap-1">
                              <Flame size={12} /> HOT
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{job.title}</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">{job.company}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800 text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{job.salary || 'Sesuai UMR'}</span>
                        <Link 
                          href="/bkk/jobs" 
                          className="font-bold text-gray-900 dark:text-white hover:text-blue-600 flex items-center gap-1 text-[11px]"
                        >
                          Lamar Sekarang &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: AI CAREER FINDER SIMULATOR */}
            {activeTab === 'ai' && (
              <div className="p-6 md:p-8">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold mb-3">
                    <Bot size={16} /> AI Smart Career Advisor
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2">
                    Bingung Memilih Jurusan? Tanyakan Pada AI!
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Ketik apa yang Anda suka lakukan (misalnya hobi, gadget, otomotif, hitung uang, atau menggambar), AI kami akan merekomendasikan jurusan yang paling cocok!
                  </p>

                  <form onSubmit={handleSimulateAI} className="flex gap-2 max-w-lg mx-auto mb-6">
                    <input
                      type="text"
                      value={aiInterestInput}
                      onChange={(e) => setAiInterestInput(e.target.value)}
                      placeholder="Contoh: Saya suka desain poster, video TikTok, dan koding game..."
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs md:text-sm outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl font-bold text-xs md:text-sm transition-all shadow-md shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isAnalyzing ? 'Menganalisis...' : 'Analisis Minat'}
                    </button>
                  </form>

                  {/* AI Result Card */}
                  {aiResult && (
                    <div className="bg-purple-50/70 dark:bg-purple-950/30 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/50 text-left animate-zoom-in">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                          Rekomendasi Terbaik AI:
                        </span>
                        <span className="text-xs font-black bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                          Kecocokan: {aiResult.score}%
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1.5">
                        {aiResult.major}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                        {aiResult.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
                        <div className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                          Karir Ideal: {aiResult.careers.join(' • ')}
                        </div>
                        <Link 
                          href="/ppdb" 
                          className="bg-purple-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors"
                        >
                          Daftar Jurusan Ini →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: FASILITAS & LAB MODERN */}
            {activeTab === 'fasilitas' && (
              <div className="p-6 md:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                    Fasilitas Laboratorium & Workshop Standar Industri
                  </h3>
                  <p className="text-xs text-gray-500">Peralatan mutakhir yang siap digunakan siswa untuk praktek nyata setiap hari.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold mb-3">
                      💻
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Lab Komputasi Core i9</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">PC High-End, dual-monitor, gigabit fiber optic untuk render 3D & software development.</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold mb-3">
                      🔧
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Bengkel EFI & EV Lab</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Scanner diagnostik OBD, hydraulic car lift, dan modul pelatihan kendaraan listrik.</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center font-bold mb-3">
                      🎙️
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Studio Podcast 4K</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Kamera sinema Sony, mic Shure broadcast, green screen studio, dan lighting multi-point.</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center font-bold mb-3">
                      🏛️
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Mini Bank & POS</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Ruang simulasi perbankan nyata dengan mesin teller, software kasir, dan akuntansi SAP.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8. Live School Pulse Ticker (Status Real-time Berjalan) */}
        <div className="mt-10 max-w-5xl mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl border border-gray-200/60 dark:border-gray-800 p-3 flex items-center gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE PULSE
          </div>
          <div className="overflow-hidden whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 font-medium">
            <span className="inline-block animate-[shimmerSweep_20s_linear_infinite]">
              📢 Pendaftaran PPDB 2026/2027 Gelombang 1 Dibuka &nbsp;•&nbsp; 
              💼 BKK: PT Astra Honda Motor & PT Telkom membuka kuota magang industri &nbsp;•&nbsp; 
              🏆 Selamat! Tim Robotik Siswa meraih Medali Emas LKS Nasional 2026 &nbsp;•&nbsp; 
              🚀 98.4% Alumni SMK GaMa langsung terserap kerja dan melanjutkan kuliah
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
