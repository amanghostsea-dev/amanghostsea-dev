import { Calendar, Users, FileText, CheckSquare, Clock, BookOpen, LogOut } from "lucide-react";
import Link from "next/link";

export default function PortalGuru() {
  const classes = [
    { name: 'XI RPL 1', subject: 'Pemrograman Web', students: 32, status: 'Sedang Berlangsung' },
    { name: 'XI RPL 2', subject: 'Pemrograman Web', students: 34, status: 'Menunggu (10:15)' },
    { name: 'XII TKJ 1', subject: 'Dasar Jaringan', students: 30, status: 'Besok (07:30)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">Portal Guru</span>
          </div>
        </div>
        <div className="p-4 flex-1 space-y-2">
          <Link href="/portal/guru" className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl font-medium">
            <Calendar size={20} /> Jadwal Mengajar
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
            <Users size={20} /> Kelas & Siswa
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
            <FileText size={20} /> Input Nilai e-Rapor
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
            <CheckSquare size={20} /> Presensi Siswa
          </a>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-medium transition-colors">
            <LogOut size={20} /> Keluar
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Selamat Pagi, Bpk. Ahmad ST!</h1>
            <p className="text-gray-500 dark:text-gray-400">Guru Produktif Rekayasa Perangkat Lunak</p>
          </div>
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-semibold text-sm border border-amber-200">
            Tahun Ajaran Genap 2026/2027
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jam Mengajar</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">24 Jam / Minggu</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tugas Belum Dinilai</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">12 Berkas</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Siswa Wali Kelas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">32 Siswa</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-amber-500" size={20} /> Jadwal Mengajar Terdekat
            </h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="py-4 px-6 font-medium">Kelas</th>
                  <th className="py-4 px-6 font-medium">Mata Pelajaran</th>
                  <th className="py-4 px-6 font-medium">Jumlah Siswa</th>
                  <th className="py-4 px-6 font-medium">Status / Waktu</th>
                  <th className="py-4 px-6 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {classes.map((cls, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{cls.name}</td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{cls.subject}</td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{cls.students} Siswa</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cls.status.includes('Sedang') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {cls.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="text-blue-600 hover:underline font-medium text-sm">Buka Kelas</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
