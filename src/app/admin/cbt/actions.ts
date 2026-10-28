'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function toggleExamSession(id: string, openSession: boolean, customToken?: string) {
  try {
    let token = customToken?.trim().toUpperCase();
    if (openSession && !token) {
      const current = await prisma.exam.findUnique({ where: { id } });
      token = current?.token || 'CBT' + Math.floor(100 + Math.random() * 900);
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
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
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
}) {
  try {
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
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
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
  }
) {
  try {
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
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${id}`);
    revalidatePath('/portal/siswa/cbt');
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
