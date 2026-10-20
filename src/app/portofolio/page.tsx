import Link from "next/link";
import { ArrowLeft, ExternalLink, Code, Camera, Briefcase } from "lucide-react";
import { getWebSettings } from "@/app/admin/settings/actions";

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  return {
    title: `Portofolio Siswa - ${schoolName}`,
    description: `Galeri karya inovatif siswa-siswi ${schoolName}.`,
  };
}

export default async function PortofolioSiswa() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";

  const projects = [
    {
      id: 1,
      title: "Sistem Kasir Pintar Berbasis Cloud",
      student: "Ahmad Rizky (Kelas XII RPL)",
      category: "Aplikasi Web",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
      description: "Aplikasi point-of-sale untuk UMKM dengan fitur laporan penjualan otomatis.",
      icon: <Code size={20} className="text-blue-500" />
    },
    {
      id: 2,
      title: "Film Pendek: Asa di Ujung Senja",
      student: "Tim Sinematografi (Kelas XI MM)",
      category: "Multimedia",
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop",
      description: "Juara 2 Lomba Film Pendek Nasional. Menceritakan perjuangan meraih cita-cita.",
      icon: <Camera size={20} className="text-purple-500" />
    },
    {
      id: 3,
      title: "Robot Pemilah Sampah Otomatis",
      student: "Eko Pratama (Kelas XII TKJ)",
      category: "Hardware / IoT",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
      description: "Menggunakan sensor ultrasonik dan AI untuk mendeteksi sampah organik dan anorganik.",
      icon: <Briefcase size={20} className="text-orange-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <div className="bg-slate-900 text-white pt-20 pb-32">
        <div className="max-w-6xl mx-auto px-6 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={20} /> Kembali ke Beranda
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Galeri Karya Siswa</h1>
          <p className="text-xl text-slate-400 max-w-2xl">
            "Hire Our Students" - Lihat berbagai karya inovatif dan portofolio digital yang diciptakan oleh siswa-siswi terbaik kami siap kerja.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300">
              <div className="h-48 w-full relative overflow-hidden bg-gray-200">
                <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 flex items-center gap-1.5 shadow-sm">
                  {project.icon} {project.category}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{project.title}</h3>
                <p className="text-blue-600 font-medium text-sm mb-4">By: {project.student}</p>
                <p className="text-gray-600 mb-6 text-sm line-clamp-3">
                  {project.description}
                </p>
                <button className="w-full py-2.5 rounded-xl border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <ExternalLink size={18} /> Lihat Detail Portofolio
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
