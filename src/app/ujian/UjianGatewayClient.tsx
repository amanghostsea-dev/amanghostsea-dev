'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  MonitorPlay, 
  Key, 
  User, 
  ArrowRight, 
  Clock, 
  FileCheck2, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Wifi,
  ChevronRight
} from 'lucide-react';
import { quickJoinExamAction } from './actions';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token: string | null;
  description: string | null;
  status?: string;
  _count: {
    questions: number;
  };
}

export default function UjianGatewayClient({
  activeExams = [],
  currentStudentName = '',
}: {
  activeExams: ExamItem[];
  currentStudentName: string;
}) {
  const [studentName, setStudentName] = useState(currentStudentName);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const formData = new FormData();
    formData.append('studentName', studentName.trim() || 'Siswa SMK');
    formData.append('token', token.trim().toUpperCase());

    try {
      const res = await quickJoinExamAction(formData);
      if (res && res.error) {
        setErrorMessage(res.error);
        setLoading(false);
      }
    } catch {
      // If redirect throws, it's normal Next.js behavior
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500 selection:text-white">
      {/* Background cyber ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>Server CBT Aktif & Terhubung</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* Hero Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-purple-400" />
            Gerbang Masuk Ujian Mandiri Siswa
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Smart CBT <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400">Ruang Ujian Online</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Akses langsung ujian berbasis komputer & smartphone. Masukkan nama Anda dan token ujian dari pengawas.
          </p>
        </div>

        {/* Quick Login Form Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500"></div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User size={14} className="text-purple-400" /> Nama Siswa / NISN
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key size={14} className="text-amber-400" /> Token Ujian
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Diberikan Pengawas)
                  </span>
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="CONTOH: PAS24G"
                  maxLength={12}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-600 text-center text-lg sm:text-xl font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Mulai Masuk Ujian</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <Link
                href="/portal/siswa/cbt"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua paket ujian di Portal Siswa</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Active Exams Preview Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                <MonitorPlay size={18} />
              </div>
              <h2 className="text-lg font-bold text-white">
                Daftar Paket Ujian Aktif Hari Ini
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {activeExams.length} Paket Tersedia
            </span>
          </div>

          {activeExams.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <p className="text-sm text-slate-400">
                Belum ada jadwal ujian berstatus aktif saat ini. Silakan hubungi pengawas atau guru pengampu Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-purple-950/20 flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {exam.subject}
                      </span>
                      {exam.status === 'ACTIVE' ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sesi Dibuka
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                          <Clock size={11} /> Ruang Tunggu
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                      {exam.title}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-purple-400" />
                        <span>{exam.duration}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileCheck2 size={12} className="text-emerald-400" />
                        <span>{exam._count.questions} Soal</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-sky-400" />
                        <span className="truncate">{exam.classTarget}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/portal/siswa/cbt/${exam.id}`}
                    className="mt-4 w-full py-2 px-3 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Kerjakan Sekarang</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & System Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Wifi size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Hemat Kuota & Cepat</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dioptimasi khusus untuk smartphone siswa dengan sinyal seluler minimal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Anti-Cheat Cerdas</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mencatat perpindahan tab browser otomatis demi integritas ujian.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Auto-Save Jawaban</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Setiap pilihan tersimpan otomatis secara real-time ke sistem.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Portal Ujian Mandiri Siswa (Smart CBT) • SMK Digital Vocational Excellence
      </footer>
    </div>
  );
}

