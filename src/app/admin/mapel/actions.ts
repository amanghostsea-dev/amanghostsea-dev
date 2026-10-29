'use server';

import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ensureDefaultSubjectsAndGrades } from '@/lib/subject-seed';

export async function getSubjects() {
  await requireSuperAdmin();

  // Pastikan data awal tersedia
  await ensureDefaultSubjectsAndGrades();

  const [subjects, teachers, students] = await Promise.all([
    prisma.subject.findMany({
      include: {
        _count: {
          select: {
            grades: true,
          },
        },
      },
      orderBy: [{ classTarget: 'asc' }, { code: 'asc' }],
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['Guru', 'Super Admin'] },
        status: 'Aktif',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'Siswa' },
      select: {
        id: true,
        name: true,
        username: true,
        nisn: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { subjects, teachers, students };
}

export async function saveSubject(data: {
  id?: string;
  code: string;
  name: string;
  category: string;
  classTarget: string;
  teacherId?: string | null;
  teacherName?: string | null;
  day?: string | null;
  time?: string | null;
  room?: string | null;
  kkm: number;
  credits: number;
}) {
  await requireSuperAdmin();

  try {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    // Check code uniqueness if creating new or changing code
    if (!data.id) {
      const existing = await prisma.subject.findUnique({ where: { code } });
      if (existing) {
        return { error: `Kode Mapel "${code}" sudah digunakan oleh mata pelajaran "${existing.name}".` };
      }
    }

    let subject;
    if (data.id) {
      subject = await prisma.subject.update({
        where: { id: data.id },
        data: {
          code,
          name,
          category: data.category,
          classTarget: data.classTarget,
          teacherId: data.teacherId || null,
          teacherName: data.teacherName || null,
          day: data.day || null,
          time: data.time || null,
          room: data.room || null,
          kkm: Number(data.kkm) || 75,
          credits: Number(data.credits) || 3,
        },
      });
    } else {
      subject = await prisma.subject.create({
        data: {
          code,
          name,
          category: data.category,
          classTarget: data.classTarget,
          teacherId: data.teacherId || null,
          teacherName: data.teacherName || null,
          day: data.day || null,
          time: data.time || null,
          room: data.room || null,
          kkm: Number(data.kkm) || 75,
          credits: Number(data.credits) || 3,
        },
      });

      // Buat default nilai untuk siswa yang ada
      const students = await prisma.user.findMany({
        where: { role: 'Siswa' },
      });

      for (const st of students) {
        await prisma.studentGrade.create({
          data: {
            subjectId: subject.id,
            studentName: st.name,
            studentNis: st.nisn || st.username,
            studentClass: data.classTarget,
            assignment: 85,
            midExam: 80,
            finalExam: 85,
            finalGrade: 'A',
            notes: 'Mata pelajaran baru ditambahkan.',
            updatedBy: data.teacherName || 'Admin',
          },
        });
      }
    }

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true, subject };
  } catch (error) {
    console.error('Error saving subject:', error);
    return { error: error instanceof Error ? error.message : 'Gagal menyimpan mata pelajaran' };
  }
}

export async function plotTeacher(subjectId: string, teacherId: string | null, teacherName: string) {
  await requireSuperAdmin();

  try {
    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        teacherId: teacherId || null,
        teacherName: teacherName.trim(),
      },
    });

    // Perbarui field updatedBy di studentGrade jika masih kosong/default
    await prisma.studentGrade.updateMany({
      where: { subjectId },
      data: {
        updatedBy: teacherName.trim(),
      },
    });

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true, updated };
  } catch (error) {
    console.error('Error plotting teacher:', error);
    return { error: error instanceof Error ? error.message : 'Gagal memplotting guru' };
  }
}

export async function deleteSubject(subjectId: string) {
  await requireSuperAdmin();

  try {
    await prisma.subject.delete({
      where: { id: subjectId },
    });

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { error: error instanceof Error ? error.message : 'Gagal menghapus mata pelajaran' };
  }
}

