import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Database aktif yang terbuka dan menyimpan seluruh data ujian terkini (termasuk 70 nilai Bahasa Inggris)
const ACTIVE_DB_URL = 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require';

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL || ACTIVE_DB_URL;

  // Jika URL mengarah ke database lama yang terkunci, otomatis alihkan ke database aktif terkini
  if (dbUrl.includes('febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d')) {
    dbUrl = ACTIVE_DB_URL;
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
