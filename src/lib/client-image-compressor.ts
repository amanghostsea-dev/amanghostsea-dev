/**
 * 🖼️ CLIENT-SIDE IMAGE COMPRESSOR & OPTIMIZER
 * Mencegah error Next.js Server Action 413 (Payload Too Large) & 
 * "An unexpected response was received from the server" saat upload foto/scan besar.
 *
 * Mengoptimalkan foto resolusi tinggi kamera HP / scanner (1MB - 20MB)
 * menjadi gambar tajam berukuran hemat (~40KB - 150KB) dengan tetap mempertahankan
 * transparansi (PNG) untuk stempel dan tanda tangan resmi.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface CompressedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  formattedOriginalSize: string;
  formattedCompressedSize: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.9,
    outputFormat = 'image/png',
  } = options;

  // Jika SVG, tidak perlu di-resize lewat canvas karena sudah vektor
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: file.size,
          width: maxWidth,
          height: maxHeight,
          formattedOriginalSize: formatBytes(file.size),
          formattedCompressedSize: formatBytes(file.size),
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar yang valid.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Hitung skala jika gambar melebihi dimensi maksimum
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthRatio = maxWidth / targetWidth;
        const heightRatio = maxHeight / targetHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      // Render ke canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal menginisialisasi canvas grafis peramban.'));
        return;
      }

      // Bersihkan canvas agar transparan
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Gambar gambar asli yang sudah di-rescale
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Tentukan format output: pertahankan transparansi
      const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
      const finalFormat = isJpeg && outputFormat === 'image/jpeg' ? 'image/jpeg' : 'image/png';

      const dataUrl = canvas.toDataURL(finalFormat, quality);

      // Hitung estimasi ukuran dari base64
      const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
      const compressedSize = Math.round((base64Length * 3) / 4);

      resolve({
        dataUrl,
        originalSize: file.size,
        compressedSize,
        width: targetWidth,
        height: targetHeight,
        formattedOriginalSize: formatBytes(file.size),
        formattedCompressedSize: formatBytes(compressedSize),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca data gambar. Pastikan file tidak rusak.'));
    };

    img.src = objectUrl;
  });
}
