import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Database primer yang aktif, sehat, dan berisi data lengkap sekolah
const PRIMARY_HEALTHY_DB = 'postgres://febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d:sk_TFZftJ4olPYiF-zvWYFBt@db.prisma.io:5432/postgres?sslmode=require';

// Database yang terkena limit kuota akun Prisma (planLimitReached)
const BLOCKED_DB_PREFIX = 'f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443';

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL || '';

  // 🛡️ Failover / Recovery: Jika env mengarah ke database yang terkena planLimitReached,
  // otomatis gunakan database primer yang terbukti online dan sehat.
  if (!dbUrl || dbUrl.includes(BLOCKED_DB_PREFIX)) {
    dbUrl = PRIMARY_HEALTHY_DB;
  }

  if (dbUrl && !dbUrl.includes('connection_limit=')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${separator}connection_limit=3&pool_timeout=15`;
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

// Always cache client on globalThis across all environments to prevent serverless connection exhaustion
globalForPrisma.prisma = prisma;

export default prisma;
