import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('nisn') || searchParams.get('query') || searchParams.get('id');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'NISN atau Nomor Registrasi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim();
    const cleanId = cleanQuery.replace(/^PPDB-/i, '').replace(/^CASH-/i, '').trim();

    const applicant = await prisma.ppdbApplicant.findFirst({
      where: {
        OR: [
          { nisn: cleanQuery },
          { id: cleanQuery },
          { id: cleanId },
          ...(cleanId.length >= 4 ? [{ id: { endsWith: cleanId.toLowerCase() } }, { id: { endsWith: cleanId } }] : []),
        ],
      },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: `Data pendaftaran dengan NISN/No. Registrasi "${cleanQuery}" tidak ditemukan. Pastikan data yang dimasukkan sudah sesuai saat mendaftar.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: applicant.id,
        regId: `PPDB-${applicant.id.slice(-6).toUpperCase()}`,
        cashCode: `CASH-${applicant.id.slice(-6).toUpperCase()}`,
        fullName: applicant.fullName,
        nisn: applicant.nisn,
        gender: applicant.gender,
        birthInfo: applicant.birthInfo,
        address: applicant.address,
        previousSchool: applicant.previousSchool,
        major: applicant.major,
        jalur: applicant.jalur,
        afirmasiNumber: applicant.afirmasiNumber,
        kipNumber: applicant.kipNumber,
        prestasiType: applicant.prestasiType,
        documentKk: applicant.documentKk,
        documentAfirmasi: applicant.documentAfirmasi,
        documentKip: applicant.documentKip,
        documentPrestasi: applicant.documentPrestasi,
        status: applicant.status, // PENDING, APPROVED, REJECTED
        paymentStatus: applicant.paymentStatus, // UNPAID, PENDING_TRANSFER, PENDING_CASH, PAID, REJECTED
        paymentMethod: applicant.paymentMethod,
        paymentProof: applicant.paymentProof,
        paymentAmount: applicant.paymentAmount,
        paymentDate: applicant.paymentDate,
        paymentNotes: applicant.paymentNotes,
        verifiedBy: applicant.verifiedBy,
        createdAt: applicant.createdAt,
        updatedAt: applicant.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error checking PPDB status:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan sistem saat memeriksa status.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body?.query || body?.nisn || body?.id;

    if (!query || !String(query).trim()) {
      return NextResponse.json(
        { error: 'NISN atau Nomor Registrasi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanQuery = String(query).trim();
    const cleanId = cleanQuery.replace(/^PPDB-/i, '').replace(/^CASH-/i, '').trim();

    const applicant = await prisma.ppdbApplicant.findFirst({
      where: {
        OR: [
          { nisn: cleanQuery },
          { id: cleanQuery },
          { id: cleanId },
          ...(cleanId.length >= 4 ? [{ id: { endsWith: cleanId.toLowerCase() } }, { id: { endsWith: cleanId } }] : []),
        ],
      },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: `Data pendaftaran dengan NISN/No. Registrasi "${cleanQuery}" tidak ditemukan. Pastikan data yang dimasukkan sudah sesuai saat mendaftar.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: applicant.id,
        regId: `PPDB-${applicant.id.slice(-6).toUpperCase()}`,
        cashCode: `CASH-${applicant.id.slice(-6).toUpperCase()}`,
        fullName: applicant.fullName,
        nisn: applicant.nisn,
        gender: applicant.gender,
        birthInfo: applicant.birthInfo,
        address: applicant.address,
        previousSchool: applicant.previousSchool,
        major: applicant.major,
        jalur: applicant.jalur,
        afirmasiNumber: applicant.afirmasiNumber,
        kipNumber: applicant.kipNumber,
        prestasiType: applicant.prestasiType,
        documentKk: applicant.documentKk,
        documentAfirmasi: applicant.documentAfirmasi,
        documentKip: applicant.documentKip,
        documentPrestasi: applicant.documentPrestasi,
        status: applicant.status,
        paymentStatus: applicant.paymentStatus,
        paymentMethod: applicant.paymentMethod,
        paymentProof: applicant.paymentProof,
        paymentAmount: applicant.paymentAmount,
        paymentDate: applicant.paymentDate,
        paymentNotes: applicant.paymentNotes,
        verifiedBy: applicant.verifiedBy,
        createdAt: applicant.createdAt,
        updatedAt: applicant.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error checking PPDB status:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan sistem saat memeriksa status.' },
      { status: 500 }
    );
  }
}
