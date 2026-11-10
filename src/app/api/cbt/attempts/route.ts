import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 });
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { examId },
      select: {
        id: true,
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

    return NextResponse.json({ attempts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

