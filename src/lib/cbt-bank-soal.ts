/**
 * CBT Bank Soal Helper
 * Format ekspor & impor bank soal CBT SMK Garuda Mahadhika.
 * Memastikan butir soal yang diunduh dari bank soal 100% kompatibel dan
 * dapat langsung di-upload ulang saat guru membuat paket ujian baru.
 */

export interface ExportableQuestionItem {
  id?: string;
  questionText: string;
  imageUrl?: string | null;
  options: string | string[];
  correctAnswer: string | number;
  points?: number | null;
  order?: number | null;
}

/**
 * Konversi index jawaban ('0', '1', '2', '3', '4') ke huruf ('A', 'B', 'C', 'D', 'E')
 */
export function keyToLetter(correctAnswer: string | number | null | undefined): string {
  const s = String(correctAnswer ?? '').trim().toUpperCase();
  if (s === '0') return 'A';
  if (s === '1') return 'B';
  if (s === '2') return 'C';
  if (s === '3') return 'D';
  if (s === '4') return 'E';
  if (['A', 'B', 'C', 'D', 'E'].includes(s)) return s;
  return 'A';
}

/**
 * Konversi huruf jawaban ('A', 'B', 'C', 'D', 'E') ke index ('0', '1', '2', '3', '4')
 */
export function letterToKey(keyLetter: string | null | undefined): string {
  const s = String(keyLetter ?? '').trim().toUpperCase();
  if (s === 'A' || s === '0') return '0';
  if (s === 'B' || s === '1') return '1';
  if (s === 'C' || s === '2') return '2';
  if (s === 'D' || s === '3') return '3';
  if (s === 'E' || s === '4') return '4';
  return '0';
}

/**
 * Escape sel CSV standar RFC 4180 untuk pemisah titik koma ';'
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Gandakan tanda petik dua internal
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Normalisasi opsi jawaban dari JSON string atau array
 */
export function normalizeOptions(options: string | string[]): string[] {
  if (Array.isArray(options)) return options;
  try {
    const parsed = JSON.parse(options);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback jika bukan JSON
  }
  return [];
}

/**
 * Pecah baris-baris CSV dengan mempertahankan baris baru di dalam tanda petik ganda
 */
export function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentRow += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        currentRow += '"';
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentRow.trim()) {
        rows.push(currentRow.trim());
      }
      currentRow = '';
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim()) {
    rows.push(currentRow.trim());
  }
  return rows;
}

/**
 * Generate string CSV format bank soal CBT resmi siap upload (dilengkapi UTF-8 BOM dan sep=;)
 */
export function generateExamQuestionsCsv(
  examTitle: string,
  examSubject: string,
  questions: ExportableQuestionItem[]
): string {
  const instructions = [
    '# BANK SOAL RESMI CBT - SMK GARUDA MAHADHIKA',
    `# Judul Ujian: ${examTitle}`,
    `# Mata Pelajaran: ${examSubject}`,
    `# Total Soal: ${questions.length} Butir Soal`,
    '# FORMAT SIAP UPLOAD: File ini dibuat dengan format standar resmi CBT (pemisah titik koma ";").',
    "# PETUNJUK: Saat guru membuat paket ujian baru, file ini DAPAT LANGSUNG DI-UPLOAD melalui menu 'Input Kolektif (Batch)' -> 'Unggah File (.csv/.txt)'.",
    '# Catatan: Kolom Kunci Jawaban berisi A, B, C, D, atau E. Bobot Poin diisi angka.',
  ];

  const headers = [
    'No',
    'Pertanyaan Soal',
    'Pilihan A',
    'Pilihan B',
    'Pilihan C',
    'Pilihan D',
    'Pilihan E (Opsional)',
    'Kunci Jawaban (A/B/C/D/E)',
    'Bobot Poin',
    'URL Gambar (Opsional)',
    'Topik / Catatan Guru',
  ];

  const rows = questions.map((q, idx) => {
    const opts = normalizeOptions(q.options);
    const optA = opts[0] || '';
    const optB = opts[1] || '';
    const optC = opts[2] || '';
    const optD = opts[3] || '';
    const optE = opts[4] || '';
    const key = keyToLetter(q.correctAnswer);
    const pts = q.points !== undefined && q.points !== null ? q.points : 10;
    const img = q.imageUrl?.trim() || '';

    return [
      String(idx + 1),
      escapeCsvCell(q.questionText),
      escapeCsvCell(optA),
      escapeCsvCell(optB),
      escapeCsvCell(optC),
      escapeCsvCell(optD),
      escapeCsvCell(optE),
      key,
      String(pts),
      escapeCsvCell(img),
      escapeCsvCell(examSubject),
    ].join(';');
  });

  const csvLines = [
    'sep=;',
    ...instructions,
    headers.join(';'),
    ...rows,
  ];

  // Karakter \uFEFF adalah UTF-8 BOM agar Microsoft Excel di Windows langsung membaca kolom dengan rapi
  return '\uFEFF' + csvLines.join('\r\n');
}

/**
 * Generate format naskah soal bernomor (.txt) siap buka di Notepad/Word & siap upload/copy-paste
 */
export function generateExamQuestionsTxt(
  examTitle: string,
  examSubject: string,
  questions: ExportableQuestionItem[]
): string {
  const lines = [
    '======================================================================',
    'NASKAH BANK SOAL CBT RESMI - SMK GARUDA MAHADHIKA',
    `Judul Ujian    : ${examTitle}`,
    `Mata Pelajaran : ${examSubject}`,
    `Total Soal     : ${questions.length} Butir Soal`,
    '======================================================================',
    'PETUNJUK PENGGUNAAN:',
    '1. File ini dapat langsung diunggah (.txt) pada menu "Input Kolektif (Batch)" -> "Unggah File".',
    '2. Anda juga dapat menyalin isinya (Ctrl+A -> Ctrl+C -> Ctrl+V) langsung ke form batch.',
    '3. Format ini mendukung rumus KaTeX ($...$) dan format penomoran resmi.',
    '======================================================================',
    '',
  ];

  questions.forEach((q, idx) => {
    const opts = normalizeOptions(q.options);
    const key = keyToLetter(q.correctAnswer);
    const pts = q.points !== undefined && q.points !== null ? q.points : 10;

    lines.push(`${idx + 1}. ${q.questionText}`);
    if (q.imageUrl && q.imageUrl.trim()) {
      lines.push(`Gambar: ${q.imageUrl.trim()}`);
    }
    if (opts[0]) lines.push(`A. ${opts[0]}`);
    if (opts[1]) lines.push(`B. ${opts[1]}`);
    if (opts[2]) lines.push(`C. ${opts[2]}`);
    if (opts[3]) lines.push(`D. ${opts[3]}`);
    if (opts[4]) lines.push(`E. ${opts[4]}`);
    lines.push(`Kunci: ${key}`);
    lines.push(`Poin: ${pts}`);
    lines.push('');
  });

  return lines.join('\r\n');
}

/**
 * Generate format master JSON untuk cadangan data teknis
 */
export function generateExamQuestionsJson(
  examTitle: string,
  examSubject: string,
  questions: ExportableQuestionItem[]
): string {
  const data = {
    metadata: {
      generator: 'SMK Garuda Mahadhika CBT System',
      title: examTitle,
      subject: examSubject,
      exportedAt: new Date().toISOString(),
      totalQuestions: questions.length,
    },
    questions: questions.map((q, idx) => ({
      nomor: idx + 1,
      questionText: q.questionText,
      imageUrl: q.imageUrl || null,
      options: normalizeOptions(q.options),
      correctAnswerIndex: letterToKey(String(q.correctAnswer)),
      correctAnswerLetter: keyToLetter(q.correctAnswer),
      points: q.points !== undefined && q.points !== null ? q.points : 10,
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Pemicu unduhan file langsung di browser client
 */
export function triggerBrowserDownload(
  content: string,
  fileName: string,
  mimeType: string = 'text/csv;charset=utf-8;'
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
