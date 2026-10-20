import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp, checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate Limiter: Maksimal 15 upload per IP dalam 5 menit
    const rateCheck = checkRateLimit(`upload:${clientIp}`, 15, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan unggah berkas. Silakan tunggu ${rateCheck.retryAfterSeconds} detik lagi.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

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

    // 1. Anti-Malware & Anti-APK Extension Filter
    const dangerousExtensions = [
      '.apk', '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', 
      '.vbs', '.scr', '.msi', '.html', '.htm', '.svg', '.bin', '.dll',
      '.jar', '.vbe', '.wsf', '.hta', '.ps1'
    ];
    const lowerFileName = file.name.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerFileName.endsWith(ext) || lowerFileName.includes(ext + '.')) {
        return NextResponse.json(
          { error: `Peringatan Keamanan: Ekstensi berkas '${ext}' dilarang keras demi keamanan sistem. Harap unggah screenshot m-banking asli berformat JPG, PNG, atau WEBP.` },
          { status: 400 }
        );
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Deep Binary Magic Bytes Inspection (Mendeteksi file APK / executable bertopeng .png)
    const { validateFileMagicBytes, computeFileHash } = await import('@/lib/security');
    const magicCheck = validateFileMagicBytes(buffer);
    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: magicCheck.error || 'Berkas tidak valid atau terdeteksi biner berbahaya.' },
        { status: 400 }
      );
    }

    const fileHash = computeFileHash(buffer);
    const base64Data = buffer.toString('base64');

    // Simpan data berkas langsung ke database PostgreSQL (Tabel UploadedFile)
    // Gunakan MIME type yang diverifikasi secara biner (magicCheck.detectedMime) untuk mencegah spoofing
    const uploaded = await prisma.uploadedFile.create({
      data: {
        fileName: file.name,
        fileType: magicCheck.detectedMime,
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
