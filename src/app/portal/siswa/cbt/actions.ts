'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { formatScheduleDate, formatScheduleTime, getExamScheduleState } from '@/lib/cbt-schedule';

export async function getExamSessionStatus(examId: string) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        status: true,
        title: true,
        token: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!exam) {
      return { status: 'NOT_FOUND', isSessionOpen: false, hasToken: false, scheduleState: null };
    }

    const schedule = getExamScheduleState(exam.startTime, exam.endTime, exam.status);
    const isSessionOpen = exam.status === 'ACTIVE' || (exam.status === 'PUBLISHED' && schedule.isAccessible);

    return {
      status: exam.status || 'UNKNOWN',
      isSessionOpen,
      hasToken: Boolean(exam.token && exam.token.trim()),
      scheduleState: schedule,
    };
  } catch (error) {
    return { status: 'ERROR', isSessionOpen: false, hasToken: false, scheduleState: null };
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

    // 📅 Verify Schedule Window & Auto-Accessibility
    const now = new Date();
    const schedule = getExamScheduleState(exam.startTime, exam.endTime, exam.status, now);

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

    const isSessionAllowed = exam.status === 'ACTIVE' || (exam.status === 'PUBLISHED' && schedule.isAccessible);
    if (!isSessionAllowed) {
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

    // Create new attempt with verified student info
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
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers: JSON.stringify(answers),
        tabSwitchCount,
      },
      select: {
        id: true,
        status: true,
        isBlocked: true,
        extraTimeMinutes: true,
        score: true,
        totalCorrect: true,
        totalQuestions: true,
      },
    });
    return {
      success: true,
      status: updated.status,
      isBlocked: updated.isBlocked,
      extraTimeMinutes: updated.extraTimeMinutes,
      score: updated.score,
      totalCorrect: updated.totalCorrect,
      totalQuestions: updated.totalQuestions,
    };
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

    // 🎓 Auto-Sync Nilai Ujian ke Transkrip Nilai Siswa (StudentGrade)
    try {
      const studentName = attempt.studentName;
      const examTitleUpper = (attempt.exam.title || '').toUpperCase();
      const examSubjectUpper = (attempt.exam.subject || '').toUpperCase();

      // Cari mapel terkait di database
      const matchedSubject = await prisma.subject.findFirst({
        where: {
          OR: [
            { name: { contains: attempt.exam.subject, mode: 'insensitive' } },
            { code: { contains: attempt.exam.subject, mode: 'insensitive' } },
          ],
        },
      });

      if (matchedSubject && studentName) {
        const existingGrade = await prisma.studentGrade.findFirst({
          where: {
            subjectId: matchedSubject.id,
            studentName: studentName,
          },
        });

        const isMidExam = examTitleUpper.includes('UTS') || examTitleUpper.includes('PTS') || examTitleUpper.includes('TENGAH');
        const isFinalExam = examTitleUpper.includes('UAS') || examTitleUpper.includes('PAS') || examTitleUpper.includes('AKHIR');

        let assignment = existingGrade ? existingGrade.assignment : 85;
        let midExam = existingGrade ? existingGrade.midExam : 80;
        let finalExam = existingGrade ? existingGrade.finalExam : 85;

        if (isMidExam) {
          midExam = finalScaledScore;
        } else if (isFinalExam) {
          finalExam = finalScaledScore;
        } else {
          // Kuis atau Penilaian Harian
          assignment = finalScaledScore;
        }

        // Hitung nilai akhir berbobot: Tugas & Kuis 30%, UTS 30%, UAS 40%
        const weightedScore = (assignment * 0.3) + (midExam * 0.3) + (finalExam * 0.4);
        let finalGradeLetter = 'B';
        if (weightedScore >= 90) finalGradeLetter = 'A';
        else if (weightedScore >= 85) finalGradeLetter = 'A-';
        else if (weightedScore >= 80) finalGradeLetter = 'B+';
        else if (weightedScore >= 75) finalGradeLetter = 'B';
        else if (weightedScore >= 70) finalGradeLetter = 'C';
        else finalGradeLetter = 'D';

        if (existingGrade) {
          await prisma.studentGrade.update({
            where: { id: existingGrade.id },
            data: {
              assignment,
              midExam,
              finalExam,
              finalGrade: finalGradeLetter,
              updatedBy: 'Sistem CBT Otomatis',
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.studentGrade.create({
            data: {
              subjectId: matchedSubject.id,
              studentName: studentName,
              studentNis: attempt.studentNis || undefined,
              studentClass: attempt.studentClass || 'XI RPL 1',
              assignment,
              midExam,
              finalExam,
              finalGrade: finalGradeLetter,
              updatedBy: 'Sistem CBT Otomatis',
            },
          });
        }
      }
    } catch (gradeSyncErr) {
      console.error('Auto-sync grade from CBT error:', gradeSyncErr);
    }

    revalidatePath(`/admin/cbt/${attempt.examId}`);
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/siswa');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/admin/mapel');

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
