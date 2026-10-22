import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    let status = (data.status || 'BEKERJA').toUpperCase();

    const tracerData = {
      alumniId: data.alumniId,
      status: status,
      companyName: data.namaInstansi || (data.status === 'wirausaha' ? data.namaInstansi : null),
      jobTitle: data.jabatan || data.bidangUsaha || null,
      salary: data.pendapatan || (data.omset ? `Omset: ${data.omset}` : null),
      university: data.namaKampus || null,
      faculty: data.jurusanKuliah ? (data.jenjang ? `${data.jurusanKuliah} (${data.jenjang})` : data.jurusanKuliah) : null,
      relevance: data.kesesuaianJurusan || null,
      suggestions: data.kendala 
        ? `Kendala: ${data.kendala}${data.ikutPelatihan ? ` | Pelatihan: ${data.ikutPelatihan}` : ''}${data.lamaMencari ? ` | Waktu Tunggu: ${data.lamaMencari} bulan` : ''}`
        : (data.bulanMasukKerja ? `Mulai Bekerja: ${data.bulanMasukKerja}` : null)
    };

    const newTracerStudy = await prisma.tracerStudy.create({
      data: tracerData
    });

    return NextResponse.json({ success: true, tracerStudy: newTracerStudy });
  } catch (error: any) {
    console.error('Error submitting tracer study:', error);
    return NextResponse.json({ error: error?.message || 'Gagal mengirim data Tracer Study' }, { status: 500 });
  }
}

