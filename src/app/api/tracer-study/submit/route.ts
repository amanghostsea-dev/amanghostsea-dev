import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.alumniId) {
      return NextResponse.json({ error: 'ID Alumni diperlukan' }, { status: 400 });
    }

    // Check if already filled
    const existingTracer = await prisma.tracerStudy.findUnique({
      where: { alumniId: data.alumniId }
    });

    if (existingTracer) {
      return NextResponse.json({ error: 'Anda sudah mengisi Tracer Study sebelumnya.' }, { status: 400 });
    }

    let status = data.status.toUpperCase();
    if (status === 'MENCARI_KERJA') status = 'MENCARI_KERJA';

    const tracerData = {
      alumniId: data.alumniId,
      status: status,
      companyName: data.namaInstansi || null,
      jobTitle: data.jabatan || null,
      salary: data.pendapatan || null,
      university: data.namaKampus || null,
      faculty: data.jurusanKuliah || null,
    };

    const newTracerStudy = await prisma.tracerStudy.create({
      data: tracerData
    });

    return NextResponse.json({ success: true, tracerStudy: newTracerStudy });
  } catch (error) {
    console.error('Error submitting tracer study:', error);
    return NextResponse.json({ error: 'Gagal mengirim data Tracer Study' }, { status: 500 });
  }
}
