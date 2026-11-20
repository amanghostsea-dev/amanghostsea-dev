const { parseBulkQuestions } = require('./cbt-bank-soal.js');

// Teacher copies only the questions from Excel without header row
const copiedRowsOnly = [
  '1\tApa fungsi CPU dalam komputer?\tPemroses data\tPenyimpan data\tPencetak data\tPendingin data\t\tA\t10',
  '2\tSatuan kecepatan prosesor adalah?\tHertz (Hz)\tByte (B)\tMeter (m)\tWatt (W)\t\tA\t10'
].join('\n');

const res = parseBulkQuestions(copiedRowsOnly);
console.log('Result when copying from Excel WITHOUT header row:', res.length);
if (res.length > 0) {
  res.forEach((r, i) => console.log(`Q${i+1}:`, r.questionText, 'Key:', r.correctAnswer, 'Opts:', r.options));
}
