'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ensureDefaultSubjectsAndGrades } from '@/lib/subject-seed';
import { ensureDefaultJurusans, getDynamicClassTargets } from '@/lib/jurusan-service';
import { isClassTargetMatch } from '@/lib/cbt-schedule';

async function requireGuruOrAdmin() {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_token')?.value;
  const name = cookieStore.get('auth_name')?.value || 'Admin';
  const username = cookieStore.get('auth_user')?.value || '';

  if (!role || (role !== 'Super Admin' && role !== 'Guru')) {
    throw new Error('Forbidden: Hanya Guru atau Super Admin yang diizinkan.');
  }

  let dbUser = null;
  if (username || name) {
    dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(username ? [{ username }] : []),
          ...(name ? [{ name }] : []),
        ],
      },
      select: { id: true, name: true, role: true },
    });
  }

  return {
    role,
    name: dbUser?.name || name,
    userId: dbUser?.id,
    isSuperAdmin: role === 'Super Admin',
  };
}

export async function getSubjects() {
  const auth = await requireGuruOrAdmin();

  const [classTargets, jurusans] = await Promise.all([
    getDynamicClassTargets(),
    ensureDefaultJurusans(),
  ]);

  // JIKA USER ADALAH GURU: Hanya ambil mata pelajaran yang dia ampu / input sendiri
  // JIKA SUPER ADMIN: Ambil seluruh mata pelajaran sekolah dari semua guru
  const subjectWhere = auth.isSuperAdmin
    ? {}
    : {
        OR: [
          ...(auth.userId ? [{ teacherId: auth.userId }] : []),
          ...(auth.name ? [{ teacherName: { equals: auth.name, mode: 'insensitive' as const } }] : []),
          ...(auth.name ? [{ teacherName: { contains: auth.name, mode: 'insensitive' as const } }] : []),
        ],
      };

  const [subjects, teachers, students] = await Promise.all([
    prisma.subject.findMany({
      where: subjectWhere,
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

  return {
    subjects,
    teachers,
    students,
    classTargets,
    jurusans,
    currentUser: {
      role: auth.role,
      name: auth.name,
      id: auth.userId,
      isSuperAdmin: auth.isSuperAdmin,
    },
  };
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
  const auth = await requireGuruOrAdmin();

  try {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    // Tentukan guru pengampu (jika user adalah Guru, otomatis akun dirinya)
    let teacherId = data.teacherId || null;
    let teacherName = data.teacherName || null;

    if (auth.role === 'Guru') {
      teacherId = auth.userId || null;
      teacherName = auth.name;
    }

    // Jika Guru mengedit, pastikan mapel tersebut adalah miliknya
    if (data.id && !auth.isSuperAdmin) {
      const existing = await prisma.subject.findUnique({ where: { id: data.id } });
      if (
        existing &&
        existing.teacherName?.toLowerCase() !== auth.name.toLowerCase() &&
        existing.teacherId !== auth.userId
      ) {
        return { error: 'Anda hanya dapat mengedit mata pelajaran yang Anda ampu.' };
      }
    }

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
          teacherId,
          teacherName,
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
          teacherId,
          teacherName,
          day: data.day || null,
          time: data.time || null,
          room: data.room || null,
          kkm: Number(data.kkm) || 75,
          credits: Number(data.credits) || 3,
        },
      });

      // Sinkronkan buku nilai hanya untuk siswa yang berada di kelas target mapel tersebut
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
          const studentClass = classMap.get(st.name) || 'XI TJKT 1';
          if (isClassTargetMatch(targetClass, studentClass)) {
            await prisma.studentGrade.create({
              data: {
                subjectId: subject.id,
                studentName: st.name,
                studentNis: st.nisn || st.username,
                studentClass: studentClass,
                assignment: 0,
                midExam: 0,
                finalExam: 0,
                finalGrade: '-',
                notes: 'Mata pelajaran baru ditambahkan.',
                updatedBy: teacherName || auth.name || 'Guru Pengampu',
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
  const auth = await requireGuruOrAdmin();

  try {
    if (!auth.isSuperAdmin) {
      const existing = await prisma.subject.findUnique({ where: { id } });
      if (
        existing &&
        existing.teacherName?.trim().toLowerCase() !== auth.name?.trim().toLowerCase() &&
        existing.teacherId !== auth.userId
      ) {
        return { error: 'Anda hanya dapat menghapus mata pelajaran yang Anda ampu.' };
      }
    }

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
  const auth = await requireGuruOrAdmin();
  if (!auth.isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak melakukan plotting guru pengampu.' };
  }

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

export async function deleteSubjectsBulk(ids: string[]) {
  const auth = await requireGuruOrAdmin();
  if (!auth.isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak melakukan penghapusan mata pelajaran secara kolektif.' };
  }

  if (!ids || ids.length === 0) {
    return { error: 'Pilih minimal satu mata pelajaran untuk dihapus.' };
  }

  try {
    // Hapus nilai terkait terlebih dahulu demi integritas data
    await prisma.studentGrade.deleteMany({
      where: { subjectId: { in: ids } },
    });

    const result = await prisma.subject.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true, count: result.count };
  } catch (error) {
    console.error('Error bulk deleting subjects:', error);
    return { error: error instanceof Error ? error.message : 'Gagal menghapus mata pelajaran secara kolektif' };
  }
}

export interface BulkSubjectInput {
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
}

export async function saveSubjectsBulk(dataList: BulkSubjectInput[]) {
  const auth = await requireGuruOrAdmin();
  if (!auth.isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak menambah mata pelajaran secara kolektif.' };
  }

  // Filter valid rows
  const validList = dataList.filter(
    (item) => item.name && item.name.trim().length > 0 && item.code && item.code.trim().length > 0
  );

  if (validList.length === 0) {
    return { error: 'Tidak ada data mata pelajaran valid yang dapat disimpan. Pastikan Kode dan Nama telah diisi.' };
  }

  try {
    // Check for duplicate codes within input
    const upperCodes = validList.map((d) => d.code.trim().toUpperCase());
    const duplicateInInput = upperCodes.filter((c, idx) => upperCodes.indexOf(c) !== idx);
    if (duplicateInInput.length > 0) {
      return {
        error: `Terdapat kode mapel ganda di dalam daftar input: ${Array.from(new Set(duplicateInInput)).join(', ')}`,
      };
    }

    // Check if any code already exists in DB
    const existing = await prisma.subject.findMany({
      where: { code: { in: upperCodes } },
      select: { code: true, name: true },
    });

    if (existing.length > 0) {
      return {
        error: `Kode mapel berikut sudah digunakan di sistem: ${existing.map((e) => `${e.code} (${e.name})`).join(', ')}. Harap gunakan kode unik.`,
      };
    }

    // Ambil data siswa & kelas untuk inisialisasi studentGrade
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

    const createdSubjects = [];

    for (const item of validList) {
      const code = item.code.trim().toUpperCase();
      const name = item.name.trim();

      const subject = await prisma.subject.create({
        data: {
          code,
          name,
          category: item.category || 'Muatan Kejuruan',
          classTarget: item.classTarget || 'Semua Kelas',
          teacherId: item.teacherId || null,
          teacherName: item.teacherName || null,
          day: item.day || 'Senin',
          time: item.time || '07:30 - 10:00',
          room: item.room || 'Lab Komputer 1',
          kkm: Number(item.kkm) || 75,
          credits: Number(item.credits) || 3,
        },
      });

      createdSubjects.push(subject);

      try {
        const targetClass = item.classTarget || 'Semua Kelas';
        for (const st of allStudents) {
          const studentClass = classMap.get(st.name) || 'XI TJKT 1';
          if (isClassTargetMatch(targetClass, studentClass)) {
            await prisma.studentGrade.create({
              data: {
                subjectId: subject.id,
                studentName: st.name,
                studentNis: st.nisn || st.username,
                studentClass: studentClass,
                assignment: 0,
                midExam: 0,
                finalExam: 0,
                finalGrade: '-',
                notes: 'Mata pelajaran ditambahkan secara kolektif oleh Super Admin.',
                updatedBy: item.teacherName || auth.name || 'Admin Utama',
              },
            });
          }
        }
      } catch (err) {
        console.error('Error initializing grades for bulk subject:', code, err);
      }
    }

    revalidatePath('/admin/mapel');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru');
    revalidatePath('/portal/guru/nilai');

    return { success: true, count: createdSubjects.length, subjects: createdSubjects };
  } catch (error) {
    console.error('Error saving subjects bulk:', error);
    return { error: error instanceof Error ? error.message : 'Gagal menyimpan mata pelajaran secara kolektif' };
  }
}
