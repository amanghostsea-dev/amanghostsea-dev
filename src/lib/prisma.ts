import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL || '';
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
