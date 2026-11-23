'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { 
  checkActiveDeviceSession, 
  registerDeviceSession, 
  clearDeviceSession,
  forceResetUserDeviceSession,
  DeviceSessionData
} from '@/lib/device-session'

export async function loginAction(formData: FormData) {
  let destination = '/';
  try {
    const username = (formData.get('username') as string || '').trim();
    const password = (formData.get('password') as string || '').trim();
    const redirectTarget = (formData.get('redirect') as string || '').trim();

    if (!username || !password) {
      return { error: 'Username dan password wajib diisi!' };
    }

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

    // 🛡️ CEK SINGLE-DEVICE LOGIN: Pastikan akun tidak sedang aktif di perangkat lain
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get('auth_session_id')?.value;

    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || 'Browser Web';
    const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               headerList.get('x-real-ip') || 
               '127.0.0.1';

    const sessionCheck = await checkActiveDeviceSession(user.id, currentSessionId);
    if (sessionCheck.hasActiveSession && sessionCheck.sessionData) {
      return {
        isDeviceConflict: true,
        canOverride: user.role === 'Super Admin' || user.role === 'Guru',
        conflictData: sessionCheck.sessionData,
        error: `Akun Anda sedang aktif di perangkat lain (${sessionCheck.sessionData.deviceName}). Login bersamaan ditolak.`,
      };
    }

    // Daftarkan sesi perangkat baru
    await registerDeviceSession(user.id, user.name, user.role, userAgent, ip);

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

    // Set auth cookie (Path '/' eksplisit agar berlaku di seluruh rute dan tidak terduplikasi per path)
    cookieStore.set('auth_token', user.role, { maxAge: 60 * 60 * 24, path: '/' });
    cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24, path: '/' });
    cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24, path: '/' });

    if (user.role === 'Siswa') {
      // Sinkronkan kelas siswa
      let studentClass = user.studentClass || '';

      if (!studentClass) {
        try {
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
        } catch {}
      }

      if (!studentClass) {
        try {
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
        } catch {}
      }

      if (studentClass) {
        cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24, path: '/' });
      }
    }
  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Login action error:', error);
    const msg = error?.message || '';
    if (msg.includes('Can\'t reach database server') || msg.includes('planLimitReached') || msg.includes('P1001')) {
      return { error: 'Layanan database cloud mencapai batas kuota / sedang offline. Silakan periksa status akun database atau hubungi administrator.' };
    }
    return { error: error.message || 'Terjadi kesalahan sistem saat mencoba login.' };
  }

  redirect(destination);
}

/**
 * ⚡ Paksa Putuskan Sesi Lama dan Login di Perangkat Ini (Untuk Admin/Guru yang sah)
 */
export async function forceTakeoverLoginAction(formData: FormData) {
  let destination = '/';
  try {
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
      return { error: 'Username atau password salah!' };
    }

    if (user.status !== 'Aktif') {
      return { error: 'Akun Anda tidak aktif.' };
    }

    // Putuskan sesi perangkat sebelumnya
    await forceResetUserDeviceSession(user.id);

    // Lanjutkan login normal
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || 'Browser Web';
    const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               headerList.get('x-real-ip') || 
               '127.0.0.1';

    await registerDeviceSession(user.id, user.name, user.role, userAgent, ip);

    const cookieStore = await cookies();
    cookieStore.set('auth_token', user.role, { maxAge: 60 * 60 * 24, path: '/' });
    cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24, path: '/' });
    cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24, path: '/' });

    if (user.role === 'Super Admin') destination = '/admin';
    else if (user.role === 'Guru') destination = '/portal/guru';
    else if (user.role === 'Siswa') destination = '/portal/siswa';

    if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
      destination = redirectTarget;
    }
  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Force takeover action error:', error);
    const msg = error?.message || '';
    if (msg.includes('Can\'t reach database server') || msg.includes('planLimitReached') || msg.includes('P1001')) {
      return { error: 'Layanan database cloud mencapai batas kuota / sedang offline. Silakan periksa status akun database.' };
    }
    return { error: error.message || 'Gagal mengambil alih sesi login.' };
  }

  redirect(destination);
}

export async function logoutAction(formDataOrRedirect?: FormData | string) {
  const redirectTo = typeof formDataOrRedirect === 'string' ? formDataOrRedirect : '/login';
  const cookieStore = await cookies();
  const authUser = cookieStore.get('auth_user')?.value;

  if (authUser) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: authUser },
            { nisn: authUser },
          ],
        },
        select: { id: true },
      });
      if (user) {
        await clearDeviceSession(user.id);
      }
    } catch {}
  }

  // Bersihkan semua cookie sesi dari root path '/' agar tidak meninggalkan zombie cookie
  cookieStore.set('auth_token', '', { maxAge: 0, path: '/' });
  cookieStore.set('auth_user', '', { maxAge: 0, path: '/' });
  cookieStore.set('auth_name', '', { maxAge: 0, path: '/' });
  cookieStore.set('auth_class', '', { maxAge: 0, path: '/' });
  cookieStore.set('auth_session_id', '', { maxAge: 0, path: '/' });
  cookieStore.delete({ name: 'auth_token', path: '/' });
  cookieStore.delete({ name: 'auth_user', path: '/' });
  cookieStore.delete({ name: 'auth_name', path: '/' });
  cookieStore.delete({ name: 'auth_class', path: '/' });
  cookieStore.delete({ name: 'auth_session_id', path: '/' });
  redirect(redirectTo);
}
