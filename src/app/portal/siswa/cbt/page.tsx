import prisma from '@/lib/prisma';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { 
  ArrowLeft, 
  MonitorPlay, 
  Clock, 
  Users, 
  Key, 
  CheckCircle2, 
  Award, 
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SiswaCbtListPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  if (!studentName && authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        }
      });
      if (user) studentName = user.name;
    } catch {}
  }
  if (!studentName) studentName = 'Siswa SMK';

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'SW';

  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ['PUBLISHED', 'ACTIVE'] },
    },
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
      attempts: {
        where: {
          studentName,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top bar navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/portal/siswa"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Portal Siswa
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/25">
                <MonitorPlay size={24} />
              </span>
              Ruang Ujian Online (Smart CBT)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Daftar paket ujian aktif untuk Anda ({studentName}). Pastikan koneksi internet stabil sebelum mulai.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
              {initials}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</div>
              <div className="text-[10px] text-slate-500">XI - RPL 1</div>
            </div>
          </div>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <MonitorPlay className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Belum ada jadwal ujian yang sedang aktif untuk kelas Anda saat ini.
              </p>
            </div>
          ) : (
            exams.map((exam) => {
              const attempt = exam.attempts[0];
              const isSubmitted = attempt?.status === 'SUBMITTED';
              const isInProgress = attempt?.status === 'IN_PROGRESS';

              return (
                <div
                  key={exam.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                        {exam.subject}
                      </span>
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse">
                          Sedang Berjalan
                        </span>
                      ) : exam.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sesi Dibuka
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock size={11} /> Ruang Tunggu
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {exam.description || 'Petunjuk ujian belum dicantumkan.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-500" />
                        <span>{exam.duration} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-emerald-500" />
                        <span>{exam._count.questions} Butir Soal</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-blue-500" />
                        <span>{exam.classTarget}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Key size={14} className="text-amber-500" />
                        <span>{exam.token ? 'Butuh Token' : 'Tanpa Token'}</span>
                      </div>
                    </div>

                    {isSubmitted && (
                      <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                          Skor Ujian Anda:
                        </span>
                        <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                          {attempt.score} / 100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action CTA */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    {isSubmitted ? (
                      <Link
                        href={`/portal/siswa/cbt/${exam.id}`}
                        className="w-full block text-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                      >
                        Lihat Rincian Hasil Ujian
                      </Link>
                    ) : (
                      <Link
                        href={`/portal/siswa/cbt/${exam.id}`}
                        className={`w-full block text-center py-2.5 px-4 rounded-xl font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          exam.status === 'ACTIVE'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25'
                        }`}
                      >
                        {isInProgress
                          ? 'Lanjutkan Pengerjaan Ujian'
                          : exam.status === 'ACTIVE'
                          ? 'Masuk Ujian (Sesi Aktif) →'
                          : 'Masuk Ruang Tunggu Standby →'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
