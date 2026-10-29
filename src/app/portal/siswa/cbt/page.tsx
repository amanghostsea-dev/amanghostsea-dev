import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import SiswaCbtClient from './SiswaCbtClient';

export const dynamic = 'force-dynamic';

export default async function SiswaCbtListPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  let studentClass = 'XI RPL 1';

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
      if (user) {
        studentName = user.name;
      }
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
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return (
    <SiswaCbtClient
      exams={exams as any}
      studentName={studentName}
      studentClass={studentClass}
      initials={initials}
    />
  );
}
