const { parseBulkQuestions } = require('./cbt-bank-soal.js');

const withAltEnter = [
  'sep=;',
  'No;Pertanyaan Soal;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E (Opsional);Kunci Jawaban;Bobot Poin',
  '1;"Perhatikan paragraf berikut:\r\nKomputer adalah alat elektronik.\r\nFungsi utamanya adalah memproses data.\r\n\r\nApa kesimpulan teks di atas?";"Komputer alat pemroses data";"Komputer alat mekanik";"Komputer alat komunikasi";"Komputer alat hiburan";"";A;10'
].join('\r\n');

const res = parseBulkQuestions(withAltEnter);
console.log('Result with Alt+Enter:', res.length);
if (res.length > 0) {
  console.log('Question text:\n' + res[0].questionText);
}
