import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/login/actions";
import SiswaDashboardClient from "./SiswaDashboardClient";

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

  const schedule = [
    { day: 'Senin', subject: 'Pemrograman Web & Perangkat Bergerak', time: '07:30 - 10:00', teacher: 'Bpk. Ahmad ST', room: 'Lab Komputer 1' },
    { day: 'Senin', subject: 'Matematika Terapan', time: '10:15 - 12:30', teacher: 'Ibu Siti S.Pd', room: 'Ruang Teori 12A' },
    { day: 'Selasa', subject: 'Administrasi Basis Data Relasional', time: '07:30 - 09:45', teacher: 'Bpk. Budi S.Kom', room: 'Lab Komputer 2' },
    { day: 'Selasa', subject: 'Bahasa Inggris Kejuruan', time: '10:00 - 11:30', teacher: 'Mr. John', room: 'Ruang 10B' },
    { day: 'Rabu', subject: 'Pemodelan Perangkat Lunak (UML)', time: '07:30 - 10:00', teacher: 'Ibu Ratna M.Kom', room: 'Lab Komputer 1' },
    { day: 'Rabu', subject: 'Pendidikan Pancasila & Kewarganegaraan', time: '10:15 - 12:00', teacher: 'Bpk. Drs. H. Suryanto', room: 'Ruang 12A' },
    { day: 'Kamis', subject: 'Pemrograman Berorientasi Objek (OOP)', time: '07:30 - 10:30', teacher: 'Bpk. Hendra S.T', room: 'Lab RPL 2' },
    { day: 'Kamis', subject: 'Produk Kreatif & Kewirausahaan (PKK)', time: '10:45 - 13:00', teacher: 'Ibu Dewi SE', room: 'Ruang Kreatif' },
    { day: 'Jumat', subject: 'Pendidikan Agama & Budi Pekerti', time: '07:00 - 09:00', teacher: 'Ust. Nurul Huda M.Pd', room: 'Masjid Sekolah' },
    { day: 'Jumat', subject: 'Bimbingan Konseling & Karir', time: '09:15 - 10:45', teacher: 'Ibu Dian S.Psi', room: 'Ruang BK' },
  ];

  const grades = [
    { subject: 'Pemrograman Web & Perangkat Bergerak', assignment: 88, midExam: 85, finalExam: 92, finalGrade: 'A' },
    { subject: 'Administrasi Basis Data Relasional', assignment: 92, midExam: 88, finalExam: 95, finalGrade: 'A' },
    { subject: 'Matematika Terapan', assignment: 82, midExam: 78, finalExam: 84, finalGrade: 'B+' },
    { subject: 'Bahasa Inggris Kejuruan', assignment: 90, midExam: 86, finalExam: 89, finalGrade: 'A-' },
    { subject: 'Pemodelan Perangkat Lunak (UML)', assignment: 87, midExam: 84, finalExam: 88, finalGrade: 'A-' },
    { subject: 'Produk Kreatif & Kewirausahaan (PKK)', assignment: 91, midExam: 89, finalExam: 93, finalGrade: 'A' },
  ];

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
