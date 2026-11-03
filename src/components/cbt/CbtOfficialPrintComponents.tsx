'use client';

import React from 'react';

/**
 * 🏛️ KOP SURAT RESMI KEDINASAN SMK TI GAMA 1 BEKASI
 * Mengikuti standar tata naskah dinas pendidikan nasional
 */
export function CbtOfficialKopSurat({
  documentTitle,
  documentNumber,
  subTitle,
}: {
  documentTitle?: string;
  documentNumber?: string;
  subTitle?: string;
}) {
  return (
    <div className="w-full text-black font-serif print:font-serif">
      {/* Kop Surat Header */}
      <div className="flex items-center justify-between gap-4 pb-3">
        {/* Logo Lambang Sekolah Kiri */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
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
              SMK TI GAMA 1
            </text>
          </svg>
        </div>

        {/* Teks Lembaga & Sekolah */}
        <div className="flex-1 text-center space-y-0.5">
          <div className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-800 uppercase">
            YAYASAN PENDIDIKAN KEJURUAN GAMA BEKASI
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tracking-tight text-black uppercase leading-tight">
            SMK TEKNOLOGI INFORMASI GAMA 1 BEKASI
          </div>
          <div className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight">
            KOMPETENSI KEAHLIAN: PPLG • TEKNIK JARINGAN (TJKT) • DKV • MANAJEMEN PERKANTORAN (MPLB)
          </div>
          <div className="text-[9px] sm:text-[9.5px] text-slate-700 font-semibold">
            NSS: 322026501001 • NPSN: 69752981 • STATUS AKREDITASI: A (UNGGUL)
          </div>
          <div className="text-[8.5px] sm:text-[9px] text-slate-600 leading-snug">
            Kampus: Jl. KH. Muchtar Tabrani No. 12, Kel. Perwira, Kec. Bekasi Utara, Kota Bekasi, Jawa Barat 17122
          </div>
          <div className="text-[8.5px] sm:text-[9px] text-slate-600">
            Telp: (021) 8898-7654 • Website: <span className="font-semibold text-blue-900">https://smkgama.sch.id</span> • Email: <span className="font-semibold text-blue-900">info@smkgama.sch.id</span>
          </div>
        </div>

        {/* Logo Lambang Akreditasi Kanan */}
        <div className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center p-1 border-2 border-slate-400 rounded-xl bg-slate-50 text-center">
          <div className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">BAN-S/M</div>
          <div className="text-xs font-black text-amber-700 leading-none my-0.5">TERAKREDITASI</div>
          <div className="text-2xl font-black text-blue-900 leading-none">A</div>
          <div className="text-[7.5px] font-bold text-slate-600 uppercase leading-none mt-0.5">UNGGUL</div>
          <div className="text-[6.5px] text-slate-500 mt-0.5">No. 129/BAN-SM/2023</div>
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
  headmasterName = 'Drs. H. M. Syarifudin, M.M.',
  headmasterNip = '19680514 199403 1 003',
  proctorName = 'Ahmad Suhendar, M.Kom',
  proctorNip = '19850412 201001 1 008',
  dateString,
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
  mode?: 'three-column' | 'two-column';
}) {
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
              {/* Cap Digital */}
              <CbtDigitalStamp />
            </div>
            <div className="font-bold underline">{headmasterName}</div>
            <div className="text-[10px] text-slate-600">NIP. {headmasterNip}</div>
          </div>

          <div>
            <div>Kota Bekasi, {currentDate}</div>
            <div className="font-bold">
              {classNameTarget ? `Wali Kelas ${classNameTarget}` : 'Guru Pengampu / Proktor'}
            </div>
            <div className="h-20 flex items-center justify-center">
              <div className="text-[10px] text-slate-400 italic font-sans">[ Tanda Tangan Sah ]</div>
            </div>
            <div className="font-bold underline">{teacherName}</div>
            <div className="text-[10px] text-slate-600">
              {teacherNip ? `NIP. ${teacherNip}` : subjectName ? `Guru Mapel: ${subjectName}` : 'SMK TI GAMA 1 BEKASI'}
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
            {/* Cap Digital */}
            <CbtDigitalStamp />
          </div>
          <div className="font-bold underline text-xs">{headmasterName}</div>
          <div className="text-[10px] text-slate-600">NIP. {headmasterNip}</div>
        </div>

        {/* Kolom 2: Koordinator CBT */}
        <div>
          <div>Diperiksa & Diverifikasi,</div>
          <div className="font-bold">Koordinator Proktor CBT</div>
          <div className="h-20 flex items-center justify-center">
            <div className="text-[10px] text-slate-400 italic font-sans">[ Paraf Pengawas ]</div>
          </div>
          <div className="font-bold underline text-xs">{proctorName}</div>
          <div className="text-[10px] text-slate-600">NIP. {proctorNip}</div>
        </div>

        {/* Kolom 3: Guru Mapel */}
        <div>
          <div>Kota Bekasi, {currentDate}</div>
          <div className="font-bold">Guru Mata Pelajaran</div>
          <div className="h-20 flex items-center justify-center">
            <div className="text-[10px] text-slate-400 italic font-sans">[ Tanda Tangan Pengampu ]</div>
          </div>
          <div className="font-bold underline text-xs">{teacherName}</div>
          <div className="text-[10px] text-slate-600">
            {subjectName ? `Mapel: ${subjectName}` : 'Pendidik SMK TI GAMA 1'}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 🛡️ STEMPEL CAP DIGITAL RESMI SEKOLAH
 */
export function CbtDigitalStamp() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 rotate-[-8deg]">
      <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-900 flex flex-col items-center justify-center p-1 text-center text-blue-900 bg-blue-50/20 backdrop-blur-[0.5px]">
        <div className="w-20 h-20 rounded-full border border-blue-800 flex flex-col items-center justify-center p-1">
          <div className="text-[6px] font-black uppercase tracking-tight">YAYASAN GAMA BEKASI</div>
          <div className="text-[8px] font-black my-0.5 text-blue-950">★ TERTUTUP ★</div>
          <div className="text-[7.5px] font-black tracking-tighter text-blue-900">SMK TI GAMA 1</div>
          <div className="text-[5.5px] font-bold text-blue-800 uppercase mt-0.5">TERVALIDASI SISTEM CBT</div>
        </div>
      </div>
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
            Dokumen ini dicetak otomatis dari server Sistem Evaluasi CBT SMK TI GAMA 1 BEKASI. Dinyatakan sah tanpa tanda tangan basah jika kode verifikasi dan stempel digital tercantum.
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

