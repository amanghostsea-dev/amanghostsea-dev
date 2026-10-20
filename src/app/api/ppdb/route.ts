import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        paymentStatus: jalur === 'normal' ? 'UNPAID' : 'PAID', // Simulasi: normal bayar, lainnya gratis
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
