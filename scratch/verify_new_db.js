const { PrismaClient } = require('@prisma/client');

const NEW_DB_URL = 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require';

const prisma = new PrismaClient({
  datasources: { db: { url: NEW_DB_URL } }
});

async function verify() {
  console.log('=== VERIFIKASI DATA DATABASE BARU ===');
  const userCount = await prisma.user.count();
  const examCount = await prisma.exam.count();
  const questionCount = await prisma.examQuestion.count();
  const attemptCount = await prisma.examAttempt.count();
  const subjectCount = await prisma.subject.count();
  const gradeCount = await prisma.studentGrade.count();
  const jurusanCount = await prisma.jurusan.count();
  const beritaCount = await prisma.berita.count();
  const applicantCount = await prisma.ppdbApplicant.count();

  console.log({
    Users: userCount,
    Exams: examCount,
    Questions: questionCount,
    ExamAttempts: attemptCount,
    Subjects: subjectCount,
    StudentGrades: gradeCount,
    Jurusans: jurusanCount,
    Berita: beritaCount,
    PpdbApplicants: applicantCount
  });

  // Sample recent exam
  const sampleExam = await prisma.exam.findFirst({
    include: { _count: { select: { questions: true, attempts: true } } }
  });
  console.log('Sample Exam:', {
    id: sampleExam.id,
    title: sampleExam.title,
    subject: sampleExam.subject,
    classTarget: sampleExam.classTarget,
    questionCount: sampleExam._count.questions,
    attemptCount: sampleExam._count.attempts
  });

  await prisma.$disconnect();
}

verify();
