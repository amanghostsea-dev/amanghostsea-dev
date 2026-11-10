'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
  proctorId?: string | null;
  proctorName?: string | null;
  proctorNip?: string | null;
  proctor2Id?: string | null;
  proctor2Name?: string | null;
  roomName?: string | null;
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
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    allowConflict?: boolean;
    proctorId?: string | null;
    proctorName?: string | null;
    proctorNip?: string | null;
    proctor2Id?: string | null;
    proctor2Name?: string | null;
    roomName?: string | null;
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

    // Step 1: Pre-validate conflicts if allowConflict is false
    if (!allowConflict) {
      for (const item of schedules) {
        if (item.startTime && item.endTime) {
          const exam = await prisma.exam.findUnique({
            where: { id: item.id },
            select: { id: true, title: true, classTarget: true },
          });
          if (exam) {
            const conflictCheck = await checkExamScheduleConflict({
              examId: item.id,
              classTarget: exam.classTarget,
              startTime: item.startTime,
              endTime: item.endTime,
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
          startTime: item.startTime ? new Date(item.startTime) : null,
          endTime: item.endTime ? new Date(item.endTime) : null,
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
          authorName: item.authorName || 'Bpk. Ahmad ST',
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

export async function resetStudentAttemptAction(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { examId: true, studentName: true },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan ujian tidak ditemukan.' };
    }

    await prisma.examAttempt.delete({ where: { id: attemptId } });

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

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        isBlocked: false,
        proctorNotes: `Login dibuka kembali oleh Pengawas Ruang pada ${new Date().toLocaleTimeString('id-ID')}`,
      },
    });

    revalidatePath('/admin/cbt');
    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/pengawas/cbt');
    revalidatePath(`/portal/pengawas/cbt/${attempt.examId}`);
    revalidatePath(`/portal/siswa/cbt/${attempt.examId}`);

    return {
      success: true,
      message: `Siswa "${attempt.studentName}" berhasil di-reset login. Siswa dapat memasukkan token kembali dan melanjutkan ujian!`,
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

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isBlocked: shouldBlock,
        proctorNotes: shouldBlock 
          ? `Diblokir pengawas: ${reason || 'Pelanggaran tata tertib'}` 
          : 'Blokir dicabut oleh pengawas',
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
    } catch {}

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
