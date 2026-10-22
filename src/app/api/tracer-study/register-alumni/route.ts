import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { nisn, fullName, graduationYear, major, phone, email } = await request.json();

    if (!nisn || !fullName || !graduationYear || !major) {
      return NextResponse.json(
        { error: 'Mohon lengkapi NISN, Nama Lengkap, Tahun Lulus, dan Jurusan.' },
        { status: 400 }
      );
    }

    // Check if already exists
    let alumni = await prisma.alumni.findUnique({
      where: { nisn }
    });

    if (alumni) {
      return NextResponse.json({
        success: true,
        message: 'Data alumni sudah terdaftar.',
        alumni
      });
    }

    // Create new alumni
    alumni = await prisma.alumni.create({
      data: {
        nisn: nisn.trim(),
        fullName: fullName.trim(),
        graduationYear: parseInt(String(graduationYear)),
        major: major.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data alumni berhasil didaftarkan.',
      alumni
    });
  } catch (error: any) {
    console.error('Error registering alumni for tracer study:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mendaftarkan data alumni.' },
      { status: 500 }
    );
  }
}
