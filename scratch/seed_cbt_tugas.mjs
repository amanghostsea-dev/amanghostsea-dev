import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CBT & Tugas data...");

  // 1. Create Sample Exams
  const exam1 = await prisma.exam.create({
    data: {
      title: "Ujian Akhir Semester - Pemrograman Web",
      subject: "Pemrograman Web & Perangkat Bergerak",
      classTarget: "XI RPL 1",
      duration: 45, // 45 menit
      token: "RPL2026",
      description: "Ujian online teori Pemrograman Web dasar mencakup HTML5, CSS3, JavaScript ES6, dan konsep REST API.",
      status: "PUBLISHED",
      shuffleQuestions: true,
      authorName: "Bpk. Ahmad ST",
      questions: {
        create: [
          {
            questionText: "Tag HTML manakah yang digunakan untuk membuat judul utama paling besar dalam dokumen web?",
            options: JSON.stringify(["<h6>", "<head>", "<h1>", "<title>"]),
            correctAnswer: "2", // h1
            points: 20,
            order: 1,
          },
          {
            questionText: "Properti CSS apa yang digunakan untuk mengatur jarak bagian dalam (antara konten dan border) sebuah elemen?",
            options: JSON.stringify(["margin", "padding", "border-spacing", "outline"]),
            correctAnswer: "1", // padding
            points: 20,
            order: 2,
          },
          {
            questionText: "Metode HTTP mana yang paling tepat digunakan untuk mengirimkan data sensitif seperti password pada form login?",
            options: JSON.stringify(["GET", "POST", "HEAD", "OPTIONS"]),
            correctAnswer: "1", // POST
            points: 20,
            order: 3,
          },
          {
            questionText: "Di JavaScript modern (ES6), kata kunci apa yang digunakan untuk mendeklarasikan variabel yang nilainya tidak dapat diubah kembali (konstan)?",
            options: JSON.stringify(["var", "let", "const", "static"]),
            correctAnswer: "2", // const
            points: 20,
            order: 4,
          },
          {
            questionText: "Framework React menggunakan ekstensi sintaks apa untuk menulis kode mirip HTML di dalam JavaScript?",
            options: JSON.stringify(["JSON", "XML", "JSX", "TypeScript"]),
            correctAnswer: "2", // JSX
            points: 20,
            order: 5,
          },
        ]
      }
    }
  });

  const exam2 = await prisma.exam.create({
    data: {
      title: "Kuis Harian - Konsep Basis Data Relasional",
      subject: "Basis Data",
      classTarget: "XI RPL 1",
      duration: 30,
      token: "DB101",
      description: "Kuis singkat pemahaman DDL, DML, dan relasi Primary Key - Foreign Key.",
      status: "PUBLISHED",
      shuffleQuestions: true,
      authorName: "Bpk. Budi S.Kom",
      questions: {
        create: [
          {
            questionText: "Perintah SQL manakah yang termasuk ke dalam kategori DDL (Data Definition Language)?",
            options: JSON.stringify(["SELECT", "INSERT", "CREATE TABLE", "UPDATE"]),
            correctAnswer: "2",
            points: 25,
            order: 1,
          },
          {
            questionText: "Kunci unik yang digunakan untuk menghubungkan satu tabel dengan tabel lainnya di basis data relasional disebut...",
            options: JSON.stringify(["Candidate Key", "Foreign Key", "Super Key", "Alternate Key"]),
            correctAnswer: "1",
            points: 25,
            order: 2,
          },
          {
            questionText: "Klausa SQL apa yang digunakan untuk menyaring baris berdasarkan kondisi tertentu?",
            options: JSON.stringify(["ORDER BY", "GROUP BY", "WHERE", "HAVING"]),
            correctAnswer: "2",
            points: 25,
            order: 3,
          },
          {
            questionText: "Manakah dari DBMS berikut yang menggunakan model relasional SQL?",
            options: JSON.stringify(["MongoDB", "PostgreSQL", "Redis", "Cassandra"]),
            correctAnswer: "1",
            points: 25,
            order: 4,
          },
        ]
      }
    }
  });

  // 2. Create Sample Assignments
  const assignment1 = await prisma.assignment.create({
    data: {
      title: "Tugas 01: Desain ERD Toko Buku Online",
      subject: "Basis Data",
      classTarget: "XI RPL 1",
      description: "Buatlah rancangan Entity Relationship Diagram (ERD) untuk sistem Toko Buku Online. Minimal harus mencakup tabel: Pelanggan, Buku, Kategori, Transaksi, dan Detail_Transaksi. Sertakan Primary Key dan Foreign Key pada tiap relasi. Kumpulkan dalam format PDF.",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari ke depan
      status: "ACTIVE",
      authorName: "Bpk. Budi S.Kom",
      submissions: {
        create: [
          {
            studentName: "Budi Santoso",
            studentNis: "10293847",
            studentClass: "XI RPL 1",
            notes: "Sudah saya lengkapi dengan relasi 1 to Many dan diagram kardinalitas, Pak.",
            fileUrl: "https://drive.google.com/sample-erd-budi.pdf",
            fileName: "ERD_TokoBuku_BudiSantoso_XI-RPL1.pdf",
            grade: 95,
            feedback: "Bagus sekali! Normalisasi sampai 3NF sudah rapi dan relasi antar tabel tepat.",
            status: "GRADED",
          }
        ]
      }
    }
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      title: "Tugas 02: Slicing Landing Page Portofolio dengan CSS Flexbox",
      subject: "Pemrograman Web & Perangkat Bergerak",
      classTarget: "XI RPL 1",
      description: "Buatlah halaman landing page portofolio sederhana menggunakan HTML semantik dan CSS Flexbox. Halaman harus responsif saat dibuka di layar HP dan laptop. Kumpulkan link repository GitHub atau Google Drive zip file.",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 hari ke depan
      status: "ACTIVE",
      authorName: "Bpk. Ahmad ST",
    }
  });

  console.log("Seeding CBT & Tugas completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
