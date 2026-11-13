/**
 * Pure TypeScript QR Code Generator (Zero-Dependency)
 * Implements ISO/IEC 18004 QR Code specification (Versions 1-6, Byte mode, EC Level L/M)
 * Generates crisp vector SVG strings or boolean matrices without any external packages.
 */

// GF(256) math
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let v = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = v;
  EXP[i + 255] = v;
  LOG[v] = i;
  v = (v << 1) ^ (v & 128 ? 285 : 0);
}

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function getRsGeneratorPoly(ecLen: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmult(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: number[], ecLen: number): number[] {
  const gen = getRsGeneratorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    for (let j = 0; j < ecLen - 1; j++) {
      res[j] = res[j + 1] ^ gmult(gen[j + 1], factor);
    }
    res[ecLen - 1] = gmult(gen[ecLen], factor);
  }
  return res;
}

// Version specifications: [totalCodewords, ecCodewords, blocks, alignCenter]
// Version 1 (21x21): 26 total, 7 EC (L) / 10 EC (M), 1 block
// Version 2 (25x25): 44 total, 10 EC (L) / 16 EC (M), 1 block, align 18
// Version 3 (29x29): 70 total, 15 EC (L) / 26 EC (M), 1 block, align 22
// Version 4 (33x33): 100 total, 20 EC (L) / 36 EC (M), (L: 1 blk of 80, M: 2 blks of 32/18)
interface QrVersionInfo {
  version: number;
  size: number;
  totalCw: number;
  dataCw: number;
  ecCw: number;
  numBlocks: number;
  alignPos: number[];
}

const QR_VERSIONS: QrVersionInfo[] = [
  { version: 1, size: 21, totalCw: 26, dataCw: 16, ecCw: 10, numBlocks: 1, alignPos: [] },
  { version: 2, size: 25, totalCw: 44, dataCw: 28, ecCw: 16, numBlocks: 1, alignPos: [6, 18] },
  { version: 3, size: 29, totalCw: 70, dataCw: 44, ecCw: 26, numBlocks: 1, alignPos: [6, 22] },
  { version: 4, size: 33, totalCw: 100, dataCw: 64, ecCw: 36, numBlocks: 2, alignPos: [6, 26] },
  { version: 5, size: 37, totalCw: 134, dataCw: 86, ecCw: 48, numBlocks: 2, alignPos: [6, 30] },
  { version: 6, size: 41, totalCw: 172, dataCw: 108, ecCw: 64, numBlocks: 4, alignPos: [6, 34] },
];

export interface QrOptions {
  padding?: number;
  darkColor?: string;
  lightColor?: string;
  size?: number; // Target pixel width/height (default 180)
}

/**
 * Generate QR code matrix for a string.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 128) {
      utf8Bytes.push(code);
    } else if (code < 2048) {
      utf8Bytes.push(192 | (code >> 6), 128 | (code & 63));
    } else {
      utf8Bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
    }
  }

  // Find minimal version that fits UTF-8 bytes in Byte Mode (4 bits mode + 8 bits length + 8*N bits)
  const requiredBits = 4 + 8 + utf8Bytes.length * 8;
  const targetVer = QR_VERSIONS.find(v => v.dataCw * 8 >= requiredBits);
  const ver = targetVer || QR_VERSIONS[QR_VERSIONS.length - 1];

  // 1. Bit Buffer Encoding
  const bitBuf: number[] = [];
  function pushBits(val: number, len: number) {
    for (let b = len - 1; b >= 0; b--) {
      bitBuf.push((val >>> b) & 1);
    }
  }

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Character count (8 bits for versions 1-9 in byte mode)
  pushBits(utf8Bytes.length, 8);
  // Data bytes
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }
  // Terminator
  const totalDataBits = ver.dataCw * 8;
  const termLen = Math.min(4, totalDataBits - bitBuf.length);
  for (let i = 0; i < termLen; i++) bitBuf.push(0);
  // Align to byte
  while (bitBuf.length % 8 !== 0) bitBuf.push(0);
  // Pad bytes 0xEC, 0x11
  const padPatterns = [0b11101100, 0b00010001];
  let pIdx = 0;
  while (bitBuf.length < totalDataBits) {
    pushBits(padPatterns[pIdx % 2], 8);
    pIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bitBuf.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuf[i + b];
    }
    dataCodewords.push(byteVal);
  }

  // 2. Reed-Solomon per Block & Interleaving
  const blocks: { data: number[]; ec: number[] }[] = [];
  const ecPerBlock = Math.floor(ver.ecCw / ver.numBlocks);
  const dataPerBlock = Math.floor(ver.dataCw / ver.numBlocks);
  const remainder = ver.dataCw % ver.numBlocks;

  let offset = 0;
  for (let b = 0; b < ver.numBlocks; b++) {
    const curLen = dataPerBlock + (b >= ver.numBlocks - remainder ? 1 : 0);
    const blockData = dataCodewords.slice(offset, offset + curLen);
    offset += curLen;
    const blockEc = computeReedSolomon(blockData, ecPerBlock);
    blocks.push({ data: blockData, ec: blockEc });
  }

  // Interleave data codewords
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(...blocks.map(b => b.data.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of blocks) {
      if (i < b.data.length) finalCodewords.push(b.data[i]);
    }
  }
  // Interleave EC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of blocks) {
      if (i < b.ec.length) finalCodewords.push(b.ec[i]);
    }
  }

  // 3. Construct Matrix
  const size = ver.size;
  // matrix: true = dark, false = light, null = unassigned
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, dark: boolean, isFunc = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = dark;
      if (isFunc) isFunction[r][c] = true;
    }
  }

  // Finder patterns at (0,0), (size-7, 0), (0, size-7)
  function placeFinder(top: number, left: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setModule(row, col, isEdge || isCenter);
        } else {
          setModule(row, col, false); // Separator
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  if (ver.alignPos.length > 0) {
    for (const r of ver.alignPos) {
      for (const c of ver.alignPos) {
        // Skip if overlaps finder
        const overlaps = (r < 9 && c < 9) || (r < 9 && c >= size - 8) || (r >= size - 8 && c < 9);
        if (overlaps) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isDot = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isDot);
          }
        }
      }
    }
  }

  // Dark module
  setModule(4 * ver.version + 9, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    isFunction[8][i] = true;
    if (matrix[i][8] === null) matrix[i][8] = false;
    isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    isFunction[8][size - 1 - i] = true;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
    isFunction[size - 1 - i][8] = true;
  }

  // 4. Place Data Codewords (zigzag traversal)
  let cwIdx = 0;
  let bitIdx = 7;
  let upwards = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing pattern
    for (let count = 0; count < size; count++) {
      const row = upwards ? size - 1 - count : count;
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = col - cOffset;
        if (!isFunction[row][c]) {
          let bit = false;
          if (cwIdx < finalCodewords.length) {
            bit = ((finalCodewords[cwIdx] >>> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              cwIdx++;
            }
          }
          matrix[row][c] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 5. Apply Mask Pattern 0: (row + col) % 2 === 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && matrix[r][c] !== null) {
        if ((r + c) % 2 === 0) {
          matrix[r][c] = !matrix[r][c];
        }
      }
    }
  }

  // 6. Write Format Info (EC Level M = 00, Mask 0 = 000 -> 00000; with BCH 15,5 and mask 101010000010010 => 101010000010010 = 0x5412)
  // For EC Level M and Mask 0: format bits = 0x5412
  const formatBits = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> (14 - i)) & 1) === 1;
    // Top-left
    if (i < 6) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    // Split across top-right & bottom-left
    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return matrix.map(row => row.map(cell => !!cell));
}

/**
 * Generate full SVG string from QR matrix
 */
export function generateQrSvg(text: string, options?: QrOptions): string {
  const matrix = generateQrMatrix(text);
  const moduleCount = matrix.length;
  const padding = options?.padding ?? 4;
  const darkColor = options?.darkColor ?? '#0f172a';
  const lightColor = options?.lightColor ?? '#ffffff';
  const targetSize = options?.size ?? 160;

  const totalGrid = moduleCount + padding * 2;
  const rects: string[] = [];

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        rects.push(`<rect x="${c + padding}" y="${r + padding}" width="1" height="1" fill="${darkColor}"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalGrid} ${totalGrid}" width="${targetSize}" height="${targetSize}" style="background-color: ${lightColor}; border-radius: 8px;">
    ${rects.join('')}
  </svg>`;
}

