'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { isClassOverlap, CbtTimezone, DEFAULT_CBT_TIMEZONE, parseDateTimeInputToIso } from '@/lib/cbt-schedule';
import { isReligiousVariantParallel, normalizeReligion } from '@/lib/cbt-religion';
import { getKopSuratConfig, getWebSettings, getCbtTimezone } from '@/lib/settings';
import { getDynamicClassTargets, ensureDefaultJurusans } from '@/lib/jurusan-service';
import { clearDeviceSession } from '@/lib/device-session';
import type { KopSuratConfig } from '@/app/admin/settings/types';

function toSafeDateInTimezone(val?: string | Date | null, tz: CbtTimezone = 'WITA'): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const iso = parseDateTimeInputToIso(val, tz);
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: Generate clean 6-character alphanumeric token without confusing symbols (0, O, 1, I)
function generateRandomCbtToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// 🔄 Rotate token periodically (every 5 mins or manual refresh by teacher)
export async function rotateExamToken(id: string, customToken?: string) {
  try {
    const current = await prisma.exam.findUnique({
      where: { id },
      select: {
        token: true,
        status: true,
        startTime: true,
        endTime: true,
        roomName: true,
        classTarget: true,
        targetReligion: true,
      },
    });

    if (!current) {
      return { error: 'Ujian tidak ditemukan.' };
    }

    const currentPrimary = current.token ? current.token.split('|')[0].trim() : '';
    const nextToken = customToken?.trim().toUpperCase() || generateRandomCbtToken();

    // Store new token and keep old primary as fallback for grace period (graceful rotation)
    const combinedToken = currentPrimary && currentPrimary !== nextToken
      ? `${nextToken}|${currentPrimary}`
      : nextToken;

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        token: combinedToken,
      },
    });

    // 🕌 Sinkronisasi Token Otomatis untuk Varian Agama Serentak:
    // Jika ujian ini adalah varian agama (targetReligion !== 'ALL'), cari ujian varian agama lain
    // di ruangan dan waktu yang sama, lalu samakan tokennya secara otomatis!
    if (current.targetReligion && current.targetReligion !== 'ALL' && current.startTime && current.endTime) {
      await prisma.exam.updateMany({
        where: {
          id: { not: id },
          status: { not: 'ARCHIVED' },
          targetReligion: { not: 'ALL' },
          startTime: current.startTime,
          endTime: current.endTime,
          roomName: current.roomName,
        },
        data: {
          token: combinedToken,
        },
      });
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${id}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${id}`);
    revalidatePath('/ujian');

    return {
      success: true,
      displayToken: nextToken,
      token: combinedToken,
      updatedAt: updated.updatedAt,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleExamSession(id: string, openSession: boolean, customToken?: string) {
  try {
    const current = await prisma.exam.findUnique({
      where: { id },
      select: {
        token: true,
        status: true,
        startTime: true,
        endTime: true,
        roomName: true,
        classTarget: true,
        targetReligion: true,
      },
    });

    if (!current) {
      return { error: 'Ujian tidak ditemukan.' };
    }

    let token = customToken?.trim().toUpperCase();
    if (openSession && !token) {
      const currentPrimary = current?.token ? current.token.split('|')[0].trim() : '';
      token = currentPrimary || generateRandomCbtToken();
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        status: openSession ? 'ACTIVE' : 'PUBLISHED',
        updatedAt: new Date(),
        ...(token ? { token } : {}),
      },
    });

    // 🕌 Sinkronisasi Sesi & Token Otomatis untuk Varian Agama Serentak di Ruang yang Sama
    if (current.targetReligion && current.targetReligion !== 'ALL' && current.startTime && current.endTime) {
      await prisma.exam.updateMany({
        where: {
          id: { not: id },
          status: { not: 'ARCHIVED' },
          targetReligion: { not: 'ALL' },
          startTime: current.startTime,
          endTime: current.endTime,
          roomName: current.roomName,
        },
        data: {
          status: openSession ? 'ACTIVE' : 'PUBLISHED',
          updatedAt: new Date(),
          ...(token ? { token } : {}),
        },
      });
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${id}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${id}`);
    revalidatePath('/ujian');
    return {
      success: true,
      data: {
        ...updated,
        displayToken: updated.token ? updated.token.split('|')[0].trim() : '',
      }
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export interface ScheduleConflictExam {
  id: string;
  title: string;
  subject: string;
  classTarget: string;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  targetReligion?: string | null;
}

/**
 * 🛡️ Anti-Collision Schedule Checker
 * Detects if an exam schedule overlaps with existing active exams for the same class
 * Mendukung pengecualian cerdas untuk varian agama paralel (misal PAI & PAK serentak di kelas yang sama)
 */
export async function checkExamScheduleConflict(params: {
  examId?: string;
  classTarget: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  targetReligion?: string | null;
}) {
  try {
    if (!params.startTime || !params.endTime) {
      return { hasConflict: false, conflicts: [] };
    }

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { hasConflict: false, conflicts: [] };
    }

    if (start >= end) {
      return {
        hasConflict: true,
        conflicts: [],
        message: 'Jadwal Mulai harus lebih awal dari Jadwal Selesai.',
      };
    }

    // Overlap condition: existing.startTime < newEnd && existing.endTime > newStart
    // Ambil seluruh kandidat ujian aktif pada rentang waktu ini, lalu uji overlap kelas & jurusan secara cerdas
    const timeCandidates = await prisma.exam.findMany({
      where: {
        ...(params.examId ? { id: { not: params.examId } } : {}),
        status: { not: 'ARCHIVED' },
        startTime: { not: null, lt: end },
        endTime: { not: null, gt: start },
      },
      select: {
        id: true,
        title: true,
        subject: true,
        classTarget: true,
        startTime: true,
        endTime: true,
        duration: true,
        targetReligion: true,
      },
    });

    const conflicting = timeCandidates.filter((c) => {
      // 1. Uji apakah kelas / rombel beririsan
      const overlapsClass = isClassOverlap(c.classTarget, params.classTarget);
      if (!overlapsClass) return false;

      // 2. 🕌 Smart Exemption Varian Agama Paralel:
      // Jika dua ujian memiliki target agama spesifik yang berbeda (misal yang satu Islam dan yang satu Kristen),
      // maka ini BUKAN BENTROK karena memang sengaja dijadwalkan bersamaan untuk siswa yang berbeda agama.
      if (isReligiousVariantParallel(c.targetReligion, params.targetReligion)) {
        return false;
      }

      return true;
    });

    if (conflicting.length > 0) {
      return {
        hasConflict: true,
        conflicts: conflicting,
        message: `Terdeteksi ${conflicting.length} jadwal ujian yang bentrok untuk kelas ${params.classTarget}!`,
      };
    }

    return { hasConflict: false, conflicts: [] };
  } catch (error: any) {
    return { error: error.message, hasConflict: false, conflicts: [] };
  }
}

export async function createExam(data: {
  title: string;
  subject: string;
  classTarget: string;
  duration: number;
  token?: string;
  description?: string;
  status?: string;
  shuffleQuestions?: boolean;
  authorName?: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  allowConflict?: boolean;
  targetReligion?: string | null;
  proctorId?: string | null;
  proctorName?: string | null;
  proctorNip?: string | null;
  proctor2Id?: string | null;
  proctor2Name?: string | null;
  roomName?: string | null;
}) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const userName = cookieStore.get('auth_name')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    // Guru otomatis terikat ke nama akun login miliknya sendiri; Super Admin bebas menentukan authorName
    const finalAuthorName = isSuperAdmin
      ? (data.authorName?.trim() || userName || 'Admin Utama')
      : (userName || data.authorName || 'Guru Pengampu');

    if (data.startTime && data.endTime && !data.allowConflict) {
      const conflictCheck = await checkExamScheduleConflict({
        classTarget: data.classTarget || 'Semua Kelas',
        startTime: data.startTime,
        endTime: data.endTime,
        targetReligion: data.targetReligion || 'ALL',
      });

      if (conflictCheck.hasConflict && conflictCheck.conflicts.length > 0) {
        return {
          error: conflictCheck.message || 'Jadwal ujian bentrok dengan ujian lain!',
          conflict: true,
          conflicts: conflictCheck.conflicts,
        };
      }
    }

    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        subject: data.subject,
        classTarget: data.classTarget || 'Semua Kelas',
        duration: Number(data.duration) || 60,
        token: data.token?.trim() || null,
        description: data.description || null,
        status: data.status || 'PUBLISHED',
        shuffleQuestions: data.shuffleQuestions ?? true,
        authorName: finalAuthorName,
        startTime: toSafeDateInTimezone(data.startTime),
        endTime: toSafeDateInTimezone(data.endTime),
        targetReligion: data.targetReligion || 'ALL',
        proctorId: data.proctorId ?? null,
        proctorName: data.proctorName?.trim() || null,
        proctorNip: data.proctorNip?.trim() || null,
        proctor2Id: data.proctor2Id ?? null,
        proctor2Name: data.proctor2Name?.trim() || null,
        roomName: data.roomName?.trim() || 'Ruang Utama',
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/pengawas/cbt');
    return { success: true, data: exam };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateExam(
  id: string,
  data: {
    title?: string;
    subject?: string;
    classTarget?: string;
    duration?: number;
    token?: string;
    description?: string;
    status?: string;
    shuffleQuestions?: boolean;
    authorName?: string;
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    allowConflict?: boolean;
    targetReligion?: string | null;
    proctorId?: string | null;
    proctorName?: string | null;
    proctorNip?: string | null;
    proctor2Id?: string | null;
    proctor2Name?: string | null;
    roomName?: string | null;
  }
) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const userName = cookieStore.get('auth_name')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return { error: 'Paket ujian tidak ditemukan.' };
    }

    // Otorisasi: Guru hanya boleh mengubah paket ujian miliknya sendiri
    if (!isSuperAdmin && existingExam.authorName && userName) {
      const a = existingExam.authorName.trim().toLowerCase();
      const u = userName.trim().toLowerCase();
      if (a !== u && !a.includes(u) && !u.includes(a)) {
        return { error: 'Akses ditolak: Anda hanya dapat mengubah paket ujian milik Anda sendiri.' };
      }
    }

    if (data.startTime && data.endTime && !data.allowConflict) {
      const targetClass =
        data.classTarget ||
        (await prisma.exam.findUnique({ where: { id }, select: { classTarget: true } }))?.classTarget ||
        'Semua Kelas';

      const conflictCheck = await checkExamScheduleConflict({
        examId: id,
        classTarget: targetClass,
        startTime: data.startTime,
        endTime: data.endTime,
        targetReligion: data.targetReligion !== undefined ? data.targetReligion : existingExam.targetReligion,
      });

      if (conflictCheck.hasConflict && conflictCheck.conflicts.length > 0) {
        return {
          error: conflictCheck.message || 'Jadwal ujian bentrok dengan ujian lain!',
          conflict: true,
          conflicts: conflictCheck.conflicts,
        };
      }
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.subject && { subject: data.subject }),
        ...(data.classTarget && { classTarget: data.classTarget }),
        ...(data.duration && { duration: Number(data.duration) }),
        ...(data.token !== undefined && { token: data.token?.trim() || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(isSuperAdmin && data.authorName && { authorName: data.authorName.trim() }),
        ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
        ...(data.startTime !== undefined && { startTime: toSafeDateInTimezone(data.startTime) }),
        ...(data.endTime !== undefined && { endTime: toSafeDateInTimezone(data.endTime) }),
        ...(data.targetReligion !== undefined && { targetReligion: data.targetReligion || 'ALL' }),
        ...(data.proctorId !== undefined && { proctorId: data.proctorId }),
        ...(data.proctorName !== undefined && { proctorName: data.proctorName?.trim() || null }),
        ...(data.proctorNip !== undefined && { proctorNip: data.proctorNip?.trim() || null }),
        ...(data.proctor2Id !== undefined && { proctor2Id: data.proctor2Id }),
        ...(data.proctor2Name !== undefined && { proctor2Name: data.proctor2Name?.trim() || null }),
        ...(data.roomName !== undefined && { roomName: data.roomName?.trim() || 'Ruang Utama' }),
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${id}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${id}`);
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/pengawas/cbt');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 📦 Batch Update Exam Schedules (Kolektif)
 * Allows updating multiple exam start/end times at once with collision verification
 */
export async function batchUpdateExamSchedules(
  schedules: Array<{
    id: string;
    startTime: string | Date | null;
    endTime: string | Date | null;
  }>,
  allowConflict = false
) {
  try {
    if (!schedules || schedules.length === 0) {
      return { success: false, error: 'Tidak ada jadwal yang dipilih untuk diperbarui.' };
    }

    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const userName = cookieStore.get('auth_name')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    // 🔒 Otorisasi Ketat: Guru hanya dapat memperbarui jadwal paket ujian miliknya sendiri
    if (!isSuperAdmin) {
      const examIds = schedules.map((s) => s.id);
      const targetExams = await prisma.exam.findMany({
        where: { id: { in: examIds } },
        select: { id: true, title: true, authorName: true },
      });
      const cleanUser = userName ? userName.trim().toLowerCase() : '';
      for (const ex of targetExams) {
        const cleanAuthor = ex.authorName ? ex.authorName.trim().toLowerCase() : '';
        if (cleanAuthor && cleanUser && cleanAuthor !== cleanUser && !cleanAuthor.includes(cleanUser) && !cleanUser.includes(cleanAuthor)) {
          return { 
            error: `Akses ditolak: Anda tidak memiliki izin mengubah jadwal ujian "${ex.title}" milik ${ex.authorName}.` 
          };
        }
      }
    }

    // Validasi urutan waktu mulai dan selesai
    for (const item of schedules) {
      if (item.startTime && item.endTime) {
        const s = toSafeDateInTimezone(item.startTime);
        const e = toSafeDateInTimezone(item.endTime);
        if (s && e && s >= e) {
          return { error: 'Jadwal Mulai harus lebih awal daripada Jadwal Selesai.' };
        }
      }
    }

    // Step 1: Pre-validate conflicts if allowConflict is false
    if (!allowConflict) {
      for (const item of schedules) {
        if (item.startTime && item.endTime) {
          const exam = await prisma.exam.findUnique({
            where: { id: item.id },
            select: { id: true, title: true, classTarget: true, targetReligion: true },
          });
          if (exam) {
            const conflictCheck = await checkExamScheduleConflict({
              examId: item.id,
              classTarget: exam.classTarget,
              startTime: item.startTime,
              endTime: item.endTime,
              targetReligion: exam.targetReligion,
            });
            if (conflictCheck.hasConflict && conflictCheck.conflicts.length > 0) {
              return {
                error: `Ujian "${exam.title}" (${exam.classTarget}) bentrok dengan jadwal lain!`,
                conflict: true,
                conflicts: conflictCheck.conflicts,
              };
            }
          }
        }
      }
    }

    // Step 2: Apply updates
    const updatedExams = [];
    for (const item of schedules) {
      const updated = await prisma.exam.update({
        where: { id: item.id },
        data: {
          startTime: toSafeDateInTimezone(item.startTime),
          endTime: toSafeDateInTimezone(item.endTime),
        },
      });
      updatedExams.push(updated);
    }

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/siswa');
    return { success: true, count: updatedExams.length, data: updatedExams };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 📋 Batch Create Exams With Schedule
 * Allows creating multiple scheduled exams at once (e.g. from collective wizard or import)
 */
export async function batchCreateExamsWithSchedule(
  examsData: Array<{
    title: string;
    subject: string;
    classTarget: string;
    duration: number;
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    authorName?: string;
  }>
) {
  try {
    if (!examsData || examsData.length === 0) {
      return { success: false, error: 'Data paket ujian kosong.' };
    }

    const created = [];
    for (const item of examsData) {
      const token = generateRandomCbtToken();
      const exam = await prisma.exam.create({
        data: {
          title: item.title,
          subject: item.subject,
          classTarget: item.classTarget,
          duration: Number(item.duration) || 60,
          token: `${token}|${new Date().toISOString()}`,
          authorName: item.authorName || 'Guru Pengampu',
          status: 'PUBLISHED',
          shuffleQuestions: true,
          startTime: item.startTime ? new Date(item.startTime) : null,
          endTime: item.endTime ? new Date(item.endTime) : null,
        },
      });
      created.push(exam);
    }

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/siswa');
    return { success: true, count: created.length, data: created };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteExam(id: string) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const userName = cookieStore.get('auth_name')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return { error: 'Paket ujian tidak ditemukan.' };
    }

    // Otorisasi: Guru hanya boleh menghapus paket ujian miliknya sendiri; Super Admin bebas menghapus ujian apapun
    if (!isSuperAdmin && existingExam.authorName && userName) {
      const a = existingExam.authorName.trim().toLowerCase();
      const u = userName.trim().toLowerCase();
      if (a !== u && !a.includes(u) && !u.includes(a)) {
        return { error: 'Akses ditolak: Anda hanya dapat menghapus paket ujian milik Anda sendiri.' };
      }
    }

    await prisma.exam.delete({ where: { id } });
    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function verifyExamAuthorOrAdmin(examId: string) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('auth_token')?.value;
  const userName = cookieStore.get('auth_name')?.value;
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';
  if (isSuperAdmin) return { allowed: true };

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { authorName: true },
  });
  if (!exam) return { allowed: false, error: 'Paket ujian tidak ditemukan.' };

  if (exam.authorName && userName) {
    const a = exam.authorName.trim().toLowerCase();
    const u = userName.trim().toLowerCase();
    if (a === u || a.includes(u) || u.includes(a)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    error: 'Akses ditolak: Anda bertugas sebagai Pengawas dan tidak memiliki wewenang untuk menambah, mengubah, atau menghapus butir soal.'
  };
}

export async function createQuestion(data: {
  examId: string;
  questionText: string;
  imageUrl?: string | null;
  options: string[];
  correctAnswer: string;
  points?: number;
}) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(data.examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    // Ambil order terakhir & total count agar soal baru berada persis di urutan paling bawah secara berurutan
    const [lastQuestion, currentCount] = await Promise.all([
      prisma.examQuestion.findFirst({
        where: { examId: data.examId },
        orderBy: [{ order: 'desc' }, { createdAt: 'desc' }],
        select: { order: true },
      }),
      prisma.examQuestion.count({
        where: { examId: data.examId },
      }),
    ]);
    const nextOrder = Math.max((lastQuestion?.order !== undefined && lastQuestion?.order !== null ? lastQuestion.order + 1 : 0), currentCount);

    const question = await prisma.examQuestion.create({
      data: {
        examId: data.examId,
        questionText: data.questionText,
        imageUrl: data.imageUrl?.trim() || null,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        points: Number(data.points) || 10,
        order: nextOrder,
      },
    });

    revalidatePath(`/admin/cbt/${data.examId}`);
    return { success: true, data: question };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createBatchQuestions(
  examId: string,
  questions: Array<{
    questionText: string;
    imageUrl?: string | null;
    options: string[];
    correctAnswer: string;
    points?: number;
  }>
) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    if (!questions || questions.length === 0) {
      return { error: 'Daftar butir soal tidak boleh kosong.' };
    }

    const [lastQuestion, currentCount] = await Promise.all([
      prisma.examQuestion.findFirst({
        where: { examId },
        orderBy: [{ order: 'desc' }, { createdAt: 'desc' }],
        select: { order: true },
      }),
      prisma.examQuestion.count({
        where: { examId },
      }),
    ]);
    const baseOrder = Math.max((lastQuestion?.order !== undefined && lastQuestion?.order !== null ? lastQuestion.order + 1 : 0), currentCount);

    const created = await prisma.$transaction(
      questions.map((q, idx) =>
        prisma.examQuestion.create({
          data: {
            examId,
            questionText: q.questionText.trim(),
            imageUrl: q.imageUrl?.trim() || null,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            points: Number(q.points) || 10,
            order: baseOrder + idx,
          },
        })
      )
    );

    revalidatePath(`/admin/cbt/${examId}`);
    revalidatePath('/admin/cbt');
    revalidatePath(`/portal/siswa/cbt/${examId}`);
    return { success: true, count: created.length, data: created };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateQuestion(
  questionId: string,
  examId: string,
  data: {
    questionText?: string;
    imageUrl?: string | null;
    options?: string[];
    correctAnswer?: string;
    points?: number;
  }
) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    const updated = await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.questionText !== undefined && { questionText: data.questionText.trim() }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() || null }),
        ...(data.options !== undefined && { options: JSON.stringify(data.options) }),
        ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        ...(data.points !== undefined && { points: Number(data.points) }),
      },
    });

    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteQuestion(questionId: string, examId: string) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    await prisma.examQuestion.delete({ where: { id: questionId } });
    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🗑️ Hapus Butir Soal Terpilih Secara Kolektif (Bulk Delete Questions)
 */
export async function deleteBulkQuestions(questionIds: string[], examId: string) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    if (!questionIds || questionIds.length === 0) {
      return { error: 'Tidak ada butir soal yang dipilih untuk dihapus.' };
    }

    const res = await prisma.examQuestion.deleteMany({
      where: {
        id: { in: questionIds },
        examId: examId,
      },
    });

    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true, count: res.count };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🗑️ Hapus Semua Butir Soal Sekaligus (Reset All Questions)
 */
export async function deleteAllQuestions(examId: string) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    const res = await prisma.examQuestion.deleteMany({
      where: { examId: examId },
    });

    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true, count: res.count };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⚡ Bagi Rata Nilai Soal Otomatis (Auto-Distribute Question Points)
 * Contoh: 40 butir soal dengan target nilai total 100 -> otomatis 2.5 poin per butir soal.
 */
export async function autoDistributeExamPointsAction(
  examId: string,
  targetTotalPoints: number = 100
) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error };
    }

    if (!targetTotalPoints || targetTotalPoints <= 0) {
      return { success: false, error: 'Target nilai total harus lebih besar dari 0.' };
    }

    const questions = await prisma.examQuestion.findMany({
      where: { examId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    if (questions.length === 0) {
      return { success: false, error: 'Belum ada butir soal dalam ujian ini untuk dibagi nilainya.' };
    }

    const count = questions.length;
    // Calculate points per question rounded to 2 decimals (e.g. 100 / 40 = 2.5)
    const pointsPerQuestion = Math.round((targetTotalPoints / count) * 100) / 100;

    await prisma.$transaction(
      questions.map((q, idx) =>
        prisma.examQuestion.update({
          where: { id: q.id },
          data: {
            points: pointsPerQuestion,
            order: idx, // Normalisasi order agar urutan soal konsisten dan tidak acak
          },
        })
      )
    );

    revalidatePath(`/admin/cbt/${examId}`);
    revalidatePath('/admin/cbt');
    revalidatePath(`/portal/siswa/cbt/${examId}`);

    return {
      success: true,
      pointsPerQuestion,
      targetTotalPoints,
      totalQuestions: count,
      message: `Nilai berhasil dibagi rata! Setiap soal (${count} butir) kini bernilai ${pointsPerQuestion} poin (Total: ${Math.round(pointsPerQuestion * count * 100) / 100} poin).`,
    };
  } catch (error: any) {
    console.error('Error auto-distributing exam points:', error);
    return { success: false, error: error.message || 'Gagal membagikan nilai soal secara otomatis.' };
  }
}

/**
 * 🔢 Urutkan Ulang Butir Soal Berdasarkan Daftar ID (Batch Reorder Questions)
 */
export async function reorderExamQuestions(examId: string, orderedQuestionIds: string[]) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    if (!orderedQuestionIds || orderedQuestionIds.length === 0) {
      return { error: 'Daftar ID soal tidak valid.' };
    }

    await prisma.$transaction(
      orderedQuestionIds.map((id, index) =>
        prisma.examQuestion.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⬆️⬇️ Pindahkan Urutan Soal (Move Up / Down)
 */
export async function moveQuestionOrder(
  examId: string,
  questionId: string,
  direction: 'up' | 'down'
) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    const allQuestions = await prisma.examQuestion.findMany({
      where: { examId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: { id: true, order: true },
    });

    const currentIndex = allQuestions.findIndex((q) => q.id === questionId);
    if (currentIndex === -1) {
      return { error: 'Soal tidak ditemukan.' };
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allQuestions.length) {
      return { success: true }; // Sudah di posisi paling atas / bawah
    }

    // Tukar posisi di array
    const targetQuestion = allQuestions[targetIndex];
    const currentQuestion = allQuestions[currentIndex];

    // Simpan order baru di transaksi
    await prisma.$transaction([
      prisma.examQuestion.update({
        where: { id: currentQuestion.id },
        data: { order: targetIndex },
      }),
      prisma.examQuestion.update({
        where: { id: targetQuestion.id },
        data: { order: currentIndex },
      }),
    ]);

    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAttempt(attemptId: string, examId: string) {
  try {
    const authCheck = await verifyExamAuthorOrAdmin(examId);
    if (!authCheck.allowed) {
      return { error: authCheck.error };
    }

    await prisma.examAttempt.delete({ where: { id: attemptId } });
    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function resetStudentAttemptAction(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { examId: true, studentName: true, studentNis: true },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan ujian tidak ditemukan.' };
    }

    await prisma.examAttempt.delete({ where: { id: attemptId } });

    // 🛡️ Lepaskan kunci sesi perangkat agar siswa bisa login di perangkat baru
    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
          select: { id: true },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch { }
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);
    revalidatePath('/ujian');

    return {
      success: true,
      message: `Pengerjaan ujian siswa "${attempt.studentName}" berhasil di-reset. Siswa kini dapat mengerjakan ulang ujian.`
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function syncCbtScoresToStudentGradesAction(examId: string, customSubjectId?: string) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        attempts: {
          where: { status: 'SUBMITTED' },
        },
      },
    });

    if (!exam) {
      return { error: 'Paket ujian tidak ditemukan.' };
    }

    if (!exam.attempts || exam.attempts.length === 0) {
      return { error: 'Belum ada siswa yang menyelesaikan (submit) ujian ini.' };
    }

    // Cari subject terkait di tabel Subject
    let targetSubject = null;
    if (customSubjectId) {
      targetSubject = await prisma.subject.findUnique({ where: { id: customSubjectId } });
    }

    if (!targetSubject) {
      targetSubject = await prisma.subject.findFirst({
        where: {
          OR: [
            { name: { equals: exam.subject, mode: 'insensitive' } },
            { name: { contains: exam.subject, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!targetSubject) {
      // Buat subject baru jika belum ada agar nilai tetap tersimpan rapi di kurikulum
      targetSubject = await prisma.subject.create({
        data: {
          code: `CBT-${(exam.subject || 'MAPEL').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          name: exam.subject,
          category: 'Muatan Kejuruan',
          classTarget: exam.classTarget || 'Semua Kelas',
          teacherName: exam.authorName || 'Guru Pengampu',
          kkm: 75,
        },
      });
    }

    const isUTS = /uts|pts|tengah semester/i.test(exam.title);
    const isUAS = /uas|pas|akhir semester/i.test(exam.title);

    let syncedCount = 0;

    for (const attempt of exam.attempts) {
      const score = Math.round(attempt.score);
      const studentClass = attempt.studentClass || exam.classTarget || 'Semua Kelas';

      // Cari atau buat StudentGrade
      const existingGrade = await prisma.studentGrade.findFirst({
        where: {
          subjectId: targetSubject.id,
          studentName: attempt.studentName,
        },
      });

      let assignment = existingGrade ? existingGrade.assignment : 85;
      let midExam = existingGrade ? existingGrade.midExam : 80;
      let finalExam = existingGrade ? existingGrade.finalExam : 85;

      if (isUTS) {
        midExam = score;
      } else if (isUAS) {
        finalExam = score;
      } else {
        assignment = score;
      }

      // Hitung final grade
      const finalNumeric = Math.round(assignment * 0.3 + midExam * 0.3 + finalExam * 0.4);
      let finalGradeLetter = 'C';
      if (finalNumeric >= 90) finalGradeLetter = 'A';
      else if (finalNumeric >= 80) finalGradeLetter = 'B';
      else if (finalNumeric >= 70) finalGradeLetter = 'C';
      else finalGradeLetter = 'D';

      const notes = `Sinkronisasi Otomatis CBT: ${exam.title} (Skor: ${score})`;

      if (existingGrade) {
        await prisma.studentGrade.update({
          where: { id: existingGrade.id },
          data: {
            assignment,
            midExam,
            finalExam,
            finalGrade: finalGradeLetter,
            notes,
            studentClass,
            studentNis: attempt.studentNis || existingGrade.studentNis,
            updatedBy: `CBT Sync (${exam.authorName || 'Sistem'})`,
          },
        });
      } else {
        await prisma.studentGrade.create({
          data: {
            subjectId: targetSubject.id,
            studentName: attempt.studentName,
            studentNis: attempt.studentNis,
            studentClass,
            assignment,
            midExam,
            finalExam,
            finalGrade: finalGradeLetter,
            notes,
            updatedBy: `CBT Sync (${exam.authorName || 'Sistem'})`,
          },
        });
      }

      syncedCount++;
    }

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/portal/guru/kelas');

    return {
      success: true,
      message: `Berhasil menyinkronkan nilai ${syncedCount} siswa dari ujian "${exam.title}" ke Buku Nilai Siswa / Raport Guru!`,
      syncedCount,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// 🛡️ FITUR PENGAWAS (PROCTORING) KHUSUS ADMIN
// ==========================================

export interface AssignProctorInput {
  proctorId?: string | null;
  proctorName?: string | null;
  proctorNip?: string | null;
  proctor2Id?: string | null;
  proctor2Name?: string | null;
  roomName?: string | null;
}

/**
 * 🔒 Plotting & Penugasan Pengawas Ruangan oleh Admin Utama
 */
export async function assignExamProctorAction(examId: string, input: AssignProctorInput) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('auth_token')?.value || '';
    if (role !== 'Super Admin' && role !== 'Admin Utama' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Akses Ditolak: Hanya Admin Utama / Super Admin yang berwenang mem-plotting pengawas ujian!'
      };
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        proctorId: input.proctorId ?? null,
        proctorName: input.proctorName?.trim() || null,
        proctorNip: input.proctorNip?.trim() || null,
        proctor2Id: input.proctor2Id ?? null,
        proctor2Name: input.proctor2Name?.trim() || null,
        roomName: input.roomName?.trim() || 'Ruang Utama',
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${examId}`);

    return {
      success: true,
      message: `Pengawas untuk ujian "${updated.title}" berhasil di-plotting ke ${updated.roomName} (${updated.proctorName || 'Belum dipilih'})!`,
      exam: updated,
    };
  } catch (error: any) {
    console.error('Error assigning proctor:', error);
    return { error: error.message || 'Gagal menyimpan penugasan pengawas.' };
  }
}

/**
 * 🔓 Buka Kunci / Reset Login Siswa oleh Pengawas
 * Jika siswa logout/mati lampu/ganti HP, pengawas klik ini agar siswa bisa login lagi tanpa hapus jawaban!
 */
export async function proctorResetStudentLoginAction(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    // ⛔ JIKA STRIKE 3: Pengawas TIDAK BISA reset/buka blokir, hanya Admin Utama yang berwenang!
    if (attempt.tabSwitchCount >= 3 || attempt.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) {
      return {
        error: 'Siswa telah melanggar tata tertib sebanyak 3 kali (Strike 3) dan di-suspend total oleh sistem. Pengawas Ruangan tidak berwenang membuka blokir ini, siswa wajib melapor ke Admin Utama!'
      };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let updatedNotes = attempt.proctorNotes || '';

    // 🔓 Buka kunci kecurangan tahap ke-2 (Strike 2) & reset login agar siswa langsung dapat melanjutkan ujian
    const izinP2Tag = `[IZIN_LANJUT_P2] Izin lanjut ujian (Pelanggaran ke-2) & Reset diberikan oleh Pengawas pada ${timeStr} (Tercatat di BAP)`;
    const resetTag = `[RESET_PENGAWAS] Reset login & buka blokir diberikan oleh Pengawas pada ${timeStr}`;

    if (!updatedNotes.includes('[IZIN_LANJUT_P2]')) {
      updatedNotes = updatedNotes ? `${updatedNotes} | ${izinP2Tag}` : izinP2Tag;
    }
    if (!updatedNotes.includes('[RESET_PENGAWAS]')) {
      updatedNotes = `${updatedNotes} | ${resetTag}`;
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        isBlocked: false,
        proctorNotes: updatedNotes,
      },
    });

    // 🛡️ Lepaskan kunci sesi perangkat siswa agar siswa dapat login ulang jika berganti perangkat/browser
    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
          select: { id: true },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch { }
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Siswa "${attempt.studentName}" berhasil di-reset. Kunci pelanggaran dibuka dan siswa dapat langsung melanjutkan ujian!`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⏱️ Tambah Waktu Dispensasi (+5, +10, +15 Menit) oleh Pengawas
 */
export async function proctorAddExtraTimeAction(attemptId: string, additionalMinutes: number) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    const nextExtra = (attempt.extraTimeMinutes || 0) + additionalMinutes;

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        extraTimeMinutes: nextExtra,
        proctorNotes: `Dispensasi waktu +${additionalMinutes} menit (Total: +${nextExtra}m) oleh Pengawas pada ${new Date().toLocaleTimeString('id-ID')}`,
      },
    });

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Berhasil menambahkan waktu dispensasi +${additionalMinutes} menit untuk ${attempt.studentName}. Total tambahan: +${nextExtra} menit.`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🚫 Tegur / Blokir Siswa oleh Pengawas Ruangan
 */
export async function proctorToggleBlockAction(attemptId: string, shouldBlock: boolean, reason?: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    // Jika siswa diblokir karena Strike 3 (3x pelanggaran), pengawas tidak bisa membuka blokir
    if (!shouldBlock && (attempt.tabSwitchCount >= 3 || attempt.proctorNotes?.includes('[STRIKE_3_BLOKIR]'))) {
      return {
        error: 'Siswa diblokir otomatis oleh sistem karena mencapai 3x pelanggaran kecurangan. Pengawas ruangan tidak berwenang membuka blokir ini. Siswa wajib melapor ke Admin Utama!'
      };
    }

    let updatedNotes = attempt.proctorNotes || '';
    if (!shouldBlock) {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const unblockTag = `[UNBLOCK_PENGAWAS] Blokir dicabut oleh pengawas pada ${timeStr}`;
      const izinP2Tag = `[IZIN_LANJUT_P2] Izin lanjut ujian diberikan oleh pengawas pada ${timeStr} (Tercatat di BAP)`;
      if (!updatedNotes.includes('[IZIN_LANJUT_P2]')) {
        updatedNotes = updatedNotes ? `${updatedNotes} | ${izinP2Tag}` : izinP2Tag;
      }
      if (!updatedNotes.includes('[RESET_PENGAWAS]')) {
        updatedNotes = `${updatedNotes} | ${unblockTag}`;
      }
    } else {
      updatedNotes = `Diblokir pengawas: ${reason || 'Pelanggaran tata tertib'}`;
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: shouldBlock ? 'SUSPENDED' : 'IN_PROGRESS',
        isBlocked: shouldBlock,
        proctorNotes: updatedNotes,
      },
    });

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: shouldBlock
        ? `Siswa "${attempt.studentName}" telah diblokir sementara oleh pengawas!`
        : `Blokir untuk siswa "${attempt.studentName}" telah dicabut.`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🔓 Buka Kunci Pengerjaan Ujian (Pelanggaran ke-2 / Strike 2) oleh Pengawas Ruangan
 * Dicatat secara resmi ke Berita Acara Ujian (BAP)
 */
export async function proctorUnlockStrike2Action(attemptId: string, proctorName?: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    if (attempt.tabSwitchCount >= 3 || attempt.proctorNotes?.includes('[STRIKE_3_BLOKIR]')) {
      return {
        error: 'Siswa telah melanggar tata tertib sebanyak 3 kali dan diblokir total oleh sistem. Hanya Admin Utama yang berwenang membuka blokir ini!'
      };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const pName = proctorName?.trim() || 'Pengawas Ruang';
    const noteEntry = `[IZIN_LANJUT_P2] Izin lanjut ujian (Pelanggaran ke-2) diberikan oleh Pengawas (${pName}) pada ${timeStr} (Tercatat di BAP)`;

    // Jangan duplikasi tag jika sudah ada
    let updatedNotes = attempt.proctorNotes || '';
    if (!updatedNotes.includes('[IZIN_LANJUT_P2]')) {
      updatedNotes = updatedNotes ? `${updatedNotes} | ${noteEntry}` : noteEntry;
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        isBlocked: false,
        proctorNotes: updatedNotes,
      },
    });

    // 🛡️ Lepaskan kunci sesi perangkat agar siswa bisa melanjutkan ujian tanpa kendala sesi
    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch (sessErr) {
        console.warn('Gagal reset activeSessionDevice:', sessErr);
      }
    }

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Izin melanjutkan ujian berhasil diberikan untuk "${attempt.studentName}". Layar siswa terbuka kembali dan tercatat di Berita Acara (BAP)!`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🚨 Buka Kunci Pelanggaran Fatal ke-4 oleh Pengawas Ruang (Pasca-Dispensasi Admin Utama)
 */
export async function proctorUnlockFatalStrike4Action(attemptId: string, proctorName?: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    if (attempt.tabSwitchCount >= 5 || attempt.proctorNotes?.includes('[DISKUALIFIKASI_FINAL]')) {
      return {
        error: 'Siswa telah melanggar tata tertib sebanyak 5 kali dan didiskualifikasi permanen oleh sistem.'
      };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const pName = proctorName?.trim() || 'Pengawas Ruang';
    const noteEntry = `[FATAL_PROCTOR_UNBLOCKED] Izin Darurat Terakhir Pelanggaran Fatal ke-4 diberikan oleh Pengawas (${pName}) pada ${timeStr} (Tercatat di BAP)`;

    let updatedNotes = attempt.proctorNotes || '';
    if (!updatedNotes.includes('[FATAL_PROCTOR_UNBLOCKED]')) {
      updatedNotes = updatedNotes ? `${updatedNotes} | ${noteEntry}` : noteEntry;
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        isBlocked: false,
        proctorNotes: updatedNotes,
      },
    });

    // 🛡️ Lepaskan kunci sesi perangkat agar siswa bisa melanjutkan ujian tanpa kendala sesi
    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch (sessErr) {
        console.warn('Gagal reset activeSessionDevice:', sessErr);
      }
    }

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Izin darurat terakhir berhasil diberikan untuk "${attempt.studentName}". Layar siswa terbuka kembali dan tercatat di Berita Acara (BAP)!`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🛡️ Buka Blokir Akun CBT Siswa oleh Admin Utama (Super Admin)
 * Khusus untuk siswa yang terblokir permanen pada Pelanggaran ke-3 (Strike 3)
 */
export async function adminUnblockStrike3Action(attemptId: string, adminName?: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const aName = adminName?.trim() || 'Admin Utama';
    const noteEntry = `[ADMIN_UNBLOCK] Suspend Pelanggaran ke-3 dicabut oleh Admin Utama (${aName}) pada ${timeStr}. Siswa diberi dispensasi resmi melanjutkan ujian.`;

    // 🧹 Bersihkan tag blokir lama agar tidak memicu deteksi blokir berulang
    let cleanedNotes = (attempt.proctorNotes || '')
      .replace(/\[STRIKE_3_BLOKIR\][^|]*/g, '')
      .replace(/\[STRIKE_4_FATAL\][^|]*/g, '')
      .replace(/\[DISKUALIFIKASI_FINAL\][^|]*/g, '')
      .replace(/\[STRIKE_2_TERKUNCI\][^|]*/g, '')
      .replace(/\[ADMIN_UNBLOCK_ACTIVE\]/g, '')
      .trim();

    const updatedNotes = `${cleanedNotes ? cleanedNotes + ' | ' : ''}${noteEntry} | [IZIN_LANJUT_P2] Dispensasi Admin Utama | [ADMIN_UNBLOCK_ACTIVE]`;

    // 🔓 Buka suspend Admin Utama: Pertahankan tabSwitchCount di 3 dengan tag [ADMIN_UNBLOCK_ACTIVE]
    // agar riwayat 3x pelanggaran tetap tercatat di BAP dan pelanggaran berikutnya menjadi Pelanggaran ke-4!
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        isBlocked: false,
        tabSwitchCount: 3, // Tetap di angka 3 dengan tag dispensasi aktif [ADMIN_UNBLOCK_ACTIVE]
        proctorNotes: updatedNotes,
      },
    });

    // 🛡️ Lepaskan kunci sesi perangkat agar siswa bisa login di perangkat baru
    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
          select: { id: true },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch { }
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);
    revalidatePath('/ujian');

    return {
      success: true,
      message: `Suspend akun siswa "${attempt.studentName}" berhasil dibuka oleh Admin Utama! Siswa dapat langsung melanjutkan ujian.`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🛡️ Buka Suspend SEMUA Siswa Sekaligus dalam Paket Ujian oleh Admin Utama
 */
export async function adminUnblockAllStrike3Action(examId: string, adminName?: string) {
  try {
    const suspendedAttempts = await prisma.examAttempt.findMany({
      where: {
        examId,
        OR: [
          { isBlocked: true },
          { tabSwitchCount: { gte: 3 } },
          { proctorNotes: { contains: '[STRIKE_3_BLOKIR]' } },
          { proctorNotes: { contains: '[STRIKE_4_FATAL]' } },
          { proctorNotes: { contains: '[DISKUALIFIKASI_FINAL]' } },
        ],
        NOT: {
          proctorNotes: { contains: '[ADMIN_UNBLOCK_ACTIVE]' },
        },
      },
      select: { id: true, studentName: true, studentNis: true, proctorNotes: true },
    });

    if (suspendedAttempts.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada siswa yang tersuspend dalam ujian ini saat ini.' };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const aName = adminName?.trim() || 'Admin Utama';

    await prisma.$transaction(
      suspendedAttempts.map((att) => {
        let cleanedNotes = (att.proctorNotes || '')
          .replace(/\[STRIKE_3_BLOKIR\][^|]*/g, '')
          .replace(/\[STRIKE_4_FATAL\][^|]*/g, '')
          .replace(/\[DISKUALIFIKASI_FINAL\][^|]*/g, '')
          .replace(/\[STRIKE_2_TERKUNCI\][^|]*/g, '')
          .replace(/\[ADMIN_UNBLOCK_ACTIVE\]/g, '')
          .trim();
        const updatedNotes = `${cleanedNotes ? cleanedNotes + ' | ' : ''}[ADMIN_UNBLOCK] Suspend dicabut massal oleh Admin Utama (${aName}) pada ${timeStr} | [IZIN_LANJUT_P2] Dispensasi Admin Utama | [ADMIN_UNBLOCK_ACTIVE]`;

        return prisma.examAttempt.update({
          where: { id: att.id },
          data: {
            status: 'IN_PROGRESS',
            isBlocked: false,
            tabSwitchCount: 3,
            proctorNotes: updatedNotes,
          },
        });
      })
    );

    // Lepaskan kunci sesi perangkat untuk seluruh siswa yang di-unblock
    for (const att of suspendedAttempts) {
      if (att.studentNis || att.studentName) {
        try {
          const studentUser = await prisma.user.findFirst({
            where: {
              role: 'Siswa',
              OR: [
                ...(att.studentNis ? [{ username: att.studentNis }, { nisn: att.studentNis }] : []),
                ...(att.studentName ? [{ name: att.studentName }] : []),
              ],
            },
            select: { id: true },
          });
          if (studentUser) {
            await clearDeviceSession(studentUser.id);
          }
        } catch {}
      }
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${examId}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${examId}`);
    revalidatePath('/ujian');

    return {
      success: true,
      count: suspendedAttempts.length,
      message: `Berhasil membuka suspend ${suspendedAttempts.length} siswa sekaligus! Seluruh siswa dapat langsung melanjutkan ujian.`,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export interface SuspendedStudentItem {
  id: string; // attempt id
  examId: string;
  examTitle: string;
  examSubject: string;
  examClassTarget: string;
  examAuthorName: string | null;
  examRoomName: string | null;
  examDuration: number;
  studentName: string;
  studentNis: string | null;
  studentClass: string | null;
  tabSwitchCount: number;
  isBlocked: boolean;
  proctorNotes: string | null;
  startedAt: string;
  submittedAt: string | null;
  status: string;
}

/**
 * 🛡️ Ambil Seluruh Siswa yang Terkena Suspend (Strike 3) di Seluruh Paket Ujian Sekolah
 */
export async function getGlobalSuspendedStudentsAction(): Promise<{
  success: boolean;
  data: SuspendedStudentItem[];
  error?: string;
}> {
  try {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        OR: [
          // 🛑 KASUS 1: Siswa Diskualifikasi Total / Pelanggaran ke-5 (Pasti Tampil di Pusat Suspend)
          { proctorNotes: { contains: '[DISKUALIFIKASI_FINAL]' } },
          { tabSwitchCount: { gte: 5 } },

          // ⛔ KASUS 2: Siswa Suspend Strike 3 / Pelanggaran fatal yang belum dibuka Admin Utama
          {
            AND: [
              {
                OR: [
                  { isBlocked: true },
                  { tabSwitchCount: { in: [3, 4] } },
                  { proctorNotes: { contains: '[STRIKE_3_BLOKIR]' } },
                ],
              },
              {
                NOT: {
                  proctorNotes: { contains: '[ADMIN_UNBLOCK_ACTIVE]' },
                },
              },
            ],
          },
        ],
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            classTarget: true,
            authorName: true,
            roomName: true,
            proctorName: true,
            duration: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return {
      success: true,
      data: attempts.map((att) => ({
        id: att.id,
        examId: att.examId,
        examTitle: att.exam.title,
        examSubject: att.exam.subject,
        examClassTarget: att.exam.classTarget,
        examAuthorName: att.exam.authorName,
        examRoomName: att.exam.roomName || att.exam.proctorName,
        examDuration: att.exam.duration,
        studentName: att.studentName,
        studentNis: att.studentNis,
        studentClass: att.studentClass,
        tabSwitchCount: att.tabSwitchCount,
        isBlocked: att.isBlocked,
        proctorNotes: att.proctorNotes,
        startedAt: att.startedAt.toISOString(),
        submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
        status: att.status,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 🛡️ Buka Suspend SEMUA Siswa Sekaligus di SELURUH Paket Ujian Sekolah oleh Admin Utama
 */
export async function adminUnblockGlobalAllStrike3Action(adminName?: string) {
  try {
    const suspendedAttempts = await prisma.examAttempt.findMany({
      where: {
        OR: [
          // 🛑 KASUS 1: Siswa Diskualifikasi Total / Pelanggaran ke-5 (Pasti Tampil di Pusat Suspend)
          { proctorNotes: { contains: '[DISKUALIFIKASI_FINAL]' } },
          { tabSwitchCount: { gte: 5 } },

          // ⛔ KASUS 2: Siswa Suspend Strike 3 / Pelanggaran fatal yang belum dibuka Admin Utama
          {
            AND: [
              {
                OR: [
                  { isBlocked: true },
                  { tabSwitchCount: { in: [3, 4] } },
                  { proctorNotes: { contains: '[STRIKE_3_BLOKIR]' } },
                ],
              },
              {
                NOT: {
                  proctorNotes: { contains: '[ADMIN_UNBLOCK_ACTIVE]' },
                },
              },
            ],
          },
        ],
      },
      select: { id: true, examId: true, studentName: true, studentNis: true, proctorNotes: true },
    });

    if (suspendedAttempts.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada siswa yang tersuspend di seluruh ujian sekolah saat ini.' };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const aName = adminName?.trim() || 'Admin Utama';

    await prisma.$transaction(
      suspendedAttempts.map((att) => {
        let cleanedNotes = (att.proctorNotes || '')
          .replace(/\[STRIKE_3_BLOKIR\][^|]*/g, '')
          .replace(/\[STRIKE_4_FATAL\][^|]*/g, '')
          .replace(/\[DISKUALIFIKASI_FINAL\][^|]*/g, '')
          .replace(/\[STRIKE_2_TERKUNCI\][^|]*/g, '')
          .replace(/\[ADMIN_UNBLOCK_ACTIVE\]/g, '')
          .trim();
        const updatedNotes = `${cleanedNotes ? cleanedNotes + ' | ' : ''}[ADMIN_UNBLOCK] Suspend dicabut massal dari Pusat Suspend oleh Admin Utama (${aName}) pada ${timeStr} | [IZIN_LANJUT_P2] Dispensasi Admin Utama | [ADMIN_UNBLOCK_ACTIVE]`;

        return prisma.examAttempt.update({
          where: { id: att.id },
          data: {
            status: 'IN_PROGRESS',
            isBlocked: false,
            tabSwitchCount: 3,
            proctorNotes: updatedNotes,
          },
        });
      })
    );

    // Lepaskan kunci sesi perangkat untuk seluruh siswa
    for (const att of suspendedAttempts) {
      if (att.studentNis || att.studentName) {
        try {
          const studentUser = await prisma.user.findFirst({
            where: {
              role: 'Siswa',
              OR: [
                ...(att.studentNis ? [{ username: att.studentNis }, { nisn: att.studentNis }] : []),
                ...(att.studentName ? [{ name: att.studentName }] : []),
              ],
            },
            select: { id: true },
          });
          if (studentUser) {
            await clearDeviceSession(studentUser.id);
          }
        } catch {}
      }
    }

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/ujian');

    return {
      success: true,
      count: suspendedAttempts.length,
      message: `Berhasil membuka suspend ${suspendedAttempts.length} siswa di seluruh sekolah sekaligus! Semua akun dapat langsung melanjutkan ujian.`,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export interface StudentLoginItem {
  id: string; // attempt id
  studentName: string;
  studentNis: string | null;
  studentClass: string | null;
  examId: string;
  examTitle: string;
  examSubject: string;
  examClassTarget: string;
  examAuthorName: string | null;
  examRoomName: string | null;
  examDuration: number;
  status: string; // 'IN_PROGRESS' | 'SUBMITTED'
  startedAt: string;
  submittedAt: string | null;
  answeredCount: number;
  totalQuestions: number;
  score: number;
  totalCorrect: number;
  tabSwitchCount: number;
  isBlocked: boolean;
  proctorNotes: string | null;
  deviceInfo?: string | null;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

/**
 * 🟢 Ambil Seluruh Data Siswa yang Login / Mengerjakan CBT (Live Presensi & Aktivitas)
 * Khusus Wewenang Admin Utama untuk pemantauan seluruh rombel dan paket ujian sekolah.
 * Secara default (ACTIVE_ONLY), hanya menampilkan siswa yang SEDANG LOGIN & AKTIF MENGERJAKAN UJIAN.
 * Begitu siswa logout atau submit (selesai ujian), data otomatis hilang dari radar aktif.
 */
export async function getGlobalStudentLoginsAction(options?: {
  scope?: 'ACTIVE_ONLY' | 'SUBMITTED_TODAY' | 'ALL_TODAY';
}): Promise<{
  success: boolean;
  data: StudentLoginItem[];
  activeCount: number;
  submittedCount: number;
  totalCount: number;
  error?: string;
}> {
  try {
    const scope = options?.scope || 'ACTIVE_ONLY';
    const nowMs = Date.now();
    const twentyFourHoursAgo = new Date(nowMs - 24 * 60 * 60 * 1000);

    const [attempts, activeSessions] = await Promise.all([
      prisma.examAttempt.findMany({
        where: {
          startedAt: { gte: twentyFourHoursAgo },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: true,
              classTarget: true,
              authorName: true,
              roomName: true,
              proctorName: true,
              duration: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 1000,
      }),
      prisma.setting.findMany({
        where: { key: { startsWith: 'active_session_' } },
      }),
    ]);

    const sessionMapByName = new Map<string, any>();
    const sessionMapByUserId = new Map<string, any>();
    const activeUserIds: string[] = [];

    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit toleransi inaktivitas sesi

    for (const s of activeSessions) {
      try {
        if (s.value) {
          const parsed = JSON.parse(s.value);
          const lastActive = parsed.lastActive || (parsed.loggedInAt ? new Date(parsed.loggedInAt).getTime() : 0);
          const isNotTimedOut = (nowMs - lastActive) <= SESSION_TIMEOUT_MS;

          if (isNotTimedOut) {
            if (parsed.userId) {
              sessionMapByUserId.set(parsed.userId, parsed);
              activeUserIds.push(parsed.userId);
            }
            if (parsed.userName) {
              sessionMapByName.set(parsed.userName.trim().toLowerCase(), parsed);
            }
          }
        }
      } catch {}
    }

    // Ambil identitas User siswa yang sedang memiliki sesi aktif untuk pemetaan via NISN
    const sessionMapByNis = new Map<string, any>();
    if (activeUserIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: activeUserIds } },
          select: { id: true, name: true, nisn: true, username: true },
        });
        for (const u of users) {
          const session = sessionMapByUserId.get(u.id);
          if (session) {
            if (u.nisn) sessionMapByNis.set(u.nisn.trim().toLowerCase(), session);
            if (u.username) sessionMapByNis.set(u.username.trim().toLowerCase(), session);
            if (u.name) sessionMapByName.set(u.name.trim().toLowerCase(), session);
          }
        }
      } catch {}
    }

    let activeCount = 0;
    let submittedCount = 0;

    const allMapped: StudentLoginItem[] = [];

    for (const att of attempts) {
      const cleanName = (att.studentName || '').trim().toLowerCase();
      const cleanNis = (att.studentNis || '').trim().toLowerCase();
      const session = sessionMapByName.get(cleanName) || (cleanNis ? sessionMapByNis.get(cleanNis) : undefined);

      const isAttemptInProgress = att.status === 'IN_PROGRESS';
      const isAttemptSubmitted = att.status === 'SUBMITTED';

      // 🎯 Penentuan Siswa Sedang Aktif di Ujian:
      // 1. Status attempt masih 'IN_PROGRESS' (belum submit)
      // 2. Belum logout: memiliki sesi aktif di database ATAU pengerjaan dimulai < 2 jam lalu
      const hasValidSession = Boolean(session);
      const isRecentlyStarted = (nowMs - new Date(att.startedAt).getTime()) < 2 * 60 * 60 * 1000;
      const isTrulyActive = isAttemptInProgress && (hasValidSession || isRecentlyStarted);

      if (isTrulyActive) {
        activeCount++;
      } else if (isAttemptSubmitted) {
        submittedCount++;
      }

      // Filter berdasarkan scope yang dipilih
      if (scope === 'ACTIVE_ONLY' && !isTrulyActive) {
        continue;
      }
      if (scope === 'SUBMITTED_TODAY' && !isAttemptSubmitted) {
        continue;
      }

      let answered = 0;
      try {
        const parsedAns = JSON.parse(att.answers || '{}');
        answered = Object.keys(parsedAns).length;
      } catch {}

      allMapped.push({
        id: att.id,
        studentName: att.studentName,
        studentNis: att.studentNis,
        studentClass: att.studentClass,
        examId: att.examId,
        examTitle: att.exam?.title || '-',
        examSubject: att.exam?.subject || '-',
        examClassTarget: att.exam?.classTarget || '-',
        examAuthorName: att.exam?.authorName || null,
        examRoomName: att.exam?.roomName || att.exam?.proctorName || null,
        examDuration: att.exam?.duration || 0,
        status: att.status,
        startedAt: att.startedAt.toISOString(),
        submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
        answeredCount: answered,
        totalQuestions: att.totalQuestions || 0,
        score: att.score || 0,
        totalCorrect: att.totalCorrect || 0,
        tabSwitchCount: att.tabSwitchCount || 0,
        isBlocked: att.isBlocked || false,
        proctorNotes: att.proctorNotes || null,
        deviceInfo: session ? `${session.os || 'OS'} • ${session.browser || 'Browser'}` : null,
        deviceType: session?.deviceType || 'unknown',
      });
    }

    return {
      success: true,
      data: allMapped,
      activeCount,
      submittedCount,
      totalCount: attempts.length,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      activeCount: 0,
      submittedCount: 0,
      totalCount: 0,
      error: error.message,
    };
  }
}

/**
 * ⚡ Reset Sesi Login Siswa oleh Admin Utama (Membersihkan session device lock agar siswa bisa login di perangkat baru)
 */
export async function adminResetStudentSessionAction(attemptId: string, adminName?: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const aName = adminName?.trim() || 'Admin Utama';
    const noteEntry = `[RESET_ADMIN] Sesi login & perangkat di-reset oleh Admin Utama (${aName}) pada ${timeStr}`;

    let updatedNotes = attempt.proctorNotes || '';
    if (!updatedNotes.includes('[RESET_ADMIN]')) {
      updatedNotes = updatedNotes ? `${updatedNotes} | ${noteEntry}` : noteEntry;
    }

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isBlocked: false,
        proctorNotes: updatedNotes,
      },
    });

    if (attempt.studentNis || attempt.studentName) {
      try {
        const studentUser = await prisma.user.findFirst({
          where: {
            role: 'Siswa',
            OR: [
              ...(attempt.studentNis ? [{ username: attempt.studentNis }, { nisn: attempt.studentNis }] : []),
              ...(attempt.studentName ? [{ name: attempt.studentName }] : []),
            ],
          },
          select: { id: true },
        });
        if (studentUser) {
          await clearDeviceSession(studentUser.id);
        }
      } catch {}
    }

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Sesi siswa "${attempt.studentName}" berhasil di-reset! Siswa dapat login kembali di perangkat baru dengan aman.`,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 📥 Paksa Kumpul Ujian (Force Submit) oleh Pengawas Ruangan
 */
export async function proctorForceSubmitAction(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan siswa tidak ditemukan.' };
    }

    // Hitung skor dari jawaban yang sudah tersimpan
    let answersObj: Record<string, string> = {};
    try {
      answersObj = JSON.parse(attempt.answers || '{}');
    } catch { }

    let correctCount = 0;
    const questions = attempt.exam.questions;
    questions.forEach((q) => {
      if (answersObj[q.id] !== undefined && String(answersObj[q.id]) === String(q.correctAnswer)) {
        correctCount++;
      }
    });

    const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        score,
        totalQuestions: questions.length,
        totalCorrect: correctCount,
        submittedAt: new Date(),
        proctorNotes: `Dikumpulkan paksa oleh Pengawas Ruang pada ${new Date().toLocaleTimeString('id-ID')}`,
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Lembar ujian siswa "${attempt.studentName}" berhasil dikumpulkan paksa oleh pengawas! Skor terhitung: ${Math.round(score)}.`,
      attempt: updated,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🪪 CBT STUDENT PARTICIPANT & LOGIN CARD (KHUSUS ADMIN UTAMA)
 */
export interface CbtStudentCardItem {
  id: string;
  name: string;
  username: string;
  password: string;
  nisn: string | null;
  studentClass: string;
  major: string;
  majorName?: string;
  gradeLevel: string;
}

export interface CbtMasterJurusanItem {
  id: string;
  name: string;
  code: string;
}

export interface GetCbtStudentCardsOptions {
  classTarget?: string;
  search?: string;
  examId?: string;
}

export async function getCbtStudentCardsDataAction(options?: GetCbtStudentCardsOptions) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    if (!isSuperAdmin) {
      return {
        error: 'Akses Ditolak: Fitur cetak kartu login peserta CBT ini khusus dan hanya dapat diakses oleh Admin Utama.',
      };
    }

    const [rawStudents, studentGrades, examAttempts, kopSuratConfig, dynamicClasses, exams, jurusans] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'Siswa',
          status: 'Aktif',
        },
        select: {
          id: true,
          name: true,
          username: true,
          password: true,
          nisn: true,
          studentClass: true,
          createdAt: true,
        },
        orderBy: [{ name: 'asc' }],
      }),
      prisma.studentGrade.findMany({
        select: {
          studentName: true,
          studentNis: true,
          studentClass: true,
        },
      }),
      prisma.examAttempt.findMany({
        where: { studentClass: { not: '' } },
        select: {
          studentName: true,
          studentNis: true,
          studentClass: true,
        },
      }),
      getKopSuratConfig(),
      getDynamicClassTargets(),
      prisma.exam.findMany({
        select: {
          id: true,
          title: true,
          subject: true,
          classTarget: true,
          roomName: true,
          startTime: true,
          endTime: true,
          token: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      ensureDefaultJurusans(),
    ]);

    const studentClassMap: Record<string, string> = {};
    for (const sg of studentGrades) {
      if (sg.studentName && sg.studentClass) {
        studentClassMap[sg.studentName.trim().toLowerCase()] = sg.studentClass.trim();
      }
      if (sg.studentNis && sg.studentClass) {
        studentClassMap[sg.studentNis.trim().toLowerCase()] = sg.studentClass.trim();
      }
    }

    for (const att of examAttempts) {
      if (att.studentName && att.studentClass) {
        const key = att.studentName.trim().toLowerCase();
        if (!studentClassMap[key]) studentClassMap[key] = att.studentClass.trim();
      }
      if (att.studentNis && att.studentClass) {
        const key = att.studentNis.trim().toLowerCase();
        if (!studentClassMap[key]) studentClassMap[key] = att.studentClass.trim();
      }
    }

    let students: CbtStudentCardItem[] = rawStudents.map((s) => {
      const assignedClass =
        s.studentClass ||
        (s.nisn ? studentClassMap[s.nisn.trim().toLowerCase()] : null) ||
        studentClassMap[s.name.trim().toLowerCase()] ||
        studentClassMap[s.username.trim().toLowerCase()] ||
        (dynamicClasses.find((c) => c !== 'Semua Kelas' && !c.includes('Semua Jurusan')) || 'XI TJKT 1');

      let gradeLevel = 'XI';
      if (assignedClass.startsWith('XII')) gradeLevel = 'XII';
      else if (assignedClass.startsWith('X') && !assignedClass.startsWith('XI') && !assignedClass.startsWith('XII')) gradeLevel = 'X';
      else if (assignedClass.startsWith('XI')) gradeLevel = 'XI';

      // Pencocokan presisi dengan master database Jurusan yang di-input Admin Utama
      const upperClass = assignedClass.toUpperCase();
      let matchedJurusan = jurusans.find((j) => {
        const code = (j.code || '').trim().toUpperCase();
        if (!code) return false;
        const regex = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, 'i');
        return regex.test(upperClass);
      });

      if (!matchedJurusan) {
        matchedJurusan = jurusans.find((j) => {
          const name = (j.name || '').trim().toLowerCase();
          return name && assignedClass.toLowerCase().includes(name);
        });
      }

      const parts = assignedClass.split(' ');
      const fallbackCode = parts.length >= 2 ? parts[1].toUpperCase() : 'Umum';

      const major = matchedJurusan ? matchedJurusan.code : fallbackCode;
      const majorName = matchedJurusan ? matchedJurusan.name : (major !== 'Umum' ? major : 'Semua Jurusan');

      return {
        id: s.id,
        name: s.name,
        username: s.username,
        password: s.password || 'siswa123',
        nisn: s.nisn,
        studentClass: assignedClass,
        major,
        majorName,
        gradeLevel,
      };
    });

    if (options?.classTarget && options.classTarget !== 'ALL' && options.classTarget !== 'Semua Kelas') {
      students = students.filter(s => s.studentClass.toLowerCase() === options.classTarget!.toLowerCase());
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      students = students.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
          s.studentClass.toLowerCase().includes(q)
      );
    }

    const cbtTimezone = await getCbtTimezone();

    return {
      success: true,
      students,
      kopSuratConfig,
      cbtTimezone,
      availableClasses: dynamicClasses,
      jurusans: jurusans.map((j) => ({
        id: j.id,
        name: j.name,
        code: j.code,
      })),
      exams: exams.map(e => ({
        ...e,
        startTime: e.startTime ? e.startTime.toISOString() : null,
        endTime: e.endTime ? e.endTime.toISOString() : null,
      })),
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 🖋️ SIMPAN STEMPEL & TANDA TANGAN RESMI SEKOLAH
 */
export async function saveSchoolStampAndSignatureAction(data: {
  stampUrl?: string | null;
  signatureUrl?: string | null;
  headmasterName?: string;
  headmasterNip?: string;
  city?: string;
}) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    if (!isSuperAdmin) {
      return {
        error: 'Akses Ditolak: Hanya Admin Utama yang berhak menyimpan stempel dan tanda tangan resmi sekolah.',
      };
    }

    // Perlindungan ukuran payload: pastikan string base64 wajar (< 2MB) agar database cepat & aman
    if (data.stampUrl && data.stampUrl.length > 2.5 * 1024 * 1024) {
      return { error: 'Ukuran gambar stempel terlalu besar. Mohon unggah ulang gambar agar sistem mengompresnya secara otomatis.' };
    }
    if (data.signatureUrl && data.signatureUrl.length > 2.5 * 1024 * 1024) {
      return { error: 'Ukuran gambar tanda tangan terlalu besar. Mohon unggah ulang gambar agar sistem mengompresnya secara otomatis.' };
    }

    const currentSettings = (await getWebSettings()) || {};
    const currentKopSurat = currentSettings.kopSurat || {};

    const updatedKopSurat = {
      ...currentKopSurat,
      ...(data.stampUrl !== undefined ? { stampUrl: data.stampUrl } : {}),
      ...(data.signatureUrl !== undefined ? { signatureUrl: data.signatureUrl } : {}),
      ...(data.headmasterName ? { headmasterName: data.headmasterName } : {}),
      ...(data.headmasterNip !== undefined ? { headmasterNip: data.headmasterNip } : {}),
      ...(data.city ? { city: data.city } : {}),
    };

    const merged = { ...currentSettings, kopSurat: updatedKopSurat };
    const value = JSON.stringify(merged);

    await prisma.setting.upsert({
      where: { key: 'webSettings' },
      update: { value },
      create: {
        key: 'webSettings',
        value,
        description: 'Web Settings (Logo, Name, Tagline, Themes, Kop Surat, Payment)',
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath('/admin/settings');
    revalidatePath('/portal/siswa/cbt');

    return {
      success: true,
      message: 'Stempel dan tanda tangan resmi sekolah berhasil disimpan permanen!',
      kopSuratConfig: updatedKopSurat,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveCbtTimezone(timezone: CbtTimezone) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('auth_token')?.value;
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin Utama';

    // Guru biasa dapat beralih tampilan zona waktu di perangkatnya, namun tidak mengubah default database sekolah
    if (!isSuperAdmin) {
      return { success: true, timezone, isLocalOnly: true };
    }

    const current = await prisma.setting.findUnique({
      where: { key: 'webSettings' },
    });
    const currentSettings = current?.value ? JSON.parse(current.value) : {};
    const merged = { ...currentSettings, cbtTimezone: timezone };
    const value = JSON.stringify(merged);

    await prisma.setting.upsert({
      where: { key: 'webSettings' },
      update: { value },
      create: {
        key: 'webSettings',
        value,
        description: 'Web Settings (Logo, Name, Tagline, Themes, Kop Surat, Payment, CBT)',
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/ujian');

    return { success: true, timezone };
  } catch (error: any) {
    return { error: error.message };
  }
}
