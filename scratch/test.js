const {
  generateBlankTemplateCsv,
  generateBlankTemplateTxt,
  parseBulkQuestions,
  splitCsvRows,
  splitCsvLine
} = require('./cbt-bank-soal.js');

console.log('=== TEST 1: Blank Template CSV ===');
const blankCsv = generateBlankTemplateCsv();
const p1 = parseBulkQuestions(blankCsv);
console.log('Parsed count p1:', p1.length);
if (p1.length > 0) {
  console.log('Sample question 1:', p1[0].questionText, 'Key:', p1[0].correctAnswer, 'Opts:', p1[0].options.length);
}

console.log('\n=== TEST 2: Blank Template TXT ===');
const blankTxt = generateBlankTemplateTxt();
const p2 = parseBulkQuestions(blankTxt);
console.log('Parsed count p2:', p2.length);

console.log('\n=== TEST 3: ExamDetailClient inline CSV template ===');
const inlineCsv = [
  'sep=;',
  '# PETUNJUK PENGISIAN TEMPLATE SOAL CBT (SMK GARUDA MAHADHIKA)',
  '# 1. Buka file ini menggunakan Microsoft Excel, WPS Office, atau Google Sheets.',
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban (A/B/C/D/E);Bobot Poin;Topik / Catatan Guru',
  '1;"Apa kepanjangan dari HTML dalam pemrograman web?";"Hyper Text Markup Language";"High Tech Modern Language";"Hyperlink Text Making Link";"Home Tool Multi Language";"";A;10;"Dasar HTML"',
  '2;"Tag HTML yang digunakan untuk membuat tautan atau hyperlink ke halaman lain adalah...";"<link>";"<a>";"<href>";"<url>";"";B;10;"Struktur HTML"'
].join('\r\n');
const p3 = parseBulkQuestions(inlineCsv);
console.log('Parsed count p3:', p3.length);
if (p3.length > 0) {
  console.log('Sample inline p3 question 1:', p3[0].questionText, 'Key:', p3[0].correctAnswer, 'Opts:', p3[0].options.length);
}

console.log('\n=== TEST 4: Excel copy-pasted (TAB separated) ===');
const tabPasted = [
  'No\tPertanyaan Soal\tPilihan A\tPilihan B\tPilihan C\tPilihan D\tPilihan E (Opsional)\tKunci Jawaban\tBobot Poin\tURL Gambar (Opsional)',
  '1\tApa kepanjangan RAM?\tRandom Access Memory\tRead Access Memory\tReal Access Memory\tRun Access Memory\t\tA\t10\t',
  '2\tPerangkat input komputer adalah?\tKeyboard\tMonitor\tPrinter\tSpeaker\t\tA\t10\t'
].join('\n');
const p4 = parseBulkQuestions(tabPasted);
console.log('Parsed count p4:', p4.length);

console.log('\n=== TEST 5: CSV saved by Excel (with quotes inside text) ===');
const excelQuotes = [
  'sep=;',
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban;Bobot Poin;URL Gambar',
  '1;"Perintah ""git commit"" digunakan untuk apa?";"Menyimpan perubahan";"Menghapus file";"Membuat branch";"Melihat log";"";A;10;""'
].join('\r\n');
const p5 = parseBulkQuestions(excelQuotes);
console.log('Parsed count p5:', p5.length);
if (p5.length > 0) {
  console.log('Sample question 5 text:', p5[0].questionText);
}

console.log('\n=== TEST 6: CSV without sep=; (Standard Excel save) ===');
const excelNoSep = [
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban;Bobot Poin;URL Gambar',
  '1;"Apa itu CPU?";"Central Processing Unit";"Central Power Unit";"Core Processing Unit";"Control Processing Unit";"";A;10;""',
  '2;"Apa itu GPU?";"Graphics Processing Unit";"General Power Unit";"General Processing Unit";"Graphic Power Unit";"";A;10;""'
].join('\r\n');
const p6 = parseBulkQuestions(excelNoSep);
console.log('Parsed count p6:', p6.length);

console.log('\n=== TEST 7: CSV saved with COMMA (US Excel or Google Sheets export) ===');
const sheetsCsv = [
  'No,Pertanyaan Soal,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E (Opsional),Kunci Jawaban,Bobot Poin,URL Gambar',
  '1,"Apa itu CPU?","Central Processing Unit","Central Power Unit","Core Processing Unit","Control Processing Unit","",A,10,""',
  '2,"Apa itu GPU?","Graphics Processing Unit","General Power Unit","General Processing Unit","Graphic Power Unit","",A,10,""'
].join('\r\n');
const p7 = parseBulkQuestions(sheetsCsv);
console.log('Parsed count p7:', p7.length);

console.log('\n=== TEST 8: Teacher writes without quotes in Excel or text editor ===');
const rawCsv = [
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;Kunci Jawaban;Bobot Poin',
  '1;Apa itu CPU?;Central Processing Unit;Central Power Unit;Core Processing Unit;Control Processing Unit;;A;10',
  '2;Apa itu GPU?;Graphics Processing Unit;General Power Unit;General Processing Unit;Graphic Power Unit;;A;10'
].join('\r\n');
const p8 = parseBulkQuestions(rawCsv);
console.log('Parsed count p8:', p8.length);

console.log('\n=== TEST 9: Teacher writes questions with question numbers like "1. Apa itu CPU?" ===');
const withNumCsv = [
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;Kunci Jawaban;Bobot Poin',
  '1;1. Apa itu CPU?;A. Central Processing Unit;B. Central Power Unit;C. Core Processing Unit;D. Control Processing Unit;;A;10'
].join('\r\n');
const p9 = parseBulkQuestions(withNumCsv);
console.log('Parsed count p9:', p9.length);
if (p9.length > 0) {
  console.log('Sample question 9:', p9[0].questionText, 'opts:', p9[0].options);
}
