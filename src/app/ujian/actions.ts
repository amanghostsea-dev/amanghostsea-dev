'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function quickJoinExamAction(formData: FormData) {
  const studentName = (formData.get('studentName') as string || '').trim();
  const token = (formData.get('token') as string || '').trim().toUpperCase();

  const cookieStore = await cookies();
  
  // Set student session cookie if provided
  if (studentName) {
    cookieStore.set('auth_name', studentName, { maxAge: 60 * 60 * 24 });
    cookieStore.set('auth_token', 'Siswa', { maxAge: 60 * 60 * 24 });
  }

  // If token is provided, find the matching published/active exam (supports rotated delimited tokens)
  if (token) {
    const candidates = await prisma.exam.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
      select: {
        id: true,
        token: true,
        status: true,
      },
    });

    const matchedExam = candidates.find((exam) => {
      if (!exam.token) return false;
      const allowedTokens = exam.token
        .split('|')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      return allowedTokens.includes(token);
    });

    if (matchedExam) {
      redirect(`/portal/siswa/cbt/${matchedExam.id}`);
    } else {
      return { 
        error: `Token "${token}" tidak valid atau ujian belum diaktifkan oleh pengawas.` 
      };
    }
  }

  // If no token specified, redirect to the full CBT active list
  redirect('/portal/siswa/cbt');
}
