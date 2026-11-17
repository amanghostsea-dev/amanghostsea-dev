'use server';

import prisma from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isClassTargetMatch, formatClassTargetDisplay, isExamTokenActive } from '@/lib/cbt-schedule';
import {
  checkActiveDeviceSession,
  registerDeviceSession,
  clearDeviceSession,
  DeviceSessionData
} from '@/lib/device-session';

function cleanString(str?: string | null): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNameMatch(dbName: string, inputName: string): boolean {
  const a = cleanString(dbName);
  const b = cleanString(inputName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(' ').filter(Boolean);
  const wordsB = b.split(' ').filter(Boolean);
  const matchedWords = wordsB.filter((w) => wordsA.includes(w));
  return matchedWords.length >= Math.min(2, wordsB.length);
}

/**
 * 🔍 Live Lookup Identitas Siswa saat mengetik NISN atau Nama
 */
export async function lookupStudentIdentityAction(query: string) {
  const q = query.trim();
  if (!q || q.length < 3) return { success: false };

  try {
    const user = await prisma.user.findFirst({
      where: {
        role: 'Siswa',
        status: 'Aktif',
        OR: [
          { nisn: { equals: q, mode: 'insensitive' } },
          { username: { equals: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        nisn: true,
        username: true,
        studentClass: true,
      },
    });

    if (!user) return { success: false };

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

    return {
      success: true,
      student: {
        id: user.id,
        name: user.name,
        nisn: user.nisn || user.username,
        username: user.username,
        studentClass,
      },
    };
  } catch {
    return { success: false };
  }
}

export interface VerifiedStudentData {
  id: string;
  name: string;
  nisn: string;
  username: string;
  studentClass: string;
  majorName: string;
}

export interface VerifiedExamData {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  roomName: string;
}

export interface WrongRoomDetails {
  examTitle: string;
  examSubject: string;
  targetClass: string;
  studentClass: string;
}

/**
 * 🛡️ Verifikasi dan Pencocokan Ketat Kredensial Siswa (Kartu Login) & Token Ujian
 * Siswa WAJIB login dengan kredensial kartu ujian (Username/NISN + Password).
 * Jika password salah, user tidak aktif, atau kelas salah (salah kamar), akses DITOLAK!
 */
export async function verifyAndPrepareExamJoinAction(params: {
  usernameOrNisn?: string;
  password?: string;
  token?: string;
  authenticatedUserId?: string;
  nisn?: string;
  studentName?: string;
}): Promise<{
  success: boolean;
  error?: string;
  errorType?: 'WRONG_ROOM' | 'NOT_FOUND' | 'MISMATCH' | 'INVALID_TOKEN' | 'INVALID_PASSWORD' | 'DEVICE_CONFLICT' | 'GENERAL';
  wrongRoomDetails?: WrongRoomDetails;
  student?: VerifiedStudentData;
  exam?: VerifiedExamData | null;
  token?: string;
  isDeviceConflict?: boolean;
  conflictData?: DeviceSessionData;
}> {
  const inputIdentifier = (params.usernameOrNisn || params.nisn || '').trim();
  const inputPassword = (params.password || '').trim();
  const inputToken = (params.token || '').trim().toUpperCase();

  try {
    let matchedUser = null;

    // 1. Jika siswa SUDAH login resmi dengan session terverifikasi
    if (params.authenticatedUserId) {
      matchedUser = await prisma.user.findFirst({
        where: {
          id: params.authenticatedUserId,
          role: 'Siswa',
          status: 'Aktif',
        },
      });

      if (!matchedUser) {
        return {
          success: false,
          error: 'Sesi login Anda telah berakhir. Silakan login kembali menggunakan kartu ujian Anda.',
        };
      }
    } else {
      // 2. Siswa BELUM login: WAJIB memasukkan Username/NISN dan Password dari Kartu Login
      if (!inputIdentifier) {
        return {
          success: false,
          error: 'Harap masukkan Username atau NISN sesuai yang tertera pada Kartu Login Siswa Anda.',
        };
      }

      if (!inputPassword) {
        return {
          success: false,
          error: 'Harap masukkan Password akun sesuai yang tertera pada Kartu Login Siswa Anda.',
        };
      }

      // Cari user berdasarkan NISN atau Username
      matchedUser = await prisma.user.findFirst({
        where: {
          role: 'Siswa',
          status: 'Aktif',
          OR: [
            { username: { equals: inputIdentifier, mode: 'insensitive' } },
            { nisn: { equals: inputIdentifier, mode: 'insensitive' } },
          ],
        },
      });

      if (!matchedUser) {
        return {
          success: false,
          error: `Akun siswa "${inputIdentifier}" tidak ditemukan di database siswa aktif. Pastikan Username atau NISN sesuai Kartu Login Siswa Anda.`,
        };
      }

      // 🔐 VALIDASI KREDENSIAL PASSWORD KARTU LOGIN
      if (matchedUser.password !== inputPassword) {
        return {
          success: false,
          errorType: 'INVALID_PASSWORD',
          error: 'Password akun salah! Silakan periksa kembali Password yang tertera pada Kartu Login & Peserta Ujian Anda.',
        };
      }

      // 🛡️ CEK SINGLE-DEVICE LOGIN: Pastikan akun tidak sedang aktif di perangkat lain
      const cookieStore = await cookies();
      const currentSessionId = cookieStore.get('auth_session_id')?.value;
      const sessionCheck = await checkActiveDeviceSession(matchedUser.id, currentSessionId);
      if (sessionCheck.hasActiveSession && sessionCheck.sessionData) {
        return {
          success: false,
          errorType: 'DEVICE_CONFLICT',
          isDeviceConflict: true,
          conflictData: sessionCheck.sessionData,
          error: `Akun Anda sedang aktif di perangkat lain (${sessionCheck.sessionData.deviceName}). Login bersamaan ditolak.`,
        };
      }
    }

    // 3. Ambil data kelas resmi siswa: UTAMAKAN DARI User.studentClass (Master Akun di Database)
    let studentClass = matchedUser.studentClass?.trim() || '';

    // Jika belum ada di User, ambil dari database rapor StudentGrade
    if (!studentClass) {
      const gradeRecord = await prisma.studentGrade.findFirst({
        where: {
          OR: [
            { studentName: { equals: matchedUser.name, mode: 'insensitive' } },
            ...(matchedUser.nisn ? [{ studentNis: matchedUser.nisn }] : []),
            { studentNis: matchedUser.username },
          ],
        },
        select: { studentClass: true },
      });
      if (gradeRecord?.studentClass?.trim()) {
        studentClass = gradeRecord.studentClass.trim();
      }
    }

    // Jika belum ada, cek riwayat pengerjaan ujian siswa (ExamAttempt)
    if (!studentClass) {
      const prevAttempt = await prisma.examAttempt.findFirst({
        where: {
          OR: [
            { studentName: matchedUser.name },
            ...(matchedUser.nisn ? [{ studentNis: matchedUser.nisn }] : []),
          ],
          studentClass: { not: null },
        },
        select: { studentClass: true },
        orderBy: { startedAt: 'desc' },
      });
      if (prevAttempt?.studentClass?.trim()) {
        studentClass = prevAttempt.studentClass.trim();
      }
    }

    // Jika masih kosong, coba ambil dari session cookie auth_class
    if (!studentClass) {
      try {
        const cookieStore = await cookies();
        const cookieClass = cookieStore.get('auth_class')?.value?.trim();
        if (cookieClass) {
          studentClass = cookieClass;
        }
      } catch { }
    }

    // Fallback jika sama sekali belum memiliki kelas
    if (!studentClass) {
      const activeJurusans = await prisma.jurusan.findMany({
        orderBy: { code: 'asc' },
        select: { code: true },
      });
      studentClass = `X ${activeJurusans[0]?.code || 'TJKT'} 1`;
    }

    // Sinkronkan kembali ke User.studentClass jika di User masih kosong
    if (matchedUser && !matchedUser.studentClass && studentClass) {
      try {
        await prisma.user.update({
          where: { id: matchedUser.id },
          data: { studentClass },
        });
      } catch (syncErr) {
        console.error('Error auto-syncing studentClass to User:', syncErr);
      }
    }

    // Sinkronkan cookie auth_class agar selalu konsisten dengan database
    try {
      const cookieStore = await cookies();
      cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24 });
    } catch { }

    // Identifikasi nama jurusan dari kelas
    const classParts = studentClass.split(' ');
    const majorCode = classParts.length >= 2 ? classParts[1] : '';
    const jurusanRecord = majorCode
      ? await prisma.jurusan.findFirst({
        where: { code: { equals: majorCode, mode: 'insensitive' } },
        select: { name: true },
      })
      : null;
    const majorName = jurusanRecord?.name || (majorCode ? `Jurusan ${majorCode}` : 'Program Keahlian SMK');

    // 4. Verifikasi Token Ujian jika token diisi
    let targetExam: VerifiedExamData | null = null;
    if (inputToken) {
      const candidates = await prisma.exam.findMany({
        where: {
          status: { in: ['PUBLISHED', 'ACTIVE'] },
        },
        select: {
          id: true,
          title: true,
          subject: true,
          classTarget: true,
          duration: true,
          token: true,
          roomName: true,
          startTime: true,
          endTime: true,
          status: true,
          updatedAt: true,
        },
      });

      const matchedExam = candidates.find((exam) => {
        if (!exam.token) return false;
        const allowedTokens = exam.token
          .split('|')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
        return allowedTokens.includes(inputToken);
      });

      if (!matchedExam) {
        return {
          success: false,
          error: `Token ujian "${inputToken}" tidak valid atau tidak terdaftar. Silakan periksa kembali token di papan tulis kelas Anda.`,
        };
      }

      // ⏰ CEK APAKAH TOKEN AKTIF & BELUM KADALUARSA
      const tokenCheck = isExamTokenActive(matchedExam);
      if (!tokenCheck.isActive) {
        if (tokenCheck.isExpired) {
          return {
            success: false,
            errorType: 'INVALID_TOKEN',
            error: `Waktu pengerjaan ujian telah berakhir dan token "${inputToken}" telah otomatis dinonaktifkan. Silakan hubungi pengawas ujian jika Anda dijadwalkan mengikuti ujian susulan.`,
          };
        }
        return {
          success: false,
          errorType: 'INVALID_TOKEN',
          error: `Sesi ujian untuk token "${inputToken}" belum diaktifkan oleh pengawas di ruang ujian. Silakan tunggu pengawas merilis token.`,
        };
      }

      // 🔒 VERIFIKASI KELAS & JURUSAN (ANTI SALAH KAMAR & BOCOR SOAL)
      if (studentClass) {
        const isClassAllowed = isClassTargetMatch(matchedExam.classTarget, studentClass);
        if (!isClassAllowed) {
          const targetDisplay = formatClassTargetDisplay(matchedExam.classTarget, true);
          return {
            success: false,
            errorType: 'WRONG_ROOM',
            error: `Salah Kamar Ujian: Token ini khusus untuk ${targetDisplay}, sedangkan Anda terdaftar di kelas "${studentClass}".`,
            wrongRoomDetails: {
              examTitle: matchedExam.title,
              examSubject: matchedExam.subject,
              targetClass: targetDisplay,
              studentClass: studentClass,
            },
          };
        }
      }

      targetExam = {
        id: matchedExam.id,
        title: matchedExam.title,
        subject: matchedExam.subject,
        classTarget: matchedExam.classTarget,
        duration: matchedExam.duration,
        roomName: matchedExam.roomName || 'Ruang CBT',
      };
    }

    return {
      success: true,
      student: {
        id: matchedUser.id,
        name: matchedUser.name,
        nisn: matchedUser.nisn || matchedUser.username,
        username: matchedUser.username,
        studentClass,
        majorName,
      },
      exam: targetExam,
      token: inputToken,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memvalidasi data siswa.';
    return { success: false, error: msg };
  }
}

/**
 * 🚀 Konfirmasi Final & Masuk ke Ruang Ujian Siswa
 */
export async function confirmAndJoinExamAction(params: {
  userId: string;
  examId?: string | null;
}) {
  const cookieStore = await cookies();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  });

  if (!user || user.role !== 'Siswa' || user.status !== 'Aktif') {
    return { error: 'Verifikasi gagal: Akun siswa tidak ditemukan atau berstatus tidak aktif.' };
  }

  // Ambil kelas resmi siswa: Utamakan dari User.studentClass
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

  // Simpan session cookies terverifikasi resmi
  cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_token', 'Siswa', { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24 });

  // 🛡️ Daftarkan sesi perangkat siswa
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || 'Browser Web';
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';
  await registerDeviceSession(user.id, user.name, user.role, userAgent, ip);

  // 🔒 Jika examId ditentukan, pastikan siswa memang berhak mengakses paket ujian ini
  if (params.examId && studentClass) {
    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
      select: { id: true, title: true, subject: true, classTarget: true },
    });

    if (exam) {
      const isClassAllowed = isClassTargetMatch(exam.classTarget, studentClass);
      if (!isClassAllowed) {
        return {
          error: `Salah Kamar Ujian: Paket ujian ini khusus untuk ${formatClassTargetDisplay(exam.classTarget, true)}. Anda di kelas "${studentClass}".`,
        };
      }
    }
  }

  if (params.examId) {
    redirect(`/portal/siswa/cbt/${params.examId}`);
  } else {
    redirect('/portal/siswa/cbt');
  }
}

/**
 * 🔑 Login Langsung Siswa ke Portal Siswa dari Gerbang Ujian
 */
export async function studentDirectLoginAction(formData: FormData) {
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();

  if (!username || !password) {
    return { error: 'Username/NISN dan Password wajib diisi!' };
  }

  const user = await prisma.user.findFirst({
    where: {
      role: 'Siswa',
      status: 'Aktif',
      OR: [
        { username: { equals: username, mode: 'insensitive' } },
        { nisn: { equals: username, mode: 'insensitive' } },
      ],
    },
  });

  if (!user || user.password !== password) {
    return { error: 'Username atau password salah! Periksa kembali kartu login Anda.' };
  }

  // 🛡️ CEK SINGLE-DEVICE LOGIN: Pastikan akun tidak sedang aktif di perangkat lain
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get('auth_session_id')?.value;
  const sessionCheck = await checkActiveDeviceSession(user.id, currentSessionId);
  if (sessionCheck.hasActiveSession && sessionCheck.sessionData) {
    return {
      error: `Akun Anda sedang aktif di perangkat lain (${sessionCheck.sessionData.deviceName}). Login bersamaan ditolak.`,
      isDeviceConflict: true,
      conflictData: sessionCheck.sessionData,
    };
  }

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

  cookieStore.set('auth_token', 'Siswa', { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24 });

  // Daftarkan sesi perangkat baru
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || 'Browser Web';
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';
  await registerDeviceSession(user.id, user.name, user.role, userAgent, ip);

  redirect('/portal/siswa/cbt');
}

/**
 * 🚪 Logout Siswa dari Gerbang Ujian (Misal saat berganti akun di komputer lab bersama)
 */
export async function studentGatewayLogoutAction() {
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
    } catch { }
  }

  cookieStore.delete('auth_token');
  cookieStore.delete('auth_user');
  cookieStore.delete('auth_name');
  cookieStore.delete('auth_class');
  cookieStore.delete('auth_session_id');
  redirect('/ujian');
}

/**
 * ⚡ Legacy quickJoinExamAction (diperketat dengan validasi database yang sama)
 */
export async function quickJoinExamAction(formData: FormData) {
  const nisn = (formData.get('nisn') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();
  const token = (formData.get('token') as string || '').trim().toUpperCase();

  const verifyRes = await verifyAndPrepareExamJoinAction({
    usernameOrNisn: nisn,
    password,
    token,
  });

  if (!verifyRes.success || !verifyRes.student) {
    return { error: verifyRes.error || 'Data siswa atau kredensial kartu tidak valid.' };
  }

  return await confirmAndJoinExamAction({
    userId: verifyRes.student.id,
    examId: verifyRes.exam?.id || null,
  });
}
