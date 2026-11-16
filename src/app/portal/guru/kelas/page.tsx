import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import KelasClient from "./KelasClient";
import { getDynamicClassTargets, ensureDefaultJurusans } from "@/lib/jurusan-service";
import { getManagedClasses } from "@/lib/kelas-service";

export const dynamic = 'force-dynamic';

export default async function GuruKelasPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let teacherName = authName;
  if (!teacherName && authUser) {
    try {
      const user = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        },
        select: { name: true }
      });
      if (user) teacherName = user.name;
    } catch {}
  }
  if (!teacherName) teacherName = 'Abdul Rahman';

  const [rawStudents, classTargets, studentGrades, examAttempts, managedClasses, jurusans] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'Siswa' },
      select: {
        id: true,
        name: true,
        username: true,
        nisn: true,
        role: true,
        status: true,
        studentClass: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    }),
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
    getManagedClasses(),
    ensureDefaultJurusans(),
  ]);

  // Bangun studentClassMap yang 100% konsisten dengan Admin Utama
  const studentClassMap: Record<string, string> = {};
  for (const u of rawStudents) {
    if (u.studentClass) {
      studentClassMap[u.id] = u.studentClass;
      studentClassMap[u.name] = u.studentClass;
      if (u.username) studentClassMap[u.username] = u.studentClass;
      if (u.nisn) studentClassMap[u.nisn] = u.studentClass;
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
  for (const sg of studentGrades) {
    if (sg.studentName && sg.studentClass && !studentClassMap[sg.studentName]) {
      studentClassMap[sg.studentName] = sg.studentClass;
    }
    if (sg.studentNis && sg.studentClass && !studentClassMap[sg.studentNis]) {
      studentClassMap[sg.studentNis] = sg.studentClass;
    }
  }

  // Sinkronkan setiap objek siswa dengan studentClass resminya
  const students = rawStudents.map((s) => {
    const resolvedClass =
      s.studentClass ||
      studentClassMap[s.id] ||
      studentClassMap[s.name] ||
      (s.nisn ? studentClassMap[s.nisn] : '') ||
      (s.username ? studentClassMap[s.username] : '') ||
      '';
    return {
      ...s,
      studentClass: resolvedClass || null,
      createdAt: s.createdAt.toISOString(),
    };
  });

  // Cari kelas binaan wali sang guru
  const teacherWaliClass = managedClasses.find((c) =>
    (c.waliKelas && teacherName && c.waliKelas.trim().toLowerCase() === teacherName.trim().toLowerCase()) ||
    (c.waliKelasId && authUser && c.waliKelasId === authUser)
  )?.name || 'XI TJKT 1';

  return (
    <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full">
      <KelasClient
        students={students}
        teacherName={teacherName}
        teacherWaliClass={teacherWaliClass}
        classTargets={classTargets}
        jurusans={jurusans}
      />
    </main>
  );
}
