'use server';

import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ensureDefaultSubjectsAndGrades } from '@/lib/subject-seed';
import { ensureDefaultJurusans, getDynamicClassTargets } from '@/lib/jurusan-service';

export async function getSubjects() {
  await requireSuperAdmin();

  // Pastikan data awal tersedia
  await ensureDefaultSubjectsAndGrades();
  const [classTargets, jurusans] = await Promise.all([
    getDynamicClassTargets(),
    ensureDefaultJurusans(),
  ]);

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

  return { subjects, teachers, students, classTargets, jurusans };
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

      // Sinkronkan buku nilai hanya untuk siswa yang berada di kelas target mapel tersebut (atau semua jika 'Semua Kelas')
      try {
        const targetClass = data.classTarget;
        const allStudents = await prisma.user.findMany({
          where: { role: 'Siswa' },
          select: { id: true, name: true, nisn: true, username: true },
        });

        const studentGrades = await prisma.studentGrade.findMany({
          select: { studentName: true, studentClass: true },
          distinct: ['studentName'],
        });
        const classMap = new Map<string, string>();
        for (const sg of studentGrades) {
          if (sg.studentName) classMap.set(sg.studentName, sg.studentClass);
        }

        for (const st of allStudents) {
          const studentClass = classMap.get(st.name) || 'XI RPL 1';
          if (targetClass === 'Semua Kelas' || targetClass === studentClass || !classMap.has(st.name)) {
            await prisma.studentGrade.create({
              data: {
                subjectId: subject.id,
                studentName: st.name,
                studentNis: st.nisn || st.username,
                studentClass: studentClass,
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
      } catch (gradeInitErr) {
        console.error('Error initializing student grades for subject:', gradeInitErr);
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

export async function deleteSubject(id: string) {
  await requireSuperAdmin();

  try {
    await prisma.subject.delete({
      where: { id },
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

export async function plotTeacherToSubject(data: {
  subjectId: string;
  teacherId?: string | null;
  teacherName?: string | null;
}) {
  await requireSuperAdmin();

  try {
    const updated = await prisma.subject.update({
      where: { id: data.subjectId },
      data: {
        teacherId: data.teacherId || null,
        teacherName: data.teacherName || null,
      },
    });

    // Update updatedBy di nilai jika perlu
    if (data.teacherName) {
      await prisma.studentGrade.updateMany({
        where: { subjectId: data.subjectId },
        data: {
          updatedBy: data.teacherName,
        },
      });
    }

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true, subject: updated };
  } catch (error) {
    console.error('Error plotting teacher to subject:', error);
    return { error: error instanceof Error ? error.message : 'Gagal memplotting guru ke mata pelajaran' };
  }
}

export async function plotTeacher(
  subjectId: string,
  teacherId?: string | null,
  teacherName?: string | null
) {
  return await plotTeacherToSubject({ subjectId, teacherId, teacherName });
}
