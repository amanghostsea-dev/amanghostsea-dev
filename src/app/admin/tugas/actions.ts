'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createAssignment(data: {
  title: string;
  subject: string;
  classTarget: string;
  description: string;
  deadline: string;
  fileUrl?: string;
  authorName?: string;
}) {
  try {
    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        subject: data.subject,
        classTarget: data.classTarget || 'Semua Kelas',
        description: data.description,
        deadline: new Date(data.deadline),
        fileUrl: data.fileUrl?.trim() || null,
        status: 'ACTIVE',
        authorName: data.authorName || 'Guru Pengampu',
      },
    });

    revalidatePath('/admin/tugas');
    revalidatePath('/portal/siswa/tugas');
    return { success: true, data: assignment };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateAssignment(
  id: string,
  data: {
    title?: string;
    subject?: string;
    classTarget?: string;
    description?: string;
    deadline?: string;
    fileUrl?: string;
    status?: string;
  }
) {
  try {
    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.subject && { subject: data.subject }),
        ...(data.classTarget && { classTarget: data.classTarget }),
        ...(data.description && { description: data.description }),
        ...(data.deadline && { deadline: new Date(data.deadline) }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl?.trim() || null }),
        ...(data.status && { status: data.status }),
      },
    });

    revalidatePath('/admin/tugas');
    revalidatePath(`/admin/tugas/${id}`);
    revalidatePath('/portal/siswa/tugas');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAssignment(id: string) {
  try {
    await prisma.assignment.delete({ where: { id } });
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/siswa/tugas');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function gradeSubmission(
  submissionId: string,
  assignmentId: string,
  grade: number,
  feedback?: string
) {
  try {
    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: Number(grade),
        feedback: feedback || null,
        status: 'GRADED',
      },
    });

    revalidatePath(`/admin/tugas/${assignmentId}`);
    revalidatePath('/portal/siswa/tugas');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteSubmission(submissionId: string, assignmentId: string) {
  try {
    await prisma.assignmentSubmission.delete({ where: { id: submissionId } });
    revalidatePath(`/admin/tugas/${assignmentId}`);
    revalidatePath('/portal/siswa/tugas');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
