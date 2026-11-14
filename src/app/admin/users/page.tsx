import { getUsers } from './actions'
import UsersClient from './UsersClient'
import { ensureDefaultJurusans, getDynamicClassTargets } from '@/lib/jurusan-service'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [users, jurusans, classTargets, studentGrades, examAttempts] = await Promise.all([
    getUsers(),
    ensureDefaultJurusans(),
    getDynamicClassTargets(),
    prisma.studentGrade.findMany({
      select: {
        studentName: true,
        studentNis: true,
        studentClass: true,
      },
    }),
    prisma.examAttempt.findMany({
      select: {
        studentName: true,
        studentNis: true,
        studentClass: true,
      },
      where: {
        studentClass: { not: null },
      },
    }),
  ]);

  // Ambil peta kelas siswa dari buku rapor StudentGrade & riwayat ujian CBT ExamAttempt
  const studentClassMap: Record<string, string> = {};
  for (const sg of studentGrades) {
    if (sg.studentName && sg.studentClass) {
      studentClassMap[sg.studentName] = sg.studentClass;
    }
    if (sg.studentNis && sg.studentClass) {
      studentClassMap[sg.studentNis] = sg.studentClass;
    }
  }
  for (const ea of examAttempts) {
    if (ea.studentClass) {
      if (ea.studentName && !studentClassMap[ea.studentName]) {
        studentClassMap[ea.studentName] = ea.studentClass;
      }
      if (ea.studentNis && !studentClassMap[ea.studentNis]) {
        studentClassMap[ea.studentNis] = ea.studentClass;
      }
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
