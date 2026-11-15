import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import CbtExamRoom from './CbtExamRoom';
import { isClassTargetMatch, formatClassTargetDisplay } from '@/lib/cbt-schedule';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SiswaExamRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;
  const authClass = cookieStore.get('auth_class')?.value;

  const isStaff = authToken === 'Super Admin' || authToken === 'Guru';

  // Wajib login: jika siswa belum login menggunakan kartu peserta, arahkan ke gerbang ujian
  if (!authUser && !isStaff) {
    redirect(`/ujian?id=${id}`);
  }

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  let studentName = authName || '';
  let studentNis = authUser || '';
  let studentClass = authClass || '';

  // Cari user resmi di database
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(authUser ? [{ username: authUser }, { nisn: authUser }] : []),
          ...(authName ? [{ username: authName }, { nisn: authName }, { name: { equals: authName, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (user) {
      studentName = user.name;
      studentNis = user.nisn || user.username;
      if (user.studentClass) {
        studentClass = user.studentClass;
      }
    }
  } catch (e) {
    console.error('Error fetching user for exam room:', e);
  }

  if (!studentName) {
    studentName = 'Siswa SMK';
  }

  // Cari kelas resmi aktual siswa dari database StudentGrade
  try {
    const gradeRecord = await prisma.studentGrade.findFirst({
      where: {
        OR: [
          { studentName: { equals: studentName, mode: 'insensitive' as const } },
          ...(studentNis ? [{ studentNis }] : []),
          ...(authUser ? [{ studentNis: authUser }] : []),
          ...(authName ? [{ studentNis: authName }, { studentName: { equals: authName, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: { studentClass: true, studentNis: true },
    });

    if (gradeRecord?.studentClass) {
      studentClass = gradeRecord.studentClass;
      if (!studentNis && gradeRecord.studentNis) {
        studentNis = gradeRecord.studentNis;
      }
    }
  } catch (err) {
    console.error('Error fetching student class info in exam room:', err);
  }

  // Jika belum ada di StudentGrade, cari dari riwayat attempt siswa
  if (!studentClass) {
    try {
      const pastAttempt = await prisma.examAttempt.findFirst({
        where: {
          OR: [
            { studentName: { equals: studentName, mode: 'insensitive' as const } },
            ...(studentNis ? [{ studentNis }] : []),
          ],
          studentClass: { not: null },
        },
        select: { studentClass: true },
        orderBy: { startedAt: 'desc' },
      });
      if (pastAttempt?.studentClass) {
        studentClass = pastAttempt.studentClass;
      }
    } catch {}
  }

  // Cek apakah siswa sudah memiliki attempt pengerjaan untuk ujian ini
  const existingAttempt = await prisma.examAttempt.findFirst({
    where: {
      examId: id,
      OR: [
        { studentName: { equals: studentName, mode: 'insensitive' as const } },
        ...(studentNis ? [{ studentNis }] : []),
      ],
    },
    orderBy: { startedAt: 'desc' },
  });

  // 🔒 VERIFIKASI HAK AKSES KELAS & JURUSAN (ANTI SALAH KAMAR & BOCOR SOAL)
  const isAllowedClass = isClassTargetMatch(exam.classTarget, studentClass);

  // Jika siswa TIDAK terdaftar di plotting paket kelas ini dan BELUM punya attempt, BLOKIR TOTAL!
  if (!isAllowedClass && !existingAttempt) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900/95 border border-rose-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
            <ShieldAlert size={36} />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Akses Ditolak • Salah Kamar Ujian
            </span>
            <h2 className="text-2xl font-black mt-3 text-white">
              Anda Tidak Berhak Mengerjakan Ujian Ini
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Sistem keamanan mendeteksi bahwa paket ujian ini diplot khusus untuk tingkat/rombel tertentu. Akun Anda tidak terdaftar dalam target rombel ujian ini.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2.5">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Nama Siswa:</span>
              <span className="font-bold text-white">{studentName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">NISN / No. Peserta:</span>
              <span className="font-mono font-bold text-slate-200">{studentNis || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Kelas Aktual Anda:</span>
              <span className="font-black text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/60">
                {studentClass || 'Tidak Teridentifikasi'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Mata Uji / Paket:</span>
              <span className="font-bold text-purple-300 truncate max-w-[240px] text-right" title={exam.title}>
                {exam.title}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Plotting Khusus Untuk:</span>
              <span className="font-black text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60 text-right">
                {formatClassTargetDisplay(exam.classTarget)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/portal/siswa/cbt"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition block shadow-lg shadow-purple-600/30"
            >
              Kembali ke Portal CBT Saya
            </Link>
            <Link
              href="/ujian"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition block border border-slate-700"
            >
              Gerbang Masuk Ujian Mandiri
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CbtExamRoom
      exam={exam}
      studentName={studentName}
      studentClass={studentClass}
      studentNis={studentNis}
      existingAttempt={existingAttempt}
    />
  );
}
