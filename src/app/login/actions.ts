'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export async function loginAction(formData: FormData) {
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();
  const redirectTarget = (formData.get('redirect') as string || '').trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: username, mode: 'insensitive' } },
        { nisn: { equals: username, mode: 'insensitive' } },
      ]
    }
  });

  if (!user || user.password !== password) {
    return { error: 'Username atau password salah! Silakan periksa kembali Kartu Login Anda.' };
  }

  if (user.status !== 'Aktif') {
    return { error: 'Akun Anda tidak aktif. Hubungi administrator sekolah.' };
  }

  let destination = '/';
  if (user.role === 'Super Admin') {
    destination = '/admin';
  } else if (user.role === 'Panitia PPDB' || user.role === 'Verifikator PPDB') {
    destination = '/admin/ppdb';
  } else if (user.role === 'Admin BKK' || user.role === 'BKK') {
    destination = '/admin/bkk/jobs';
  } else if (user.role === 'Guru') {
    destination = '/portal/guru';
  } else if (user.role === 'Siswa') {
    destination = '/portal/siswa';
  }

  // Dukung pengalihan aman jika ada target redirect (misal ke /ujian atau /portal/siswa/cbt)
  if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
    if (user.role === 'Siswa' || user.role === 'Super Admin') {
      destination = redirectTarget;
    }
  }

  // Set auth cookie
  const cookieStore = await cookies();
  cookieStore.set('auth_token', user.role, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24 });

  if (user.role === 'Siswa') {
    // Sinkronkan kelas siswa
    let studentClass = user.studentClass || '';

    if (!studentClass) {
      const attempt = await prisma.examAttempt.findFirst({
        where: {
          OR: [
            { studentName: user.name },
            ...(user.nisn ? [{ studentNis: user.nisn }] : []),
            { studentNis: user.username },
          ],
          studentClass: { not: null },
        },
        select: { studentClass: true },
        orderBy: { startedAt: 'desc' },
      });
      if (attempt?.studentClass) {
        studentClass = attempt.studentClass;
      }
    }

    if (!studentClass) {
      const grade = await prisma.studentGrade.findFirst({
        where: {
          OR: [
            { studentName: user.name },
            ...(user.nisn ? [{ studentNis: user.nisn }] : []),
            { studentNis: user.username },
          ],
        },
        select: { studentClass: true },
      });
      if (grade?.studentClass) {
        studentClass = grade.studentClass;
      }
    }

    if (studentClass) {
      cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24 });
    }
  }

  redirect(destination);
}

export async function logoutAction(formDataOrRedirect?: FormData | string) {
  const redirectTo = typeof formDataOrRedirect === 'string' ? formDataOrRedirect : '/login';
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  cookieStore.delete('auth_user');
  cookieStore.delete('auth_name');
  cookieStore.delete('auth_class');
  redirect(redirectTo);
}
