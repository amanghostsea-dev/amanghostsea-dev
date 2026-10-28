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
    revalidatePath('/admin/users');
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
    revalidatePath('/admin/users');
    return { success: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function deleteUser(id: string) {
  await requireSuperAdmin();
  try {
    await prisma.user.delete({
      where: { id }
    });
    revalidatePath('/admin/users');
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
}

export async function createBulkStudents(
  students: BulkStudentItem[],
  options?: {
    defaultPassword?: string;
    useNisnAsPassword?: boolean;
    useNisnAsUsername?: boolean;
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

    // Fetch existing users to check duplicates quickly in memory
    const existingUsers = await prisma.user.findMany({
      select: { username: true, nisn: true }
    });
    const takenUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
    const takenNisns = new Set(existingUsers.filter(u => u.nisn).map(u => u.nisn!.toLowerCase()));

    const createdUsers = [];
    const skipped: { name: string; nisn: string; reason: string }[] = [];
    const errors: string[] = [];

    // Track duplicates inside the current batch
    const batchUsernames = new Set<string>();
    const batchNisns = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const name = s.name?.trim();
      const nisn = s.nisn?.toString().trim();
      
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
        createdUsers.push(created);
        takenUsernames.add(lowerUsername);
        takenNisns.add(lowerNisn);
        batchUsernames.add(lowerUsername);
        batchNisns.add(lowerNisn);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Database error';
        errors.push(`Gagal menyimpan ${name} (${nisn}): ${msg}`);
      }
    }

    revalidatePath('/admin/users');
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
