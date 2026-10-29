'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper: Generate clean 6-character alphanumeric token without confusing symbols (0, O, 1, I)
export function generateRandomCbtToken(): string {
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
      select: { token: true, status: true },
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
    let token = customToken?.trim().toUpperCase();
    if (openSession && !token) {
      const current = await prisma.exam.findUnique({ where: { id } });
      const currentPrimary = current?.token ? current.token.split('|')[0].trim() : '';
      token = currentPrimary || generateRandomCbtToken();
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        status: openSession ? 'ACTIVE' : 'PUBLISHED',
        ...(token ? { token } : {}),
      },
    });

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
}

/**
 * 🛡️ Anti-Collision Schedule Checker
 * Detects if an exam schedule overlaps with existing active exams for the same class
 */
export async function checkExamScheduleConflict(params: {
  examId?: string;
  classTarget: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
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
    const classFilter =
      params.classTarget === 'Semua Kelas'
        ? {}
        : {
            OR: [
              { classTarget: params.classTarget },
              { classTarget: 'Semua Kelas' },
            ],
          };

    const conflicting = await prisma.exam.findMany({
      where: {
        ...(params.examId ? { id: { not: params.examId } } : {}),
        status: { not: 'ARCHIVED' },
        startTime: { not: null },
        endTime: { not: null },
        ...classFilter,
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
      select: {
        id: true,
        title: true,
        subject: true,
        classTarget: true,
        startTime: true,
        endTime: true,
        duration: true,
      },
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
}) {
  try {
    if (data.startTime && data.endTime && !data.allowConflict) {
      const conflictCheck = await checkExamScheduleConflict({
        classTarget: data.classTarget || 'Semua Kelas',
        startTime: data.startTime,
        endTime: data.endTime,
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
        authorName: data.authorName || 'Guru Pengampu',
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/siswa');
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
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    allowConflict?: boolean;
  }
) {
  try {
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
        ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
        ...(data.startTime !== undefined && { startTime: data.startTime ? new Date(data.startTime) : null }),
        ...(data.endTime !== undefined && { endTime: data.endTime ? new Date(data.endTime) : null }),
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${id}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath(`/portal/siswa/cbt/${id}`);
    revalidatePath('/portal/siswa');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteExam(id: string) {
  try {
    await prisma.exam.delete({ where: { id } });
    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createQuestion(data: {
  examId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  points?: number;
}) {
  try {
    const question = await prisma.examQuestion.create({
      data: {
        examId: data.examId,
        questionText: data.questionText,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        points: Number(data.points) || 10,
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
    options: string[];
    correctAnswer: string;
    points?: number;
  }>
) {
  try {
    if (!questions || questions.length === 0) {
      return { error: 'Daftar butir soal tidak boleh kosong.' };
    }

    const currentCount = await prisma.examQuestion.count({
      where: { examId },
    });

    const created = await prisma.$transaction(
      questions.map((q, idx) =>
        prisma.examQuestion.create({
          data: {
            examId,
            questionText: q.questionText.trim(),
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            points: Number(q.points) || 10,
            order: currentCount + idx,
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
    options?: string[];
    correctAnswer?: string;
    points?: number;
  }
) {
  try {
    const updated = await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.questionText !== undefined && { questionText: data.questionText.trim() }),
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
    await prisma.examQuestion.delete({ where: { id: questionId } });
    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAttempt(attemptId: string, examId: string) {
  try {
    await prisma.examAttempt.delete({ where: { id: attemptId } });
    revalidatePath(`/admin/cbt/${examId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
