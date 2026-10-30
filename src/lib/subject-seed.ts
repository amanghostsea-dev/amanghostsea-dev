import prisma from './prisma';

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

export const DEFAULT_SUBJECTS: DefaultSubjectItem[] = [
  {
    code: 'PWM-01',
    name: 'Pemrograman Web & Mobile',
    category: 'Muatan Kejuruan',
    classTarget: 'XI RPL 1',
    teacherName: 'Abdul Rahman',
    day: 'Senin',
    time: '07:30 - 10:00',
    room: 'Lab Komputer 1',
    kkm: 78,
    credits: 4,
    defaultAssignment: 88,
    defaultMid: 85,
    defaultFinal: 92,
    defaultGrade: 'A',
  },
  {
    code: 'BD-02',
    name: 'Basis Data & SQL Relasional',
    category: 'Muatan Kejuruan',
    classTarget: 'XI RPL 1',
    teacherName: 'Bpk. Budi S.Kom',
    day: 'Selasa',
    time: '07:30 - 09:45',
    room: 'Lab Komputer 2',
    kkm: 78,
    credits: 3,
    defaultAssignment: 90,
    defaultMid: 86,
    defaultFinal: 94,
    defaultGrade: 'A',
  },
  {
    code: 'PBO-03',
    name: 'Pemrograman Berorientasi Objek',
    category: 'Muatan Kejuruan',
    classTarget: 'XI RPL 1',
    teacherName: 'Bpk. Hendra S.T',
    day: 'Kamis',
    time: '07:30 - 10:30',
    room: 'Lab RPL 2',
    kkm: 78,
    credits: 4,
    defaultAssignment: 86,
    defaultMid: 82,
    defaultFinal: 89,
    defaultGrade: 'A-',
  },
  {
    code: 'MTK-04',
    name: 'Matematika Terapan',
    category: 'Muatan Umum',
    classTarget: 'XI RPL 1',
    teacherName: 'Ibu Siti S.Pd',
    day: 'Senin',
    time: '10:15 - 12:30',
    room: 'Ruang Teori 12A',
    kkm: 75,
    credits: 3,
    defaultAssignment: 80,
    defaultMid: 76,
    defaultFinal: 84,
    defaultGrade: 'B+',
  },
  {
    code: 'BIG-05',
    name: 'Bahasa Inggris Kejuruan',
    category: 'Muatan Umum',
    classTarget: 'XI RPL 1',
    teacherName: 'Mr. John',
    day: 'Selasa',
    time: '10:00 - 11:30',
    room: 'Ruang 10B',
    kkm: 75,
    credits: 2,
    defaultAssignment: 88,
    defaultMid: 85,
    defaultFinal: 88,
    defaultGrade: 'A-',
  },
  {
    code: 'PKK-06',
    name: 'Produk Kreatif & Kewirausahaan',
    category: 'Muatan Kejuruan',
    classTarget: 'XI RPL 1',
    teacherName: 'Ibu Dewi SE',
    day: 'Kamis',
    time: '10:45 - 13:00',
    room: 'Ruang Kreatif',
    kkm: 78,
    credits: 3,
    defaultAssignment: 92,
    defaultMid: 90,
    defaultFinal: 95,
    defaultGrade: 'A',
  },
  {
    code: 'AIJ-07',
    name: 'Administrasi Infrastruktur Jaringan',
    category: 'Muatan Kejuruan',
    classTarget: 'XI RPL 1',
    teacherName: 'Bpk. Farhan M.T',
    day: 'Rabu',
    time: '07:30 - 10:00',
    room: 'Lab Jaringan',
    kkm: 78,
    credits: 4,
    defaultAssignment: 84,
    defaultMid: 80,
    defaultFinal: 85,
    defaultGrade: 'B+',
  },
  {
    code: 'PABP-08',
    name: 'Pendidikan Agama & Budi Pekerti',
    category: 'Muatan Umum',
    classTarget: 'XI RPL 1',
    teacherName: 'Ust. Nurul Huda M.Pd',
    day: 'Jumat',
    time: '07:00 - 09:00',
    room: 'Masjid Sekolah',
    kkm: 80,
    credits: 2,
    defaultAssignment: 95,
    defaultMid: 92,
    defaultFinal: 96,
    defaultGrade: 'A',
  },
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
 * Memastikan Mapel dasar dan nilai awal siswa terdaftar di PostgreSQL
 * Dioptimalkan agar tidak melakukan loop lambat pada setiap pemanggilan halaman.
 */
export async function ensureDefaultSubjectsAndGrades(targetStudentName?: string, targetStudentNis?: string) {
  try {
    // 1. Inisialisasi awal Mapel jika tabel Subject masih kosong
    const subjectCount = await prisma.subject.count();
    if (subjectCount === 0) {
      for (const def of DEFAULT_SUBJECTS) {
        await prisma.subject.create({
          data: {
            code: def.code,
            name: def.name,
            category: def.category,
            classTarget: def.classTarget,
            teacherName: def.teacherName,
            day: def.day,
            time: def.time,
            room: def.room,
            kkm: def.kkm,
            credits: def.credits,
            status: 'ACTIVE',
          },
        });
      }
    }

    // 2. Jika dipanggil khusus untuk 1 siswa tertentu (misal setelah registrasi baru)
    if (targetStudentName) {
      const activeSubjects = await prisma.subject.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, code: true, classTarget: true, teacherName: true },
      });

      for (const subj of activeSubjects) {
        const defMatch = DEFAULT_SUBJECTS.find((d) => d.code === subj.code);
        const assignment = defMatch ? defMatch.defaultAssignment : 85;
        const midExam = defMatch ? defMatch.defaultMid : 80;
        const finalExam = defMatch ? defMatch.defaultFinal : 85;
        const finalGrade = defMatch ? defMatch.defaultGrade : 'A';

        await prisma.studentGrade.upsert({
          where: {
            subjectId_studentName: {
              subjectId: subj.id,
              studentName: targetStudentName,
            },
          },
          update: {},
          create: {
            subjectId: subj.id,
            studentName: targetStudentName,
            studentNis: targetStudentNis || '10293847',
            studentClass: subj.classTarget,
            assignment,
            midExam,
            finalExam,
            finalGrade,
            notes: 'Kemajuan belajar sangat baik, aktif dalam praktikum dan diskusi kelas.',
            updatedBy: subj.teacherName || 'Admin',
          },
        });
      }
      return { success: true };
    }

    // 3. Jika inisialisasi awal dan StudentGrade masih kosong sama sekali
    const gradeCount = await prisma.studentGrade.count();
    if (gradeCount === 0) {
      const allSubjects = await prisma.subject.findMany({
        where: { status: 'ACTIVE' },
      });

      const dbStudents = await prisma.user.findMany({
        where: { role: 'Siswa' },
        select: { name: true, nisn: true, username: true },
      });

      const seedList = dbStudents.length > 0 
        ? dbStudents.map((s) => ({ name: s.name, nisn: s.nisn || s.username }))
        : [{ name: 'Aman Rahman', nisn: '10293847' }];

      for (const student of seedList) {
        for (const subj of allSubjects) {
          const defMatch = DEFAULT_SUBJECTS.find((d) => d.code === subj.code);
          await prisma.studentGrade.upsert({
            where: {
              subjectId_studentName: {
                subjectId: subj.id,
                studentName: student.name,
              },
            },
            update: {},
            create: {
              subjectId: subj.id,
              studentName: student.name,
              studentNis: student.nisn || '10293847',
              studentClass: subj.classTarget,
              assignment: defMatch?.defaultAssignment ?? 85,
              midExam: defMatch?.defaultMid ?? 80,
              finalExam: defMatch?.defaultFinal ?? 85,
              finalGrade: defMatch?.defaultGrade ?? 'A',
              notes: 'Kemajuan belajar sangat baik, aktif dalam praktikum dan diskusi kelas.',
              updatedBy: subj.teacherName || 'Admin',
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
