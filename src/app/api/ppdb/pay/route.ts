import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp, checkRateLimit, sanitizeString } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. Rate Limiting: Maksimal 10 upload/submit bukti bayar per IP per 5 menit
    const rateCheck = checkRateLimit(`ppdb_pay:${clientIp}`, 10, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak permintaan pembayaran. Silakan tunggu ${rateCheck.retryAfterSeconds} detik lagi demi keamanan.` 
        },
        { 
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        }
      );
    }

    const body = await request.json();
    const { id, paymentMethod, paymentProof, paymentNotes } = body;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID pendaftar wajib diisi' }, { status: 400 });
    }

    // Pastikan pendaftar ada di database
    const existing = await prisma.ppdbApplicant.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data pendaftar tidak ditemukan.' }, { status: 404 });
    }

    // 2. Proteksi Anti-Penipuan Status: Pendaftar TIDAK BISA mengesahkan status menjadi 'PAID' sendiri!
    // Status hanya boleh PENDING_TRANSFER atau PENDING_CASH
    let determinedStatus: string;
    if (paymentMethod === 'TRANSFER' || paymentMethod === 'QRIS') {
      determinedStatus = 'PENDING_TRANSFER';
    } else if (paymentMethod === 'CASH') {
      determinedStatus = 'PENDING_CASH';
    } else {
      determinedStatus = 'PENDING_TRANSFER';
    }

    // 3. Anti-Fraud Bukti Bayar Daur Ulang: Cek apakah gambar bukti bayar sudah pernah dipakai pendaftar lain
    if (paymentProof && typeof paymentProof === 'string' && paymentProof.trim()) {
      const reusedProof = await prisma.ppdbApplicant.findFirst({
        where: {
          id: { not: id },
          paymentProof: paymentProof.trim(),
          paymentStatus: { in: ['PAID', 'PENDING_TRANSFER'] }
        },
        select: { id: true, fullName: true, nisn: true }
      });

      if (reusedProof) {
        console.warn(`[SECURITY ALERT] Reused payment receipt detected! IP: ${clientIp}, targetId: ${id}, originalUser: ${reusedProof.fullName}`);
        return NextResponse.json({
          error: 'Berkas bukti pembayaran ini terdeteksi sudah pernah digunakan oleh pendaftar lain. Mohon unggah struk atau bukti transaksi asli Anda sendiri.'
        }, { status: 400 });
      }
    }

    const cleanNotes = sanitizeString(paymentNotes, 200) || (
      paymentMethod === 'CASH' 
        ? 'Menunggu pembayaran tunai di loket kasir PPDB sekolah' 
        : paymentMethod === 'QRIS'
        ? 'Menunggu verifikasi bukti transaksi QRIS'
        : 'Menunggu verifikasi bukti transfer bank'
    );

    const applicant = await prisma.ppdbApplicant.update({
      where: { id },
      data: {
        paymentStatus: determinedStatus,
        paymentMethod: paymentMethod || 'TRANSFER',
        paymentProof: paymentProof ? String(paymentProof).trim() : null,
        paymentDate: new Date(),
        paymentNotes: cleanNotes
      }
    });

    return NextResponse.json({ success: true, applicant });
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memperbarui status pembayaran' }, { status: 500 });
  }
}
