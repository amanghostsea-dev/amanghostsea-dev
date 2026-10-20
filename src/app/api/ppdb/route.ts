import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPPDBPaymentConfig } from '@/app/admin/settings/actions';
import { getTrackConfig } from '@/app/admin/settings/types';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const jalur = data.jalur || data.jalurPendaftaran || 'normal';
    
    // Check if NISN already exists
    const existingApplicant = await prisma.ppdbApplicant.findUnique({
      where: { nisn: String(data.nisn) }
    });

    if (existingApplicant) {
      return NextResponse.json(
        { error: 'NISN sudah terdaftar' },
        { status: 400 }
      );
    }

    const paymentConfig = await getPPDBPaymentConfig();
    const trackConfig = getTrackConfig(paymentConfig, jalur);
    const nominal = (paymentConfig.enabled && trackConfig.enabled) ? (trackConfig.totalAmount || 0) : 0;
    const initialPaymentStatus = (paymentConfig.enabled && trackConfig.enabled && nominal > 0) ? 'UNPAID' : 'PAID';

    const applicant = await prisma.ppdbApplicant.create({
      data: {
        jalur,
        fullName: data.fullName,
        nisn: String(data.nisn),
        birthInfo: data.birthInfo,
        gender: data.gender,
        address: data.address,
        phone: data.phone,
        previousSchool: data.previousSchool,
        major: data.major,
        afirmasiNumber: data.afirmasiNumber || null,
        kipNumber: data.kipNumber || null,
        prestasiType: data.prestasiType || null,
        documentKk: data.documentKk || null,
        documentAfirmasi: data.documentAfirmasi || null,
        documentKip: data.documentKip || null,
        documentPrestasi: data.documentPrestasi || null,
        paymentStatus: initialPaymentStatus,
        paymentAmount: nominal,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, applicant }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating PPDB applicant:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mendaftar. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
