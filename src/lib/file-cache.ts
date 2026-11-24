/**
 * Server-Side Smart File Cache (LRU In-Memory)
 * SMK Garuda Mahadhika - CBT Engine
 *
 * Cache gambar soal di memori server agar 142 siswa membuka soal yang sama
 * hanya menyebabkan 1x query ke database, bukan 142x.
 *
 * Strategi:
 * - LRU (Least Recently Used) eviction policy
 * - Max 50 entries (cukup untuk 1 sesi ujian aktif)
 * - Max ~100 MB total cache size
 * - TTL: 30 menit per entry (auto-expire)
 * - Thread-safe (single-threaded Node.js, tapi aman untuk concurrent requests)
 */

interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  size: number;
  cachedAt: number;
  lastAccessed: number;
  hitCount: number;
}

const MAX_ENTRIES = 50;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB
const TTL_MS = 30 * 60 * 1000; // 30 minutes

// Persistent cache across serverless invocations (attached to globalThis)
const globalForCache = globalThis as unknown as {
  __fileCache?: Map<string, CacheEntry>;
  __fileCacheTotalBytes?: number;
};

function getCache(): Map<string, CacheEntry> {
  if (!globalForCache.__fileCache) {
    globalForCache.__fileCache = new Map();
    globalForCache.__fileCacheTotalBytes = 0;
  }
  return globalForCache.__fileCache;
}

function getTotalBytes(): number {
  return globalForCache.__fileCacheTotalBytes || 0;
}

function setTotalBytes(val: number) {
  globalForCache.__fileCacheTotalBytes = val;
}

/**
 * Evict expired and over-limit entries.
 */
function evict(cache: Map<string, CacheEntry>) {
  const now = Date.now();

  // 1. Remove expired entries
  for (const [key, entry] of cache) {
    if (now - entry.cachedAt > TTL_MS) {
      setTotalBytes(getTotalBytes() - entry.size);
      cache.delete(key);
    }
  }

  // 2. If still over limits, remove least-recently-accessed entries
  while (cache.size > MAX_ENTRIES || getTotalBytes() > MAX_TOTAL_BYTES) {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of cache) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = cache.get(oldestKey);
      if (entry) {
        setTotalBytes(getTotalBytes() - entry.size);
      }
      cache.delete(oldestKey);
    } else {
      break;
    }
  }
}

/**
 * Get a cached file by ID.
 * Returns null if not cached (cache miss).
 */
export function getCachedFile(
  fileId: string
): { buffer: Buffer; contentType: string; fileName: string } | null {
  const cache = getCache();
  const entry = cache.get(fileId);

  if (!entry) return null;

  // Check expiry
  if (Date.now() - entry.cachedAt > TTL_MS) {
    setTotalBytes(getTotalBytes() - entry.size);
    cache.delete(fileId);
    return null;
  }

  // Update LRU tracking
  entry.lastAccessed = Date.now();
  entry.hitCount++;

  return {
    buffer: entry.buffer,
    contentType: entry.contentType,
    fileName: entry.fileName,
  };
}

/**
 * Store a file in cache.
 */
export function setCachedFile(
  fileId: string,
  buffer: Buffer,
  contentType: string,
  fileName: string
): void {
  const cache = getCache();

  // Don't cache files larger than 5 MB (they'd fill the cache too fast)
  if (buffer.length > 5 * 1024 * 1024) return;

  // If already cached, remove old entry first
  const existing = cache.get(fileId);
  if (existing) {
    setTotalBytes(getTotalBytes() - existing.size);
    cache.delete(fileId);
  }

  // Evict if needed
  evict(cache);

  const entry: CacheEntry = {
    buffer,
    contentType,
    fileName,
    size: buffer.length,
    cachedAt: Date.now(),
    lastAccessed: Date.now(),
    hitCount: 0,
  };

  cache.set(fileId, entry);
  setTotalBytes(getTotalBytes() + buffer.length);
}

/**
 * Get cache statistics (for debugging/monitoring).
 */
export function getCacheStats(): {
  entries: number;
  totalBytes: number;
  totalHits: number;
} {
  const cache = getCache();
  let totalHits = 0;
  for (const entry of cache.values()) {
    totalHits += entry.hitCount;
  }
  return {
    entries: cache.size,
    totalBytes: getTotalBytes(),
    totalHits,
  };
}
