export interface PPDBFeeItem {
  id: string;
  name: string;
  amount: number;
}

export interface PPDBPaymentConfig {
  enabled: boolean;
  title: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  cashLocation: string;
  cashHours: string;
  notes: string;
  feeItems: PPDBFeeItem[];
  totalAmount: number;
}

export const DEFAULT_PPDB_PAYMENT_CONFIG: PPDBPaymentConfig = {
  enabled: true,
  title: 'Biaya Pendaftaran & Seleksi Masuk (Jalur Reguler)',
  bankName: 'Bank BRI',
  bankAccount: '0123-01-001234-56-7',
  bankHolder: 'SMK GARUDA MAHADHIKA',
  cashLocation: 'Ruang Panitia PPDB / Loket Kasir Gedung Utama SMK GaMa',
  cashHours: 'Senin s/d Sabtu, pukul 08.00 - 14.00 WIB',
  notes: 'Biaya di atas berlaku khusus pendaftar Jalur Reguler. Jalur Afirmasi 100% Bebas Biaya Formulir.',
  feeItems: [
    { id: 'fee-1', name: 'Biaya Formulir Pendaftaran Online', amount: 100000 },
    { id: 'fee-2', name: 'Tes Minat Bakat & Wawancara', amount: 50000 },
  ],
  totalAmount: 150000,
};
