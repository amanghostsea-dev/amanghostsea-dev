import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, paymentMethod, paymentProof, paymentNotes, paymentStatus } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID pendaftar wajib diisi' }, { status: 400 });
    }

    let determinedStatus = paymentStatus;
    if (!determinedStatus) {
      if (paymentMethod === 'TRANSFER') {
        determinedStatus = 'PENDING_TRANSFER';
      } else if (paymentMethod === 'CASH') {
        determinedStatus = 'PENDING_CASH';
      } else {
        determinedStatus = 'PAID';
      }
    }

    const applicant = await prisma.ppdbApplicant.update({
      where: { id },
      data: {
        paymentStatus: determinedStatus,
        paymentMethod: paymentMethod || 'TRANSFER',
        paymentProof: paymentProof || null,
        paymentDate: new Date(),
        paymentNotes: paymentNotes || (
          paymentMethod === 'CASH' 
            ? 'Menunggu pembayaran tunai di loket kasir PPDB sekolah' 
            : 'Menunggu verifikasi bukti transfer'
        )
      }
    });

    return NextResponse.json({ success: true, applicant });
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memperbarui status pembayaran' }, { status: 500 });
  }
}
