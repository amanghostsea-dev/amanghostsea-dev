'use client';

import React from 'react';
import { KopSuratConfig, DEFAULT_KOP_SURAT_CONFIG } from '@/app/admin/settings/types';

/**
 * 🏛️ KOP SURAT RESMI KEDINASAN
 * Mendukung konfigurasi dinamis yang dapat disesuaikan langsung oleh Admin Utama
 */
export function CbtOfficialKopSurat({
  documentTitle,
  documentNumber,
  subTitle,
  config,
}: {
  documentTitle?: string;
  documentNumber?: string;
  subTitle?: string;
  config?: Partial<KopSuratConfig>;
}) {
  const cfg: KopSuratConfig = {
    ...DEFAULT_KOP_SURAT_CONFIG,
    ...config,
  };

  return (
    <div className="w-full text-black font-serif print:font-serif">
      {/* Kop Surat Header */}
      <div className="flex items-center justify-between gap-4 pb-3">
        {/* Logo Lambang Sekolah Kiri */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
          {cfg.logoLeftUrl ? (
            <img 
              src={cfg.logoLeftUrl} 
              alt={cfg.schoolName} 
              className="max-w-[76px] max-h-[76px] object-contain" 
            />
          ) : (
            <svg viewBox="0 0 100 100" className="w-20 h-20 text-blue-900" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Shield Outer */}
              <path d="M50 5 L88 20 C88 55 50 92 50 95 C50 92 12 55 12 20 Z" fill="#1e3a8a" stroke="#d97706" strokeWidth="3" />
              {/* Shield Inner */}
              <path d="M50 12 L80 24 C80 52 50 82 50 84 C50 82 20 52 20 24 Z" fill="#ffffff" />
              {/* Gear / Technology Circle */}
              <circle cx="50" cy="46" r="20" fill="#2563eb" opacity="0.15" />
              <circle cx="50" cy="46" r="14" stroke="#1e3a8a" strokeWidth="2.5" strokeDasharray="3 2" />
              {/* Open Book */}
              <path d="M50 52 C44 47 34 46 28 47 L28 62 C35 61 44 63 50 67 C56 63 65 61 72 62 L72 47 C66 46 56 47 50 52 Z" fill="#d97706" stroke="#b45309" strokeWidth="1" />
              <line x1="50" y1="52" x2="50" y2="67" stroke="#1e3a8a" strokeWidth="2" />
              {/* Torch of Knowledge */}
              <path d="M47 34 L53 34 L51 44 L49 44 Z" fill="#d97706" />
              <path d="M50 25 C47 28 48 31 50 34 C52 31 53 28 50 25 Z" fill="#dc2626" />
              {/* Text Ribbon */}
              <rect x="22" y="72" width="56" height="11" rx="2" fill="#1e3a8a" stroke="#d97706" strokeWidth="1" />
              <text x="50" y="80" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
                {cfg.schoolName.slice(0, 14)}
              </text>
            </svg>
          )}
        </div>

        {/* Teks Lembaga & Sekolah */}
        <div className="flex-1 text-center space-y-0.5">
          <div className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-800 uppercase">
            {cfg.yayasanName}
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tracking-tight text-black uppercase leading-tight">
            {cfg.schoolName}
          </div>
          {cfg.competencies && (
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">
              {cfg.competencies}
            </div>
          )}
          <div className="text-[8.5px] sm:text-[9.5px] text-slate-700 font-semibold">
            NSS: {cfg.nss} • NPSN: {cfg.npsn} • STATUS AKREDITASI: {cfg.akreditasi}
          </div>
          <div className="text-[8px] sm:text-[9px] text-slate-600 leading-snug">
            {cfg.address}
          </div>
          <div className="text-[8px] sm:text-[9px] text-slate-600">
            Telp: {cfg.phone} • Website: <span className="font-semibold text-blue-900">{cfg.website}</span> • Email: <span className="font-semibold text-blue-900">{cfg.email}</span>
          </div>
        </div>

        {/* Logo Lambang Akreditasi Kanan */}
        <div className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center p-1 border-2 border-slate-400 rounded-xl bg-slate-50 text-center overflow-hidden">
          {cfg.logoRightUrl ? (
            <img 
              src={cfg.logoRightUrl} 
              alt="Akreditasi" 
              className="max-w-[76px] max-h-[76px] object-contain" 
            />
          ) : (
            <>
              <div className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">BAN-S/M</div>
              <div className="text-xs font-black text-amber-700 leading-none my-0.5">TERAKREDITASI</div>
              <div className="text-2xl font-black text-blue-900 leading-none">{cfg.akreditasi.charAt(0) || 'A'}</div>
              <div className="text-[7.5px] font-bold text-slate-600 uppercase leading-none mt-0.5">
                {cfg.akreditasi.includes('UNGGUL') ? 'UNGGUL' : 'RESMI'}
              </div>
              {cfg.akreditasiSk && (
                <div className="text-[6.5px] text-slate-500 mt-0.5">{cfg.akreditasiSk}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Garis Ganda Pemisah Kop Surat Standar Dokumen Kedinasan */}
      <div className="border-t-[3px] border-black pt-[2px] border-b-[1px] border-black mb-4" />

      {/* Judul & Nomor Dokumen (Bila ada) */}
      {documentTitle && (
        <div className="text-center my-3 space-y-0.5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-black underline">
            {documentTitle}
          </h2>
          {documentNumber && (
            <p className="text-[11px] font-bold text-slate-700">
              {documentNumber}
            </p>
          )}
          {subTitle && (
            <p className="text-[10px] text-slate-600 font-medium">
              {subTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 🖋️ CAP RESMI SEKOLAH & TANDA TANGAN KEDINASAN
 */
export function CbtOfficialSignatures({
  teacherName = 'Guru Mata Pelajaran',
  teacherNip,
  subjectName,
  classNameTarget,
  headmasterName,
  headmasterNip,
  proctorName,
  proctorNip,
  dateString,
  city,
  config,
  mode = 'three-column', // 'three-column' | 'two-column'
}: {
  teacherName?: string;
  teacherNip?: string;
  subjectName?: string;
  classNameTarget?: string;
  headmasterName?: string;
  headmasterNip?: string;
  proctorName?: string;
  proctorNip?: string;
  dateString?: string;
  city?: string;
  config?: Partial<KopSuratConfig>;
  mode?: 'three-column' | 'two-column';
}) {
  const cfg = { ...DEFAULT_KOP_SURAT_CONFIG, ...config };
  const cityName = city || cfg.city || 'Kota Bekasi';
  const hName = headmasterName || cfg.headmasterName;
  const hNip = headmasterNip || cfg.headmasterNip;
  const pName = proctorName || cfg.proctorName;
  const pNip = proctorNip || cfg.proctorNip;

  const currentDate = dateString || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (mode === 'two-column') {
    return (
      <div className="pt-6 print:pt-4 print-avoid-break text-black font-serif text-[11px]">
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold">Kepala Sekolah / Ka. Laboratorium CBT</div>
            <div className="relative h-20 flex items-center justify-center">
              {/* Cap Stempel Resmi / Digital */}
              <div className="absolute -left-2 top-0 pointer-events-none z-10">
                <CbtDigitalStamp 
                  schoolName={cfg.schoolName} 
                  yayasanName={cfg.yayasanName} 
                  stampUrl={cfg.stampUrl}
                  size={76} 
                />
              </div>
              {/* Tanda Tangan Kepala Sekolah */}
              <div className="z-20">
                <HeadmasterSignatureStroke signatureUrl={cfg.signatureUrl} size={{ width: 120, height: 48 }} />
              </div>
            </div>
            <div className="font-bold underline">{hName}</div>
            <div className="text-[10px] text-slate-600">NIP. {hNip}</div>
          </div>

          <div>
            <div>{cityName}, {currentDate}</div>
            <div className="font-bold">
              {classNameTarget ? `Wali Kelas ${classNameTarget}` : 'Guru Pengampu / Proktor'}
            </div>
            <div className="h-20 flex items-center justify-center">
              <HeadmasterSignatureStroke size={{ width: 110, height: 42 }} />
            </div>
            <div className="font-bold underline">{teacherName}</div>
            <div className="text-[10px] text-slate-600">
              {teacherNip ? `NIP. ${teacherNip}` : subjectName ? `Guru Mapel: ${subjectName}` : cfg.schoolName}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 print:pt-4 print-avoid-break text-black font-serif text-[11px]">
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Kolom 1: Kepala Sekolah */}
        <div>
          <div>Mengetahui,</div>
          <div className="font-bold">Kepala Sekolah</div>
          <div className="relative h-20 flex items-center justify-center">
            {/* Cap Stempel Resmi / Digital */}
            <div className="absolute -left-2 top-0 pointer-events-none z-10">
              <CbtDigitalStamp 
                schoolName={cfg.schoolName} 
                yayasanName={cfg.yayasanName} 
                stampUrl={cfg.stampUrl}
                size={74} 
              />
            </div>
            {/* Tanda Tangan Kepala Sekolah */}
            <div className="z-20">
              <HeadmasterSignatureStroke signatureUrl={cfg.signatureUrl} size={{ width: 115, height: 45 }} />
            </div>
          </div>
          <div className="font-bold underline text-xs">{hName}</div>
          <div className="text-[10px] text-slate-600">NIP. {hNip}</div>
        </div>

        {/* Kolom 2: Koordinator CBT */}
        <div>
          <div>Diperiksa & Diverifikasi,</div>
          <div className="font-bold">Koordinator Proktor CBT</div>
          <div className="h-20 flex items-center justify-center">
            <HeadmasterSignatureStroke size={{ width: 100, height: 40 }} />
          </div>
          <div className="font-bold underline text-xs">{pName}</div>
          <div className="text-[10px] text-slate-600">NIP. {pNip}</div>
        </div>

        {/* Kolom 3: Guru Mapel */}
        <div>
          <div>{cityName}, {currentDate}</div>
          <div className="font-bold">Guru Mata Pelajaran</div>
          <div className="h-20 flex items-center justify-center">
            <HeadmasterSignatureStroke size={{ width: 110, height: 42 }} />
          </div>
          <div className="font-bold underline text-xs">{teacherName}</div>
          <div className="text-[10px] text-slate-600">
            {subjectName ? `Mapel: ${subjectName}` : `Pendidik ${cfg.schoolName}`}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 🖋️ TANDA TANGAN RESMI KEPALA SEKOLAH (STROKE VECTOR / GAMBAR UPLOAD)
 */
export function HeadmasterSignatureStroke({
  signatureUrl,
  className = '',
  size = { width: 100, height: 38 },
}: {
  signatureUrl?: string | null;
  className?: string;
  size?: { width: number; height: number };
}) {
  if (signatureUrl) {
    return (
      <div 
        className={`pointer-events-none select-none flex items-center justify-center ${className}`}
        style={{ width: size.width, height: size.height }}
      >
        <img 
          src={signatureUrl} 
          alt="Tanda Tangan Kepala Sekolah" 
          className="w-full h-full object-contain filter contrast-125 drop-shadow-xs"
        />
      </div>
    );
  }

  // Realistic dynamic calligraphic pen signature path
  return (
    <svg
      viewBox="0 0 160 55"
      width={size.width}
      height={size.height}
      className={`pointer-events-none select-none text-slate-900 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 38 C 22 20, 28 8, 38 12 C 45 15, 32 44, 48 35 C 58 29, 65 18, 72 26 C 78 32, 70 42, 85 36 C 96 32, 102 24, 114 28 C 122 31, 116 42, 130 36 C 142 30, 148 22, 155 18 M 28 42 C 60 40, 105 38, 145 42 M 18 28 C 35 32, 60 28, 80 34"
        stroke="#1e293b"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}

/**
 * 🛡️ STEMPEL CAP RESMI SEKOLAH (MENDUKUNG GAMBAR ASLI UPLOAD & VECTOR DINAMIS)
 */
export function CbtDigitalStamp({
  schoolName = 'SMK GARUDA MAHADHIKA',
  yayasanName = 'YAYASAN GARUDA MAHADHIKA',
  stampUrl,
  size = 80,
  className = '',
}: {
  schoolName?: string;
  yayasanName?: string;
  stampUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (stampUrl) {
    return (
      <div 
        className={`pointer-events-none select-none flex items-center justify-center rotate-[-6deg] opacity-90 ${className}`}
        style={{ width: size, height: size }}
      >
        <img 
          src={stampUrl} 
          alt="Stempel Resmi Sekolah" 
          className="w-full h-full object-contain filter contrast-110 drop-shadow-xs" 
        />
      </div>
    );
  }

  const cleanSchool = (schoolName || 'SMK GARUDA').toUpperCase();
  const cleanYayasan = (yayasanName || 'YAYASAN PENDIDIKAN').toUpperCase();

  return (
    <div 
      className={`pointer-events-none select-none flex items-center justify-center rotate-[-7deg] opacity-85 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
        {/* Lingkaran Luar Ganda Standar Cap Dinas */}
        <circle cx="50" cy="50" r="47" fill="none" stroke="#3730a3" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#3730a3" strokeWidth="1" strokeDasharray="3 1.5" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#3730a3" strokeWidth="1.2" />

        {/* Busur Teks Melingkar Atas & Bawah */}
        <path id="stamp-arc-top" d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
        <path id="stamp-arc-bottom" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />

        <text fontSize="7.5" fontWeight="900" fill="#3730a3" letterSpacing="0.8">
          <textPath href="#stamp-arc-top" startOffset="50%" textAnchor="middle">
            {cleanYayasan.length > 22 ? cleanYayasan.slice(0, 22) : cleanYayasan}
          </textPath>
        </text>

        <text fontSize="7" fontWeight="900" fill="#3730a3" letterSpacing="0.8">
          <textPath href="#stamp-arc-bottom" startOffset="50%" textAnchor="middle">
            {cleanSchool.length > 20 ? cleanSchool.slice(0, 20) : cleanSchool}
          </textPath>
        </text>

        {/* Bintang Ornamen Kiri & Kanan */}
        <polygon points="12,50 14,46 18,48 16,52 18,56 14,54" fill="#3730a3" />
        <polygon points="88,50 86,46 82,48 84,52 82,56 86,54" fill="#3730a3" />

        {/* Pusat Segel Cap */}
        <g transform="translate(50, 50)" textAnchor="middle">
          <text y="-7" fontSize="5.5" fontWeight="900" fill="#3730a3" letterSpacing="0.5">
            ★ RESMI ★
          </text>
          <line x1="-22" y1="-3" x2="22" y2="-3" stroke="#3730a3" strokeWidth="1" />
          <text y="5" fontSize="7" fontWeight="950" fill="#312e81" letterSpacing="0.5">
            TERVALIDASI
          </text>
          <line x1="-22" y1="8" x2="22" y2="8" stroke="#3730a3" strokeWidth="1" />
          <text y="14" fontSize="4.5" fontWeight="800" fill="#3730a3" letterSpacing="0.5">
            CBT INDONESIA
          </text>
        </g>
      </svg>
    </div>
  );
}

/**
 * 🔒 SECURITY BADGE & QR VERIFIKASI RESMI
 */
export function CbtSecurityValidationBox({
  verificationCode,
  examTitle,
}: {
  verificationCode?: string;
  examTitle?: string;
}) {
  const code = verificationCode || `CBT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return (
    <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50/70 text-black font-sans text-[9px] flex items-center justify-between gap-3 print-avoid-break mt-4">
      <div className="flex items-center gap-2.5">
        {/* QR Code SVG */}
        <div className="w-12 h-12 flex-shrink-0 bg-white p-1 border border-slate-300 rounded shadow-xs flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-900" fill="currentColor">
            <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-6 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-4h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
          </svg>
        </div>
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <span>KEABSAHAN DOKUMEN DIGITAL (VERIFIED SMART CBT)</span>
            <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono font-black">VALID</span>
          </div>
          <div className="text-slate-600 leading-tight">
            Dokumen ini dicetak otomatis dari server Sistem Evaluasi CBT. Dinyatakan sah tanpa tanda tangan basah jika kode verifikasi dan stempel digital tercantum.
          </div>
          <div className="text-[8.5px] font-mono text-slate-700">
            ID Verifikasi: <strong className="text-black">{code}</strong> • Paket: {examTitle || 'Evaluasi Belajar'}
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0 border-l border-slate-300 pl-3">
        <div className="text-[8px] text-slate-500 uppercase">Verifikasi Daring:</div>
        <div className="font-bold text-blue-900 text-[8.5px]">smkgama.sch.id/cbt/verify</div>
        <div className="text-[7.5px] text-slate-400">Scan QR untuk cek integritas</div>
      </div>
    </div>
  );
}

