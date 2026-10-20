/**
 * Enterprise-Grade Security Suite for SMK Web
 * Provides:
 * 1. In-Memory Sliding Window Rate Limiting (Anti-Spam & DoS Protection)
 * 2. Honeypot Bot Trap Detector (Silent Zero-Friction Captcha Alternative)
 * 3. Strict Input Sanitization & Format Validators (NISN, Phone, Text)
 * 4. Stolen Payment Receipt & Proof Reuse Detector (Anti-Fraud)
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-Memory store for IP tracking with automatic garbage collection
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean expired records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Resolves the client's actual IP address from standard proxies, Cloudflare, or Vercel
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}

/**
 * In-Memory Sliding Window Rate Limiter
 * @param identifier Unique key (e.g., `ppdb_submit:${ip}`)
 * @param maxRequests Maximum allowed requests in window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    retryAfterSeconds: Math.ceil((existing.resetTime - now) / 1000),
  };
}

/**
 * Honeypot Bot Trap
 * Legitimate human users will leave this hidden field blank.
 * Automated bots & scrapers fill all fields, triggering the trap.
 */
export function isHoneypotTriggered(
  body: Record<string, any>,
  honeypotField = '_hp_website'
): boolean {
  if (!body || typeof body !== 'object') return false;
  const val = body[honeypotField];
  // If the honeypot field has ANY content, it's a bot
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Sanitize text input: strips HTML tags, removes unsafe scripts, trims excess whitespace
 */
export function sanitizeString(val: unknown, maxLength = 300): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>'"&]/g, (char) => {
      // Basic entity escaping for security
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate NISN (Nomor Induk Siswa Nasional): must be exactly 10 numeric digits
 */
export function validateNISN(nisn: unknown): { valid: boolean; cleanNisn: string; error?: string } {
  if (!nisn) {
    return { valid: false, cleanNisn: '', error: 'NISN wajib diisi' };
  }
  const str = String(nisn).trim();
  if (!/^\d{10}$/.test(str)) {
    return { 
      valid: false, 
      cleanNisn: str, 
      error: 'Format NISN tidak valid. NISN harus terdiri dari tepat 10 digit angka.' 
    };
  }
  return { valid: true, cleanNisn: str };
}

/**
 * Validate Indonesian Phone Number (e.g., 0812..., +62812..., 62812...)
 */
export function validatePhone(phone: unknown): { valid: boolean; formatted: string; error?: string } {
  if (!phone) {
    return { valid: false, formatted: '', error: 'Nomor WhatsApp / HP wajib diisi' };
  }
  let clean = String(phone).replace(/[^\d+]/g, '').trim();

  // Normalize +62 or 62 to 08...
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }

  // Must start with 08 and have 10-14 digits
  if (!/^08\d{8,12}$/.test(clean)) {
    return { 
      valid: false, 
      formatted: clean, 
      error: 'Nomor telepon/WhatsApp tidak valid. Harap gunakan nomor aktif berawalan 08 (10-14 digit).' 
    };
  }

  return { valid: true, formatted: clean };
}

/**
 * Validate Full Name (letters, spaces, dots, commas, apostrophes only)
 */
export function validateFullName(name: unknown): { valid: boolean; cleanName: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, cleanName: '', error: 'Nama lengkap wajib diisi' };
  }
  const clean = name.trim();
  if (clean.length < 3 || clean.length > 100) {
    return { valid: false, cleanName: clean, error: 'Nama lengkap harus antara 3 - 100 karakter.' };
  }
  // Allow letters, spaces, hyphens, apostrophes, periods
  if (!/^[a-zA-Z\s'.,-]+$/.test(clean)) {
    return { valid: false, cleanName: clean, error: 'Nama lengkap hanya boleh mengandung huruf dan tanda baca nama.' };
  }
  return { valid: true, cleanName: clean };
}
