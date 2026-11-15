import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ExamDetailClient from './ExamDetailClient';
import { getKopSuratConfig } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const userName = cookieStore.get('auth_name')?.value || 'Guru Mapel';
  const userRole = cookieStore.get('auth_token')?.value || 'Guru';
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

  const [exam, kopSuratConfig] = await Promise.all([
    prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        attempts: {
          orderBy: { score: 'desc' },
        },
      },
    }),
    getKopSuratConfig(),
  ]);

  if (!exam) {
    notFound();
  }

  // Otorisasi Akses Paket Ujian:
  // - Admin Utama (Super Admin) memiliki hak akses penuh ke seluruh paket ujian.
  // - Guru Pengampu dapat mengelola bank soal & paket ujian miliknya sendiri.
  // - Pengawas yang di-plotting Admin Utama dapat mengakses ruang monitoring & pengawasan ujian.
  const author = (exam.authorName || '').trim().toLowerCase();
  const current = userName.trim().toLowerCase();
  const isOwner = isSuperAdmin || (!!current && (author === current || author.includes(current) || current.includes(author)));

  const p1 = (exam.proctorName || '').trim().toLowerCase();
  const p2 = (exam.proctor2Name || '').trim().toLowerCase();
  const isProctor = !!current && (
    (p1 && (p1 === current || p1.includes(current) || current.includes(p1))) ||
    (p2 && (p2 === current || p2.includes(current) || current.includes(p2)))
  );

  if (!isOwner && !isProctor) {
    redirect('/admin/cbt');
  }

  const isProctorMode = !isOwner && !!isProctor;

  return (
    <ExamDetailClient 
      exam={exam} 
      kopSuratConfig={kopSuratConfig} 
      currentUser={{ name: userName, role: userRole }}
      isProctorMode={isProctorMode}
    />
  );
}
