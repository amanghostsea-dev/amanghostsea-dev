'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { formatScheduleDate, formatScheduleTime } from '@/lib/cbt-schedule';

export async function getExamSessionStatus(examId: string) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        status: true,
        title: true,
        token: true,
      },
    });
    return {
      status: exam?.status || 'UNKNOWN',
      isSessionOpen: exam?.status === 'ACTIVE',
      hasToken: Boolean(exam?.token),
    };
  } catch (error) {
    return { status: 'ERROR', isSessionOpen: false, hasToken: false };
  }
}

export async function startOrResumeAttempt(data: {
  examId: string;
  studentName: string;
  studentNis?: string;
  studentClass?: string;
  token?: string;
}) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      return { error: 'Ujian tidak ditemukan.' };
    }

    if (exam.status === 'DRAFT') {
      return { error: 'Paket ujian masih dalam tahap penyusunan oleh guru.' };
    }

    if (exam.status === 'CLOSED' || exam.status === 'ARCHIVED') {
      return { error: 'Sesi ujian telah resmi ditutup oleh guru pengawas.' };
    }

    // 📅 Verify Schedule Window
    const now = new Date();
    if (exam.startTime && now < exam.startTime && exam.status !== 'ACTIVE') {
      return { 
        error: `Ujian ini belum dimulai. Sesuai jadwal, ujian baru dapat diakses pada ${formatScheduleDate(exam.startTime)} pukul ${formatScheduleTime(exam.startTime)}.` 
      };
    }

    if (exam.endTime && now > exam.endTime && exam.status !== 'ACTIVE') {
      return { 
        error: `Waktu pengerjaan ujian ini telah berakhir pada ${formatScheduleDate(exam.endTime)} pukul ${formatScheduleTime(exam.endTime)}. Silakan hubungi guru pengampu.` 
      };
    }

    if (exam.status !== 'ACTIVE') {
      return { 
        error: 'Sesi ujian kelas ini belum dibuka oleh pengawas di kelas. Harap tunggu di Ruang Tunggu.' 
      };
    }

    // Verify token if required (supports dynamic 5-minute rolling token with grace period)
    if (exam.token && exam.token.trim() !== '') {
      const allowedTokens = exam.token
        .split('|')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const studentInput = (data.token || '').trim().toUpperCase();
      if (!allowedTokens.includes(studentInput)) {
        return { error: 'Token ujian yang Anda masukkan salah atau sudah kadaluwarsa!' };
      }
    }

    // Check if an existing attempt exists for this student
    const existing = await prisma.examAttempt.findFirst({
      where: {
        examId: data.examId,
        studentName: data.studentName,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      return { success: true, attempt: existing, questions: exam.questions };
    }

    // Create new attempt
    const newAttempt = await prisma.examAttempt.create({
      data: {
        examId: data.examId,
        studentName: data.studentName,
        studentNis: data.studentNis || null,
        studentClass: data.studentClass || null,
        totalQuestions: exam.questions.length,
        answers: '{}',
        status: 'IN_PROGRESS',
        tabSwitchCount: 0,
      },
    });

    return { success: true, attempt: newAttempt, questions: exam.questions };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveProgress(
  attemptId: string,
  answers: Record<string, string>,
  tabSwitchCount: number
) {
  try {
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers: JSON.stringify(answers),
        tabSwitchCount,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function submitExam(
  attemptId: string,
  answers: Record<string, string>,
  tabSwitchCount: number
) {
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
      return { error: 'Data pengerjaan tidak ditemukan.' };
    }

    // Calculate score
    const questions = attempt.exam.questions;
    let totalScore = 0;
    let totalCorrect = 0;
    const totalMaxPoints = questions.reduce((sum, q) => sum + q.points, 0) || 100;

    questions.forEach((q) => {
      const studentAns = answers[q.id];
      if (studentAns !== undefined && studentAns === q.correctAnswer) {
        totalScore += q.points;
        totalCorrect += 1;
      }
    });

    // Scale to 100 if points are variable
    const finalScaledScore = Math.round((totalScore / totalMaxPoints) * 100);

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers: JSON.stringify(answers),
        score: finalScaledScore,
        totalQuestions: questions.length,
        totalCorrect,
        status: 'SUBMITTED',
        tabSwitchCount,
        submittedAt: new Date(),
      },
    });

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/siswa/cbt');

    return {
      success: true,
      result: {
        score: finalScaledScore,
        totalCorrect,
        totalQuestions: questions.length,
        tabSwitchCount,
      },
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
