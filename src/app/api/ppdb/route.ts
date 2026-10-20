import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPPDBPaymentConfig } from '@/app/admin/settings/actions';
import { getTrackConfig } from '@/app/admin/settings/types';
import { 
  getClientIp, 
  checkRateLimit, 
  isHoneypotTriggered, 
  validateFullName, 
  validateNISN, 
  validatePhone, 
  sanitizeString 
} from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. IP Rate Limiting (Maksimal 5 pendaftaran per IP dalam 10 menit untuk mencegah spam bot)
    const rateCheck = checkRateLimit(`ppdb_submit:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak permintaan pendaftaran dari perangkat Anda. Silakan tunggu ${rateCheck.retryAfterSeconds} detik lagi demi keamanan.` 
        },
        { 
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        }
      );
    }

    const data = await request.json();

    // 2. Honeypot Anti-Bot Trap (Mendeteksi bot otomatis tanpa mengganggu pengguna asli)
    if (isHoneypotTriggered(data, '_hp_website') || isHoneypotTriggered(data, '_hp_company')) {
      console.warn(`[SECURITY ALERT] Bot spam attempt detected and blocked from IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Permintaan pendaftaran terindikasi otomatis (spam). Akses ditolak.' },
        { status: 400 }
      );
    }

    // 3. Strict Validation & Sanitization
    const nameValidation = validateFullName(data.fullName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const nisnValidation = validateNISN(data.nisn);
    if (!nisnValidation.valid) {
      return NextResponse.json({ error: nisnValidation.error }, { status: 400 });
    }

    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
    }

    const cleanNISN = nisnValidation.cleanNisn;
    const cleanFullName = nameValidation.cleanName;
    const cleanPhone = phoneValidation.formatted;
    const cleanBirthInfo = sanitizeString(data.birthInfo, 100);
    const cleanAddress = sanitizeString(data.address, 300);
    const cleanPreviousSchool = sanitizeString(data.previousSchool, 150);
    const cleanGender = data.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki';
    const cleanMajor = sanitizeString(data.major, 100);
    const jalur = sanitizeString(data.jalur || data.jalurPendaftaran || 'normal', 50);

    // 4. Check if NISN already exists (Anti-Duplicate)
    const existingApplicant = await prisma.ppdbApplicant.findUnique({
      where: { nisn: cleanNISN }
    });

    if (existingApplicant) {
      return NextResponse.json(
        { error: `NISN ${cleanNISN} sudah terdaftar dalam sistem PPDB. Anda dapat mengecek status pendaftaran di menu Cek Status PPDB.` },
        { status: 400 }
      );
    }

    const paymentConfig = await getPPDBPaymentConfig();
    const trackConfig = getTrackConfig(paymentConfig, jalur);
    const nominal = (paymentConfig.enabled && trackConfig.enabled) ? (trackConfig.totalAmount || 0) : 0;
    const initialPaymentStatus = (paymentConfig.enabled && trackConfig.enabled && nominal > 0) ? 'UNPAID' : 'PAID';

    const applicant = await prisma.ppdbApplicant.create({
      data: {
        jalur,
        fullName: cleanFullName,
        nisn: cleanNISN,
        birthInfo: cleanBirthInfo,
        gender: cleanGender,
        address: cleanAddress,
        phone: cleanPhone,
        previousSchool: cleanPreviousSchool,
        major: cleanMajor,
        afirmasiNumber: sanitizeString(data.afirmasiNumber, 100) || null,
        kipNumber: sanitizeString(data.kipNumber, 100) || null,
        prestasiType: sanitizeString(data.prestasiType, 100) || null,
        documentKk: data.documentKk || null,
        documentAfirmasi: data.documentAfirmasi || null,
        documentKip: data.documentKip || null,
        documentPrestasi: data.documentPrestasi || null,
        paymentStatus: initialPaymentStatus,
        paymentAmount: nominal,
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
