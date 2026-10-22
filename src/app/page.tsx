import Image from "next/image";
import { ArrowRight, BookOpen, Calendar, GraduationCap, LayoutDashboard, Users, Trophy, Newspaper, Code, Monitor, Camera, Briefcase, MapPin, Phone, Mail, Globe, MessageCircle, Video, CheckCircle } from "lucide-react";
import Link from "next/link";
import SchoolLogo from "@/components/SchoolLogo";
import Navbar from "@/components/Navbar";
import { getWebSettings } from "@/lib/settings";
import prisma from '@/lib/prisma';
import ModernHeroSection from "@/components/home/ModernHeroSection";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || 'SMK GaMa';
  
  // Fetch Program Keahlian (Jurusan) dari database
  let jurusans: any[] = [];
  try {
    jurusans = await prisma.jurusan.findMany({
      orderBy: { createdAt: 'asc' }
    });
  } catch (e) {
    console.warn("Could not fetch jurusans from DB, using empty fallback");
  }

  // Fetch Hot Jobs untuk Hero BKK live ticker
  let hotJobs: any[] = [];
  try {
    hotJobs = await prisma.jobListing.findMany({
      take: 4,
      orderBy: [
        { isHot: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  } catch (e) {
    console.warn("Could not fetch hot jobs for hero ticker, using fallback");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans">
      {/* Dynamic Navbar */}
      <Navbar />

      <main>
        {/* Futuristic Interactive Hero Section */}
        <ModernHeroSection 
          schoolName={schoolName} 
          jurusans={jurusans} 
          hotJobs={hotJobs} 
        />


        {/* Feature Cards Section */}
        <section className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Layanan & Sistem Terintegrasi</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* PPDB Card */}
              <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 cursor-pointer animate-slide-up delay-100">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <GraduationCap size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">PPDB Online</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                  Sistem pendaftaran peserta didik baru terpadu. Proses mudah, transparan, dan dapat diakses dari mana saja.
                </p>
                <Link href="/ppdb" className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Buka Portal <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>

              {/* Portal Siswa & Guru */}
              <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 cursor-pointer animate-slide-up delay-200">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Portal Akademik</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                  Akses jadwal pelajaran, transkrip nilai, e-learning, dan absensi khusus untuk siswa dan guru.
                </p>
                <Link href="/login" className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Login Sistem <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>

              {/* Berita */}
              <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-amber-500 hover:shadow-2xl transition-all duration-300 cursor-pointer animate-slide-up delay-300">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Newspaper size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Berita & Informasi</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                  Pengumuman resmi, kegiatan ekstrakurikuler, dan update berita terkini dari lingkungan sekolah.
                </p>
                <Link href="/berita" className="flex items-center text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Baca Berita <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>

              {/* Prestasi & Galeri */}
              <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-emerald-500 hover:shadow-2xl transition-all duration-300 cursor-pointer animate-slide-up delay-400">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Trophy size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Galeri Prestasi</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                  Dokumentasi kegiatan siswa, fasilitas sekolah, dan capaian prestasi tingkat nasional maupun internasional.
                </p>
                <Link href="/berita" className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Lihat Galeri <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Program Keahlian Section (NEW) */}
        <section className="py-20 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Program Keahlian</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full mb-6"></div>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Kami menyediakan berbagai program keahlian yang disesuaikan dengan kebutuhan industri masa kini untuk mencetak tenaga kerja profesional.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {jurusans.map((jurusan, index) => {
                const colors = [
                  { border: 'hover:border-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
                  { border: 'hover:border-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
                  { border: 'hover:border-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
                  { border: 'hover:border-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
                  { border: 'hover:border-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
                ];
                const color = colors[index % colors.length];
                const delay = `delay-${(index % 3 + 1) * 100}`;
                
                return (
                  <div key={jurusan.id} className={`bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 hover:shadow-xl ${color.border} transition-all group animate-slide-right ${delay} flex flex-col`}>
                    <div className={`w-14 h-14 ${color.bg} ${color.text} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <BookOpen size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{jurusan.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm flex-grow">{jurusan.description}</p>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <Users size={16} className="text-gray-400"/> Kuota: {jurusan.kuota} Siswa
                      </span>
                    </div>
                  </div>
                );
              })}
              {jurusans.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  Belum ada program keahlian yang ditambahkan.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mitra Industri Section (NEW) */}
        <section className="py-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-widest">Lulusan Kami Dipercaya & Bekerja di Berbagai Perusahaan</h3>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
              <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="text-blue-600" /> TechNesia</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="text-blue-600" /> CyberNet</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="text-blue-600" /> Kreativ Studio</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="text-blue-600" /> Nusa Corp</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="text-blue-600" /> AlphaTech</div>
            </div>
          </div>
        </section>

        {/* Highlight Berita Terbaru (NEW) */}
        <section className="py-24 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Berita Terbaru</h2>
                <div className="w-20 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <Link href="/berita" className="flex items-center text-blue-600 font-semibold hover:text-blue-700 group">
                Lihat Semua Berita <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  id: 1, 
                  title: 'Pendaftaran PPDB Gelombang 1 Resmi Dibuka', 
                  category: 'Pengumuman',
                  date: '5 Oktober 2026', 
                  image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80'
                },
                { 
                  id: 2, 
                  title: 'Tim Robotik SMK Raih Juara 1 Nasional', 
                  category: 'Prestasi',
                  date: '1 Oktober 2026', 
                  image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&q=80'
                },
                { 
                  id: 3, 
                  title: 'Kunjungan Industri ke PT. Teknologi Indonesia', 
                  category: 'Kegiatan',
                  date: '28 September 2026', 
                  image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80'
                }
              ].map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group cursor-pointer">
                  <div className="h-48 relative overflow-hidden">
                    <Image src={item.image} alt="News" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3 gap-2">
                      <Calendar size={14} /> {item.date}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center text-blue-600 font-medium text-sm mt-4">
                      Baca Selengkapnya <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Expanded Footer (NEW) */}
      <footer className="bg-gray-950 pt-20 pb-10 border-t border-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Brand Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <SchoolLogo logoUrl={settings?.logoUrl} />
                <span className="font-bold text-2xl text-white">{schoolName}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Mencetak generasi muda yang kompeten, berkarakter, dan siap bersaing di dunia industri kreatif dan teknologi masa depan.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 text-gray-400 hover:text-white transition-all">
                  <MessageCircle size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 text-gray-400 hover:text-white transition-all">
                  <Video size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 text-gray-400 hover:text-white transition-all">
                  <Globe size={18} />
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Tautan Cepat</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ArrowRight size={14}/> Beranda</Link></li>
                <li><Link href="/berita" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ArrowRight size={14}/> Berita & Pengumuman</Link></li>
                <li><Link href="/ppdb" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ArrowRight size={14}/> Pendaftaran (PPDB)</Link></li>
                <li><Link href="/login" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ArrowRight size={14}/> Portal Akademik</Link></li>
              </ul>
            </div>

            {/* Majors */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Program Keahlian</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {jurusans.map((jurusan, index) => {
                  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
                  const color = colors[index % colors.length];
                  return (
                    <li key={jurusan.id} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div> {jurusan.name}
                    </li>
                  );
                })}
                {jurusans.length === 0 && (
                  <li className="italic text-gray-500">Belum ada program keahlian.</li>
                )}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Kontak & Lokasi</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Jl. Pendidikan No. 123, Kota Cerdas, Provinsi Teknologi, 12345</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-500 flex-shrink-0" />
                  <span>(021) 555-0123</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-blue-500 flex-shrink-0" />
                  <span>info@smkbisa.sch.id</span>
                </li>
              </ul>
            </div>
            
          </div>

          {/* Bottom Sub-Footer Bar */}
          <div className="pt-8 mt-12 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
            <p>&copy; {new Date().getFullYear()} <strong className="text-white font-semibold">{schoolName}</strong>. All Rights Reserved.</p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-[11px] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Created by</span>
              <span className="font-bold text-white tracking-wide">Abdul Rahman</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
