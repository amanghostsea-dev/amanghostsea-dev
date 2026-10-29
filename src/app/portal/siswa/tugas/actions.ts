'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitStudentAssignment(data: {
  assignmentId: string;
  studentName: string;
  studentNis?: string;
  studentClass?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
}) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      select: { deadline: true, status: true },
    });

    if (!assignment) {
      return { error: 'Data tugas tidak ditemukan.' };
    }

    const now = new Date();
    const isLate = now.getTime() > new Date(assignment.deadline).getTime();
    const submissionStatus = isLate ? 'LATE' : 'SUBMITTED';

    const existing = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: data.assignmentId,
        studentName: data.studentName,
      },
    });

    let result;
    if (existing) {
      // Update existing submission (re-submit)
      result = await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          studentNis: data.studentNis || existing.studentNis,
          studentClass: data.studentClass || existing.studentClass,
          notes: data.notes || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || 'Dokumen Tugas',
          submittedAt: now,
          status: submissionStatus,
        },
      });
    } else {
      // Create new submission
      result = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: data.assignmentId,
          studentName: data.studentName,
          studentNis: data.studentNis || null,
          studentClass: data.studentClass || null,
          notes: data.notes || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || 'Dokumen Tugas',
          submittedAt: now,
          status: submissionStatus,
        },
      });
    }

    revalidatePath('/portal/siswa/tugas');
    revalidatePath(`/admin/tugas/${data.assignmentId}`);
    revalidatePath('/admin/tugas');

    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message };
  }
}
