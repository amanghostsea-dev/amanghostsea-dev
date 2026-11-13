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
    } = {
      name: data.name.trim(),
      username,
      role: data.role,
      status: data.status,
      nisn,
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
          where: { studentName: user.name }
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
    const fallbackClass = options?.studentClass?.trim() || 'XI RPL 1';

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
