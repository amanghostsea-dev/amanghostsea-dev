import prisma from '@/lib/prisma';
import TugasDashboard from './TugasDashboard';
import { getDynamicClassTargets } from '@/lib/jurusan-service';
import { cookies } from 'next/headers';
import { cleanupLegacyDummyAssignments } from '@/lib/subject-seed';

export const dynamic = 'force-dynamic';

export default async function AdminTugasPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_token')?.value;
  const name = cookieStore.get('auth_name')?.value || 'Admin';
  const username = cookieStore.get('auth_user')?.value || '';

  // 1. Bersihkan tugas dummy / anonim lawas otomatis
  await cleanupLegacyDummyAssignments();

  // 2. Identifikasi identitas pengguna (Guru atau Super Admin)
  let dbUser = null;
  if (username || name) {
    dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(username ? [{ username }] : []),
          ...(name ? [{ name }] : []),
        ],
      },
      select: { id: true, name: true, role: true },
    });
  }

  const isSuperAdmin = role === 'Super Admin';
  const teacherName = dbUser?.name || name;

  // Filter tugas: Jika Guru, hanya ambil tugas yang dibuat oleh guru ini
  // Jika Super Admin, ambil seluruh tugas sekolah
  const assignmentWhere = isSuperAdmin
    ? {}
    : {
        OR: [
          { authorName: { equals: teacherName, mode: 'insensitive' as const } },
          { authorName: { contains: teacherName, mode: 'insensitive' as const } },
        ],
      };

  const [assignments, classTargets, activeSubjects, teachers] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
        submissions: {
          select: {
            id: true,
            status: true,
            grade: true,
          },
        },
      },
      orderBy: { deadline: 'desc' },
    }),
    getDynamicClassTargets(),
    prisma.subject.findMany({
      where: {
        status: 'ACTIVE',
        ...(isSuperAdmin
          ? {}
          : {
              OR: [
                ...(dbUser?.id ? [{ teacherId: dbUser.id }] : []),
                ...(teacherName ? [{ teacherName: { equals: teacherName, mode: 'insensitive' as const } }] : []),
                ...(teacherName ? [{ teacherName: { contains: teacherName, mode: 'insensitive' as const } }] : []),
              ],
            }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        classTarget: true,
        teacherName: true,
      },
      orderBy: [{ classTarget: 'asc' }, { name: 'asc' }],
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['Guru', 'Super Admin'] },
        status: 'Aktif',
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <TugasDashboard
      assignments={assignments}
      dynamicClassPresets={classTargets}
      activeSubjects={activeSubjects}
      teachers={teachers}
      currentUser={{
        role: role || 'Guru',
        name: teacherName,
        isSuperAdmin,
      }}
    />
  );
}
