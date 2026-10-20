'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user || user.password !== password) {
    return { error: 'Username atau password salah!' };
  }

  if (user.status !== 'Aktif') {
    return { error: 'Akun Anda tidak aktif. Hubungi administrator.' };
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

  // Set simulated auth cookie
  const cookieStore = await cookies();
  cookieStore.set('auth_token', user.role, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24 });

  redirect(destination);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  cookieStore.delete('auth_user');
  redirect('/login');
}
