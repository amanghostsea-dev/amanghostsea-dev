'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
      },
    });

    if (!user) return { success: false };

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

    const studentClass = grade?.studentClass || 'XI TJKT 1';

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

/**
 * 🛡️ Verifikasi dan Pencocokan Ketat Data Siswa & Token Ujian
 * Jika data Nama/NISN tidak cocok dengan database, kembalikan notifikasi error spesifik dan BLOKIR login!
 */
export async function verifyAndPrepareExamJoinAction(params: {
  nisn?: string;
  studentName?: string;
  token?: string;
}): Promise<{
  success: boolean;
  error?: string;
  student?: VerifiedStudentData;
  exam?: VerifiedExamData | null;
  token?: string;
}> {
  const inputNisn = (params.nisn || '').trim();
  const inputName = (params.studentName || '').trim();
  const inputToken = (params.token || '').trim().toUpperCase();

  if (!inputNisn && !inputName) {
    return {
      success: false,
      error: 'Harap masukkan NISN atau Nama Lengkap siswa sesuai kartu peserta ujian.',
    };
  }

  try {
    let matchedUser = null;

    // 1. Jika NISN diisi, verifikasi keberadaan NISN di database siswa aktif
    if (inputNisn) {
      matchedUser = await prisma.user.findFirst({
        where: {
          role: 'Siswa',
          status: 'Aktif',
          OR: [
            { nisn: { equals: inputNisn, mode: 'insensitive' } },
            { username: { equals: inputNisn, mode: 'insensitive' } },
          ],
        },
      });

      if (!matchedUser) {
        return {
          success: false,
          error: `NISN "${inputNisn}" tidak ditemukan di database siswa aktif sekolah. Pastikan nomor NISN sesuai kartu login ujian Anda.`,
        };
      }

      // Jika Nama Lengkap juga diisi, cocokkan apakah nama sesuai dengan pemilik NISN tersebut
      if (inputName && !isNameMatch(matchedUser.name, inputName)) {
        return {
          success: false,
          error: `Data Tidak Sesuai: NISN ${inputNisn} terdaftar resmi atas nama "${matchedUser.name}", bukan "${inputName}". Harap periksa kembali kartu ujian Anda.`,
        };
      }
    } else if (inputName) {
      // 2. Jika hanya Nama diisi, cari kecocokan di database
      matchedUser = await prisma.user.findFirst({
        where: {
          role: 'Siswa',
          status: 'Aktif',
          name: { equals: inputName, mode: 'insensitive' },
        },
      });

      // Coba pencarian partial jika nama lengkap memiliki singkatan/spasi berbeda
      if (!matchedUser) {
        const candidates = await prisma.user.findMany({
          where: {
            role: 'Siswa',
            status: 'Aktif',
            name: { contains: inputName, mode: 'insensitive' },
          },
          take: 3,
        });

        if (candidates.length === 1) {
          matchedUser = candidates[0];
        } else if (candidates.length > 1) {
          return {
            success: false,
            error: `Ditemukan beberapa nama yang mirip (${candidates.map((c) => c.name).join(', ')}). Mohon sertakan nomor NISN Anda agar data terkonfirmasi presisi.`,
          };
        }
      }

      if (!matchedUser) {
        return {
          success: false,
          error: `Nama siswa "${inputName}" tidak terdaftar di database siswa aktif. Pastikan ejaan nama atau NISN sesuai dengan kartu ujian Anda.`,
        };
      }
    }

    if (!matchedUser) {
      return {
        success: false,
        error: 'Data siswa (Nama/NISN) salah atau tidak ditemukan di database. Anda tidak dapat masuk ke ruang ujian CBT.',
      };
    }

    // 3. Ambil data kelas resmi siswa dari database rapor StudentGrade
    const gradeRecord = await prisma.studentGrade.findFirst({
      where: {
        OR: [
          { studentName: matchedUser.name },
          ...(matchedUser.nisn ? [{ studentNis: matchedUser.nisn }] : []),
          { studentNis: matchedUser.username },
        ],
      },
      select: { studentClass: true },
    });

    let studentClass = gradeRecord?.studentClass;
    if (!studentClass) {
      const activeJurusans = await prisma.jurusan.findMany({
        orderBy: { code: 'asc' },
        select: { code: true },
      });
      studentClass = `XI ${activeJurusans[0]?.code || 'TJKT'} 1`;
    }

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
          error: `Token ujian "${inputToken}" tidak valid atau sesi ujian belum diaktifkan oleh pengawas. Silakan mintakan token aktif ke pengawas ujian Anda.`,
        };
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

  // Ambil kelas resmi siswa
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

  const studentClass = grade?.studentClass || 'XI TJKT 1';

  // Simpan session cookies terverifikasi resmi
  cookieStore.set('auth_name', user.name, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_user', user.username, { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_token', 'Siswa', { maxAge: 60 * 60 * 24 });
  cookieStore.set('auth_class', studentClass, { maxAge: 60 * 60 * 24 });

  if (params.examId) {
    redirect(`/portal/siswa/cbt/${params.examId}`);
  } else {
    redirect('/portal/siswa/cbt');
  }
}

/**
 * ⚡ Legacy quickJoinExamAction (diperketat dengan validasi database yang sama)
 */
export async function quickJoinExamAction(formData: FormData) {
  const nisn = (formData.get('nisn') as string || '').trim();
  const studentName = (formData.get('studentName') as string || '').trim();
  const token = (formData.get('token') as string || '').trim().toUpperCase();

  const verifyRes = await verifyAndPrepareExamJoinAction({
    nisn,
    studentName,
    token,
  });

  if (!verifyRes.success || !verifyRes.student) {
    return { error: verifyRes.error || 'Data siswa tidak valid.' };
  }

  return await confirmAndJoinExamAction({
    userId: verifyRes.student.id,
    examId: verifyRes.exam?.id || null,
  });
}
