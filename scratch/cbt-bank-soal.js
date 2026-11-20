"use strict";
/**
 * CBT Bank Soal Helper
 * Format ekspor & impor bank soal CBT SMK Garuda Mahadhika.
 * Memastikan butir soal yang diunduh dari bank soal 100% kompatibel dan
 * dapat langsung di-upload ulang saat guru membuat paket ujian baru.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyToLetter = keyToLetter;
exports.letterToKey = letterToKey;
exports.escapeCsvCell = escapeCsvCell;
exports.unescapeCsvCell = unescapeCsvCell;
exports.normalizeOptions = normalizeOptions;
exports.splitCsvRows = splitCsvRows;
exports.splitCsvLine = splitCsvLine;
exports.generateExamQuestionsCsv = generateExamQuestionsCsv;
exports.generateExamQuestionsTxt = generateExamQuestionsTxt;
exports.generateExamQuestionsJson = generateExamQuestionsJson;
exports.generateExamQuestionsClipboard = generateExamQuestionsClipboard;
exports.generateBlankTemplateCsv = generateBlankTemplateCsv;
exports.generateBlankTemplateTxt = generateBlankTemplateTxt;
exports.parseBulkQuestions = parseBulkQuestions;
exports.triggerBrowserDownload = triggerBrowserDownload;
/**
 * Konversi index jawaban ('0', '1', '2', '3', '4') ke huruf ('A', 'B', 'C', 'D', 'E')
 */
function keyToLetter(correctAnswer) {
    const s = String(correctAnswer ?? '').trim().toUpperCase();
    if (s === '0')
        return 'A';
    if (s === '1')
        return 'B';
    if (s === '2')
        return 'C';
    if (s === '3')
        return 'D';
    if (s === '4')
        return 'E';
    if (['A', 'B', 'C', 'D', 'E'].includes(s))
        return s;
    return 'A';
}
/**
 * Konversi huruf jawaban ('A', 'B', 'C', 'D', 'E') ke index ('0', '1', '2', '3', '4')
 */
function letterToKey(keyLetter) {
    const s = String(keyLetter ?? '').trim().toUpperCase();
    if (s === 'A' || s === '0')
        return '0';
    if (s === 'B' || s === '1')
        return '1';
    if (s === 'C' || s === '2')
        return '2';
    if (s === 'D' || s === '3')
        return '3';
    if (s === 'E' || s === '4')
        return '4';
    return '0';
}
/**
 * Escape sel CSV standar RFC 4180 untuk pemisah titik koma ';' atau koma ','
 */
function escapeCsvCell(val) {
    if (val === null || val === undefined)
        return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
}
/**
 * Unescape sel CSV standar RFC 4180
 */
function unescapeCsvCell(val) {
    let s = val.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
    }
    return s.replace(/""/g, '"').trim();
}
/**
 * Normalisasi opsi jawaban dari JSON string atau array
 */
function normalizeOptions(options) {
    if (Array.isArray(options))
        return options.map(String);
    try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed))
            return parsed.map(String);
    }
    catch {
        // fallback jika bukan JSON
    }
    return [];
}
/**
 * Pecah baris-baris CSV dengan mempertahankan baris baru (newline) di dalam tanda petik ganda
 */
function splitCsvRows(text) {
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                currentRow += '""';
                i++;
            }
            else {
                inQuotes = !inQuotes;
                currentRow += '"';
            }
        }
        else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i++;
            }
            if (currentRow.trim()) {
                rows.push(currentRow.trim());
            }
            currentRow = '';
        }
        else {
            currentRow += char;
        }
    }
    if (currentRow.trim()) {
        rows.push(currentRow.trim());
    }
    return rows;
}
/**
 * Pecah satu baris CSV ke kolom-kolom berdasarkan delimiter (titik koma, koma, tab)
 * dengan menjaga tanda petik ganda RFC 4180
 */
function splitCsvLine(line, delimiter = ';') {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '""';
                i++;
            }
            else {
                inQuotes = !inQuotes;
                current += '"';
            }
        }
        else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
/**
 * 1. Generate string CSV format bank soal CBT resmi siap upload (dilengkapi UTF-8 BOM dan sep=;)
 * 100% kompatibel dibuka di Microsoft Excel Indonesia & siap diunggah ulang ke CBT
 */
function generateExamQuestionsCsv(examTitle, examSubject, questions) {
    const instructions = [
        '# BANK SOAL RESMI CBT - SMK GARUDA MAHADHIKA',
        `# Judul Ujian: ${examTitle}`,
        `# Mata Pelajaran: ${examSubject}`,
        `# Total Soal: ${questions.length} Butir Soal`,
        '# FORMAT SIAP UPLOAD: File ini dibuat dengan format standar resmi CBT (pemisah titik koma ";").',
        "# PETUNJUK: Saat guru membuat paket ujian baru, file ini DAPAT LANGSUNG DI-UPLOAD melalui menu 'Input Kolektif' -> 'Unggah File'.",
        '# Catatan: Kolom Kunci Jawaban diisi A, B, C, D, atau E. Bobot Poin diisi angka.',
    ];
    const headers = [
        'No',
        'Pertanyaan Soal',
        'Pilihan A',
        'Pilihan B',
        'Pilihan C',
        'Pilihan D',
        'Pilihan E (Opsional)',
        'Kunci Jawaban',
        'Bobot Poin',
        'URL Gambar (Opsional)',
        'Mata Pelajaran',
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
 * 2. Generate format naskah soal bernomor (.txt) siap buka di Notepad/Word & siap upload/copy-paste
 */
function generateExamQuestionsTxt(examTitle, examSubject, questions) {
    const lines = [
        '======================================================================',
        'NASKAH BANK SOAL CBT RESMI - SMK GARUDA MAHADHIKA',
        `Judul Ujian    : ${examTitle}`,
        `Mata Pelajaran : ${examSubject}`,
        `Total Soal     : ${questions.length} Butir Soal`,
        '======================================================================',
        'PETUNJUK PENGGUNAAN:',
        '1. File ini dapat langsung diunggah (.txt) pada menu "Input Kolektif" -> "Unggah File".',
        '2. Anda juga dapat menyalin isinya (Ctrl+A -> Ctrl+C -> Ctrl+V) langsung ke form batch.',
        '3. Format ini mendukung rumus matematika KaTeX ($...$) dan format naskah penomoran resmi.',
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
        if (opts[0])
            lines.push(`A. ${opts[0]}`);
        if (opts[1])
            lines.push(`B. ${opts[1]}`);
        if (opts[2])
            lines.push(`C. ${opts[2]}`);
        if (opts[3])
            lines.push(`D. ${opts[3]}`);
        if (opts[4])
            lines.push(`E. ${opts[4]}`);
        lines.push(`Kunci: ${key}`);
        lines.push(`Poin: ${pts}`);
        lines.push('');
    });
    return lines.join('\r\n');
}
/**
 * 3. Generate format master JSON untuk cadangan data digital lengkap
 */
function generateExamQuestionsJson(examTitle, examSubject, questions) {
    const data = {
        metadata: {
            generator: 'SMK Garuda Mahadhika CBT System',
            title: examTitle,
            subject: examSubject,
            exportedAt: new Date().toISOString(),
            totalQuestions: questions.length,
            note: 'File cadangan resmi CBT. Dapat langsung di-upload ulang pada menu Input Kolektif (.json).',
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
 * 4. Generate format teks murni siap paste langsung (Quick Clipboard Copy)
 */
function generateExamQuestionsClipboard(questions) {
    const lines = [];
    questions.forEach((q, idx) => {
        const opts = normalizeOptions(q.options);
        const key = keyToLetter(q.correctAnswer);
        const pts = q.points !== undefined && q.points !== null ? q.points : 10;
        lines.push(`${idx + 1}. ${q.questionText}`);
        if (q.imageUrl && q.imageUrl.trim()) {
            lines.push(`Gambar: ${q.imageUrl.trim()}`);
        }
        if (opts[0])
            lines.push(`A. ${opts[0]}`);
        if (opts[1])
            lines.push(`B. ${opts[1]}`);
        if (opts[2])
            lines.push(`C. ${opts[2]}`);
        if (opts[3])
            lines.push(`D. ${opts[3]}`);
        if (opts[4])
            lines.push(`E. ${opts[4]}`);
        lines.push(`Kunci: ${key}`);
        lines.push(`Poin: ${pts}`);
        lines.push('');
    });
    return lines.join('\n');
}
/**
 * 5. Generate template kosong Excel (.csv) siap isi untuk guru
 */
function generateBlankTemplateCsv() {
    const instructions = [
        '# TEMPLATE RESMI PENYUSUNAN BANK SOAL CBT - SMK GARUDA MAHADHIKA',
        '# Petunjuk Pengisian:',
        '# 1. Tulis pertanyaan pada kolom Pertanyaan Soal.',
        '# 2. Isi pilihan jawaban A sampai D (Pilihan E opsional jika soal jenjang SMK memerlukan 5 opsi).',
        '# 3. Kunci Jawaban diisi dengan huruf A, B, C, D, atau E.',
        '# 4. Bobot Poin diisi angka bilangan bulat (default: 10 poin per soal).',
        '# 5. File ini dapat langsung diunggah melalui menu "Input Kolektif" -> "Unggah File (.csv)".',
    ];
    const headers = [
        'No',
        'Pertanyaan Soal',
        'Pilihan A',
        'Pilihan B',
        'Pilihan C',
        'Pilihan D',
        'Pilihan E (Opsional)',
        'Kunci Jawaban',
        'Bobot Poin',
        'URL Gambar (Opsional)',
    ];
    const sampleRows = [
        '1;"Jaringan komputer yang menghubungkan komputer dalam area geografis terbatas seperti gedung sekolah disebut...";"LAN";"WAN";"MAN";"PAN";"SAN";A;10;""',
        '2;"Perangkat keras komputer yang berfungsi memproses instruksi dan data pada sistem komputasi adalah...";"CPU (Central Processing Unit)";"RAM";"Harddisk";"Power Supply";"Monitor";A;10;""',
        '3;"Protokol jaringan standar yang digunakan untuk mentransfer halaman web secara terenkripsi dan aman adalah...";"HTTPS";"FTP";"SMTP";"TELNET";"SNMP";A;10;""',
    ];
    const csvLines = [
        'sep=;',
        ...instructions,
        headers.join(';'),
        ...sampleRows,
    ];
    return '\uFEFF' + csvLines.join('\r\n');
}
/**
 * 6. Generate template kosong Dokumen Teks (.txt) siap isi untuk guru
 */
function generateBlankTemplateTxt() {
    return [
        '======================================================================',
        'TEMPLATE NASKAH SOAL CBT RESMI - SMK GARUDA MAHADHIKA',
        'Petunjuk: Tuliskan soal dengan format di bawah ini.',
        'Dapat langsung diunggah atau di-copy-paste ke form Input Kolektif.',
        '======================================================================',
        '',
        '1. Jaringan komputer yang menghubungkan komputer dalam area terbatas seperti gedung sekolah adalah...',
        'A. LAN (Local Area Network)',
        'B. WAN (Wide Area Network)',
        'C. MAN (Metropolitan Area Network)',
        'D. PAN (Personal Area Network)',
        'E. SAN (Storage Area Network)',
        'Kunci: A',
        'Poin: 10',
        '',
        '2. Perangkat keras yang berfungsi sebagai otak pemroses data utama pada komputer adalah...',
        'A. CPU (Central Processing Unit)',
        'B. Monitor',
        'C. Keyboard',
        'D. Mouse',
        'E. Speaker',
        'Kunci: A',
        'Poin: 10',
        '',
    ].join('\r\n');
}
/**
 * 🚀 Universal Parser Bank Soal Kolektif
 * Mengubah teks input (JSON, CSV titik-koma/koma/tab, maupun naskah Word/TXT)
 * menjadi array ParsedQuestion yang siap disimpan ke database.
 */
function parseBulkQuestions(rawText, defaultPoints = 10) {
    const trimmed = rawText.trim();
    if (!trimmed)
        return [];
    // ==========================================
    // TAHAP 1: Deteksi format JSON (.json)
    // ==========================================
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsedJson = JSON.parse(trimmed);
            const list = Array.isArray(parsedJson)
                ? parsedJson
                : (parsedJson.questions || parsedJson.data || parsedJson.items || []);
            if (Array.isArray(list) && list.length > 0) {
                const jsonResults = [];
                for (const item of list) {
                    const qText = item.questionText || item.pertanyaan || item.soal || item.question || '';
                    if (!qText.trim())
                        continue;
                    const rawOpts = item.options || item.pilihan || item.opsi || [];
                    const opts = Array.isArray(rawOpts) ? rawOpts.map(String) : normalizeOptions(rawOpts);
                    const rawKey = item.correctAnswerLetter ?? item.correctAnswer ?? item.kunci ?? item.kunciJawaban ?? item.key ?? 'A';
                    const kStr = String(rawKey).toUpperCase().trim();
                    let kIdx = 0;
                    if (kStr === 'B' || kStr === '1')
                        kIdx = 1;
                    else if (kStr === 'C' || kStr === '2')
                        kIdx = 2;
                    else if (kStr === 'D' || kStr === '3')
                        kIdx = 3;
                    else if (kStr === 'E' || kStr === '4')
                        kIdx = 4;
                    const filledOpts = [...opts];
                    while (filledOpts.length < 4) {
                        filledOpts.push(`Pilihan ${String.fromCharCode(65 + filledOpts.length)}`);
                    }
                    const pt = typeof item.points === 'number' && item.points > 0
                        ? item.points
                        : typeof item.poin === 'number' && item.poin > 0
                            ? item.poin
                            : defaultPoints;
                    jsonResults.push({
                        questionText: qText.trim(),
                        imageUrl: item.imageUrl || item.gambar || null,
                        options: filledOpts,
                        correctAnswer: String(kIdx),
                        points: pt,
                    });
                }
                if (jsonResults.length > 0)
                    return jsonResults;
            }
        }
        catch {
            // bukan valid JSON, lanjut ke parser Delimited / Text
        }
    }
    // ==========================================
    // TAHAP 2: Deteksi format Tabel Delimited (CSV / TSV)
    // ==========================================
    const isDelimited = trimmed.includes('sep=;') ||
        trimmed.includes(';') ||
        trimmed.includes('\t') ||
        (trimmed.includes(',') && trimmed.includes('"'));
    const lines = isDelimited
        ? splitCsvRows(trimmed).filter((l) => !l.toLowerCase().startsWith('sep='))
        : trimmed
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .filter((l) => !l.toLowerCase().startsWith('sep='));
    if (isDelimited) {
        const results = [];
        let detectedDelimiter = ';';
        const sampleLine = lines.find((l) => !l.startsWith('#')) || '';
        if (sampleLine.split('\t').length >= 5)
            detectedDelimiter = '\t';
        else if (sampleLine.split(';').length >= 5)
            detectedDelimiter = ';';
        else if (sampleLine.split(',').length >= 5)
            detectedDelimiter = ',';
        // Pemetaan indeks kolom berdasarkan header
        let colQ = -1;
        let colA = -1;
        let colB = -1;
        let colC = -1;
        let colD = -1;
        let colE = -1;
        let colKey = -1;
        let colPoints = -1;
        let colImg = -1;
        let hasHeader = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('#'))
                continue;
            const parts = splitCsvLine(line, detectedDelimiter).map(unescapeCsvCell);
            if (parts.length < 5)
                continue;
            // Cek apakah baris ini adalah header
            const lower = parts.map((p) => p.toLowerCase());
            const looksLikeHeader = lower.some((p) => p.includes('soal') || p.includes('tanya') || p.includes('kunci') || p.includes('pilihan'));
            if (!hasHeader && looksLikeHeader) {
                hasHeader = true;
                parts.forEach((p, idx) => {
                    const s = p.toLowerCase();
                    if (s.includes('soal') || s.includes('tanya') || s.includes('pertanyaan'))
                        colQ = idx;
                    else if (s === 'a' || s.includes('pilihan a') || s.includes('opsi a'))
                        colA = idx;
                    else if (s === 'b' || s.includes('pilihan b') || s.includes('opsi b'))
                        colB = idx;
                    else if (s === 'c' || s.includes('pilihan c') || s.includes('opsi c'))
                        colC = idx;
                    else if (s === 'd' || s.includes('pilihan d') || s.includes('opsi d'))
                        colD = idx;
                    else if (s === 'e' || s.includes('pilihan e') || s.includes('opsi e'))
                        colE = idx;
                    else if (s.includes('kunci') || s.includes('jawaban') || s.includes('ans') || s.includes('key'))
                        colKey = idx;
                    else if (s.includes('poin') || s.includes('nilai') || s.includes('bobot') || s.includes('skor'))
                        colPoints = idx;
                    else if (s.includes('gambar') || s.includes('image') || s.includes('foto') || s.includes('url'))
                        colImg = idx;
                });
                continue;
            }
            let qText = '';
            let optA = '';
            let optB = '';
            let optC = '';
            let optD = '';
            let optE = '';
            let keyRaw = 'A';
            let pt = defaultPoints;
            let imgUrl = colImg !== -1 && parts[colImg] ? parts[colImg].trim() : undefined;
            const parsePt = (val) => {
                if (!val)
                    return defaultPoints;
                const p = parseFloat(String(val).replace(',', '.'));
                return !isNaN(p) && p > 0 ? p : defaultPoints;
            };
            if (hasHeader && colQ !== -1 && colA !== -1) {
                qText = parts[colQ] || '';
                optA = parts[colA] || '';
                optB = parts[colB] || '';
                optC = parts[colC] || '';
                optD = parts[colD] || '';
                optE = colE !== -1 ? parts[colE] || '' : '';
                keyRaw = colKey !== -1 ? parts[colKey] || 'A' : 'A';
                pt = colPoints !== -1 && parts[colPoints] ? parsePt(parts[colPoints]) : defaultPoints;
            }
            else {
                const isFirstColNumber = /^\d+$/.test(parts[0]);
                const offset = isFirstColNumber ? 1 : 0;
                qText = parts[offset] || '';
                optA = parts[offset + 1] || '';
                optB = parts[offset + 2] || '';
                optC = parts[offset + 3] || '';
                optD = parts[offset + 4] || '';
                if (parts.length >= offset + 7 &&
                    !['A', 'B', 'C', 'D', 'E', '0', '1', '2', '3', '4'].includes(parts[offset + 5].toUpperCase())) {
                    optE = parts[offset + 5];
                    keyRaw = parts[offset + 6] || 'A';
                    pt = parts[offset + 7] ? parsePt(parts[offset + 7]) : defaultPoints;
                }
                else {
                    keyRaw = parts[offset + 5] || 'A';
                    pt = parts[offset + 6] ? parsePt(parts[offset + 6]) : defaultPoints;
                }
            }
            qText = qText.replace(/^(?:Soal\s*)?\d+[\.\:\)]\s*/i, '').trim();
            if (!qText)
                continue;
            const opts = [optA, optB, optC, optD].filter(Boolean);
            if (optE)
                opts.push(optE);
            while (opts.length < 4) {
                opts.push(`Pilihan ${String.fromCharCode(65 + opts.length)}`);
            }
            const k = keyRaw.toUpperCase().trim();
            let kIdx = 0;
            if (k === 'B' || k === '1')
                kIdx = 1;
            else if (k === 'C' || k === '2')
                kIdx = 2;
            else if (k === 'D' || k === '3')
                kIdx = 3;
            else if (k === 'E' || k === '4')
                kIdx = 4;
            results.push({
                questionText: qText,
                imageUrl: imgUrl || null,
                options: opts,
                correctAnswer: String(kIdx),
                points: pt,
            });
        }
        if (results.length > 0)
            return results;
    }
    // ==========================================
    // TAHAP 3: Deteksi format Naskah Dokumen Word / TXT
    // ==========================================
    const normalized = trimmed.replace(/\r\n/g, '\n');
    const rawBlocks = normalized
        .split(/\n\s*\n+|(?<=\n)(?=(?:Soal\s*)?\d+[\.\)]\s+)/i)
        .map((b) => b.trim())
        .filter(Boolean);
    const parsedResults = [];
    for (const block of rawBlocks) {
        const bLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (bLines.length === 0)
            continue;
        let qTextParts = [];
        let options = [];
        let correctAnswer = '0';
        let points = defaultPoints;
        let imageUrl = null;
        const optionRegex = /^(?:(?:\(?([A-Ea-e])[\.\)]|\(([A-Ea-e])\))|\b([A-Ea-e])\.\s+)\s*(.*)/;
        const keyRegex = /^(?:Kunci|Jawaban|Ans|Key|Kunci\s*Jawaban|Jawaban\s*Benar)[\s\:\=\-]+([A-Ea-e]|\d)\b/i;
        const pointsRegex = /^(?:Poin|Nilai|Bobot|Score|Points)[\s\:\=\-]+([\d\.,]+)\b/i;
        const imageRegex = /^(?:Gambar|Image|Foto|Pic|Picture)[\s\:\=\-]+(.*)/i;
        for (const bLine of bLines) {
            // Lewati baris header dekoratif (seperti ==== atau #)
            if (bLine.startsWith('===') || bLine.startsWith('---') || bLine.startsWith('#')) {
                continue;
            }
            const kMatch = bLine.match(keyRegex);
            if (kMatch) {
                const k = kMatch[1].toUpperCase();
                let kIdx = 0;
                if (k === 'B' || k === '1')
                    kIdx = 1;
                else if (k === 'C' || k === '2')
                    kIdx = 2;
                else if (k === 'D' || k === '3')
                    kIdx = 3;
                else if (k === 'E' || k === '4')
                    kIdx = 4;
                correctAnswer = String(kIdx);
                continue;
            }
            const pMatch = bLine.match(pointsRegex);
            if (pMatch) {
                const parsedVal = parseFloat(pMatch[1].replace(',', '.'));
                points = !isNaN(parsedVal) && parsedVal > 0 ? parsedVal : defaultPoints;
                continue;
            }
            const imgMatch = bLine.match(imageRegex);
            if (imgMatch) {
                imageUrl = imgMatch[1].trim();
                qTextParts.push('[GAMBAR]');
                continue;
            }
            const oMatch = bLine.match(optionRegex);
            if (oMatch) {
                const optText = oMatch[4] || '';
                options.push(optText.trim());
                continue;
            }
            if (options.length === 0) {
                qTextParts.push(bLine);
            }
            else {
                const lastIdx = options.length - 1;
                options[lastIdx] += ' ' + bLine;
            }
        }
        // Blok HANYA diproses jika memiliki setidaknya 2 opsi jawaban (mencegah teks judul/header terdaftar sebagai soal)
        if (qTextParts.length > 0 && options.length >= 2) {
            let rawQ = qTextParts.join('\n').trim();
            rawQ = rawQ.replace(/^(?:Soal\s*)?\d+[\.\:\)]\s*/i, '').trim();
            while (options.length < 4) {
                options.push(`Pilihan ${String.fromCharCode(65 + options.length)}`);
            }
            parsedResults.push({
                questionText: rawQ,
                imageUrl,
                options,
                correctAnswer,
                points,
            });
        }
    }
    return parsedResults;
}
/**
 * Pemicu unduhan file langsung di browser client
 */
function triggerBrowserDownload(content, fileName, mimeType = 'text/csv;charset=utf-8;') {
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
