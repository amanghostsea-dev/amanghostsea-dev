import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import CbtDashboard from './CbtDashboard';
import { getDynamicClassTargets } from '@/lib/jurusan-service';
import { getKopSuratConfig } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminCbtPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const initialTab = sp?.tab === 'jadwal' 
    ? 'schedule' 
    : sp?.tab === 'laporan' 
    ? 'reports' 
    : sp?.tab === 'pengawas' || sp?.tab === 'proctors'
    ? 'proctors'
    : 'exams';

  const cookieStore = await cookies();
  const userName = cookieStore.get('auth_name')?.value || 'Guru Mapel';
  const userRole = cookieStore.get('auth_token')?.value || 'Guru';
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';
  const cleanUserName = userName.trim();

  // Filter paket ujian:
  // - Admin Utama (Super Admin): melihat SELURUH paket ujian sekolah untuk monitoring & kontrol penuh.
  // - Guru Mapel (misal PABP, TKJ, dll): HANYA melihat paket ujian miliknya sendiri (berdasarkan authorName),
  //   serta ujian di mana guru tersebut ditugaskan sebagai pengawas (proctorName/proctor2Name) untuk tab pengawasan.
  const examWhereClause = isSuperAdmin
    ? undefined
    : {
        OR: [
          { authorName: { equals: cleanUserName, mode: 'insensitive' as const } },
          { authorName: { contains: cleanUserName, mode: 'insensitive' as const } },
          { proctorName: { equals: cleanUserName, mode: 'insensitive' as const } },
          { proctorName: { contains: cleanUserName, mode: 'insensitive' as const } },
          { proctor2Name: { equals: cleanUserName, mode: 'insensitive' as const } },
          { proctor2Name: { contains: cleanUserName, mode: 'insensitive' as const } },
        ],
      };

  const [exams, classTargets, subjects, kopSuratConfig, teachers] = await Promise.all([
    prisma.exam.findMany({
      where: examWhereClause,
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
        attempts: {
          select: {
            id: true,
            studentName: true,
            studentNis: true,
            studentClass: true,
            score: true,
            totalQuestions: true,
            totalCorrect: true,
            status: true,
            tabSwitchCount: true,
            extraTimeMinutes: true,
            isBlocked: true,
            startedAt: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getDynamicClassTargets(),
    prisma.subject.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    }),
    getKopSuratConfig(),
    prisma.user.findMany({
      where: {
        role: { in: ['Guru', 'Super Admin', 'Admin Utama'] },
        status: 'Aktif',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        nisn: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Memuat Smart CBT...</div>}>
      <CbtDashboard 
        exams={exams} 
        currentUser={{ name: userName, role: userRole }} 
        initialTab={initialTab}
        dynamicClassPresets={classTargets}
        dynamicSubjectPresets={subjects.map(s => s.name)}
        kopSuratConfig={kopSuratConfig}
        teachers={teachers}
      />
    </Suspense>
  );
}
