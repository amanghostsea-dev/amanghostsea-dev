'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { formatScheduleDate, formatScheduleTime, getExamScheduleState, isExamTokenActive, isClassTargetMatch, formatClassTargetDisplay } from '@/lib/cbt-schedule';
import { getCbtTimezone } from '@/lib/settings';
import { touchDeviceSession } from '@/lib/device-session';

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
        duration: true,
        updatedAt: true,
      },
    });

    if (!exam) {
      return { status: 'NOT_FOUND', isSessionOpen: false, hasToken: false, scheduleState: null, isTokenActive: false };
    }

    const tokenStatus = isExamTokenActive(exam);
    const schedule = getExamScheduleState(exam.startTime, exam.endTime, exam.status, new Date(), exam.updatedAt, exam.duration);

    return {
      status: exam.status || 'UNKNOWN',
      isSessionOpen: tokenStatus.isActive,
      hasToken: Boolean(exam.token && exam.token.trim()),
      scheduleState: schedule,
      isTokenActive: tokenStatus.isActive,
      tokenStatus,
    };
  } catch (error) {
    return { status: 'ERROR', isSessionOpen: false, hasToken: false, scheduleState: null, isTokenActive: false };
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
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' },
          ],
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

    const cleanName = data.studentName.trim();
    const cleanNis = data.studentNis?.trim();

    // 🔄 1. AUTO-RESUME: Jika siswa SUDAH memiliki sesi ujian aktif (IN_PROGRESS atau SUBMITTED),
    // langsung lanjutkan pengerjaan tanpa perlu memasukkan token ulang!
    const existing = await prisma.examAttempt.findFirst({
      where: {
        examId: data.examId,
        OR: [
          { studentName: { equals: cleanName, mode: 'insensitive' } },
          ...(cleanNis ? [{ studentNis: cleanNis }] : []),
        ],
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      return { success: true, attempt: existing, questions: exam.questions, isResumed: true };
    }

    // 📅 2. JIKA ATTEMPT BARU: Verify Schedule Window & Token Activation
    const now = new Date();
    const tokenStatus = isExamTokenActive(exam, now);
    const schedule = getExamScheduleState(exam.startTime, exam.endTime, exam.status, now, exam.updatedAt, exam.duration);
    const cbtTimezone = await getCbtTimezone();

    if (tokenStatus.isExpired && !tokenStatus.isActive) {
      const endTimeText = exam.endTime ? `${formatScheduleDate(exam.endTime, cbtTimezone)} pukul ${formatScheduleTime(exam.endTime, cbtTimezone)}` : 'jadwal yang ditentukan';
      return { 
        error: `Waktu pengerjaan ujian ini telah berakhir pada ${endTimeText}. Token ujian telah otomatis dinonaktifkan. Silakan hubungi pengawas jika Anda dijadwalkan mengikuti sesi susulan.` 
      };
    }

    if (exam.startTime && now < exam.startTime && !tokenStatus.isActive) {
      return { 
        error: `Ujian ini belum dimulai. Sesuai jadwal, ujian baru dapat diakses pada ${formatScheduleDate(exam.startTime, cbtTimezone)} pukul ${formatScheduleTime(exam.startTime, cbtTimezone)}.` 
      };
    }

    if (!tokenStatus.isActive) {
      return { 
        error: 'Sesi ujian kelas ini belum dibuka oleh pengawas di kelas. Harap tunggu di Ruang Tunggu atau mintakan token aktif ke pengawas.' 
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

    // 🔒 STRICT CLASS TARGET VERIFICATION (ANTI SALAH KAMAR & BOCOR SOAL)
    let verifiedClass = data.studentClass;
    if (data.studentNis || data.studentName) {
      const userRec = await prisma.user.findFirst({
        where: {
          OR: [
            ...(data.studentNis ? [{ username: data.studentNis }, { nisn: data.studentNis }] : []),
            { name: { equals: data.studentName, mode: 'insensitive' as const } },
          ],
        },
        select: { studentClass: true },
      });
      if (userRec?.studentClass) {
        verifiedClass = userRec.studentClass;
      } else {
        const gradeRec = await prisma.studentGrade.findFirst({
          where: {
            OR: [
              ...(data.studentNis ? [{ studentNis: data.studentNis }] : []),
              { studentName: { equals: data.studentName, mode: 'insensitive' as const } },
            ],
          },
          select: { studentClass: true },
        });
        if (gradeRec?.studentClass) {
          verifiedClass = gradeRec.studentClass;
        }
      }
    }

    if (verifiedClass) {
      const isClassAllowed = isClassTargetMatch(exam.classTarget, verifiedClass);
      if (!isClassAllowed) {
        return {
          error: `Salah Kamar Ujian: Paket ujian ini khusus untuk ${formatClassTargetDisplay(exam.classTarget, true)}, sedangkan Anda terdaftar di kelas "${verifiedClass}". Silakan minta token kelas Anda ke pengawas.`
        };
      }
    }

    // Create new attempt with verified student info
    const newAttempt = await prisma.examAttempt.create({
      data: {
        examId: data.examId,
        studentName: cleanName,
        studentNis: cleanNis || null,
        studentClass: verifiedClass || data.studentClass || null,
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
    const current = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { proctorNotes: true, isBlocked: true, tabSwitchCount: true, studentName: true, studentNis: true },
    });

    if (!current) {
      return { error: 'Data pengerjaan tidak ditemukan.' };
    }

    // 💓 Heartbeat: Perbarui lastActive sesi perangkat siswa secara otomatis di latar belakang
    if (current.studentNis || current.studentName) {
      prisma.user.findFirst({
        where: {
          OR: [
            ...(current.studentNis ? [{ nisn: current.studentNis }, { username: current.studentNis }] : []),
            { name: { equals: current.studentName, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true },
      }).then((u) => {
        if (u) touchDeviceSession(u.id).catch(() => {});
      }).catch(() => {});
    }

    const hasAdminOverride = 
      current.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || 
      current.proctorNotes?.includes('[ADMIN_UNBLOCK]');

    const hasProctorPermission = 
      hasAdminOverride ||
      current.proctorNotes?.includes('[IZIN_LANJUT_P2]') || 
      current.proctorNotes?.includes('[RESET_PENGAWAS]');

    const hasProctorFatalPermission =
      current.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]');

    // 🛡️ Jika Admin Utama telah membuka suspend: Siswa memiliki tag [ADMIN_UNBLOCK_ACTIVE] dan isBlocked === false
    const isUnblockedByAdmin = 
      !current.isBlocked &&
      Boolean(current.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]'));

    let effectiveTabCount = Math.max(current.tabSwitchCount || 0, tabSwitchCount);
    let shouldBlock = current.isBlocked;
    let newNotes = current.proctorNotes || '';
    let isDisqualified = false;

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 🛡️ PROGRESSIVE 5-TIER CBT ENFORCEMENT
    if (effectiveTabCount >= 5) {
      // 🛑 PELANGGARAN KE-5: Diskualifikasi Otomatis (Auto-Submit Permanen)
      isDisqualified = true;
      shouldBlock = true;
      // Cabut dispensasi lama Strike 3 karena siswa sudah melanggar hingga batas final ke-5
      newNotes = newNotes.replace(/\[ADMIN_UNBLOCK_ACTIVE\]/g, '').trim();
      if (!newNotes.includes('[DISKUALIFIKASI_FINAL]')) {
        const dsqMsg = `[DISKUALIFIKASI_FINAL] DISKUALIFIKASI TOTAL: Siswa melakukan pelanggaran ke-5 pada ${timeStr} setelah 2x dispensasi (Admin Utama & Pengawas). Ujian diakhiri otomatis.`;
        newNotes = newNotes ? `${newNotes} | ${dsqMsg}` : dsqMsg;
      }
    } else if (effectiveTabCount === 4) {
      // 🚨 PELANGGARAN KE-4: Fatal Strike Pasca-Dispensasi Admin Utama
      // Hanya terkunci jika pengawas belum memberikan izin darurat [FATAL_PROCTOR_UNBLOCKED]
      if (!hasProctorFatalPermission) {
        shouldBlock = true;
        // Cabut dispensasi lama Strike 3 karena siswa telah melakukan pelanggaran fatal ke-4
        newNotes = newNotes.replace(/\[ADMIN_UNBLOCK_ACTIVE\]/g, '').trim();
        if (!newNotes.includes('[STRIKE_4_FATAL]')) {
          const s4Msg = `[STRIKE_4_FATAL] PELANGGARAN FATAL KE-4 pada ${timeStr} (Pasca Dispensasi Admin CBT). Pengerjaan Terkunci Kritis - Wajib Izin Darurat Pengawas Ruang!`;
          newNotes = newNotes ? `${newNotes} | ${s4Msg}` : s4Msg;
        }
      } else {
        shouldBlock = false;
      }
    } else if (effectiveTabCount === 3) {
      // ⛔ PELANGGARAN KE-3: Suspend Total Sistem (Wajib Admin Utama)
      if (!isUnblockedByAdmin) {
        shouldBlock = true;
        if (!newNotes.includes('[STRIKE_3_BLOKIR]')) {
          const strike3Msg = `[STRIKE_3_BLOKIR] DIBLOKIR OTOMATIS SISTEM: 3x Pelanggaran Tata Tertib (Pindah Tab/Layar) pada ${timeStr}. Pengerjaan dihentikan permanen. Wajib Lapor ke Admin Utama!`;
          newNotes = newNotes ? `${newNotes} | ${strike3Msg}` : strike3Msg;
        }
      } else {
        shouldBlock = false;
      }
    } else if (effectiveTabCount === 2) {
      // 🚫 PELANGGARAN KE-2: Terkunci Sementara (Wajib Pengawas)
      if (!hasProctorPermission && !newNotes.includes('[STRIKE_2_TERKUNCI]')) {
        const strike2Msg = `[STRIKE_2_TERKUNCI] Pelanggaran ke-2 pada ${timeStr} (Pengerjaan Soal Terkunci Sementara Menunggu Pengawas)`;
        newNotes = newNotes ? `${newNotes} | ${strike2Msg}` : strike2Msg;
      }
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers: JSON.stringify(answers),
        tabSwitchCount: effectiveTabCount,
        isBlocked: shouldBlock,
        proctorNotes: newNotes,
        ...(isDisqualified ? { status: 'SUBMITTED', submittedAt: new Date() } : {}),
      },
      select: {
        id: true,
        status: true,
        isBlocked: true,
        tabSwitchCount: true,
        proctorNotes: true,
        extraTimeMinutes: true,
        score: true,
        totalCorrect: true,
        totalQuestions: true,
      },
    });

    const isStrike2Locked = updated.tabSwitchCount === 2 && !hasProctorPermission && !updated.isBlocked;
    const isStrike4FatalLocked = updated.tabSwitchCount === 4 && !hasProctorFatalPermission && updated.isBlocked;

    return {
      success: true,
      status: updated.status,
      isBlocked: updated.isBlocked,
      isStrike2Locked,
      isStrike4FatalLocked,
      hasProctorPermission,
      hasProctorFatalPermission,
      tabSwitchCount: updated.tabSwitchCount,
      proctorNotes: updated.proctorNotes,
      extraTimeMinutes: updated.extraTimeMinutes,
      score: updated.score,
      totalCorrect: updated.totalCorrect,
      totalQuestions: updated.totalQuestions,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function checkStudentExamLockStatus(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        isBlocked: true,
        tabSwitchCount: true,
        proctorNotes: true,
        extraTimeMinutes: true,
      },
    });

    if (!attempt) return { error: 'Attempt tidak ditemukan' };

    const hasAdminOverride = 
      attempt.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || 
      attempt.proctorNotes?.includes('[ADMIN_UNBLOCK]');

    const hasProctorPermission = 
      hasAdminOverride ||
      attempt.proctorNotes?.includes('[IZIN_LANJUT_P2]') || 
      attempt.proctorNotes?.includes('[RESET_PENGAWAS]');

    const isStrike2Locked = attempt.tabSwitchCount === 2 && !hasProctorPermission && !attempt.isBlocked;

    return {
      success: true,
      isBlocked: attempt.isBlocked,
      isStrike2Locked,
      hasProctorPermission,
      tabSwitchCount: attempt.tabSwitchCount,
      proctorNotes: attempt.proctorNotes,
      extraTimeMinutes: attempt.extraTimeMinutes,
      status: attempt.status,
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
              studentClass: attempt.studentClass || 'XI TJKT 1',
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

/**
 * 🔄 Cek Status Realtime Attempt Siswa (Cek Buka Suspend / Status Terkini)
 */
export async function checkAttemptStatusAction(attemptId: string) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        isBlocked: true,
        tabSwitchCount: true,
        proctorNotes: true,
        extraTimeMinutes: true,
      },
    });

    if (!attempt) {
      return { error: 'Data pengerjaan tidak ditemukan.' };
    }

    const hasAdminOverride = 
      attempt.proctorNotes?.includes('[ADMIN_UNBLOCK_ACTIVE]') || 
      attempt.proctorNotes?.includes('[ADMIN_UNBLOCK]');

    const hasProctorFatalPermission = 
      attempt.proctorNotes?.includes('[FATAL_PROCTOR_UNBLOCKED]');

    const isUnblocked = !attempt.isBlocked && (
      (attempt.tabSwitchCount === 4 && hasProctorFatalPermission) ||
      (attempt.tabSwitchCount === 3 && hasAdminOverride) ||
      attempt.tabSwitchCount < 3
    );

    return {
      success: true,
      attempt,
      isUnblocked,
      tabSwitchCount: attempt.tabSwitchCount,
      isBlocked: attempt.isBlocked,
      proctorNotes: attempt.proctorNotes,
      hasAdminOverride,
      hasProctorFatalPermission,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
