'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function requireGuruOrAdmin() {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_token')?.value;
  const name = cookieStore.get('auth_name')?.value || 'Guru';

  if (!role || (role !== 'Guru' && role !== 'Super Admin')) {
    throw new Error('Akses ditolak: Hanya Guru atau Super Admin yang diizinkan.');
  }

  return { role, name };
}

export async function createStudentByGuru(data: {
  name: string;
  nisn?: string | null;
  username?: string | null;
  password?: string | null;
  studentClass?: string | null;
}) {
  await requireGuruOrAdmin();

  try {
    const name = data.name.trim();
    if (!name) {
      return { error: 'Nama lengkap siswa wajib diisi.' };
    }

    const nisn = data.nisn && data.nisn.trim() !== '' ? data.nisn.trim() : null;
    let username = data.username && data.username.trim() !== '' ? data.username.trim() : '';

    if (!username) {
      if (nisn) {
        username = nisn;
      } else {
        username = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) + Math.floor(1000 + Math.random() * 9000);
      }
    }

    // Periksa apakah username sudah digunakan
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return { error: `Username "${username}" sudah digunakan oleh akun lain.` };
    }

    // Periksa apakah NISN sudah digunakan
    if (nisn) {
      const existingNisn = await prisma.user.findUnique({
        where: { nisn },
      });
      if (existingNisn) {
        return { error: `NISN "${nisn}" sudah terdaftar atas nama ${existingNisn.name}.` };
      }
    }

    const password = data.password && data.password.trim() !== ''
      ? data.password.trim()
      : (nisn || '123456');

    const newStudent = await prisma.user.create({
      data: {
        name,
        username,
        nisn,
        role: 'Siswa',
        status: 'Aktif',
        password,
      },
    });

    // Otomatis sinkronkan buku nilai siswa baru secara cepat
    try {
      const activeSubjects = await prisma.subject.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, classTarget: true, teacherName: true },
      });

      if (activeSubjects.length > 0) {
        await prisma.studentGrade.createMany({
          data: activeSubjects.map((subj) => ({
            subjectId: subj.id,
            studentName: name,
            studentNis: nisn || username,
            studentClass: data.studentClass || subj.classTarget || 'XI RPL 1',
            assignment: 85,
            midExam: 80,
            finalExam: 85,
            finalGrade: 'A',
            notes: 'Kemajuan belajar sangat baik, aktif dalam praktikum dan diskusi kelas.',
            updatedBy: subj.teacherName || 'Admin',
          })),
          skipDuplicates: true,
        });
      }
    } catch (gradeErr) {
      console.warn('Non-fatal grade seed error for new student:', gradeErr);
    }

    revalidatePath('/portal/guru/kelas');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/admin/users');
    revalidatePath('/admin/mapel');

    return {
      success: true,
      data: {
        id: newStudent.id,
        name: newStudent.name,
        username: newStudent.username,
        nisn: newStudent.nisn,
        role: newStudent.role,
        status: newStudent.status,
        createdAt: newStudent.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error('Error creating student by guru:', error);
    const message = error instanceof Error ? error.message : 'Gagal menambahkan data siswa';
    return { error: message };
  }
}

export async function importStudentsByGuru(studentsData: { name: string; nisn?: string; username?: string; password?: string; studentClass?: string }[]) {
  await requireGuruOrAdmin();

  try {
    let successCount = 0;
    const errors: string[] = [];
    const createdStudents: { name: string; nisnOrUser: string; studentClass: string }[] = [];

    for (const item of studentsData) {
      const name = item.name?.trim();
      if (!name) continue;

      const nisn = item.nisn?.trim() || null;
      let username = item.username?.trim() || '';
      if (!username) {
        username = nisn || (name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) + Math.floor(1000 + Math.random() * 9000));
      }

      // Check existence
      const exists = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            ...(nisn ? [{ nisn }] : []),
          ],
        },
      });

      if (exists) {
        errors.push(`Siswa "${name}" (${nisn || username}) dilewati karena sudah ada.`);
        continue;
      }

      const password = item.password?.trim() || (nisn || '123456');

      await prisma.user.create({
        data: {
          name,
          username,
          nisn,
          role: 'Siswa',
          status: 'Aktif',
          password,
        },
      });

      createdStudents.push({
        name,
        nisnOrUser: nisn || username,
        studentClass: item.studentClass || 'XI RPL 1',
      });
      successCount++;
    }

    // Bulk create grades for all created students
    if (createdStudents.length > 0) {
      try {
        const activeSubjects = await prisma.subject.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, classTarget: true, teacherName: true },
        });

        if (activeSubjects.length > 0) {
          const gradesData = [];
          for (const st of createdStudents) {
            for (const subj of activeSubjects) {
              gradesData.push({
                subjectId: subj.id,
                studentName: st.name,
                studentNis: st.nisnOrUser,
                studentClass: st.studentClass || subj.classTarget || 'XI RPL 1',
                assignment: 85,
                midExam: 80,
                finalExam: 85,
                finalGrade: 'A',
                notes: 'Kemajuan belajar sangat baik.',
                updatedBy: subj.teacherName || 'Admin',
              });
            }
          }

          await prisma.studentGrade.createMany({
            data: gradesData,
            skipDuplicates: true,
          });
        }
      } catch (gradeBulkErr) {
        console.warn('Non-fatal bulk grade creation error:', gradeBulkErr);
      }
    }

    revalidatePath('/portal/guru/kelas');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/admin/users');

    return { success: true, count: successCount, errors };
  } catch (error) {
    console.error('Error importing students by guru:', error);
    return { error: 'Gagal memproses impor siswa massal.' };
  }
}
