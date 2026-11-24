/**
 * Client-Side Image Auto-Compression Utility
 * SMK Garuda Mahadhika - CBT Engine
 *
 * Kompres gambar soal secara otomatis di browser guru sebelum diunggah ke server.
 * Menggunakan Canvas API untuk resize & compress tanpa library eksternal.
 *
 * Target output:
 * - Maks lebar/tinggi: 1200px (cukup jelas untuk layar HP/laptop siswa)
 * - Maks ukuran file: ~200 KB (JPEG quality 0.75)
 * - Format output: JPEG (lebih ringan dari PNG untuk foto soal)
 */

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // e.g. 0.05 means compressed to 5% of original
  wasCompressed: boolean;
  width: number;
  height: number;
}

/**
 * Maximum dimension (width or height) for question images.
 * 1200px is more than enough for CBT exam questions on any screen.
 */
const MAX_DIMENSION = 1200;

/**
 * Target maximum file size in bytes (200 KB).
 * If the image is already below this, no compression is needed.
 */
const TARGET_MAX_SIZE = 200 * 1024;

/**
 * Skip compression threshold - if file is already smaller than this, return as-is.
 */
const SKIP_THRESHOLD = 250 * 1024;

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi.'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio.
 */
function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxDim: number
): { width: number; height: number } {
  if (origWidth <= maxDim && origHeight <= maxDim) {
    return { width: origWidth, height: origHeight };
  }

  const ratio = Math.min(maxDim / origWidth, maxDim / origHeight);
  return {
    width: Math.round(origWidth * ratio),
    height: Math.round(origHeight * ratio),
  };
}

/**
 * Compress an image file using Canvas API.
 * Returns a new compressed File, or the original if already small enough.
 *
 * This runs entirely in the browser (client-side) — no server roundtrip needed.
 */
export async function compressQuestionImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;

  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      width: 0,
      height: 0,
    };
  }

  // Skip if already small enough
  if (originalSize <= SKIP_THRESHOLD) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      width: 0,
      height: 0,
    };
  }

  try {
    const img = await loadImage(file);
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      MAX_DIMENSION
    );

    // Create off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Canvas not supported, return original
      URL.revokeObjectURL(img.src);
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    // Draw resized image with high-quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Try JPEG compression at progressive quality levels
    let blob: Blob | null = null;
    const qualities = [0.75, 0.65, 0.55, 0.45];

    for (const quality of qualities) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          quality
        );
      });

      if (blob && blob.size <= TARGET_MAX_SIZE) {
        break;
      }
    }

    // Clean up
    URL.revokeObjectURL(img.src);

    if (!blob) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    // Only use compressed version if it's actually smaller
    if (blob.size >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        width,
        height,
      };
    }

    // Create new File from compressed blob
    const compressedFileName = file.name.replace(/\.[^.]+$/, '.jpg');
    const compressedFile = new File([blob], compressedFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: compressedFile.size / originalSize,
      wasCompressed: true,
      width,
      height,
    };
  } catch {
    // If compression fails for any reason, return the original file
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      width: 0,
      height: 0,
    };
  }
}

/**
 * Format file size for display (e.g. "2.4 MB" → "198 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
