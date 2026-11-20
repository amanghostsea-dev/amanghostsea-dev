import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rotateExamToken } from '@/app/admin/cbt/actions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawExamId = searchParams.get('examId');

    if (!rawExamId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 });
    }

    const examIds = rawExamId.split(',').map((s) => s.trim()).filter(Boolean);
    const primaryExamId = examIds[0] || rawExamId;

    // 1. Ambil data paket ujian terkini untuk sinkronisasi token Guru & Pengawas
    let exam = await prisma.exam.findUnique({
      where: { id: primaryExamId },
      select: {
        id: true,
        status: true,
        token: true,
        updatedAt: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // 2. 🔄 Dynamic 10-Minute Rolling Token Auto-Reset (600 detik)
    // Jika sesi AKTIF dan sudah >= 10 menit (600 detik) sejak rotasi terakhir:
    let elapsedSeconds = Math.floor((Date.now() - new Date(exam.updatedAt).getTime()) / 1000);
    if (exam.status === 'ACTIVE' && elapsedSeconds >= 600) {
      const rotateRes = await rotateExamToken(exam.id);
      if (rotateRes.success && rotateRes.displayToken) {
        exam.token = rotateRes.token || rotateRes.displayToken;
        exam.updatedAt = new Date();
        elapsedSeconds = 0;
      }
    }

    const remainingSeconds = Math.max(0, 600 - (elapsedSeconds % 600));

    // 3. Ambil data attempts siswa di ruangan (mendukung multi-exam untuk sesi paralel agama)
    const attempts = await prisma.examAttempt.findMany({
      where: examIds.length > 1 ? { examId: { in: examIds } } : { examId: primaryExamId },
      select: {
        id: true,
        examId: true,
        studentName: true,
        studentNis: true,
        studentClass: true,
        answers: true,
        score: true,
        totalQuestions: true,
        totalCorrect: true,
        status: true,
        tabSwitchCount: true,
        extraTimeMinutes: true,
        isBlocked: true,
        proctorNotes: true,
        startedAt: true,
        submittedAt: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({
      attempts,
      exam: {
        id: exam.id,
        status: exam.status,
        token: exam.token,
        displayToken: exam.token ? exam.token.split('|')[0].trim() : '',
        updatedAt: exam.updatedAt,
        remainingSeconds,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

