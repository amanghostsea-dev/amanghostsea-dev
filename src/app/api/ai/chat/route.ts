import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPPDBPaymentConfig, getWebSettings } from '@/app/admin/settings/actions';
import { getClientIp, checkRateLimit } from '@/lib/security';

interface ChatActionLink {
  label: string;
  url: string;
  icon?: 'form' | 'search' | 'info' | 'whatsapp' | 'book' | 'briefcase';
}

interface ChatResponsePayload {
  reply: string;
  suggestions: string[];
  actionLinks: ChatActionLink[];
  source: 'gemini' | 'knowledge-engine';
}

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiter: Maksimal 25 pesan chat per IP dalam 1 menit
    const rateCheck = checkRateLimit(`ai_chat:${clientIp}`, 25, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          reply: `Anda mengirim pesan terlalu cepat. Silakan tunggu ${rateCheck.retryAfterSeconds} detik lagi sebelum bertanya kembali demi kenyamanan bersama.`,
          suggestions: ['Cara daftar PPDB online', 'Berapa biaya PPDB?'],
          actionLinks: [{ label: 'Buka Halaman PPDB', url: '/ppdb', icon: 'form' }],
          source: 'knowledge-engine'
        } as ChatResponsePayload,
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const message: string = (body.message || '').trim();
    const history: Array<{ sender: 'user' | 'bot'; text: string }> = body.history || [];

    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    // Ambil data dinamis terkini dari database / settings
    const [paymentConfig, webSettings, jurusans] = await Promise.all([
      getPPDBPaymentConfig().catch(() => null),
      getWebSettings().catch(() => null),
      prisma.jurusan.findMany({ select: { name: true, code: true, description: true } }).catch(() => [])
    ]);

    const schoolName = webSettings?.schoolName || 'SMK Garuda Mahadhika';
    const cleanJurusans = jurusans.length > 0 
      ? jurusans.map(j => `• ${j.name} (${j.code || 'Program Keahlian'}): ${j.description || 'Kompetensi kejuruan vokasi digital unggulan'}`).join('\n')
      : `• TJKT (Teknik Jaringan Komputer & Telekomunikasi): Jaringan komputer, cloud, fiber optik & cyber security.
• DKV (Desain Komunikasi Visual): Desain grafis, multimedia, video editing, 3D & fotografi.
• MPLB (Manajemen Perkantoran & Layanan Bisnis): Administrasi perkantoran digital, korespondensi & manajemen bisnis.`;

    const regulerAmount = paymentConfig?.reguler?.totalAmount ?? 150000;
    const afirmasiAmount = paymentConfig?.afirmasi?.totalAmount ?? 50000;
    const prestasiAmount = paymentConfig?.prestasi?.totalAmount ?? 75000;

    const bankName = paymentConfig?.bankName || 'BCA';
    const bankAccount = paymentConfig?.bankAccount || '123-456-7890';
    const bankHolder = paymentConfig?.bankHolder || schoolName;
    const qrisMerchant = paymentConfig?.qrisMerchantName || schoolName;
    const qrisNmid = paymentConfig?.qrisNmid || 'ID1020304050607';

    // 1. Coba panggil Gemini API jika GEMINI_API_KEY tersedia di server
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const systemInstruction = `Kamu adalah "SMK Asisten AI", asisten virtual resmi yang sangat ramah, cerdas, informatif, dan profesional untuk ${schoolName} (pusat keunggulan vokasi digital).
Website resmi: https://smkgama.sch.id
Created by: Abdul Rahman.

Informasi Resmi Sekolah Terkini:
Nama Sekolah: ${schoolName}
Program Keahlian (Jurusan):
${cleanJurusans}

Ketentuan PPDB & Biaya Pendaftaran:
- Jalur Reguler: Rp ${regulerAmount.toLocaleString('id-ID')}
- Jalur Afirmasi (KIP / PIP / SKTM): Rp ${afirmasiAmount.toLocaleString('id-ID')} (ada potongan subsidi biaya & form upload kartu KIP/PIP)
- Jalur Prestasi (Akademik & Non-Akademik): Rp ${prestasiAmount.toLocaleString('id-ID')} (potongan untuk siswa berprestasi)

Metode Pembayaran Resmi:
1. QRIS (Standar Nasional): Dapat dipindai dari semua E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja) & M-Banking (BCA, Mandiri, BRI, BNI). Merchant: ${qrisMerchant}, NMID: ${qrisNmid}. Pendaftar mengunggah screenshot bukti pembayaran di portal PPDB.
2. Transfer Bank: Bank ${bankName}, No. Rek: ${bankAccount}, A.N. ${bankHolder}.
3. Tunai di Loket: Memilih opsi tunai saat daftar, mendapatkan kode booking kasir, lalu bayar tunai di loket bendahara sekolah dalam 3x24 jam.

Alur Pendaftaran PPDB:
1. Isi formulir di /ppdb (data diri, NISN, pilihan jurusan, jalur pendaftaran).
2. Pilih metode pembayaran (QRIS / Transfer Bank / Tunai di Loket).
3. Unggah bukti pembayaran (untuk QRIS/Transfer) atau simpan kode booking (untuk Tunai).
4. Cek status seleksi & berkas di /ppdb/status secara berkala.

Panduan Menjawab:
- Berikan jawaban yang terstruktur, rapi dengan poin-poin tebal dan bahasa Indonesia yang hangat & sopan.
- Berikan format JSON dengan struktur:
{
  "reply": "isi jawaban dalam format markdown rapi",
  "suggestions": ["3 pertanyaan singkat lanjutan yang relevan"],
  "actionLinks": [
    {"label": "Teks Tombol", "url": "/path-tujuan", "icon": "form/search/info/whatsapp/book/briefcase"}
  ]
}`;

        const conversationContext = history.slice(-6).map(h => `${h.sender === 'user' ? 'Pengguna' : 'Asisten'}: ${h.text}`).join('\n');
        const prompt = `${conversationContext ? `Riwayat obrolan:\n${conversationContext}\n\n` : ''}Pertanyaan Pengguna saat ini: ${message}\n\nBalas dalam format JSON yang valid persis sesuai skema di atas tanpa markdown wrapper lainnya.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1000,
              }
            }),
            signal: AbortSignal.timeout(7000)
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            let jsonText = rawText.trim();
            if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
            if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
            const parsed = JSON.parse(jsonText.trim());
            return NextResponse.json({
              reply: parsed.reply,
              suggestions: parsed.suggestions || [],
              actionLinks: parsed.actionLinks || [],
              source: 'gemini'
            } as ChatResponsePayload);
          }
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to Knowledge Engine:', geminiError);
      }
    }

    // 2. High-Performance Context-Aware Knowledge Engine (Cerdas & Cepat Tanpa Ketergantungan Eksternal)
    const q = message.toLowerCase();

    // Helper respons
    const buildResponse = (
      reply: string,
      suggestions: string[],
      actionLinks: ChatActionLink[]
    ): ChatResponsePayload => ({
      reply,
      suggestions,
      actionLinks,
      source: 'knowledge-engine'
    });

    // Deteksi Topik: Salam & Sapaan
    if (/^(halo|hai|hi|hey|assalam|pagi|siang|sore|malam|permisi|test|tes)/i.test(q)) {
      return NextResponse.json(buildResponse(
        `Halo! Selamat datang di **${schoolName}** 🌟\n\nSaya adalah **SMK Asisten AI**, siap membantu Anda 24/7 dengan informasi lengkap mengenai:\n• 📝 **Pendaftaran PPDB Online** & persyaratan\n• 💳 **Biaya Formulir & Cara Pembayaran QRIS / Transfer / Tunai**\n• 💻 **Program Keahlian (TJKT, DKV, MPLB)**\n• 📑 **Jalur Beasiswa KIP / Afirmasi & Prestasi**\n• 🔎 **Cek Status Pendaftaran & Verifikasi Berkas**\n\nApa yang ingin Anda tanyakan hari ini?`,
        ['Cara daftar PPDB online', 'Berapa biaya PPDB & bayar QRIS?', 'Apa saja jurusan di SMK?', 'Syarat jalur beasiswa KIP'],
        [
          { label: 'Daftar PPDB Online', url: '/ppdb', icon: 'form' },
          { label: 'Cek Status Pendaftaran', url: '/ppdb/status', icon: 'search' }
        ]
      ));
    }

    // Deteksi Topik: Siapa pembuat / Created By
    if (q.includes('creator') || q.includes('created') || q.includes('pembuat') || q.includes('bikin web') || q.includes('developer') || q.includes('abdul')) {
      return NextResponse.json(buildResponse(
        `Website dan Sistem PPDB Digital terintegrasi **${schoolName}** ini dirancang dan dikembangkan dengan bangga oleh **Abdul Rahman** 💻✨.\n\nSistem ini dilengkapi otomasi verifikasi formulir, multi-jalur beasiswa KIP, sistem pembayaran digital QRIS/Transfer, serta asisten AI interaktif untuk mempermudah calon siswa dan wali murid.`,
        ['Cara daftar PPDB online', 'Pilihan jurusan yang ada', 'Hubungi sekolah'],
        [
          { label: 'Kembali ke Beranda', url: '/', icon: 'info' }
        ]
      ));
    }

    // Deteksi Topik: Biaya & QRIS & Pembayaran
    if (q.includes('qris') || q.includes('biaya') || q.includes('bayar') || q.includes('tarif') || q.includes('uang') || q.includes('nominal') || q.includes('rekening') || q.includes('transfer') || q.includes('tunai') || q.includes('kasir')) {
      return NextResponse.json(buildResponse(
        `Berikut adalah **rincian resmi biaya pendaftaran PPDB ${schoolName}** berdasarkan jalur yang dipilih:\n\n` +
        `1. 🎓 **Jalur Reguler**: **Rp ${regulerAmount.toLocaleString('id-ID')}**\n` +
        `2. 📑 **Jalur Afirmasi (KIP / PIP / SKTM)**: **Rp ${afirmasiAmount.toLocaleString('id-ID')}** *(Mendapatkan subsidi khusus)*\n` +
        `3. 🏆 **Jalur Prestasi**: **Rp ${prestasiAmount.toLocaleString('id-ID')}** *(Potongan prestasi akademik/kejuaraan)*\n\n` +
        `### Opsi Metode Pembayaran yang Tersedia:\n` +
        `• 📱 **QRIS (Scan Barcode Otomatis)**: Mendukung seluruh E-Wallet (**GoPay, OVO, DANA, ShopeePay, LinkAja**) & M-Banking (**BCA, Mandiri, BRI, BNI**). Merchant: **${qrisMerchant}** (NMID: \`${qrisNmid}\`). Calon siswa cukup scan barcode di layar pendaftaran lalu unggah screenshot bukti bayar.\n` +
        `• 🏦 **Transfer Bank**: Bank **${bankName}**, No. Rekening: **${bankAccount}** a.n **${bankHolder}**.\n` +
        `• 💵 **Tunai di Loket**: Dapatkan **Kode Booking Tunai**, lalu serahkan uang pas langsung ke loket kasir sekolah dalam 3x24 jam.`,
        ['Bagaimana cara bayar via QRIS?', 'Syarat daftar jalur afirmasi KIP', 'Buka formulir pendaftaran PPDB'],
        [
          { label: 'Buka Formulir PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Cek Status Pembayaran', url: '/ppdb/status', icon: 'search' }
        ]
      ));
    }

    // Deteksi Topik: Cara Bayar via QRIS Spesifik
    if (q.includes('cara bayar qris') || q.includes('scan qris') || q.includes('barcode qris') || q.includes('langkah qris')) {
      return NextResponse.json(buildResponse(
        `### Panduan Praktis Pembayaran Memakai QRIS di PPDB:\n\n` +
        `1. **Buka Formulir PPDB** di halaman \`/ppdb\` dan lengkapi data diri Anda.\n` +
        `2. Pada langkah pembayaran, pilih tab **"QRIS (E-Wallet & M-Banking)"**.\n` +
        `3. Barcode QRIS resmi **${qrisMerchant}** akan tampil otomatis dengan nominal tagihan sesuai jalur yang Anda pilih.\n` +
        `4. Buka aplikasi M-Banking atau E-Wallet di HP Anda (BCA Mobile, Livin Mandiri, BRImo, GoPay, OVO, DANA, ShopeePay, dll.).\n` +
        `5. Pilih menu **Scan QRIS**, lalu arahkan kamera ke barcode (atau simpan gambar barcode jika membuka dari HP yang sama).\n` +
        `6. Masukkan nominal tagihan yang sesuai dan selesaikan transaksi.\n` +
        `7. Ambil tangkapan layar (**screenshot**) bukti transaksi berhasil, lalu unggah di form PPDB.\n` +
        `8. Panitia keuangan akan memverifikasi bukti Anda maksimal 1x24 jam kerja!`,
        ['Berapa biaya jalur afirmasi?', 'Cek status pendaftaran saya', 'Buka formulir pendaftaran'],
        [
          { label: 'Buka Halaman PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Cek Status PPDB', url: '/ppdb/status', icon: 'search' }
        ]
      ));
    }

    // Deteksi Topik: Afirmasi, KIP, PIP, SKTM, Beasiswa
    if (q.includes('afirmasi') || q.includes('kip') || q.includes('pip') || q.includes('sktm') || q.includes('beasiswa') || q.includes('tidak mampu') || q.includes('keringanan')) {
      return NextResponse.json(buildResponse(
        `### Informasi Jalur Afirmasi & Beasiswa KIP di ${schoolName}:\n\n` +
        `Jalur Afirmasi dibuka khusus bagi calon peserta didik pemegang **Kartu Indonesia Pintar (KIP)**, **Program Indonesia Pintar (PIP)**, atau **Surat Keterangan Tidak Mampu (SKTM)** dari kelurahan setempat.\n\n` +
        `**Keuntungan & Kebijakan:**\n` +
        `• Biaya administrasi formulir disubsidi menjadi hanya **Rp ${afirmasiAmount.toLocaleString('id-ID')}**.\n` +
        `• Kesempatan prioritas beasiswa SPP & bantuan perlengkapan sekolah.\n\n` +
        `**Syarat Dokumen:**\n` +
        `1. Nomor KIP / PIP / SKTM yang masih berlaku.\n` +
        `2. Foto/Scan berkas fisik KIP / kartu bantuan / surat SKTM saat mengisi formulir di jalur Afirmasi.`,
        ['Berapa biaya formulir reguler?', 'Cara daftar PPDB online', 'Pilihan jurusan yang tersedia'],
        [
          { label: 'Daftar Jalur Afirmasi', url: '/ppdb', icon: 'form' },
          { label: 'Cek Status Berkas KIP', url: '/ppdb/status', icon: 'search' }
        ]
      ));
    }

    // Deteksi Topik: Prestasi
    if (q.includes('prestasi') || q.includes('juara') || q.includes('piagam') || q.includes('sertifikat') || q.includes('tahfidz') || q.includes('lomba')) {
      return NextResponse.json(buildResponse(
        `### Informasi Jalur Prestasi ${schoolName}:\n\n` +
        `Jalur Prestasi diperuntukkan bagi calon peserta didik yang memiliki prestasi unggul di bidang:\n` +
        `• 🏆 **Akademik**: Juara olimpiade sains, matematika, bahasa, atau peringkat 1-3 paralel di SMP/MTs.\n` +
        `• 🥇 **Non-Akademik**: Kejuaraan olahraga, seni, debat, robotik, atau tahfidz Al-Qur'an (minimal tingkat kota/kabupaten).\n\n` +
        `**Keuntungan:**\n` +
        `• Potongan biaya formulir menjadi **Rp ${prestasiAmount.toLocaleString('id-ID')}**.\n` +
        `• Jalur seleksi bebas tes tertulis & prioritas penerimaan jurusan pilihan pertama.\n\n` +
        `Cukup lampirkan scan sertifikat / piagam kejuaraan saat mendaftar online.`,
        ['Buka formulir pendaftaran', 'Pilihan jurusan di SMK', 'Berapa biaya jalur reguler?'],
        [
          { label: 'Daftar Jalur Prestasi', url: '/ppdb', icon: 'form' },
          { label: 'Lihat Prestasi Sekolah', url: '/portofolio', icon: 'book' }
        ]
      ));
    }

    // Deteksi Topik: Cek Status Pendaftaran / NISN
    if (q.includes('status') || q.includes('nisn') || q.includes('cek') || q.includes('lulus') || q.includes('diterima') || q.includes('hasil') || q.includes('pengumuman')) {
      return NextResponse.json(buildResponse(
        `### Cara Cek Status Pendaftaran PPDB:\n\n` +
        `Anda dapat memantau status berkas dan pembayaran secara langsung kapan saja:\n` +
        `1. Kunjungi halaman **Cek Status PPDB** di \`/ppdb/status\`.\n` +
        `2. Masukkan **10 digit Nomor Induk Siswa Nasional (NISN)** Anda.\n` +
        `3. Masukkan **Tanggal Lahir** sesuai data yang didaftarkan.\n` +
        `4. Klik tombol **"Lacak Pendaftaran"**.\n\n` +
        `Sistem akan menampilkan:\n` +
        `• Status verifikasi berkas (*Menunggu Review / Diterima / Perlu Perbaikan*)\n` +
        `• Status pembayaran (*Lunas / Menunggu Verifikasi QRIS-Transfer / Bayar di Loket*)\n` +
        `• Tombol cetak kartu bukti pendaftaran resmi.`,
        ['Buka halaman Cek Status', 'Bagaimana cara bayar via QRIS?', 'Hubungi panitia PPDB'],
        [
          { label: 'Cek Status PPDB Sekarang', url: '/ppdb/status', icon: 'search' },
          { label: 'Buka Halaman Pendaftaran', url: '/ppdb', icon: 'form' }
        ]
      ));
    }

    // Deteksi Topik: Jurusan TJKT / TKJ
    if (q.includes('tjkt') || q.includes('tkj') || q.includes('jaringan') || q.includes('cyber') || q.includes('server') || q.includes('cisco') || q.includes('mikrotik')) {
      return NextResponse.json(buildResponse(
        `### Program Keahlian: TJKT (Teknik Jaringan Komputer & Telekomunikasi) 🌐\n\n` +
        `Jurusan unggulan masa depan yang mempelajari infrastruktur digital modern:\n` +
        `• 💻 **Keahlian Utama**: Administrasi Server Linux & Windows, Cyber Security, Cloud Computing, Instalasi Fiber Optic, Konfigurasi Router MikroTik & Cisco, serta IoT.\n` +
        `• 🏢 **Peluang Karir**: Network Engineer, Cyber Security Analyst, Cloud Administrator, IT Support Specialist, System Integrator.\n` +
        `• 🔬 **Fasilitas**: Lab Jaringan Standar Industri dengan perangkat switch/router enterprise dan sertifikasi keahlian internasional.`,
        ['Daftar jurusan TJKT', 'Biaya pendaftaran PPDB', 'Jurusan lainnya di SMK'],
        [
          { label: 'Pilih Jurusan TJKT di PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Lihat Lowongan Kerja Mitra BKK', url: '/bkk/jobs', icon: 'briefcase' }
        ]
      ));
    }

    // Deteksi Topik: Jurusan DKV
    if (q.includes('dkv') || q.includes('desain') || q.includes('multimedia') || q.includes('animasi') || q.includes('video') || q.includes('grafis') || q.includes('fotografi')) {
      return NextResponse.json(buildResponse(
        `### Program Keahlian: DKV (Desain Komunikasi Visual) 🎨✨\n\n` +
        `Jurusan kreatif berbasis industri digital dan periklanan modern:\n` +
        `• 🖌️ **Keahlian Utama**: Graphic Design, UI/UX Mobile & Web Design, 2D/3D Animation, Motion Graphics, Videografi & Video Editing, Digital Branding, serta Fotografi Studio.\n` +
        `• 💼 **Peluang Karir**: Graphic Designer, UI/UX Designer, Video Editor, 3D Animator, Content Creator, Creative Director, Multimedia Specialist.\n` +
        `• 🎬 **Fasilitas**: Studio Podcast & Videografi berlampu profesional, Lab iMac & PC High-End untuk rendering rendering desain.`,
        ['Daftar jurusan DKV', 'Lihat karya portofolio siswa', 'Berapa biaya pendaftarannya?'],
        [
          { label: 'Pilih Jurusan DKV di PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Lihat Portofolio Karya Siswa', url: '/portofolio', icon: 'book' }
        ]
      ));
    }

    // Deteksi Topik: Jurusan MPLB
    if (q.includes('mplb') || q.includes('otkp') || q.includes('kantor') || q.includes('administrasi') || q.includes('bisnis') || q.includes('sekretaris')) {
      return NextResponse.json(buildResponse(
        `### Program Keahlian: MPLB (Manajemen Perkantoran & Layanan Bisnis) 📊💼\n\n` +
        `Jurusan profesional di era digitalisasi operasional korporasi:\n` +
        `• 📁 **Keahlian Utama**: Administrasi Perkantoran Modern, Otomasi Tata Kelola Kearsipan Digital, Public Relations (Kehumasan), Komunikasi Bisnis Bahasa Inggris, serta Manajemen Keuangan Perusahaan.\n` +
        `• 🏢 **Peluang Karir**: Executive Secretary, Human Resource Officer, Office Administrator, Public Relations Staff, Customer Relationship Specialist.\n` +
        `• 📑 **Fasilitas**: Lab Simulasi Perkantoran Modern dengan software ERP dan ruang rapat eksekutif.`,
        ['Daftar jurusan MPLB', 'Biaya pendaftaran PPDB', 'Cek status pendaftaran'],
        [
          { label: 'Pilih Jurusan MPLB di PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Lihat Mitra Kerjasama Industri', url: '/bkk', icon: 'briefcase' }
        ]
      ));
    }

    // Deteksi Topik: Jurusan Umum
    if (q.includes('jurusan') || q.includes('prodi') || q.includes('kompetensi') || q.includes('program keahlian')) {
      return NextResponse.json(buildResponse(
        `### Program Keahlian (Jurusan) Unggulan di ${schoolName}:\n\n` +
        `1. 🌐 **TJKT (Teknik Jaringan Komputer & Telekomunikasi)**\n` +
        `   Fokus pada infrastruktur jaringan, cloud, fiber optic, cyber security & MikroTik/Cisco.\n\n` +
        `2. 🎨 **DKV (Desain Komunikasi Visual)**\n` +
        `   Fokus pada desain grafis, UI/UX, motion graphics, video editing, animasi 2D/3D & multimedia.\n\n` +
        `3. 📊 **MPLB (Manajemen Perkantoran & Layanan Bisnis)**\n` +
        `   Fokus pada digital office management, public relations, administrasi bisnis & kearsipan modern.\n\n` +
        `Semua jurusan telah diselaraskan dengan kurikulum industri dan didukung sertifikasi kompetensi BNSP!`,
        ['Detail jurusan TJKT', 'Detail jurusan DKV', 'Cara daftar PPDB online'],
        [
          { label: 'Daftar Sekarang di PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Lihat Karya Portofolio Siswa', url: '/portofolio', icon: 'book' }
        ]
      ));
    }

    // Deteksi Topik: BKK / Lowongan / Magang
    if (q.includes('bkk') || q.includes('kerja') || q.includes('lulusan') || q.includes('magang') || q.includes('prakerin') || q.includes('mitra')) {
      return NextResponse.json(buildResponse(
        `### Bursa Kerja Khusus (BKK) & Penyaluran Kerja ${schoolName}:\n\n` +
        `Sekolah kami memiliki unit **BKK resmi** yang aktif menyalurkan alumni ke dunia usaha dan dunia industri (DUDI):\n` +
        `• 🤝 **50+ Mitra Industri & Perusahaan Terkemuka** untuk program Praktik Kerja Lapangan (Prakerin) dan rekrutmen kerja langsung sebelum lulus.\n` +
        `• 📈 **Tingkat Keterserapan Lulusan 98%** (bekerja di perusahaan mitra, wirausaha mandiri, maupun melanjutkan ke perguruan tinggi negeri/swasta).\n` +
        `• 💼 Portal lowongan kerja berkala khusus alumni di halaman BKK.`,
        ['Lihat lowongan kerja BKK', 'Daftar PPDB online', 'Program keahlian sekolah'],
        [
          { label: 'Portal BKK & Lowongan Kerja', url: '/bkk/jobs', icon: 'briefcase' },
          { label: 'Daftar Siswa Baru (PPDB)', url: '/ppdb', icon: 'form' }
        ]
      ));
    }

    // Deteksi Topik: Kontak & Alamat
    if (q.includes('alamat') || q.includes('lokasi') || q.includes('kontak') || q.includes('wa') || q.includes('whatsapp') || q.includes('telepon') || q.includes('maps') || q.includes('gedung')) {
      return NextResponse.json(buildResponse(
        `### Kontak & Lokasi Kampus ${schoolName}:\n\n` +
        `• 📍 **Alamat**: Jl. Pendidikan No. 123, Kota Cerdas, Provinsi Teknologi\n` +
        `• 🌐 **Website Resmi**: [smkgama.sch.id](https://smkgama.sch.id/)\n` +
        `• 📞 **Telepon Kantor**: (021) 555-0123\n` +
        `• 💬 **Layanan WhatsApp Hotline PPDB**: 0812-3456-7890\n` +
        `• 🕒 **Jam Buka Loket Pendaftaran Fisik**: Senin - Jumat: 08.00 - 15.00 WIB | Sabtu: 08.00 - 12.00 WIB.\n\n` +
        `Pendaftaran online di website dapat dilakukan **24 jam nonstop**!`,
        ['Cara daftar PPDB online', 'Berapa biaya formulir pendaftaran?', 'Pilihan jurusan yang ada'],
        [
          { label: 'Daftar PPDB Online Sekarang', url: '/ppdb', icon: 'form' },
          { label: 'Hubungi WhatsApp Panitia', url: 'https://wa.me/6281234567890?text=Halo%20Panitia%20PPDB%20SMK', icon: 'whatsapp' }
        ]
      ));
    }

    // Deteksi Topik: Ucapan Terima Kasih
    if (q.includes('terima kasih') || q.includes('makasih') || q.includes('thanks') || q.includes('thx') || q.includes('mantap') || q.includes('keren') || q.includes('ok') || q.includes('oke') || q.includes('siap')) {
      return NextResponse.json(buildResponse(
        `Sama-sama! Senang bisa membantu Anda 😊🙏.\n\nJika ada pertanyaan lain seputar PPDB, pilihan jurusan, atau pembayaran QRIS, silakan langsung tanyakan kapan saja. Sukses untuk proses pendaftaran Anda di **${schoolName}**!`,
        ['Buka formulir PPDB sekarang', 'Cek status berkas saya', 'Biaya pendaftaran PPDB'],
        [
          { label: 'Mulai Pendaftaran PPDB', url: '/ppdb', icon: 'form' }
        ]
      ));
    }

    // Fallback Cerdas (Default)
    return NextResponse.json(buildResponse(
      `Terima kasih telah bertanya! Saya dapat memberikan informasi lengkap seputar **${schoolName}**.\n\n` +
      `Silakan pilih salah satu topik cepat di bawah ini atau ketikkan pertanyaan Anda secara spesifik:`,
      [
        'Cara daftar PPDB online',
        'Berapa biaya PPDB & bayar QRIS?',
        'Apa saja jurusan yang ada?',
        'Syarat jalur beasiswa KIP / Afirmasi'
      ],
      [
        { label: 'Buka Formulir PPDB', url: '/ppdb', icon: 'form' },
        { label: 'Cek Status Pendaftaran', url: '/ppdb/status', icon: 'search' },
        { label: 'Lihat Program Keahlian', url: '/', icon: 'info' }
      ]
    ));

  } catch (error: any) {
    console.error('Error in AI chat route:', error);
    return NextResponse.json({
      reply: 'Maaf, sistem asisten AI sedang mengalami kendala sesaat. Silakan coba tanyakan kembali atau buka menu pendaftaran PPDB.',
      suggestions: ['Cara daftar PPDB online', 'Berapa biaya PPDB?'],
      actionLinks: [{ label: 'Buka Halaman PPDB', url: '/ppdb', icon: 'form' }],
      source: 'knowledge-engine'
    } as ChatResponsePayload, { status: 200 });
  }
}
