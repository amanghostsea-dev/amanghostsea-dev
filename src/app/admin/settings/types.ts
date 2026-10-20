export interface PPDBFeeItem {
  id: string;
  name: string;
  amount: number;
}

export interface PPDBTrackFeeConfig {
  enabled: boolean;
  title: string;
  notes: string;
  feeItems: PPDBFeeItem[];
  totalAmount: number;
}

export interface PPDBPaymentConfig {
  enabled: boolean;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  cashLocation: string;
  cashHours: string;

  // Multi-track fee structures:
  reguler: PPDBTrackFeeConfig;
  afirmasi: PPDBTrackFeeConfig;
  prestasi: PPDBTrackFeeConfig;

  // Backward compatibility legacy fields:
  title?: string;
  notes?: string;
  feeItems?: PPDBFeeItem[];
  totalAmount?: number;
}

export const DEFAULT_TRACK_REGULER: PPDBTrackFeeConfig = {
  enabled: true,
  title: 'Biaya Pendaftaran & Seleksi Masuk (Jalur Reguler)',
  notes: 'Biaya pendaftaran dan tes seleksi masuk khusus calon siswa Jalur Reguler.',
  feeItems: [
    { id: 'fee-reg-1', name: 'Biaya Formulir Pendaftaran Online', amount: 100000 },
    { id: 'fee-reg-2', name: 'Tes Minat Bakat & Wawancara', amount: 50000 },
  ],
  totalAmount: 150000,
};

export const DEFAULT_TRACK_AFIRMASI: PPDBTrackFeeConfig = {
  enabled: true,
  title: 'Biaya Administrasi Pendaftaran (Jalur Afirmasi / KIP)',
  notes: 'Biaya khusus bersubsidi sesuai kebijakan sekolah bagi pendaftar pemegang Kartu Indonesia Pintar (KIP) & SKTM.',
  feeItems: [
    { id: 'fee-af-1', name: 'Biaya Administrasi & Verifikasi Berkas KIP/SKTM', amount: 25000 },
    { id: 'fee-af-2', name: 'Tes Minat Bakat Bersubsidi', amount: 25000 },
  ],
  totalAmount: 50000,
};

export const DEFAULT_TRACK_PRESTASI: PPDBTrackFeeConfig = {
  enabled: true,
  title: 'Biaya Pendaftaran & Seleksi Berkas (Jalur Prestasi)',
  notes: 'Biaya pendaftaran dan uji portofolio sertifikat prestasi akademik / non-akademik.',
  feeItems: [
    { id: 'fee-pr-1', name: 'Biaya Formulir & Uji Portofolio Prestasi', amount: 50000 },
    { id: 'fee-pr-2', name: 'Wawancara Bakat & Pemetaan Jurusan', amount: 25000 },
  ],
  totalAmount: 75000,
};

export const DEFAULT_PPDB_PAYMENT_CONFIG: PPDBPaymentConfig = {
  enabled: true,
  bankName: 'Bank BRI',
  bankAccount: '0123-01-001234-56-7',
  bankHolder: 'SMK GARUDA MAHADHIKA',
  cashLocation: 'Ruang Panitia PPDB / Loket Kasir Gedung Utama SMK GaMa',
  cashHours: 'Senin s/d Sabtu, pukul 08.00 - 14.00 WIB',
  reguler: DEFAULT_TRACK_REGULER,
  afirmasi: DEFAULT_TRACK_AFIRMASI,
  prestasi: DEFAULT_TRACK_PRESTASI,

  // Legacy fallback
  title: DEFAULT_TRACK_REGULER.title,
  notes: DEFAULT_TRACK_REGULER.notes,
  feeItems: DEFAULT_TRACK_REGULER.feeItems,
  totalAmount: DEFAULT_TRACK_REGULER.totalAmount,
};

/**
 * Mengambil konfigurasi tarif biaya untuk jalur pendaftaran tertentu.
 */
export function getTrackConfig(
  config: PPDBPaymentConfig | undefined | null,
  jalur: string = 'normal'
): PPDBTrackFeeConfig {
  if (!config) {
    const norm = (jalur || '').toLowerCase();
    if (norm === 'afirmasi') return DEFAULT_TRACK_AFIRMASI;
    if (norm === 'beasiswa' || norm === 'prestasi') return DEFAULT_TRACK_PRESTASI;
    return DEFAULT_TRACK_REGULER;
  }

  const norm = (jalur || '').toLowerCase();
  if (norm === 'afirmasi') {
    if (config.afirmasi) {
      const items = Array.isArray(config.afirmasi.feeItems) ? config.afirmasi.feeItems : DEFAULT_TRACK_AFIRMASI.feeItems;
      const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      return {
        enabled: config.afirmasi.enabled !== false,
        title: config.afirmasi.title || DEFAULT_TRACK_AFIRMASI.title,
        notes: config.afirmasi.notes ?? DEFAULT_TRACK_AFIRMASI.notes,
        feeItems: items,
        totalAmount: total,
      };
    }
    return DEFAULT_TRACK_AFIRMASI;
  }

  if (norm === 'beasiswa' || norm === 'prestasi') {
    if (config.prestasi) {
      const items = Array.isArray(config.prestasi.feeItems) ? config.prestasi.feeItems : DEFAULT_TRACK_PRESTASI.feeItems;
      const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      return {
        enabled: config.prestasi.enabled !== false,
        title: config.prestasi.title || DEFAULT_TRACK_PRESTASI.title,
        notes: config.prestasi.notes ?? DEFAULT_TRACK_PRESTASI.notes,
        feeItems: items,
        totalAmount: total,
      };
    }
    return DEFAULT_TRACK_PRESTASI;
  }

  // Default: Reguler
  const regulerSource = config.reguler || {
    enabled: config.enabled !== false,
    title: config.title || DEFAULT_TRACK_REGULER.title,
    notes: config.notes || DEFAULT_TRACK_REGULER.notes,
    feeItems: config.feeItems || DEFAULT_TRACK_REGULER.feeItems,
    totalAmount: config.totalAmount || DEFAULT_TRACK_REGULER.totalAmount,
  };

  const items = Array.isArray(regulerSource.feeItems) ? regulerSource.feeItems : DEFAULT_TRACK_REGULER.feeItems;
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return {
    enabled: regulerSource.enabled !== false,
    title: regulerSource.title || DEFAULT_TRACK_REGULER.title,
    notes: regulerSource.notes ?? DEFAULT_TRACK_REGULER.notes,
    feeItems: items,
    totalAmount: total,
  };
}
