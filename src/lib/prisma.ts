import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Database Supabase PostgreSQL aktif (Unlimited Query Operations, Zero Quota Limit)
const SUPABASE_DB_URL = 'postgresql://postgres.hozzlhyocyhnylgxkneq:%40%40Rahman253%40%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL || SUPABASE_DB_URL;

  // Jika URL mengarah ke database lama Prisma Postgres (db.prisma.io) yang limit operasinya habis,
  // alihkan secara otomatis ke database Supabase PostgreSQL agar aplikasi tidak 500 / down
  if (
    dbUrl.includes('prisma.io') ||
    dbUrl.includes('febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d') ||
    dbUrl.includes('f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443')
  ) {
    dbUrl = SUPABASE_DB_URL;
  }

  if (dbUrl && !dbUrl.includes('connection_limit=')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${separator}connection_limit=10&pool_timeout=20`;
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
