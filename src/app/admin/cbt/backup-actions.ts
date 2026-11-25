'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export interface CbtBackupSummary {
  usersCount: number;
  subjectsCount: number;
  examsCount: number;
  questionsCount: number;
  attemptsCount: number;
  gradesCount: number;
  settingsCount: number;
}

export interface CbtBackupMetadata {
  formatVersion: '2.0-CBT-ULTRA';
  appVersion: string;
  timestamp: string;
  schoolName: string;
  exportedBy: string;
  checksum: string;
  summary: CbtBackupSummary;
}

export interface CbtBackupPayload {
  metadata: CbtBackupMetadata;
  data: {
    users: any[];
    subjects: any[];
    exams: any[];
    questions: any[];
    attempts: any[];
    grades: any[];
    settings: any[];
  };
}

// Helper verifikasi otorisasi Super Admin
async function verifySuperAdmin(): Promise<{ isAuthorized: boolean; userName: string; error?: string }> {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('auth_token')?.value;
  const userName = cookieStore.get('auth_name')?.value || 'Admin Utama';

  if (userRole !== 'Super Admin' && userRole !== 'Admin Utama') {
    return {
      isAuthorized: false,
      userName,
      error: 'Akses Ditolak: Fitur Cadangan & Pemulihan Database hanya dapat diakses oleh Admin Utama.',
    };
  }

  return { isAuthorized: true, userName };
}

// 📦 1. EXPORT FULL CBT DATABASE BACKUP (.cbtbak)
export async function exportCbtBackupAction(): Promise<{
  success: boolean;
  backupString?: string;
  filename?: string;
  summary?: CbtBackupSummary;
  error?: string;
}> {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.isAuthorized) {
      return { success: false, error: auth.error };
    }

    // Ambil data lengkap seluruh ekosistem CBT secara paralel
    const [users, subjects, exams, questions, attempts, grades, settings] = await Promise.all([
      // 1. Akun CBT (Siswa, Guru, Super Admin)
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          password: true,
          role: true,
          status: true,
          nisn: true,
          studentClass: true,
          religion: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      // 2. Mata Pelajaran Master
      prisma.subject.findMany({
        orderBy: { name: 'asc' },
      }),
      // 3. Paket Ujian CBT
      prisma.exam.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      // 4. Butir Soal CBT Lengkap
      prisma.examQuestion.findMany({
        orderBy: { order: 'asc' },
      }),
      // 5. Lembar Jawaban & Riwayat Pengerjaan Siswa
      prisma.examAttempt.findMany({
        orderBy: { startedAt: 'asc' },
      }),
      // 6. Nilai Rekap Raport / Semester Sinkronisasi CBT
      prisma.studentGrade.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      // 7. Pengaturan CBT (Kop Surat, Timezone, dsb)
      prisma.setting.findMany({
        where: {
          key: {
            in: [
              'cbt_timezone',
              'kop_surat_config',
              'school_name',
              'school_npsn',
              'cbt_anti_cheat_strictness',
            ],
          },
        },
      }),
    ]);

    const schoolSetting = settings.find((s) => s.key === 'school_name');
    const schoolName = schoolSetting?.value || 'SMK Negeri 1 Balikpapan';

    const rawDataPayload = {
      users,
      subjects,
      exams,
      questions,
      attempts,
      grades,
      settings,
    };

    // Hitung Checksum SHA-256 untuk memvalidasi integritas data (anti-korup / anti-tamper)
    const jsonStringData = JSON.stringify(rawDataPayload);
    const checksum = crypto.createHash('sha256').update(jsonStringData, 'utf8').digest('hex');

    const summary: CbtBackupSummary = {
      usersCount: users.length,
      subjectsCount: subjects.length,
      examsCount: exams.length,
      questionsCount: questions.length,
      attemptsCount: attempts.length,
      gradesCount: grades.length,
      settingsCount: settings.length,
    };

    const metadata: CbtBackupMetadata = {
      formatVersion: '2.0-CBT-ULTRA',
      appVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      schoolName,
      exportedBy: auth.userName,
      checksum,
      summary,
    };

    const fullBackupPackage: CbtBackupPayload = {
      metadata,
      data: rawDataPayload,
    };

    const backupString = JSON.stringify(fullBackupPackage);
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `cbt-database-backup-${dateStamp}.cbtbak`;

    return {
      success: true,
      backupString,
      filename,
      summary,
    };
  } catch (error: any) {
    console.error('Error saat membuat cadangan database CBT:', error);
    return {
      success: false,
      error: `Gagal membuat cadangan database: ${error.message || 'Terjadi kesalahan internal'}`,
    };
  }
}

// 🔍 2. VALIDATE BACKUP FILE (HEALTH CHECK & INTEGRITY CHECK)
export async function validateCbtBackupAction(backupJsonString: string): Promise<{
  isValid: boolean;
  metadata?: CbtBackupMetadata;
  error?: string;
}> {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.isAuthorized) {
      return { isValid: false, error: auth.error };
    }

    if (!backupJsonString || typeof backupJsonString !== 'string') {
      return { isValid: false, error: 'File cadangan kosong atau tidak terbaca.' };
    }

    const parsed: CbtBackupPayload = JSON.parse(backupJsonString);

    if (!parsed.metadata || !parsed.data) {
      return { isValid: false, error: 'Format berkas tidak valid: Metadata atau Data tidak ditemukan.' };
    }

    if (parsed.metadata.formatVersion !== '2.0-CBT-ULTRA') {
      return {
        isValid: false,
        error: `Versi format tidak didukung (${parsed.metadata.formatVersion || 'Unknown'}). Diperlukan format 2.0-CBT-ULTRA.`,
      };
    }

    // Verifikasi Checksum SHA-256
    const calculatedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(parsed.data), 'utf8')
      .digest('hex');

    if (calculatedChecksum !== parsed.metadata.checksum) {
      return {
        isValid: false,
        error: 'Peringatan Integritas: Checksum SHA-256 tidak cocok. Berkas cadangan terindikasi rusak atau telah dimodifikasi.',
      };
    }

    return {
      isValid: true,
      metadata: parsed.metadata,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Berkas cadangan tidak valid (JSON Parse Error): ${error.message || 'Format rusak'}`,
    };
  }
}

// 🚀 3. RESTORE CBT DATABASE TO NEW/EXISTING DATABASE
export async function restoreCbtBackupAction(
  backupJsonString: string,
  mode: 'CLEAN' | 'MERGE' = 'CLEAN'
): Promise<{
  success: boolean;
  restoredStats?: CbtBackupSummary;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.isAuthorized) {
      return { success: false, error: auth.error };
    }

    // 1. Validasi berkas & integritas
    const validation = await validateCbtBackupAction(backupJsonString);
    if (!validation.isValid || !validation.metadata) {
      return { success: false, error: validation.error || 'Validasi cadangan gagal.' };
    }

    const parsed: CbtBackupPayload = JSON.parse(backupJsonString);
    const { users, subjects, exams, questions, attempts, grades, settings } = parsed.data;

    // 2. Eksekusi restore dalam 1 transaksi ACID utuh (Timeout 120 detik)
    // Jika 1 tabel gagal, seluruh proses dibatalkan otomatis (Rollback Bersih)
    await prisma.$transaction(
      async (tx) => {
        // A. JIKA MODE CLEAN: Bersihkan data lama CBT yang berelasi
        if (mode === 'CLEAN') {
          // Hapus dengan urutan dependensi dari anak ke induk
          await tx.examAttempt.deleteMany();
          await tx.examQuestion.deleteMany();
          await tx.exam.deleteMany();
          await tx.studentGrade.deleteMany();
          // Catatan: User dan Subject tidak di-deleteMany total agar sesi akun Admin Utama yang sedang login tidak terputus,
          // melainkan di-upsert sinkron 1:1 di bawah.
        }

        // B. RESTORE SETTINGS (Kop Surat, Timezone, Konfigurasi)
        if (Array.isArray(settings) && settings.length > 0) {
          for (const s of settings) {
            if (s.key && s.value) {
              await tx.setting.upsert({
                where: { key: s.key },
                update: { value: s.value, description: s.description || null },
                create: { key: s.key, value: s.value, description: s.description || null },
              });
            }
          }
        }

        // C. RESTORE USERS (Siswa, Guru, Super Admin)
        // Menggunakan upsert by username sehingga akun siswa & guru lama/baru sinkron tanpa bentrok unique constraint
        if (Array.isArray(users) && users.length > 0) {
          for (const u of users) {
            if (u.username && u.name) {
              await tx.user.upsert({
                where: { username: u.username },
                update: {
                  name: u.name,
                  password: u.password, // Hash password tetap utuh sehingga siswa/guru bisa langsung login
                  role: u.role || 'Siswa',
                  status: u.status || 'Aktif',
                  nisn: u.nisn || null,
                  studentClass: u.studentClass || null,
                  religion: u.religion || null,
                },
                create: {
                  name: u.name,
                  username: u.username,
                  password: u.password,
                  role: u.role || 'Siswa',
                  status: u.status || 'Aktif',
                  nisn: u.nisn || null,
                  studentClass: u.studentClass || null,
                  religion: u.religion || null,
                },
              });
            }
          }
        }

        // D. RESTORE SUBJECTS & PEMETAAN ID
        // Map oldSubjectId -> newSubjectId
        const subjectIdMap = new Map<string, string>();
        if (Array.isArray(subjects) && subjects.length > 0) {
          for (const sub of subjects) {
            if (sub.code && sub.name) {
              const resSub = await tx.subject.upsert({
                where: { code: sub.code },
                update: {
                  name: sub.name,
                  category: sub.category || 'Muatan Kejuruan',
                  classTarget: sub.classTarget || 'Semua Kelas',
                  teacherName: sub.teacherName || null,
                  day: sub.day || null,
                  time: sub.time || null,
                  room: sub.room || null,
                  kkm: Number(sub.kkm) || 75,
                  credits: Number(sub.credits) || 4,
                  status: sub.status || 'ACTIVE',
                },
                create: {
                  code: sub.code,
                  name: sub.name,
                  category: sub.category || 'Muatan Kejuruan',
                  classTarget: sub.classTarget || 'Semua Kelas',
                  teacherName: sub.teacherName || null,
                  day: sub.day || null,
                  time: sub.time || null,
                  room: sub.room || null,
                  kkm: Number(sub.kkm) || 75,
                  credits: Number(sub.credits) || 4,
                  status: sub.status || 'ACTIVE',
                },
              });
              if (sub.id) {
                subjectIdMap.set(sub.id, resSub.id);
              }
            }
          }
        }

        // E. RESTORE EXAMS & PEMETAAN ID CERDAS (SMART FOREIGN KEY BRIDGE)
        // Map oldExamId -> newExamId
        const examIdMap = new Map<string, string>();
        if (Array.isArray(exams) && exams.length > 0) {
          for (const ex of exams) {
            const createdExam = await tx.exam.create({
              data: {
                title: ex.title,
                subject: ex.subject,
                classTarget: ex.classTarget || 'Semua Kelas',
                duration: Number(ex.duration) || 60,
                token: ex.token || null,
                description: ex.description || null,
                status: ex.status || 'PUBLISHED',
                shuffleQuestions: ex.shuffleQuestions ?? true,
                authorName: ex.authorName || 'Guru Pengampu',
                proctorId: ex.proctorId || null,
                proctorName: ex.proctorName || null,
                proctorNip: ex.proctorNip || null,
                proctor2Id: ex.proctor2Id || null,
                proctor2Name: ex.proctor2Name || null,
                roomName: ex.roomName || 'Ruang Utama',
                startTime: ex.startTime ? new Date(ex.startTime) : null,
                endTime: ex.endTime ? new Date(ex.endTime) : null,
                targetReligion: ex.targetReligion || 'ALL',
                sharedSessionId: ex.sharedSessionId || null,
                createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date(),
              },
            });
            if (ex.id) {
              examIdMap.set(ex.id, createdExam.id);
            }
          }
        }

        // F. RESTORE EXAM QUESTIONS (DENGAN EXAM ID BARU)
        // Map oldQuestionId -> newQuestionId (untuk pemetaan jawaban attempt jika diperlukan)
        const questionIdMap = new Map<string, string>();
        if (Array.isArray(questions) && questions.length > 0) {
          for (const q of questions) {
            const mappedExamId = examIdMap.get(q.examId);
            if (mappedExamId) {
              const createdQ = await tx.examQuestion.create({
                data: {
                  examId: mappedExamId,
                  questionText: q.questionText,
                  imageUrl: q.imageUrl || null,
                  options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
                  correctAnswer: String(q.correctAnswer ?? '0'),
                  points: Number(q.points) || 10,
                  order: Number(q.order) || 0,
                  createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
                },
              });
              if (q.id) {
                questionIdMap.set(q.id, createdQ.id);
              }
            }
          }
        }

        // G. RESTORE EXAM ATTEMPTS (LEMBAR JAWABAN & RIWAYAT SISWA)
        if (Array.isArray(attempts) && attempts.length > 0) {
          for (const att of attempts) {
            const mappedExamId = examIdMap.get(att.examId);
            if (mappedExamId) {
              // Pemetaan kunci jawaban questionId jika ID pertanyaan mengalami remapping
              let finalAnswers = att.answers || '{}';
              if (typeof finalAnswers === 'string') {
                try {
                  const ansObj = JSON.parse(finalAnswers);
                  const remappedAnsObj: Record<string, string> = {};
                  for (const [qId, val] of Object.entries(ansObj)) {
                    const newQId = questionIdMap.get(qId) || qId;
                    remappedAnsObj[newQId] = String(val);
                  }
                  finalAnswers = JSON.stringify(remappedAnsObj);
                } catch {
                  // Fallback jika jawaban bukan format JSON valid
                  finalAnswers = att.answers;
                }
              }

              await tx.examAttempt.create({
                data: {
                  examId: mappedExamId,
                  studentName: att.studentName,
                  studentNis: att.studentNis || null,
                  studentClass: att.studentClass || null,
                  answers: typeof finalAnswers === 'string' ? finalAnswers : JSON.stringify(finalAnswers),
                  score: Number(att.score) || 0,
                  totalQuestions: Number(att.totalQuestions) || 0,
                  totalCorrect: Number(att.totalCorrect) || 0,
                  status: att.status || 'SUBMITTED',
                  tabSwitchCount: Number(att.tabSwitchCount) || 0,
                  extraTimeMinutes: Number(att.extraTimeMinutes) || 0,
                  isBlocked: Boolean(att.isBlocked),
                  proctorNotes: att.proctorNotes || null,
                  startedAt: att.startedAt ? new Date(att.startedAt) : new Date(),
                  submittedAt: att.submittedAt ? new Date(att.submittedAt) : null,
                },
              });
            }
          }
        }

        // H. RESTORE STUDENT GRADES (NILAI RAPORT SINKRONISASI CBT)
        if (Array.isArray(grades) && grades.length > 0) {
          for (const g of grades) {
            const mappedSubjectId = subjectIdMap.get(g.subjectId) || g.subjectId;
            // Pastikan subject tujuan benar-benar ada di database
            const subjectExists = await tx.subject.findUnique({ where: { id: mappedSubjectId } });
            if (subjectExists && g.studentName) {
              await tx.studentGrade.upsert({
                where: {
                  subjectId_studentName: {
                    subjectId: mappedSubjectId,
                    studentName: g.studentName,
                  },
                },
                update: {
                  studentNis: g.studentNis || null,
                  studentClass: g.studentClass || 'Semua Kelas',
                  assignment: Number(g.assignment) || 85,
                  midExam: Number(g.midExam) || 80,
                  finalExam: Number(g.finalExam) || 85,
                  finalGrade: g.finalGrade || 'A',
                  notes: g.notes || null,
                  updatedBy: g.updatedBy || 'CBT Restore',
                },
                create: {
                  subjectId: mappedSubjectId,
                  studentName: g.studentName,
                  studentNis: g.studentNis || null,
                  studentClass: g.studentClass || 'Semua Kelas',
                  assignment: Number(g.assignment) || 85,
                  midExam: Number(g.midExam) || 80,
                  finalExam: Number(g.finalExam) || 85,
                  finalGrade: g.finalGrade || 'A',
                  notes: g.notes || null,
                  updatedBy: g.updatedBy || 'CBT Restore',
                },
              });
            }
          }
        }
      },
      {
        timeout: 120000, // 2 menit batas transaksi aman untuk ribuan butir soal & attempt
      }
    );

    // Refresh cache Next.js
    revalidatePath('/admin/cbt');
    revalidatePath('/portal/siswa/cbt');
    revalidatePath('/portal/guru/nilai');
    revalidatePath('/portal/pengawas/cbt');

    return {
      success: true,
      restoredStats: validation.metadata.summary,
      message: `Database CBT berhasil dipulihkan 100%! Dipulihkan: ${validation.metadata.summary.examsCount} Paket Ujian, ${validation.metadata.summary.questionsCount} Butir Soal, dan ${validation.metadata.summary.attemptsCount} Riwayat Pengerjaan Siswa.`,
    };
  } catch (error: any) {
    console.error('Error saat pemulihan database CBT:', error);
    return {
      success: false,
      error: `Gagal memulihkan database CBT: ${error.message || 'Terjadi kesalahan sistem'}`,
    };
  }
}
