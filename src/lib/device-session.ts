import prisma from './prisma';
import { cookies } from 'next/headers';

export interface DeviceSessionData {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip: string;
  userAgent: string;
  loggedInAt: string;
  lastActive: number;
}

/**
 * 💻 Parser Informasi Perangkat Pengguna dari User-Agent
 */
export function parseDeviceDetails(ua: string): {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  fullDevice: string;
} {
  const safeUa = ua || '';

  let os = 'Sistem Operasi Tidak Dikenal';
  if (/windows phone/i.test(safeUa)) os = 'Windows Phone';
  else if (/win(dows|98|me|nt|xp|7|8|10|11)/i.test(safeUa)) {
    if (/windows nt 10\.0/i.test(safeUa)) os = 'Windows 10/11';
    else if (/windows nt 6\.3/i.test(safeUa)) os = 'Windows 8.1';
    else if (/windows nt 6\.1/i.test(safeUa)) os = 'Windows 7';
    else os = 'Windows PC';
  } else if (/android/i.test(safeUa)) os = 'Android Smartphone';
  else if (/ipad/i.test(safeUa)) os = 'Apple iPad';
  else if (/iphone/i.test(safeUa)) os = 'Apple iPhone';
  else if (/macintosh|mac os x/i.test(safeUa)) os = 'Apple macOS';
  else if (/linux/i.test(safeUa)) os = 'Linux Workstation';
  else if (/cros/i.test(safeUa)) os = 'ChromeOS Chromebook';

  let browser = 'Browser Web';
  if (/edg/i.test(safeUa)) browser = 'Microsoft Edge';
  else if (/opr|opera/i.test(safeUa)) browser = 'Opera Browser';
  else if (/chrome|crios/i.test(safeUa)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(safeUa)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(safeUa)) browser = 'Apple Safari';
  else if (/msie|trident/i.test(safeUa)) browser = 'Internet Explorer';

  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/tablet|ipad/i.test(safeUa)) deviceType = 'tablet';
  else if (/mobile|iphone|android/i.test(safeUa)) deviceType = 'mobile';

  const icon = deviceType === 'mobile' ? '📱' : deviceType === 'tablet' ? '📟' : '💻';
  const fullDevice = `${icon} ${os} • ${browser}`;

  return { deviceType, browser, os, fullDevice };
}

/**
 * 🔒 Periksa apakah user memiliki sesi aktif di perangkat lain
 */
export async function checkActiveDeviceSession(
  userId: string,
  incomingSessionId?: string | null
): Promise<{
  hasActiveSession: boolean;
  sessionData?: DeviceSessionData | null;
}> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: `active_session_${userId}` },
    });

    if (!setting || !setting.value) {
      return { hasActiveSession: false };
    }

    let parsed: DeviceSessionData;
    try {
      parsed = JSON.parse(setting.value);
    } catch {
      return { hasActiveSession: false };
    }

    // Jika ini perangkat yang sama (auth_session_id sama): izinkan
    if (incomingSessionId && parsed.sessionId === incomingSessionId) {
      return { hasActiveSession: false, sessionData: parsed };
    }

    // Batas waktu inaktivitas sesi: 30 Menit
    const TIMEOUT_MS = 30 * 60 * 1000;
    const now = Date.now();
    const lastActiveTime = parsed.lastActive || (parsed.loggedInAt ? new Date(parsed.loggedInAt).getTime() : 0);

    if (now - lastActiveTime > TIMEOUT_MS) {
      // Sesi lama sudah kadaluarsa (user menutup browser atau meninggalkan PC)
      await prisma.setting.delete({
        where: { key: `active_session_${userId}` },
      }).catch(() => {});
      return { hasActiveSession: false };
    }

    // Sesi terbukti masih AKTIF di perangkat lain!
    return {
      hasActiveSession: true,
      sessionData: parsed,
    };
  } catch (error) {
    console.error('Error checking active device session:', error);
    return { hasActiveSession: false };
  }
}

/**
 * 🚀 Daftarkan Sesi Perangkat Baru Saat Berhasil Login
 */
export async function registerDeviceSession(
  userId: string,
  userName: string,
  userRole: string,
  userAgent: string,
  ip: string
): Promise<string> {
  const cookieStore = await cookies();
  const existingCookieSessionId = cookieStore.get('auth_session_id')?.value;
  const sessionId = existingCookieSessionId || `SES_${Date.now()}_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;

  const dev = parseDeviceDetails(userAgent);
  const now = new Date();

  // Format waktu resmi
  const formattedTime = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  }) + ' WITA';

  const sessionData: DeviceSessionData = {
    sessionId,
    userId,
    userName,
    userRole,
    deviceName: dev.fullDevice,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    ip: ip || '127.0.0.1',
    userAgent,
    loggedInAt: formattedTime,
    lastActive: Date.now(),
  };

  try {
    await prisma.setting.upsert({
      where: { key: `active_session_${userId}` },
      update: {
        value: JSON.stringify(sessionData),
        description: `Sesi login aktif untuk ${userName} (${userRole})`,
      },
      create: {
        key: `active_session_${userId}`,
        value: JSON.stringify(sessionData),
        description: `Sesi login aktif untuk ${userName} (${userRole})`,
      },
    });
  } catch (err) {
    console.error('Error registering device session in Setting:', err);
  }

  cookieStore.set('auth_session_id', sessionId, {
    maxAge: 60 * 60 * 24,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return sessionId;
}

/**
 * 🚪 Hapus Sesi Perangkat Saat User Logout Resmi
 */
export async function clearDeviceSession(userId: string): Promise<void> {
  try {
    await prisma.setting.delete({
      where: { key: `active_session_${userId}` },
    }).catch(() => {});
  } catch (e) {
    console.warn('Non-fatal error clearing device session:', e);
  }

  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_session_id');
  } catch {}
}

/**
 * 💓 Perbarui Heartbeat Sesi Aktif
 */
export async function touchDeviceSession(userId: string): Promise<void> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: `active_session_${userId}` },
    });
    if (!setting?.value) return;

    const parsed = JSON.parse(setting.value);
    parsed.lastActive = Date.now();

    await prisma.setting.update({
      where: { key: `active_session_${userId}` },
      data: { value: JSON.stringify(parsed) },
    });
  } catch {}
}

/**
 * ⚡ Paksa Reset / Putuskan Sesi Perangkat (Kewenangan Admin / Pengawas Ruangan)
 */
export async function forceResetUserDeviceSession(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.setting.delete({
      where: { key: `active_session_${userId}` },
    }).catch(() => {});
    return { success: true, message: 'Sesi perangkat berhasil direset. User sekarang dapat login di perangkat baru.' };
  } catch {
    return { success: false, message: 'Gagal mereset sesi perangkat.' };
  }
}
