'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { computeFinalScore, computeGradePredicate } from '@/lib/subject-seed';

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

    // 🎓 Otomatis sinkronkan nilai tugas guru ke Rapor / Transkrip Nilai Siswa (StudentGrade)
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { subject: true, classTarget: true, authorName: true },
      });

      if (assignment && updated.studentName) {
        // Cari mapel terkait di database
        const subject = await prisma.subject.findFirst({
          where: {
            OR: [
              { name: { equals: assignment.subject, mode: 'insensitive' } },
              { name: { contains: assignment.subject, mode: 'insensitive' } },
              { code: { equals: assignment.subject, mode: 'insensitive' } },
            ],
          },
        });

        if (subject) {
          // Hitung rata-rata nilai seluruh tugas siswa pada mapel ini
          const studentSubmissions = await prisma.assignmentSubmission.findMany({
            where: {
              studentName: updated.studentName,
              status: 'GRADED',
              grade: { not: null },
              assignment: {
                subject: assignment.subject,
              },
            },
            select: { grade: true },
          });

          const totalGraded = studentSubmissions.length;
          const avgAssignmentGrade = totalGraded > 0
            ? Math.round(studentSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / totalGraded)
            : Number(grade);

          const existingGrade = await prisma.studentGrade.findUnique({
            where: {
              subjectId_studentName: {
                subjectId: subject.id,
                studentName: updated.studentName,
              },
            },
          });

          const midExam = existingGrade?.midExam || 0;
          const finalExam = existingGrade?.finalExam || 0;
          const finalScore = computeFinalScore(avgAssignmentGrade, midExam, finalExam);
          const finalGradeLetter = computeGradePredicate(finalScore);

          await prisma.studentGrade.upsert({
            where: {
              subjectId_studentName: {
                subjectId: subject.id,
                studentName: updated.studentName,
              },
            },
            update: {
              assignment: avgAssignmentGrade,
              finalGrade: finalGradeLetter,
              updatedBy: assignment.authorName || 'Guru Pengampu',
              updatedAt: new Date(),
            },
            create: {
              subjectId: subject.id,
              studentName: updated.studentName,
              studentNis: updated.studentNis,
              studentClass: updated.studentClass || subject.classTarget,
              assignment: avgAssignmentGrade,
              midExam: 0,
              finalExam: 0,
              finalGrade: finalGradeLetter,
              notes: 'Nilai tugas tersinkronisasi otomatis dari penilaian guru.',
              updatedBy: assignment.authorName || 'Guru Pengampu',
            },
          });
        }
      }
    } catch (syncErr) {
      console.error('Error auto-syncing assignment grade to StudentGrade:', syncErr);
    }

    revalidatePath(`/admin/tugas/${assignmentId}`);
    revalidatePath('/portal/siswa/tugas');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru/nilai');
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
