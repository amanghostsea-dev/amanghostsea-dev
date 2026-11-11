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
  // - Guru hanya dapat mengakses dan mengelola bank soal paket ujian miliknya sendiri.
  if (!isSuperAdmin && exam.authorName) {
    const author = exam.authorName.trim().toLowerCase();
    const current = userName.trim().toLowerCase();
    const isOwner = author === current || author.includes(current) || current.includes(author);
    if (!isOwner) {
      redirect('/admin/cbt');
    }
  }

  return (
    <ExamDetailClient 
      exam={exam} 
      kopSuratConfig={kopSuratConfig} 
      currentUser={{ name: userName, role: userRole }}
    />
  );
}
