import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCachedFile, setCachedFile } from '@/lib/file-cache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID file tidak valid.' }, { status: 400 });
    }

    // 🗄️ SMART CACHE: Cek apakah file sudah ada di cache memori server
    const cached = getCachedFile(id);
    if (cached) {
      // Cache HIT — langsung sajikan dari memori tanpa query database
      const body = new Uint8Array(cached.buffer);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': cached.contentType || 'application/octet-stream',
          'Content-Length': cached.buffer.length.toString(),
          'Content-Disposition': `inline; filename="${encodeURIComponent(cached.fileName)}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'no-referrer',
          'X-Cache': 'HIT',
        },
      });
    }

    // Cache MISS — ambil dari database
    const file = await prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
    }

    // Ubah base64 kembali menjadi buffer binary
    const fileBuffer = Buffer.from(file.fileData, 'base64');

    // 🗄️ SMART CACHE: Simpan ke cache agar request berikutnya tidak query database lagi
    setCachedFile(id, fileBuffer, file.fileType || 'application/octet-stream', file.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': file.fileType || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'no-referrer',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Gagal memuat berkas.' }, { status: 500 });
  }
}
