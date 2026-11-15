import prisma from './prisma';
import { isClassTargetMatch } from './cbt-schedule';

export interface DefaultSubjectItem {
  code: string;
  name: string;
  category: string;
  classTarget: string;
  teacherName: string;
  day: string;
  time: string;
  room: string;
  kkm: number;
  credits: number;
  defaultAssignment: number;
  defaultMid: number;
  defaultFinal: number;
  defaultGrade: string;
}

// Data dummy lawas dikosongkan agar sistem TIDAK PERNAH menginjeksi mapel fiktif ke database
export const DEFAULT_SUBJECTS: DefaultSubjectItem[] = [];

// Daftar penanda data dummy bawaan yang tidak pernah diinput oleh pengguna
export const LEGACY_DUMMY_CODES = [
  'AIJ-07',
  'BD-02',
  'BIG-05',
  'MTK-04',
  'PABP-08',
  'PBO-03',
  'PKK-06',
  'PWM-01',
];

export const LEGACY_DUMMY_TEACHERS = [
  'Bpk. Farhan M.T',
  'Mr. John',
  'Bpk. Budi S.Kom',
  'Ibu Siti S.Pd',
  'Bpk. Hendra S.T',
  'Ibu Dewi SE',
  'Ust. Nurul Huda M.Pd',
];

export const DUMMY_TEACHER_KEYWORDS = [
  'Guru Pengampu',
  'Anonim',
  'Bpk. Farhan M.T',
  'Farhan M.T',
  'Mr. John',
  'Bpk. Budi S.Kom',
  'Ibu Siti S.Pd',
  'Bpk. Hendra S.T',
  'Ibu Dewi SE',
  'Ust. Nurul Huda M.Pd',
];

export function computeGradePredicate(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  return 'D';
}

export function computeFinalScore(assignment: number, midExam: number, finalExam: number): number {
  return Math.round((assignment * 0.3 + midExam * 0.3 + finalExam * 0.4) * 10) / 10;
}

/**
 * Membersihkan seluruh mata pelajaran dummy (seperti Bpk. Farhan M.T, Mr. John, dll.)
 * yang pernah ter-generate otomatis sebelumnya, sehingga database benar-benar bersih
 * dan murni hanya berisi data yang diinput resmi oleh Guru & Admin Utama.
 */
export async function cleanupLegacyDummySubjects() {
  try {
    const dummySubjects = await prisma.subject.findMany({
      where: {
        OR: [
          { teacherName: { in: LEGACY_DUMMY_TEACHERS } },
          {
            AND: [
              { code: { in: LEGACY_DUMMY_CODES } },
              { teacherName: { in: [...LEGACY_DUMMY_TEACHERS, 'Abdul Rahman'] } },
            ],
          },
        ],
      },
      select: { id: true, code: true, name: true, teacherName: true },
    });

    if (dummySubjects.length > 0) {
      const ids = dummySubjects.map((d) => d.id);
      await prisma.studentGrade.deleteMany({
        where: { subjectId: { in: ids } },
      });
      await prisma.subject.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`[CLEANUP] Berhasil menghapus ${dummySubjects.length} mata pelajaran dummy lawas.`);
    }
  } catch (error) {
    console.error('Error cleaning up legacy dummy subjects:', error);
  }
}

/**
 * Membersihkan seluruh tugas dummy atau tugas dengan nama pengampu anonim ('Guru Pengampu')
 * agar tidak ada lagi tugas fiktif yang muncul di portal siswa.
 */
export async function cleanupLegacyDummyAssignments() {
  try {
    const dummyAssignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { authorName: null },
          { authorName: '' },
          { authorName: { in: DUMMY_TEACHER_KEYWORDS } },
        ],
      },
      select: { id: true, title: true, authorName: true },
    });

    if (dummyAssignments.length > 0) {
      const ids = dummyAssignments.map((a) => a.id);
      await prisma.assignmentSubmission.deleteMany({
        where: { assignmentId: { in: ids } },
      });
      await prisma.assignment.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`[CLEANUP] Berhasil menghapus ${dummyAssignments.length} tugas dummy/anonim.`);
    }
  } catch (error) {
    console.error('Error cleaning up legacy dummy assignments:', error);
  }
}

/**
 * Menghubungkan siswa dengan mata pelajaran resmi yang ada di database.
 * TIDAK PERNAH membuat mata pelajaran dummy baru jika database kosong.
 */
export async function ensureDefaultSubjectsAndGrades(
  targetStudentName?: string,
  targetStudentNis?: string,
  targetStudentClass?: string
) {
  try {
    // 1. Bersihkan sisa mapel dummy lawas dan tugas dummy/anonim jika ada
    await cleanupLegacyDummySubjects();
    await cleanupLegacyDummyAssignments();

    // 2. Jika dipanggil khusus untuk 1 siswa tertentu:
    // Buat placeholder nilai HANYA untuk mata pelajaran resmi yang memang sudah ada di database
    if (targetStudentName) {
      let studentClass = targetStudentClass || '';
      if (!studentClass) {
        const found = await prisma.studentGrade.findFirst({
          where: { studentName: targetStudentName },
          select: { studentClass: true },
        });
        studentClass = found?.studentClass || 'XI TJKT 1';
      }

      const activeSubjects = await prisma.subject.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, code: true, name: true, classTarget: true, teacherName: true },
      });

      // Filter HANYA mata pelajaran yang diperuntukkan bagi kelas siswa
      const relevantSubjects = activeSubjects.filter((subj) =>
        isClassTargetMatch(subj.classTarget, studentClass)
      );

      for (const subj of relevantSubjects) {
        const existingGrade = await prisma.studentGrade.findUnique({
          where: {
            subjectId_studentName: {
              subjectId: subj.id,
              studentName: targetStudentName,
            },
          },
        });

        if (!existingGrade) {
          await prisma.studentGrade.create({
            data: {
              subjectId: subj.id,
              studentName: targetStudentName,
              studentNis: targetStudentNis || undefined,
              studentClass: studentClass,
              assignment: 0,
              midExam: 0,
              finalExam: 0,
              finalGrade: '-',
              notes: 'Menunggu penilaian guru pengampu.',
              updatedBy: subj.teacherName || 'Guru Pengampu',
            },
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('ensureDefaultSubjectsAndGrades error:', error);
    return { error: String(error) };
  }
}
