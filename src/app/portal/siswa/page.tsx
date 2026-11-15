import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";
import SiswaDashboardClient from "./SiswaDashboardClient";
import { ensureDefaultSubjectsAndGrades, computeGradePredicate, DUMMY_TEACHER_KEYWORDS } from "@/lib/subject-seed";
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
  let studentClass = '';

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
        if (user.studentClass) {
          studentClass = user.studentClass;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!studentName) {
    redirect('/login?redirect=/portal/siswa');
  }

  // Ambil kelas aktual siswa (User -> Cookie -> ExamAttempt -> StudentGrade)
  if (!studentClass) {
    studentClass = cookieStore.get('auth_class')?.value?.trim() || '';
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
    } catch { }
  }

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
      const activeJurusans = await prisma.jurusan.findMany({
        orderBy: { code: 'asc' },
        select: { code: true, name: true },
      });
      const first = activeJurusans[0];
      studentClass = first ? `X ${first.code} 1` : 'X TJKT 1';
    } catch {
      studentClass = 'Kelas X TJKT 1';
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

  // Hitung tugas siswa yang belum dikerjakan untuk kelas siswa (mengabaikan tugas dummy / anonim)
  let pendingAssignmentsCount = 0;
  try {
    const candidateAssignments = await prisma.assignment.findMany({
      where: {
        status: 'ACTIVE',
        authorName: {
          notIn: DUMMY_TEACHER_KEYWORDS,
        },
        submissions: {
          none: {
            studentName: studentName,
          },
        },
      },
      select: { classTarget: true },
    });
    pendingAssignmentsCount = candidateAssignments.filter((a) =>
      isClassTargetMatch(a.classTarget, studentClass)
    ).length;
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

  // 1. Ambil seluruh data Mata Pelajaran Aktif dari Database Sekolah
  let allActiveSubjects: any[] = [];
  try {
    allActiveSubjects = await prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      include: {
        grades: {
          where: {
            OR: [
              { studentName },
              ...(studentNis ? [{ studentNis }] : []),
              ...(authUser ? [{ studentNis: authUser }] : []),
            ],
          },
        },
      },
      orderBy: [{ classTarget: 'asc' }, { code: 'asc' }],
    });
  } catch (err) {
    console.error('Error querying active subjects:', err);
    allActiveSubjects = [];
  }

  // 2. Filter HANYA mata pelajaran yang diperuntukkan bagi kelas siswa ini
  const classSubjects = allActiveSubjects.filter((s) => isClassTargetMatch(s.classTarget, studentClass));

  // 3. Susun Jadwal Pelajaran (Schedule) secara kronologis Senin - Jumat
  const dayOrder: Record<string, number> = {
    senin: 1,
    selasa: 2,
    rabu: 3,
    kamis: 4,
    jumat: 5,
    sabtu: 6,
    minggu: 7,
  };

  const schedule = [...classSubjects]
    .sort((a, b) => {
      const orderA = dayOrder[(a.day || 'senin').toLowerCase().trim()] || 99;
      const orderB = dayOrder[(b.day || 'senin').toLowerCase().trim()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.time || '').localeCompare(b.time || '');
    })
    .map((s) => ({
      day: s.day || 'Senin',
      subject: s.name,
      code: s.code,
      time: s.time || '07:30 - 10:00',
      teacher: s.teacherName || 'Guru Pengampu',
      room: s.room || 'Ruang Kelas',
      category: s.category || 'Muatan Kejuruan',
      kkm: s.kkm || 75,
      credits: s.credits || 3,
    }));

  // 4. Susun Transkrip & Capaian Nilai Siswa per Mapel
  const grades = classSubjects.map((s) => {
    const g = s.grades && s.grades.length > 0 ? s.grades[0] : null;
    const assignment = Number(g?.assignment) || 0;
    const midExam = Number(g?.midExam) || 0;
    const finalExam = Number(g?.finalExam) || 0;
    const isEvaluated = Boolean(g && (assignment > 0 || midExam > 0 || finalExam > 0));
    const finalScore = isEvaluated
      ? Math.round((assignment * 0.3 + midExam * 0.3 + finalExam * 0.4) * 10) / 10
      : 0;
    const kkm = s.kkm || 75;
    const isPassed = isEvaluated ? finalScore >= kkm : false;
    const finalGrade = isEvaluated
      ? g?.finalGrade && g?.finalGrade !== '-'
        ? g.finalGrade
        : computeGradePredicate(finalScore)
      : '-';

    return {
      id: s.id,
      code: s.code,
      subject: s.name,
      category: s.category || 'Muatan Kejuruan',
      teacherName: s.teacherName || 'Guru Pengampu',
      classTarget: s.classTarget,
      kkm,
      credits: s.credits || 3,
      day: s.day || 'Senin',
      time: s.time || '07:30 - 10:00',
      room: s.room || 'Ruang Kelas',
      assignment,
      midExam,
      finalExam,
      finalScore,
      finalGrade,
      isEvaluated,
      isPassed,
      notes: g?.notes || '',
    };
  });

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
