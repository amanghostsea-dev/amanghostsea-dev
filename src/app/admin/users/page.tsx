import { getUsers } from './actions'
import UsersClient from './UsersClient'
import { ensureDefaultJurusans, getDynamicClassTargets } from '@/lib/jurusan-service'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [users, jurusans, classTargets] = await Promise.all([
    getUsers(),
    ensureDefaultJurusans(),
    getDynamicClassTargets(),
  ]);

  // Ambil peta kelas siswa dari buku rapor StudentGrade
  const studentGrades = await prisma.studentGrade.findMany({
    select: {
      studentName: true,
      studentNis: true,
      studentClass: true,
    },
  });

  const studentClassMap: Record<string, string> = {};
  for (const sg of studentGrades) {
    if (sg.studentName && sg.studentClass) {
      studentClassMap[sg.studentName] = sg.studentClass;
    }
    if (sg.studentNis && sg.studentClass) {
      studentClassMap[sg.studentNis] = sg.studentClass;
    }
  }

  return (
    <UsersClient 
      initialUsers={users} 
      jurusans={jurusans}
      classTargets={classTargets}
      studentClassMap={studentClassMap}
    />
  );
}
