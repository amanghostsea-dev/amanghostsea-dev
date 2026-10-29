import { Calendar, Users, FileText, CheckSquare, Clock, BookOpen, LogOut, MonitorPlay, Key, Play, Square, Award, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";

export const dynamic = 'force-dynamic';

export default async function PortalGuru() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let teacherName = authName;
  if (authUser) {
    try {
      const user = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        } 
      });
      if (user) teacherName = user.name;
    } catch {}
  }
  if (!teacherName) teacherName = 'Bpk. Ahmad ST';

  // Fetch Live Database Stats
  let totalExams = 0;
  let activeExams: any[] = [];
  let totalAttempts = 0;
  let unreviewedSubmissions = 0;

  try {
    const [examsCount, activeList, attemptsCount, unreviewedCount] = await Promise.all([
      prisma.exam.count(),
      prisma.exam.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: { questions: true, attempts: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 2,
      }),
      prisma.examAttempt.count(),
      prisma.assignmentSubmission.count({
        where: { grade: null }
      })
    ]);
    totalExams = examsCount;
    activeExams = activeList;
    totalAttempts = attemptsCount;
    unreviewedSubmissions = unreviewedCount;
  } catch (err) {
    console.error('Error fetching guru stats:', err);
  }

  const classes = [
    { name: 'XI RPL 1', subject: 'Pemrograman Web', students: 32, status: 'Sedang Berlangsung' },
    { name: 'XI RPL 2', subject: 'Pemrograman Web', students: 34, status: 'Menunggu (10:15)' },
    { name: 'XII TKJ 1', subject: 'Dasar Jaringan', students: 30, status: 'Besok (07:30)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Guru */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col hidden md:flex h-screen sticky top-0 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-amber-500/30">
              G
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 dark:text-white block leading-tight">Portal Guru</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">SMK Garuda Mahadhika</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-1.5">
          <Link href="/portal/guru" className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-sm shadow-sm">
            <Calendar size={18} /> Jadwal & Dashboard
          </Link>
          <Link href="/admin/cbt" className="flex items-center gap-3 px-4 py-3 text-purple-600 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl font-bold text-sm transition-all">
            <MonitorPlay size={18} /> Smart CBT (Ujian)
            {activeExams.length > 0 && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesi Ujian Aktif"></span>
            )}
          </Link>
          <Link href="/admin/tugas" className="flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-medium text-sm transition-colors">
            <FileText size={18} /> Tugas Siswa
            {unreviewedSubmissions > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {unreviewedSubmissions}
              </span>
            )}
          </Link>
          <Link href="/portal/guru/kelas" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium text-sm transition-colors">
            <Users size={18} /> Kelas & Siswa
          </Link>
          <Link href="/portal/guru/presensi" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium text-sm transition-colors">
            <CheckSquare size={18} /> Presensi Siswa
          </Link>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <form action={logoutAction}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-semibold text-sm transition-colors cursor-pointer">
              <LogOut size={18} /> Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl">
        
        {/* Top Header Mobile */}
        <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-6 border border-gray-200 dark:border-gray-800">
          <div className="font-bold text-lg text-gray-900 dark:text-white">Portal Guru</div>
          <form action={logoutAction}>
            <button type="submit" title="Keluar"><LogOut size={20} className="text-red-500" /></button>
          </form>
        </div>

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              Selamat Datang, {teacherName}! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Guru Mata Pelajaran & Pendidik Produktif SMK Garuda Mahadhika
            </p>
          </div>
          <div className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-xl font-bold text-xs border border-amber-200 dark:border-amber-800/60 shadow-sm">
            Tahun Ajaran Genap 2026/2027
          </div>
        </div>

        {/* 🌟 PROMINENT CBT EXAM & TOKEN RELEASE WIDGET */}
        <div className="mb-8">
          {activeExams.length > 0 ? (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none"></div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-emerald-950/40 text-emerald-200 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Sesi Ujian CBT Sedang Aktif di Kelas
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {activeExams[0].title}
                  </h3>
                  <p className="text-emerald-100 text-xs sm:text-sm max-w-xl">
                    Target: <strong className="text-white">{activeExams[0].classTarget}</strong> • 
                    Durasi: <strong className="text-white">{activeExams[0].duration} Menit</strong> • 
                    Siswa Sedang Ujian: <strong className="text-white">{activeExams[0]._count.attempts} Siswa</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 px-5 rounded-2xl text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Token Siswa</div>
                    <div className="text-2xl font-black font-mono tracking-widest text-white mt-0.5">
                      {activeExams[0].token || 'RPL2026'}
                    </div>
                  </div>

                  <Link
                    href={`/admin/cbt/${activeExams[0].id}`}
                    className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Buka Monitor & Papan Token</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-xl shadow-purple-600/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-purple-950/40 text-purple-200 px-3 py-1 rounded-full text-xs font-bold border border-purple-400/30">
                  <MonitorPlay size={14} /> Modul Smart CBT Guru
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Kelola Ujian Online & Rilis Token Sesi
                </h3>
                <p className="text-purple-100 text-xs sm:text-sm max-w-xl">
                  Buat paket ujian, susun bank soal pilihan ganda, dan rilis token ujian secara instan saat jam pelajaran dimulai di kelas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/cbt"
                  className="px-5 py-3 bg-white text-purple-800 hover:bg-purple-50 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <MonitorPlay size={16} /> Buka Manajemen CBT
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center font-bold">
              <MonitorPlay size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Paket CBT</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalExams} Ujian</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Peserta CBT Tuntas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalAttempts} Siswa</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tugas Belum Dinilai</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{unreviewedSubmissions} Berkas</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center font-bold">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Jam Mengajar</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">24 Jam / Mgg</h3>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-amber-500" size={18} /> Jadwal Mengajar Terdekat
              </h2>
              <p className="text-xs text-gray-500">Jadwal tatap muka dan sesi kelas daring mingguan</p>
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-4 px-6">Kelas</th>
                  <th className="py-4 px-6">Mata Pelajaran</th>
                  <th className="py-4 px-6">Jumlah Siswa</th>
                  <th className="py-4 px-6">Status / Waktu</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {classes.map((cls, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{cls.name}</td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-medium">{cls.subject}</td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{cls.students} Siswa</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cls.status.includes('Sedang') ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {cls.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link href="/admin/cbt" className="text-purple-600 dark:text-purple-400 hover:underline font-bold text-xs inline-flex items-center gap-1">
                        Siapkan CBT <ArrowRight size={12} />
                      </Link>
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
