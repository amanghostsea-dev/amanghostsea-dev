import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";
import SiswaDashboardClient from "./SiswaDashboardClient";
import { ensureDefaultSubjectsAndGrades } from "@/lib/subject-seed";

export const dynamic = 'force-dynamic';

export default async function PortalSiswa() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let studentName = authName;
  let studentNis = authUser || '10293847';

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
    studentName = 'Siswa SMK';
  }

  // Pastikan master mapel dan nilai siswa tersinkronisasi di Postgres
  await ensureDefaultSubjectsAndGrades(studentName, studentNis);

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
    pendingAssignmentsCount = 2; // fallback
  }

  // Ambil daftar ujian CBT aktif / terjadwal
  const upcomingExams = await prisma.exam.findMany({
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
    take: 6,
  });

  // 1. Ambil data Jadwal Pelajaran (Mapel yang aktif & Guru Pengampu)
  const dbSubjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ code: 'asc' }],
  });

  const schedule = dbSubjects.map((s) => ({
    day: s.day || 'Senin',
    subject: s.name,
    time: s.time || '07:30 - 10:00',
    teacher: s.teacherName || 'Guru Pengampu',
    room: s.room || 'Lab Komputer 1',
  }));

  // 2. Ambil data Transkrip Nilai Siswa langsung dari Database
  const dbGrades = await prisma.studentGrade.findMany({
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

  const grades = dbGrades.map((g) => ({
    subject: g.subject.name,
    assignment: g.assignment,
    midExam: g.midExam,
    finalExam: g.finalExam,
    finalGrade: g.finalGrade,
  }));

  return (
    <SiswaDashboardClient
      studentName={studentName}
      studentNis={studentNis}
      studentClass="Kelas XI - Rekayasa Perangkat Lunak 1 (XI-RPL 1)"
      initials={initials}
      upcomingExams={upcomingExams}
      schedule={schedule}
      grades={grades}
      pendingAssignmentsCount={pendingAssignmentsCount}
      logoutAction={logoutAction}
    />
  );
}
