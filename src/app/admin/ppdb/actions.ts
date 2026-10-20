'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth'

export async function getSubmissions() {
  await requireAdmin();
  return await prisma.ppdbApplicant.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateSubmissionStatus(id: string, status: string) {
  await requireAdmin();
  try {
    const updated = await prisma.ppdbApplicant.update({
      where: { id },
      data: { status }
    });
    revalidatePath('/admin/ppdb');
    return { success: true, applicant: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function verifyPayment(id: string, paymentStatus: 'PAID' | 'REJECTED', notes?: string) {
  await requireAdmin();
  try {
    const cookieStore = await cookies();
    const verifierName = cookieStore.get('auth_name')?.value || cookieStore.get('auth_user')?.value || 'Panitia PPDB';

    const updated = await prisma.ppdbApplicant.update({
      where: { id },
      data: {
        paymentStatus,
        paymentDate: new Date(),
        verifiedBy: verifierName,
        paymentNotes: notes || (paymentStatus === 'PAID' ? 'Pembayaran telah diverifikasi sah' : 'Bukti pembayaran ditolak/tidak valid'),
      }
    });
    revalidatePath('/admin/ppdb');
    return { success: true, applicant: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

