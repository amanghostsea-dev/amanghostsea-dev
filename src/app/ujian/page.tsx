import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import UjianGatewayClient from './UjianGatewayClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ruang Ujian Online CBT Siswa | SMK Digital',
  description: 'Gerbang mandiri ujian berbasis komputer dan smartphone siswa SMK. Masukkan nama dan token untuk memulai ujian.',
};

export default async function UjianPage() {
  const cookieStore = await cookies();
  const currentStudentName = cookieStore.get('auth_name')?.value || '';

  // Ambil daftar ujian aktif berstatus PUBLISHED atau ACTIVE
  let activeExams: any[] = [];
  try {
    activeExams = await prisma.exam.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching active exams for gateway:', error);
  }

  return (
    <UjianGatewayClient
      activeExams={activeExams}
      currentStudentName={currentStudentName}
    />
  );
}

