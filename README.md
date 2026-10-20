# 🎓 SMK Web Portal & Sistem PPDB Online Modern

Aplikasi Web Portal Sekolah Menengah Kejuruan (SMK) modern berbasis **Next.js 16 (App Router)**, **Prisma ORM**, dan **PostgreSQL**. Dilengkapi sistem pendaftaran siswa baru (PPDB Online) terpadu, multi-metode pembayaran (QRIS, Transfer Bank, Tunai Loket), modul BKK & Tracer Study, Asisten AI interaktif, dan sistem proteksi keamanan berkas tingkat perbankan (*Enterprise Security Suite*).

---

## 🌟 Fitur Utama Sistem

### 1. Sistem PPDB Online (Penerimaan Peserta Didik Baru)
- **Multi-Jalur Pendaftaran**: 
  - Jalur Reguler / Umum
  - Jalur Afirmasi (Unggah bukti KIP / Kartu Keluarga)
  - Jalur Prestasi (Akademik & Non-Akademik)
- **Multi-Metode Pembayaran**:
  - **QRIS Dinamis / Statis**: Scan langsung dari BCA Mobile, Livin' Mandiri, BRImo, BNI, GoPay, OVO, DANA, ShopeePay.
  - **Transfer Rekening Bank**: Dilengkapi salin nomor rekening instan, panduan ATM/m-banking, dan unggah struk.
  - **Tunai di Loket Kasir**: Dilengkapi generate kode bayar unik (contoh: `CASH-8F29A1`).
- **Fitur Cek NISN & Lanjutkan Pembayaran (`/ppdb/status`)**:
  - Pendaftar yang lupa bayar atau ingin mengganti metode pembayaran dapat mencari data hanya dengan **NISN**.
  - Dapat memilih ulang metode bayar (misal dari Tunai beralih ke QRIS) dan mengunggah ulang bukti tanpa perlu mendaftar dari nol.
- **Pratinjau Dokumen In-App (Tanpa Perlu Download)**:
  - Verifikator & pendaftar dapat melihat berkas (JPG, PNG, WEBP, PDF) langsung di browser secara aman.

### 2. Enterprise Security & Anti-Fraud Suite
- **Deep Binary Magic Bytes Inspector**:
  - Memeriksa tanda tangan biner asli berkas di level server.
  - **Anti-APK Phishing**: Otomatis mendeteksi dan memblokir file aplikasi Android (`.apk` / zip header `0x50 0x4B 0x03 0x04`) yang disamarkan penipu sebagai gambar `.png`.
  - Memblokir program jahat Windows (`.exe`/`MZ`), Linux ELF, dan skrip injeksi (`<?php`, `<script>`).
- **HTTP Sandbox & Nosniff Headers**:
  - File yang disajikan diproteksi header `X-Content-Type-Options: nosniff` dan `Content-Security-Policy: sandbox` untuk mencegah eksekusi skrip jahat di browser verifikator.
- **SOP Anti-Penipuan Verifikator**:
  - Kartu peringatan di panel admin bahwa screenshot pembayaran adalah klaim awal.
  - Tombol 1-klik untuk menyalin Nama Siswa, NISN, dan Nominal untuk pencarian instan di mutasi rekening / dashboard merchant QRIS.
- **Anti-Spam & Anti-Bot**:
  - *In-Memory Sliding Window Rate Limiting* (mencegah DoS / spam formulir).
  - *Silent Honeypot Trap* (menjebak bot otomatis tanpa mengganggu pengalaman pengguna).

### 3. Portal Informasi & Asisten AI
- **Asisten AI SMK Interaktif**: Chatbot cerdas untuk menjawab pertanyaan calon siswa seputar jurusan, kurikulum, alur PPDB, dan biaya sekolah.
- **Bursa Kerja Khusus (BKK) & Tracer Study**: Pendataan alumni dan informasi lowongan kerja mitra industri.
- **Dashboard Admin Lengkap (`/admin`)**:
  - Verifikasi pendaftar & pembayaran PPDB.
  - Manajemen Berita & Agenda Sekolah.
  - Manajemen Kompetensi Keahlian / Jurusan.
  - Pengaturan biaya formulir dan profil sekolah.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend & Backend**: Next.js 16.3 (Turbopack, React 19, TypeScript)
- **Styling**: TailwindCSS & Vanilla CSS (Desain modern, dark mode ready, glassmorphism)
- **Database & ORM**: PostgreSQL & Prisma ORM v5.21
- **Icons**: Lucide React
- **Security Engine**: Custom Node.js Binary Inspector, SHA-256 Hashing, Sliding Window Limiter

---

## 🚀 Panduan Menjalankan Sistem Secara Lokal

### 1. Kebutuhan Sistem
- **Node.js**: Versi 18.x, 20.x, atau lebih baru
- **PostgreSQL Database**: Lokal (Postgres), Prisma Postgres, Supabase, atau Neon

### 2. Langkah Instalasi

1. **Clone Repositori & Masuk ke Direktori**:
   ```bash
   git clone https://github.com/amanghostsea-dev/amanghostsea-dev.git smk-web
   cd smk-web
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Salin file template `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Buka file `.env` dan masukkan URL database PostgreSQL Anda:
   ```env
   POSTGRES_PRISMA_DATABASE_URL="postgres://username:password@localhost:5432/smk_db?sslmode=prefer"
   POSTGRES_URL="postgres://username:password@localhost:5432/smk_db?sslmode=prefer"
   GEMINI_API_KEY="AIzaSy..." # Opsional untuk AI Chatbot
   ```

4. **Sinkronisasi Schema Database**:
   Jalankan generator client dan push skema Prisma ke database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 📁 Struktur Direktori Utama

```
smk-web/
├── prisma/
│   └── schema.prisma         # Definisi skema tabel database (User, PpdbApplicant, dll)
├── src/
│   ├── app/
│   │   ├── admin/             # Panel Administrasi (PPDB, Berita, Jurusan, Settings)
│   │   ├── api/
│   │   │   ├── ai/chat/       # Endpoint Asisten AI
│   │   │   ├── files/[id]/    # Endpoint Serving Berkas Terproteksi Sandbox
│   │   │   ├── ppdb/          # Endpoint Registrasi, Cek Status, dan Pembayaran PPDB
│   │   │   └── upload/        # Endpoint Unggah Berkas dengan Magic Bytes Inspector
│   │   ├── ppdb/              # Halaman Formulir PPDB, Cek Status, & Sukses
│   │   ├── bkk/               # Halaman Tracer Study & Lowongan BKK
│   │   └── page.tsx           # Halaman Utama (Landing Page Sekolah)
│   ├── components/            # Komponen UI (Navbar, Footer, AIChatWidget, dll)
│   └── lib/
│       ├── prisma.ts          # Singleton Prisma Client
│       └── security.ts        # Suite Keamanan (Magic Bytes, Rate Limit, Honeypot)
├── .env.example               # Template environment variable
└── package.json
```

---

## 🛡️ Checklist Menjaga Sistem Bebas Error Saat Pengembangan

1. **Cek Tipe TypeScript**:
   ```bash
   npx tsc --noEmit
   ```
2. **Uji Build Produksi Sebelum Deploy**:
   ```bash
   npm run build
   ```
3. **Jika Mengubah Tabel Database di `schema.prisma`**:
   Selalu jalankan:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## 📄 Lisensi
Hak Cipta © 2026 SMK Web & Sistem PPDB Online. Dikembangkan untuk efisiensi dan keamanan administrasi sekolah.
