import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";
import SiswaDashboardClient from "./SiswaDashboardClient";
import { ensureDefaultSubjectsAndGrades } from "@/lib/subject-seed";
import { isClassTargetMatch } from "@/lib/cbt-schedule";

export const dynamic = 'force-dynamic';

export default async function PortalSiswa() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  // Wajib login: jika tidak ada session akun siswa resmi, alihkan ke login
  if (!authUser || !authToken) {
    redirect('/login?redirect=/portal/siswa');
  }

  let studentName = authName || '';
  let studentNis = authUser || '';

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        },
      });
      if (user) {
        studentName = user.name;
        studentNis = user.nisn || user.username;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    redirect('/login?redirect=/portal/siswa');
  }

  // Ambil kelas aktual siswa (dari cookie / database rapor / riwayat ujian)
  let studentClass = cookieStore.get('auth_class')?.value?.trim() || '';

  if (!studentClass) {
    try {
      const gradeRecord = await prisma.studentGrade.findFirst({
        where: {
          OR: [
            { studentName },
            ...(studentNis ? [{ studentNis }] : []),
            ...(authUser ? [{ studentNis: authUser }] : []),
          ],
        },
        select: { studentClass: true },
      });
      if (gradeRecord?.studentClass) {
        studentClass = gradeRecord.studentClass;
      }
    } catch (err) {
      console.error('Error fetching student class from gradeRecord:', err);
    }
  }

  if (!studentClass) {
    try {
      const attemptRecord = await prisma.examAttempt.findFirst({
        where: {
          OR: [
            { studentName },
            ...(studentNis ? [{ studentNis }] : []),
          ],
          studentClass: { not: null },
        },
        select: { studentClass: true },
        orderBy: { startedAt: 'desc' },
      });
      if (attemptRecord?.studentClass) {
        studentClass = attemptRecord.studentClass;
      }
    } catch {}
  }

  if (!studentClass) {
    try {
      const activeJurusans = await prisma.jurusan.findMany({
        orderBy: { code: 'asc' },
        select: { code: true, name: true },
      });
      const first = activeJurusans[0];
      studentClass = first ? `Kelas XI - ${first.name} 1 (XI ${first.code} 1)` : 'Kelas XI TJKT 1';
    } catch {
      studentClass = 'Kelas XI TJKT 1';
    }
  }

  // Pastikan master mapel dan nilai siswa tersinkronisasi di Postgres secara aman
  try {
    await ensureDefaultSubjectsAndGrades(studentName, studentNis, studentClass);
  } catch (err) {
    console.error('ensureDefaultSubjectsAndGrades error:', err);
  }

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'S';

  // Hitung tugas siswa yang belum dikerjakan
  let pendingAssignmentsCount = 0;
  try {
    pendingAssignmentsCount = await prisma.assignment.count({
      where: {
        status: 'ACTIVE',
        submissions: {
          none: {
            studentName: studentName,
          },
        },
      },
    });
  } catch (err) {
    console.error('Error counting pending assignments:', err);
    pendingAssignmentsCount = 0;
  }

  // Ambil daftar ujian CBT aktif / terjadwal
  let rawUpcomingExams: any[] = [];
  try {
    rawUpcomingExams = await prisma.exam.findMany({
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
      take: 12,
    });
  } catch (err) {
    console.error('Error querying rawUpcomingExams:', err);
    rawUpcomingExams = [];
  }

  // Filter ujian yang relevan dengan kelas siswa (atau siswa telah memiliki attempt)
  const upcomingExams = rawUpcomingExams
    .filter((exam) => {
      if (exam.attempts && exam.attempts.length > 0) return true;
      return isClassTargetMatch(exam.classTarget, studentClass);
    })
    .slice(0, 6);

  // 1. Ambil data Jadwal Pelajaran (Mapel yang aktif & relevan dengan kelas siswa)
  let dbSubjects: any[] = [];
  try {
    dbSubjects = await prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ day: 'asc' }, { time: 'asc' }, { code: 'asc' }],
    });
  } catch (err) {
    console.error('Error querying subjects:', err);
    dbSubjects = [];
  }

  // Filter jadwal mata pelajaran hanya untuk kelas siswa ini
  const classSubjects = dbSubjects.filter((s) => isClassTargetMatch(s.classTarget, studentClass));

  const schedule = classSubjects.map((s) => ({
    day: s.day || 'Senin',
    subject: s.name,
    time: s.time || '07:30 - 10:00',
    teacher: s.teacherName || 'Guru Pengampu',
    room: s.room || 'Ruang Kelas',
  }));

  // 2. Ambil data Transkrip Nilai Siswa langsung dari Database yang sesuai kelasnya
  let dbGrades: any[] = [];
  try {
    dbGrades = await prisma.studentGrade.findMany({
      where: {
        studentName: studentName,
      },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          code: 'asc',
        },
      },
    });
  } catch (err) {
    console.error('Error querying student grades:', err);
    dbGrades = [];
  }

  // Filter nilai hanya untuk mata pelajaran yang relevan dengan kelas siswa
  const classGrades = dbGrades.filter((g) => {
    const target = g.subject?.classTarget || g.studentClass;
    return isClassTargetMatch(target, studentClass);
  });

  // Gabungkan mapel aktif kelas yang belum memiliki baris StudentGrade (status Belum Dinilai)
  const existingSubjectNames = new Set(classGrades.map((g) => g.subject?.name?.toLowerCase()));
  const unassignedGrades = classSubjects
    .filter((s) => !existingSubjectNames.has(s.name.toLowerCase()))
    .map((s) => ({
      subject: s.name,
      assignment: 0,
      midExam: 0,
      finalExam: 0,
      finalGrade: '-',
    }));

  const grades = [
    ...classGrades.map((g) => ({
      subject: g.subject?.name || 'Mata Pelajaran',
      assignment: g.assignment,
      midExam: g.midExam,
      finalExam: g.finalExam,
      finalGrade: g.finalGrade,
    })),
    ...unassignedGrades,
  ];

  return (
    <SiswaDashboardClient
      studentName={studentName}
      studentNis={studentNis}
      studentClass={studentClass}
      initials={initials}
      upcomingExams={upcomingExams}
      schedule={schedule}
      grades={grades}
      pendingAssignmentsCount={pendingAssignmentsCount}
      logoutAction={logoutAction}
    />
  );
}
