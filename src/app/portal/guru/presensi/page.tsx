import { Calendar, Users, FileText, CheckSquare, Clock, BookOpen, LogOut, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";
import PresensiClient from "./PresensiClient";

export const dynamic = 'force-dynamic';

export default async function GuruPresensiPage() {
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

  const students = await prisma.user.findMany({
    where: { role: 'Siswa' },
    orderBy: { name: 'asc' },
  });

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
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate block max-w-[140px]">{teacherName}</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-1.5">
          <Link href="/portal/guru" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium text-sm transition-colors">
            <Calendar size={18} /> Jadwal & Dashboard
          </Link>
          <Link href="/admin/cbt" className="flex items-center gap-3 px-4 py-3 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl font-bold text-sm transition-all">
            <MonitorPlay size={18} /> Smart CBT (Ujian)
          </Link>
          <Link href="/admin/tugas" className="flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-medium text-sm transition-colors">
            <FileText size={18} /> Tugas Siswa
          </Link>
          <Link href="/portal/guru/kelas" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium text-sm transition-colors">
            <Users size={18} /> Kelas & Siswa
          </Link>
          <Link href="/portal/guru/presensi" className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-sm shadow-sm">
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
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-6 border border-gray-200 dark:border-gray-800">
          <div className="font-bold text-lg text-gray-900 dark:text-white">Presensi Siswa</div>
          <form action={logoutAction}>
            <button type="submit" title="Keluar"><LogOut size={20} className="text-red-500" /></button>
          </form>
        </div>

        <PresensiClient students={students} teacherName={teacherName} />
      </main>
    </div>
  );
}
