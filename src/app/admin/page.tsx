import { Users, Settings, Database, Server, Shield, Activity, LogOut, BookOpen, Network, TrendingUp, Briefcase, MonitorPlay, Calendar, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import SchoolLogo from '@/components/SchoolLogo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

  // 🔄 Sinkronisasi Data Pengguna Aktif Real-Time dari Database
  const [
    activeUsersCount,
    activeStudentsCount,
    activeTeachersCount,
    activeStaffCount,
    cbtExamsCount,
  ] = await Promise.all([
    prisma.user.count({
      where: { status: { equals: 'Aktif', mode: 'insensitive' } },
    }),
    prisma.user.count({
      where: {
        role: 'Siswa',
        status: { equals: 'Aktif', mode: 'insensitive' },
      },
    }),
    prisma.user.count({
      where: {
        role: 'Guru',
        status: { equals: 'Aktif', mode: 'insensitive' },
      },
    }),
    prisma.user.count({
      where: {
        role: { notIn: ['Siswa', 'Guru'] },
        status: { equals: 'Aktif', mode: 'insensitive' },
      },
    }),
    prisma.exam.count(),
  ]);

  return (
    <main className="p-4 sm:p-6 md:p-10 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">System Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Selamat datang, Administrator Utama.</p>
        </div>
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm w-fit">
          <Shield className="text-blue-500" size={18} />
          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Level: Super Admin</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Total Pengguna Aktif (Sinkron Database Real-Time) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Pengguna Aktif</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {activeUsersCount.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">{activeStudentsCount} Siswa • {activeTeachersCount} Guru • {activeStaffCount} Admin</span>
          </div>
        </div>

        {/* Card 2: Siswa Aktif Terdaftar */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap size={24} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Siswa Aktif Terdaftar</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {activeStudentsCount.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            Terhubung ke Ujian CBT & Rapor
          </div>
        </div>

        {/* Card 3: Paket Ujian CBT */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <MonitorPlay size={24} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Paket Ujian CBT</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {cbtExamsCount.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Bank Soal & Penjadwalan Terintegrasi
          </div>
        </div>

        {/* Card 4: Status Server */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Server size={24} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Status Server</p>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
              <span>Normal</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            PostgreSQL Database & API Online
          </div>
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
