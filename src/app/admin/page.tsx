import { Users, Settings, Database, Server, Shield, Activity, LogOut, BookOpen, Network, TrendingUp, Briefcase, MonitorPlay, Calendar } from 'lucide-react';
import Link from 'next/link';
import SchoolLogo from '@/components/SchoolLogo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_token')?.value;

  if (role === 'Panitia PPDB' || role === 'Verifikator PPDB') {
    redirect('/admin/ppdb');
  }
  if (role === 'Admin BKK' || role === 'BKK') {
    redirect('/admin/bkk/jobs');
  }
  if (role === 'Guru') {
    redirect('/portal/guru');
  }
  return (
    <main className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Selamat datang, Administrator Utama.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
          <Shield className="text-blue-500" size={20} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Level: Super Admin</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Pengguna Aktif</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">1,248</h3>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
            <Server size={24} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Status Server</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-green-500">Normal</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Akses Cepat Modul Sistem</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/cbt" className="p-6 border border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/20 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group cursor-pointer block">
            <MonitorPlay className="text-purple-600 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Ujian Online (CBT)</h3>
            <p className="text-slate-500 text-sm">Kelola bank soal, kontrol ruang ujian live, dan rilis token kelas.</p>
          </Link>
          <Link href="/admin/cbt?tab=jadwal" className="p-6 border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Calendar className="text-indigo-600 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Jadwal Ujian & Anti-Bentrok</h3>
            <p className="text-slate-500 text-sm">Atur jadwal ujian online per kelas dan cegah tabrakan waktu otomatis.</p>
          </Link>
          <Link href="/admin/ppdb" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group">
            <Database className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Verifikasi PPDB</h3>
            <p className="text-gray-500 text-sm">Kelola data pendaftaran siswa baru yang masuk ke sistem.</p>
          </Link>
          <Link href="/admin/berita" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Settings className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Manajemen Konten (CMS)</h3>
            <p className="text-gray-500 text-sm">Kelola Berita, Pengumuman, dan Galeri di halaman utama.</p>
          </Link>
          <Link href="/admin/users" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-amber-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Users className="text-amber-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Manajemen Akun</h3>
            <p className="text-gray-500 text-sm">Kelola akses pengguna, siswa, guru, dan administrator.</p>
          </Link>
          <Link href="/admin/jurusan" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 hover:shadow-lg transition-all group cursor-pointer block">
            <BookOpen className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Manajemen Jurusan</h3>
            <p className="text-gray-500 text-sm">Kelola program keahlian dan kuota penerimaan siswa.</p>
          </Link>
          <Link href="/admin/sambutan" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-cyan-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Users className="text-cyan-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Kelola Profil Sekolah</h3>
            <p className="text-gray-500 text-sm">Update nama, foto, dan pesan sambutan Kepala Sekolah.</p>
          </Link>
          <Link href="/admin/struktur" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Network className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Kelola Bagan Organisasi</h3>
            <p className="text-gray-500 text-sm">Atur struktur organisasi dan hirarki kepengurusan sekolah.</p>
          </Link>
          <Link href="/admin/bkk/tracer-study" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all group cursor-pointer block">
            <TrendingUp className="text-orange-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">BKK Tracer Study</h3>
            <p className="text-gray-500 text-sm">Pantau statistik penyaluran alumni ke industri dan PTN.</p>
          </Link>
          <Link href="/admin/bkk/jobs" className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group cursor-pointer block">
            <Briefcase className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">BKK Lowongan</h3>
            <p className="text-gray-500 text-sm">Kelola info lowongan pekerjaan untuk siswa/alumni.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
