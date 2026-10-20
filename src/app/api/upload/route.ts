import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang dipilih.' }, { status: 400 });
    }

    // Validasi Ukuran (Maks 4.5 MB sesuai limit serverless payload Vercel)
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimal 4.5MB. Silakan gunakan foto/PDF dengan ukuran lebih kecil atau kompres terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Validasi Tipe File (PDF dan Gambar)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Harap unggah file PDF, JPG, PNG, atau WEBP.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Simpan data berkas langsung ke database PostgreSQL (Tabel UploadedFile)
    // Ini menjamin 100% kompatibel dan persisten di Vercel Serverless tanpa error read-only filesystem
    const uploaded = await prisma.uploadedFile.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: base64Data,
      },
    });

    const fileUrl = `/api/files/${uploaded.id}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan berkas ke database. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
