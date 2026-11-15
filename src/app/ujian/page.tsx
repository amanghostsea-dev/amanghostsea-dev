import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import UjianGatewayClient from './UjianGatewayClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ruang Ujian Online CBT Siswa | SMK Digital',
  description: 'Gerbang mandiri ujian berbasis komputer dan smartphone siswa SMK. Masukkan nama dan token untuk memulai ujian.',
};

export default async function UjianPage({
  searchParams,
}: {
  searchParams?: Promise<{ u?: string; nisn?: string; token?: string; id?: string }>;
}) {
  const [cookieStore, resolvedParams] = await Promise.all([
    cookies(),
    searchParams ? searchParams : Promise.resolve({} as { u?: string; nisn?: string; token?: string; id?: string }),
  ]);

  const authToken = cookieStore.get('auth_token')?.value || '';
  const currentStudentName = cookieStore.get('auth_name')?.value || '';
  const currentStudentNis = cookieStore.get('auth_user')?.value || '';

  const prefillUsername = (resolvedParams?.u || resolvedParams?.nisn || '').trim();
  const prefillToken = (resolvedParams?.token || '').trim();

  // Cek apakah siswa saat ini SUDAH login secara sah dengan kredensial kartu
  let authenticatedStudent: {
    id: string;
    name: string;
    username: string;
    nisn: string;
    studentClass: string;
  } | null = null;

  if (authToken === 'Siswa' && currentStudentNis) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          role: 'Siswa',
          status: 'Aktif',
          OR: [
            { username: { equals: currentStudentNis, mode: 'insensitive' } },
            { nisn: { equals: currentStudentNis, mode: 'insensitive' } },
          ],
        },
      });

      if (user) {
        let studentClass = user.studentClass || '';

        if (!studentClass) {
          const attempt = await prisma.examAttempt.findFirst({
            where: {
              OR: [
                { studentName: user.name },
                ...(user.nisn ? [{ studentNis: user.nisn }] : []),
                { studentNis: user.username },
              ],
              studentClass: { not: null },
            },
            select: { studentClass: true },
            orderBy: { startedAt: 'desc' },
          });
          if (attempt?.studentClass) {
            studentClass = attempt.studentClass;
          }
        }

        if (!studentClass) {
          const grade = await prisma.studentGrade.findFirst({
            where: {
              OR: [
                { studentName: user.name },
                ...(user.nisn ? [{ studentNis: user.nisn }] : []),
                { studentNis: user.username },
              ],
            },
            select: { studentClass: true },
          });
          if (grade?.studentClass) {
            studentClass = grade.studentClass;
          }
        }

        authenticatedStudent = {
          id: user.id,
          name: user.name,
          username: user.username,
          nisn: user.nisn || user.username,
          studentClass: studentClass || '',
        };
      }
    } catch (err) {
      console.error('Error fetching authenticated student:', err);
    }
  }

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
      currentStudentNis={currentStudentNis}
      authenticatedStudent={authenticatedStudent}
      prefillUsername={prefillUsername}
      prefillToken={prefillToken}
    />
  );
}

