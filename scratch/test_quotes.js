const { parseBulkQuestions } = require('./cbt-bank-soal.js');

const csvWithQuotesInside = [
  'sep=;',
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban;Bobot Poin',
  '1;Apa arti dari kata "komputer" dalam bahasa latin?;Menghitung;Membaca;Menulis;Menggambar;;A;10',
  '2;Perangkat yang disebut "otak" komputer adalah?;CPU;RAM;ROM;VGA;;A;10',
  '3;Ukuran layar monitor standar adalah 14" atau 15";Benar;Salah;Ragu;Bisa jadi;;A;10'
].join('\r\n');

const res = parseBulkQuestions(csvWithQuotesInside);
console.log('Result count with unescaped quotes inside cells:', res.length);
if (res.length > 0) {
  res.forEach((r, i) => console.log(`Q${i+1}:`, r.questionText));
}
