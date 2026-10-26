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
    const existing = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: data.assignmentId,
        studentName: data.studentName,
      },
    });

    let result;
    if (existing) {
      // Update existing submission
      result = await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          notes: data.notes || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || 'Dokumen Tugas',
          submittedAt: new Date(),
          status: 'SUBMITTED',
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
          status: 'SUBMITTED',
        },
      });
    }

    revalidatePath('/portal/siswa/tugas');
    revalidatePath(`/admin/tugas/${data.assignmentId}`);

    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message };
  }
}
