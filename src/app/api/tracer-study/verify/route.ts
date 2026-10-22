import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { nisn, fullName } = await request.json();
    
    if (!nisn) {
      return NextResponse.json({ error: 'NISN diperlukan untuk verifikasi.' }, { status: 400 });
    }

    const trimmedNisn = String(nisn).trim();
    const alumni = await prisma.alumni.findUnique({
      where: { nisn: trimmedNisn }
    });

    if (!alumni) {
      return NextResponse.json({ 
        error: 'Data alumni dengan NISN tersebut belum ditemukan di database sekolah.', 
        notFound: true 
      }, { status: 404 });
    }

    if (fullName && String(fullName).trim()) {
      const dbName = alumni.fullName.trim().toLowerCase();
      const inputName = String(fullName).trim().toLowerCase();
      if (dbName !== inputName && !dbName.includes(inputName) && !inputName.includes(dbName)) {
        return NextResponse.json({ 
          error: `Nama Lengkap "${fullName}" tidak cocok dengan data NISN terdaftar.` 
        }, { status: 400 });
      }
    }

    // Check if already filled
    const existingTracer = await prisma.tracerStudy.findUnique({
      where: { alumniId: alumni.id }
    });

    if (existingTracer) {
      return NextResponse.json({ 
        error: 'Anda sudah pernah mengisi kuesioner Tracer Study ini sebelumnya. Terima kasih atas kontribusi Anda!' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, alumni });
  } catch (error) {
    console.error('Error verifying alumni:', error);
    return NextResponse.json({ error: 'Gagal memverifikasi data' }, { status: 500 });
  }
}

