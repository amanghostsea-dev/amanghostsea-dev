'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'

export async function getUsers() {
  await requireSuperAdmin();
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(data: {
  name: string;
  username: string;
  role: string;
  status: string;
  nisn?: string | null;
  password?: string;
  studentClass?: string | null;
}) {
  await requireSuperAdmin();
  try {
    const username = data.username.trim();
    const nisn = data.nisn && data.nisn.trim() !== '' ? data.nisn.trim() : null;

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUsername) {
      return { error: `Username "${username}" sudah digunakan oleh akun lain.` };
    }

    // Check NISN uniqueness if provided
    if (nisn) {
      const existingNisn = await prisma.user.findUnique({
        where: { nisn }
      });
      if (existingNisn) {
        return { error: `NISN "${nisn}" sudah terdaftar pada pengguna lain (${existingNisn.name}).` };
      }
    }

    const password = data.password && data.password.trim() !== '' 
      ? data.password.trim() 
      : (nisn || Math.random().toString(36).slice(-8));
    
    const newUser = await prisma.user.create({
      data: {
        name: data.name.trim(),
        username,
        role: data.role,
        status: data.status,
        nisn,
        password,
        studentClass: data.role === 'Siswa' ? (data.studentClass?.trim() || null) : null,
      }
    });

    // Jika role Siswa dan ada kelas/jurusan, sinkronkan ke buku nilai rapor (StudentGrade)
    if (data.role === 'Siswa' && data.studentClass) {
      try {
        const activeSubjects = await prisma.subject.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, classTarget: true, teacherName: true },
        });

        if (activeSubjects.length > 0) {
          for (const subj of activeSubjects) {
            await prisma.studentGrade.upsert({
              where: {
                subjectId_studentName: {
                  subjectId: subj.id,
                  studentName: data.name.trim(),
                },
              },
              update: {
                studentNis: nisn || username,
                studentClass: data.studentClass,
              },
              create: {
                subjectId: subj.id,
                studentName: data.name.trim(),
                studentNis: nisn || username,
                studentClass: data.studentClass,
                assignment: 85,
                midExam: 80,
                finalExam: 85,
                finalGrade: 'A',
                updatedBy: 'Admin Utama',
              },
            });
          }
        }
      } catch (gradeErr) {
        console.error('Error linking student class to StudentGrade in createUser:', gradeErr);
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/portal/guru/nilai');
    return { success: true, data: newUser };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function updateUser(id: string, data: {
  name: string;
  username: string;
  role: string;
  status: string;
  nisn?: string | null;
  password?: string;
  studentClass?: string | null;
}) {
  await requireSuperAdmin();
  try {
    const username = data.username.trim();
    const nisn = data.nisn && data.nisn.trim() !== '' ? data.nisn.trim() : null;

    // Check username uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUser && existingUser.id !== id) {
      return { error: `Username "${username}" sudah digunakan oleh akun lain.` };
    }

    // Check NISN uniqueness
    if (nisn) {
      const existingNisn = await prisma.user.findUnique({
        where: { nisn }
      });
      if (existingNisn && existingNisn.id !== id) {
        return { error: `NISN "${nisn}" sudah terdaftar pada akun lain (${existingNisn.name}).` };
      }
    }

    const updateData: {
      name: string;
      username: string;
      role: string;
      status: string;
      nisn: string | null;
      password?: string;
      studentClass?: string | null;
    } = {
      name: data.name.trim(),
      username,
      role: data.role,
      status: data.status,
      nisn,
      studentClass: data.role === 'Siswa' ? (data.studentClass?.trim() || null) : null,
    };
    
    if (data.password && data.password.trim() !== '') {
      updateData.password = data.password.trim();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Jika role Siswa dan ada kelas/jurusan, perbarui kelas di buku rapor (StudentGrade)
    if (data.role === 'Siswa' && data.studentClass) {
      try {
        await prisma.studentGrade.updateMany({
          where: { studentName: data.name.trim() },
          data: { studentClass: data.studentClass },
        });
      } catch (gradeErr) {
        console.error('Error updating student class in StudentGrade:', gradeErr);
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/portal/guru/nilai');
    return { success: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function deleteUser(id: string) {
  await requireSuperAdmin();
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });

    // Hapus juga grade terkait jika siswa dihapus
    if (user?.role === 'Siswa') {
      try {
        await prisma.studentGrade.deleteMany({
          where: {
            OR: [
              { studentName: user.name },
              ...(user.nisn ? [{ studentNis: user.nisn }] : []),
            ]
          }
        });
      } catch {}
    }

    revalidatePath('/admin/users');
    revalidatePath('/portal/guru/kelas');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function deleteBulkUsers(ids: string[]) {
  const admin = await requireSuperAdmin();
  try {
    if (!ids || ids.length === 0) {
      return { error: 'Tidak ada akun yang dipilih untuk dihapus.' };
    }

    const targetUsers = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, nisn: true, role: true }
    });

    if (targetUsers.length === 0) {
      return { error: 'Data akun yang ingin dihapus tidak ditemukan.' };
    }

    // Safety: Cegah menghapus akun Super Admin yang sedang aktif digunakan saat ini
    const safeUsers = targetUsers.filter(u => !(u.role === 'Super Admin' && u.name === admin.name));
    if (safeUsers.length === 0) {
      return { error: 'Anda tidak dapat menghapus akun Super Admin yang sedang aktif digunakan.' };
    }

    const safeIds = safeUsers.map(u => u.id);
    const studentNames = safeUsers.filter(u => u.role === 'Siswa').map(u => u.name);
    const studentNisns = safeUsers.filter(u => u.role === 'Siswa' && u.nisn).map(u => u.nisn as string);

    // Hapus users dari database
    const deleteResult = await prisma.user.deleteMany({
      where: { id: { in: safeIds } }
    });

    // Hapus juga data nilai rapor jika akun siswa dihapus
    if (studentNames.length > 0 || studentNisns.length > 0) {
      try {
        await prisma.studentGrade.deleteMany({
          where: {
            OR: [
              ...(studentNames.length > 0 ? [{ studentName: { in: studentNames } }] : []),
              ...(studentNisns.length > 0 ? [{ studentNis: { in: studentNisns } }] : []),
            ]
          }
        });
      } catch (e) {
        console.error('Error cleaning up student grades in bulk delete:', e);
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/portal/guru/kelas');
    return {
      success: true,
      deletedCount: deleteResult.count,
      skippedSelf: safeIds.length < ids.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat menghapus data massal.';
    return { error: message };
  }
}

export interface BulkStudentItem {
  name: string;
  nisn: string;
  username?: string;
  password?: string;
  studentClass?: string;
}

export async function createBulkStudents(
  students: BulkStudentItem[],
  options?: {
    defaultPassword?: string;
    useNisnAsPassword?: boolean;
    useNisnAsUsername?: boolean;
    studentClass?: string;
  }
) {
  await requireSuperAdmin();
  try {
    if (!students || students.length === 0) {
      return { error: 'Tidak ada data siswa yang dikirimkan.' };
    }

    const defaultPwd = options?.defaultPassword?.trim() || 'siswa123';
    const useNisnAsPassword = !!options?.useNisnAsPassword;
    const useNisnAsUsername = options?.useNisnAsUsername ?? true;
    const fallbackClass = options?.studentClass?.trim() || 'XI TJKT 1';

    // Fetch existing users to check duplicates quickly in memory
    const existingUsers = await prisma.user.findMany({
      select: { username: true, nisn: true }
    });
    const takenUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
    const takenNisns = new Set(existingUsers.filter(u => u.nisn).map(u => u.nisn!.toLowerCase()));

    const createdUsers: any[] = [];
    const skipped: { name: string; nisn: string; reason: string }[] = [];
    const errors: string[] = [];

    // Track duplicates inside the current batch
    const batchUsernames = new Set<string>();
    const batchNisns = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const name = s.name?.trim();
      const nisn = s.nisn?.toString().trim();
      const assignedClass = s.studentClass?.trim() || fallbackClass;
      
      if (!name) {
        skipped.push({ name: s.name || `Baris ${i + 1}`, nisn: nisn || '-', reason: 'Nama siswa wajib diisi' });
        continue;
      }

      if (!nisn) {
        skipped.push({ name, nisn: '-', reason: 'NISN siswa wajib diisi' });
        continue;
      }

      const lowerNisn = nisn.toLowerCase();
      if (takenNisns.has(lowerNisn) || batchNisns.has(lowerNisn)) {
        skipped.push({ name, nisn, reason: 'NISN sudah terdaftar di sistem atau duplikat dalam daftar' });
        continue;
      }

      let username = s.username?.trim();
      if (!username || useNisnAsUsername) {
        username = nisn;
      }

      const lowerUsername = username.toLowerCase();
      if (takenUsernames.has(lowerUsername) || batchUsernames.has(lowerUsername)) {
        skipped.push({ name, nisn, reason: `Username "${username}" sudah digunakan` });
        continue;
      }

      let password = s.password?.trim();
      if (!password) {
        password = useNisnAsPassword ? nisn : defaultPwd;
      }

      try {
        const created = await prisma.user.create({
          data: {
            name,
            username,
            nisn,
            password,
            role: 'Siswa',
            status: 'Aktif',
            studentClass: assignedClass,
          }
        });
        createdUsers.push({
          ...created,
          studentClass: assignedClass,
        });
        takenUsernames.add(lowerUsername);
        takenNisns.add(lowerNisn);
        batchUsernames.add(lowerUsername);
        batchNisns.add(lowerNisn);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Database error';
        errors.push(`Gagal menyimpan ${name} (${nisn}): ${msg}`);
      }
    }

    // Auto-sync StudentGrade untuk siswa yang baru dibuat massal sesuai kelas masing-masing
    if (createdUsers.length > 0) {
      try {
        const activeSubjects = await prisma.subject.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, classTarget: true, teacherName: true },
        });

        if (activeSubjects.length > 0) {
          const gradesData: any[] = [];
          for (const u of createdUsers) {
            for (const subj of activeSubjects) {
              gradesData.push({
                subjectId: subj.id,
                studentName: u.name,
                studentNis: u.nisn || u.username,
                studentClass: u.studentClass,
                assignment: 85,
                midExam: 80,
                finalExam: 85,
                finalGrade: 'A',
                updatedBy: 'Admin Utama',
              });
            }
          }
          await prisma.studentGrade.createMany({
            data: gradesData,
            skipDuplicates: true,
          });
        }
      } catch (gradeBulkErr) {
        console.error('Error auto-syncing grades for bulk students:', gradeBulkErr);
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/admin/cbt');
    return {
      success: true,
      totalSubmitted: students.length,
      createdCount: createdUsers.length,
      skippedCount: skipped.length,
      skipped,
      errors,
      createdUsers,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}
