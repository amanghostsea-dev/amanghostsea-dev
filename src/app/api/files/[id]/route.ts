import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    const file = await prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
    }

    // Ubah base64 kembali menjadi buffer binary
    const fileBuffer = Buffer.from(file.fileData, 'base64');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': file.fileType || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Gagal memuat berkas.' }, { status: 500 });
  }
}
