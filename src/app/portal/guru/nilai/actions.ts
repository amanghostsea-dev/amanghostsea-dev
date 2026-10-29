'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { computeFinalScore, computeGradePredicate, ensureDefaultSubjectsAndGrades } from '@/lib/subject-seed';

export async function getTeacherGradingData(selectedSubjectId?: string) {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;
  const authRole = cookieStore.get('auth_token')?.value;

  await ensureDefaultSubjectsAndGrades();

  const isSuperAdmin = authRole === 'Super Admin';

  // Cari user record jika ada
  let dbUser = null;
  if (authUser || authName) {
    dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(authUser ? [{ username: authUser }] : []),
          ...(authName ? [{ name: authName }] : []),
        ],
      },
      select: { id: true, name: true, role: true },
    });
  }

  const userId = dbUser?.id;
  const teacherName = dbUser?.name || authName || 'Guru Pengampu';

  // 1. Ambil HANYA mata pelajaran yang di-plotting ke guru ini (Kecuali SuperAdmin)
  let teacherSubjects: any[] = [];

  if (isSuperAdmin) {
    teacherSubjects = await prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ classTarget: 'asc' }, { name: 'asc' }],
    });
  } else {
    teacherSubjects = await prisma.subject.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          ...(userId ? [{ teacherId: userId }] : []),
          ...(teacherName ? [{ teacherName: { equals: teacherName, mode: 'insensitive' as const } }] : []),
          ...(teacherName ? [{ teacherName: { contains: teacherName, mode: 'insensitive' as const } }] : []),
        ],
      },
      orderBy: [{ classTarget: 'asc' }, { name: 'asc' }],
    });
  }

  // Jika guru belum diplotting ke mapel apapun, kembalikan state kosong
  if (teacherSubjects.length === 0) {
    return {
      subjects: [],
      activeSubject: null,
      grades: [],
      teacherName,
      isSuperAdmin,
    };
  }

  // 2. Tentukan subject aktif (HANYA dari daftar yang diizinkan untuk guru ini)
  let activeSubject = teacherSubjects[0];
  if (selectedSubjectId) {
    const found = teacherSubjects.find((s) => s.id === selectedSubjectId);
    if (found) {
      activeSubject = found;
    }
  }

  // 3. Pastikan semua siswa kelas tersebut memiliki record nilai
  const dbStudents = await prisma.user.findMany({
    where: { role: 'Siswa' },
    select: { name: true, nisn: true, username: true },
    orderBy: { name: 'asc' },
  });

  for (const st of dbStudents) {
    await prisma.studentGrade.upsert({
      where: {
        subjectId_studentName: {
          subjectId: activeSubject.id,
          studentName: st.name,
        },
      },
      update: {},
      create: {
        subjectId: activeSubject.id,
        studentName: st.name,
        studentNis: st.nisn || st.username,
        studentClass: activeSubject.classTarget,
        assignment: 85,
        midExam: 80,
        finalExam: 85,
        finalGrade: 'A',
        notes: 'Kemajuan belajar baik.',
        updatedBy: teacherName,
      },
    });
  }

  // 4. Ambil data nilai HANYA untuk subject aktif milik guru ini
  const grades = await prisma.studentGrade.findMany({
    where: { subjectId: activeSubject.id },
    orderBy: { studentName: 'asc' },
  });

  return {
    subjects: teacherSubjects, // HANYA MAPEL MILIK GURU INI
    activeSubject,
    grades,
    teacherName,
    isSuperAdmin,
  };
}

export async function updateSingleGrade(
  gradeId: string,
  data: {
    assignment: number;
    midExam: number;
    finalExam: number;
    notes?: string;
  }
) {
  const cookieStore = await cookies();
  const updaterName = cookieStore.get('auth_name')?.value || 'Guru Pengampu';

  try {
    const finalScore = computeFinalScore(data.assignment, data.midExam, data.finalExam);
    const finalGrade = computeGradePredicate(finalScore);

    const updated = await prisma.studentGrade.update({
      where: { id: gradeId },
      data: {
        assignment: Number(data.assignment),
        midExam: Number(data.midExam),
        finalExam: Number(data.finalExam),
        finalGrade,
        notes: data.notes || '',
        updatedBy: updaterName,
      },
    });

    revalidatePath('/portal/guru/nilai');
    revalidatePath('/portal/siswa');
    revalidatePath('/admin/mapel');

    return { success: true, updated };
  } catch (error) {
    console.error('Error updating grade:', error);
    return { error: 'Gagal memperbarui nilai siswa' };
  }
}

export async function batchSaveGrades(
  subjectId: string,
  gradeRows: {
    id: string;
    assignment: number;
    midExam: number;
    finalExam: number;
    notes?: string;
  }[]
) {
  const cookieStore = await cookies();
  const updaterName = cookieStore.get('auth_name')?.value || 'Guru Pengampu';

  try {
    for (const row of gradeRows) {
      const finalScore = computeFinalScore(row.assignment, row.midExam, row.finalExam);
      const finalGrade = computeGradePredicate(finalScore);

      await prisma.studentGrade.update({
        where: { id: row.id },
        data: {
          assignment: Number(row.assignment),
          midExam: Number(row.midExam),
          finalExam: Number(row.finalExam),
          finalGrade,
          notes: row.notes || '',
          updatedBy: updaterName,
        },
      });
    }

    revalidatePath('/portal/guru/nilai');
    revalidatePath('/portal/siswa');
    revalidatePath('/admin/mapel');

    return { success: true, count: gradeRows.length };
  } catch (error) {
    console.error('Error batch saving grades:', error);
    return { error: 'Gagal menyimpan nilai secara massal' };
  }
}
