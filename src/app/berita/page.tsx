import { Calendar, ChevronRight, Search, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import SchoolLogo from "@/components/SchoolLogo";
import { getWebSettings } from "@/app/admin/settings/actions";

export default async function BeritaSekolah() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";

  const news = [
    {
      id: 1,
      title: 'Pendaftaran Peserta Didik Baru (PPDB) Gelombang 1 Resmi Dibuka',
      excerpt: `${schoolName} resmi membuka pendaftaran peserta didik baru untuk tahun ajaran 2026/2027. Tersedia beasiswa untuk siswa berprestasi...`,
      category: 'Pengumuman',
      date: '5 Oktober 2026',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    },
    {
      id: 2,
      title: `Tim Robotik ${schoolName} Raih Juara 1 Nasional`,
      excerpt: 'Kebanggaan kembali ditorehkan oleh siswa-siswi jurusan Rekayasa Perangkat Lunak dalam ajang kompetisi robotik tingkat nasional.',
      category: 'Prestasi',
      date: '1 Oktober 2026',
      image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&q=80',
    },
    {
      id: 3,
      title: 'Kunjungan Industri Kelas XI ke PT. Teknologi Indonesia',
      excerpt: 'Untuk meningkatkan pemahaman dunia kerja, siswa kelas XI jurusan TJKT mengadakan kunjungan industri guna melihat infrastruktur jaringan.',
      category: 'Kegiatan',
      date: '28 September 2026',
      image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80',
    },
    {
      id: 4,
      title: 'Workshop Pembuatan Startup Digital Bagi Pemula',
      excerpt: 'Sekolah akan menyelenggarakan workshop gratis pembuatan startup untuk semua siswa dengan pembicara dari industri startup ternama.',
      category: 'Agenda',
      date: '10 Oktober 2026',
      image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      
      {/* Header/Nav (Simplified version for Berita) */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center gap-3">
              <SchoolLogo logoUrl={settings?.logoUrl} />
              <span className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white">{schoolName}</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 font-medium">Beranda</Link>
              <Link href="/berita" className="text-blue-600 font-medium">Berita & Informasi</Link>
              <Link href="/ppdb" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 font-medium">PPDB</Link>
              <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 font-medium">Login Portal</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Title & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Sistem Informasi & Berita</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
              Dapatkan informasi terbaru mengenai pengumuman akademik, kegiatan sekolah, dan prestasi siswa {schoolName}.
            </p>
          </div>
          <div className="relative w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Cari berita..." 
              className="w-full md:w-80 pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Featured News (First item) */}
        <div className="mb-16">
          <div className="group rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row cursor-pointer">
            <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden">
              <img src={news[0].image} alt={news[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {news[0].category}
              </div>
            </div>
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Calendar size={16} /> {news[0].date}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {news[0].title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-lg line-clamp-3">
                {news[0].excerpt}
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-2 transition-all">
                Baca Selengkapnya <ArrowRight size={20} className="ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* News Grid */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">Berita Lainnya</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.slice(1).map((item) => (
            <div key={item.id} className="group bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col">
              <div className="h-56 relative overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/70 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {item.category}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <Clock size={14} /> {item.date}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3 text-sm flex-1">
                  {item.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center">
                    Baca Artikel <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
