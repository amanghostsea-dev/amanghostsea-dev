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
  // If regular teacher / proctor, STRICTLY filter ONLY the exams plotted to them by Admin Utama
  let whereCondition: any;
  if (isSuperAdmin) {
    whereCondition = {};
  } else {
    const proctorConditions: any[] = [];
    if (currentUser.id) {
      proctorConditions.push({ proctorId: currentUser.id });
      proctorConditions.push({ proctor2Id: currentUser.id });
    }
    if (currentUser.name && currentUser.name !== 'Guru Pengawas') {
      proctorConditions.push({ proctorName: { equals: currentUser.name, mode: 'insensitive' } });
      proctorConditions.push({ proctor2Name: { equals: currentUser.name, mode: 'insensitive' } });
    }
    if (currentUser.username && currentUser.username !== 'pengawas') {
      proctorConditions.push({ proctorName: { contains: currentUser.username, mode: 'insensitive' } });
    }

    // Only matches if teacher was specifically plotted by Admin Utama
    if (proctorConditions.length > 0) {
      whereCondition = { OR: proctorConditions };
    } else {
      whereCondition = { id: '__UNASSIGNED_NO_EXAMS__' };
    }
  }

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

