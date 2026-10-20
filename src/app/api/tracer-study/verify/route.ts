import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { nisn, fullName } = await request.json();
    
    if (!nisn || !fullName) {
      return NextResponse.json({ error: 'NISN dan Nama Lengkap diperlukan' }, { status: 400 });
    }

    const alumni = await prisma.alumni.findUnique({
      where: { nisn }
    });

    if (!alumni) {
      return NextResponse.json({ error: 'Data alumni tidak ditemukan di database. Pastikan NISN benar.' }, { status: 404 });
    }

    if (alumni.fullName.toLowerCase() !== fullName.toLowerCase()) {
      return NextResponse.json({ error: 'Nama Lengkap tidak sesuai dengan NISN di database.' }, { status: 400 });
    }

    // Check if already filled
    const existingTracer = await prisma.tracerStudy.findUnique({
      where: { alumniId: alumni.id }
    });

    if (existingTracer) {
      return NextResponse.json({ error: 'Anda sudah mengisi Tracer Study sebelumnya.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, alumni });
  } catch (error) {
    console.error('Error verifying alumni:', error);
    return NextResponse.json({ error: 'Gagal memverifikasi data' }, { status: 500 });
  }
}
