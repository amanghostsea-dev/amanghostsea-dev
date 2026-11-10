import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import ProctorScheduleClient, { AssignedExamItem } from './ProctorScheduleClient';

export const dynamic = 'force-dynamic';

export default async function ProctorSchedulePage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value || '';
  const authUser = cookieStore.get('auth_user')?.value || '';
  const authToken = cookieStore.get('auth_token')?.value || '';

  let currentUser = {
    name: authName || 'Guru Pengawas',
    username: authUser || 'pengawas',
    role: authToken || 'Guru',
    id: '',
  };

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { name: authName },
          ],
        },
        select: { id: true, name: true, username: true, role: true },
      });
      if (user) {
        currentUser = {
          name: user.name,
          username: user.username,
          role: user.role,
          id: user.id,
        };
      }
    } catch (e) {
      console.error('Error fetching user for proctoring:', e);
    }
  }

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin Utama';

  // If Super Admin, fetch all exams so they can supervise any room as Chief Proctor
  // If regular teacher, strictly filter ONLY the exams plotted to them by Admin
  const whereCondition = isSuperAdmin
    ? {}
    : {
        OR: [
          { proctorName: currentUser.name },
          { proctorId: currentUser.id || 'none' },
          { proctor2Name: currentUser.name },
          { proctor2Id: currentUser.id || 'none' },
        ],
      };

  const exams = await prisma.exam.findMany({
    where: whereCondition,
    include: {
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return (
    <ProctorScheduleClient
      exams={exams as any}
      currentUser={currentUser}
    />
  );
}

