const { parseBulkQuestions } = require('./cbt-bank-soal.js');

const oddQuotes = [
  'sep=;',
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban;Bobot Poin',
  '1;Ukuran layar laptop ini adalah 14" inch;14;15;16;17;;A;10',
  '2;Berikut ini yang merupakan input device adalah?;Mouse;Monitor;Printer;Speaker;;A;10',
  '3;Berikut ini yang merupakan output device adalah?;Monitor;Keyboard;Scanner;Microphone;;A;10'
].join('\r\n');

const res = parseBulkQuestions(oddQuotes);
console.log('Result count with single quote (14") in Q1:', res.length);
if (res.length > 0) {
  res.forEach((r, i) => console.log(`Q${i+1}:`, r.questionText));
}
