'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { computeFinalScore, computeGradePredicate, ensureDefaultSubjectsAndGrades } from '@/lib/subject-seed';

export async function getTeacherGradingData(selectedSubjectId?: string) {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authRole = cookieStore.get('auth_token')?.value;

  await ensureDefaultSubjectsAndGrades();

  const isSuperAdmin = authRole === 'Super Admin';

  // 1. Ambil semua subject
  const allSubjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ classTarget: 'asc' }, { name: 'asc' }],
  });

  // Filter subject yang diampu guru ini (atau semua jika Super Admin)
  let teacherSubjects = allSubjects;
  if (!isSuperAdmin && authName) {
    const filtered = allSubjects.filter(
      (s) => s.teacherName?.toLowerCase().includes(authName.toLowerCase())
    );
    if (filtered.length > 0) {
      teacherSubjects = filtered;
    }
  }

  // Tentukan subject aktif
  let activeSubject = allSubjects[0];
  if (selectedSubjectId) {
    const found = allSubjects.find((s) => s.id === selectedSubjectId);
    if (found) activeSubject = found;
  } else if (teacherSubjects.length > 0) {
    activeSubject = teacherSubjects[0];
  }

  if (!activeSubject) {
    return {
      subjects: [],
      activeSubject: null,
      grades: [],
      teacherName: authName || 'Guru',
    };
  }

  // 2. Pastikan semua siswa memiliki record nilai untuk subject aktif
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
        updatedBy: authName || activeSubject.teacherName || 'Guru Pengampu',
      },
    });
  }

  // 3. Ambil data nilai
  const grades = await prisma.studentGrade.findMany({
    where: { subjectId: activeSubject.id },
    orderBy: { studentName: 'asc' },
  });

  return {
    subjects: allSubjects,
    activeSubject,
    grades,
    teacherName: authName || 'Guru Pengampu',
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

