import { BookOpen, Calendar, Clock, GraduationCap, LayoutDashboard, FileText, Bell, LogOut, User, MapPin, MonitorPlay, QrCode } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";

export const dynamic = 'force-dynamic';

export default async function PortalSiswa() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  let studentNis = authUser || '10293847';

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        },
      });
      if (user) {
        studentName = user.name;
        studentNis = user.nisn || user.username;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'S';
  const schedule = [
    { day: 'Senin', subject: 'Pemrograman Web', time: '07:30 - 10:00', teacher: 'Bpk. Ahmad ST', room: 'Lab Komputer 1' },
    { day: 'Senin', subject: 'Matematika', time: '10:15 - 12:30', teacher: 'Ibu Siti S.Pd', room: 'Ruang 12A' },
    { day: 'Selasa', subject: 'Basis Data', time: '07:30 - 09:45', teacher: 'Bpk. Budi S.Kom', room: 'Lab Komputer 2' },
    { day: 'Selasa', subject: 'Bahasa Inggris', time: '10:00 - 11:30', teacher: 'Mr. John', room: 'Ruang 10B' },
  ];

  const grades = [
    { subject: 'Pemrograman Web', assignment: 85, midExam: 80, finalExam: 88, finalGrade: 'A' },
    { subject: 'Basis Data', assignment: 90, midExam: 85, finalExam: 92, finalGrade: 'A' },
    { subject: 'Matematika', assignment: 78, midExam: 75, finalExam: 80, finalGrade: 'B' },
    { subject: 'Bahasa Inggris', assignment: 88, midExam: 82, finalExam: 85, finalGrade: 'A-' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">Portal Siswa</span>
          </div>
        </div>
        <div className="p-4 flex-1 space-y-2">
          <Link href="/portal/siswa" className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-medium">
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
            <Calendar size={20} /> Jadwal Pelajaran
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
            <GraduationCap size={20} /> Transkrip Nilai
          </a>
          <Link href="/portal/siswa/tugas" className="flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl font-medium transition-colors">
            <FileText size={20} /> Tugas Siswa
          </Link>
          <Link href="/portal/siswa/cbt" className="flex items-center gap-3 px-4 py-3 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 rounded-xl font-medium transition-colors">
            <MonitorPlay size={20} /> Smart CBT (Ujian)
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 rounded-xl font-medium transition-colors">
            <QrCode size={20} /> Absensi QR Code
          </a>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <form action={logoutAction}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-medium transition-colors">
              <LogOut size={20} /> Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10">
        
        {/* Top Navbar Mobile */}
        <div className="md:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
          <div className="font-bold text-lg">Portal Siswa</div>
          <form action={logoutAction}>
            <button type="submit" title="Keluar"><LogOut size={20} className="text-red-500" /></button>
          </form>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Halo, {studentName}! 👋</h1>
            <p className="text-gray-500 dark:text-gray-400">Kelas XI - Rekayasa Perangkat Lunak 1 (XI-RPL 1)</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 pr-4 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                {initials}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NIS / Akun: {studentNis}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions / Advanced Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl text-white flex items-center justify-between shadow-lg shadow-purple-500/30">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 mb-1"><MonitorPlay size={20} /> Ujian Berlangsung (CBT)</h3>
              <p className="text-purple-100 text-sm">Lihat daftar jadwal ujian online dan mulai mengerjakan.</p>
            </div>
            <Link
              href="/portal/siswa/cbt"
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-sm"
            >
              Buka CBT
            </Link>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-2xl text-white flex items-center justify-between shadow-lg shadow-green-500/30">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 mb-1"><QrCode size={20} /> Presensi Geolocation</h3>
              <p className="text-green-100 text-sm">Jarak Anda ke sekolah: <span className="font-bold text-white">0.5 km</span> (Valid).</p>
            </div>
            <button className="px-4 py-2 bg-white text-green-600 rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-sm">
              Hadir Sekarang
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500 dark:text-gray-400">Kehadiran</h3>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center"><Calendar size={20} /></div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">98%</h2>
            <p className="text-sm text-green-600 mt-2">↑ 2% dari bulan lalu</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500 dark:text-gray-400">Tugas Tertunda</h3>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center"><BookOpen size={20} /></div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">2</h2>
            <p className="text-sm text-amber-600 mt-2">Batas waktu hari ini</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500 dark:text-gray-400">Indeks Prestasi</h3>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center"><GraduationCap size={20} /></div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">88.5</h2>
            <p className="text-sm text-gray-500 mt-2">Rata-rata Semester Ganjil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Schedule */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="text-blue-500" size={20} /> Jadwal Hari Ini & Esok
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {schedule.map((item, index) => (
                <div key={index} className="flex gap-4 items-start relative">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 z-10"></div>
                    {index !== schedule.length - 1 && <div className="absolute top-4 left-[5px] w-[2px] h-full bg-gray-200 dark:bg-gray-800 -z-0"></div>}
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{item.subject}</h4>
                      <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-gray-900 rounded-md text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {item.day}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                      <span className="flex items-center gap-2"><Clock size={14} /> {item.time}</span>
                      <span className="flex items-center gap-2"><User size={14} /> {item.teacher}</span>
                      <span className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> {item.room}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grades */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-500" size={20} /> Ringkasan Nilai Terkini
              </h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Lihat Semua</button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="py-3 px-6 font-medium">Mata Pelajaran</th>
                    <th className="py-3 px-6 font-medium text-center">Tugas</th>
                    <th className="py-3 px-6 font-medium text-center">UTS</th>
                    <th className="py-3 px-6 font-medium text-center">UAS</th>
                    <th className="py-3 px-6 font-medium text-center">Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {grades.map((g, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">{g.subject}</td>
                      <td className="py-4 px-6 text-center">{g.assignment}</td>
                      <td className="py-4 px-6 text-center">{g.midExam}</td>
                      <td className="py-4 px-6 text-center">{g.finalExam}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg font-bold ${
                          g.finalGrade.includes('A') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {g.finalGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
