const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const envContent = fs.readFileSync('.env', 'utf8');
  let url = '';
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      url = line.trim().substring('DATABASE_URL='.length).trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
        url = url.substring(1, url.length - 1);
      }
      break;
    }
  }

  console.log('Testing PrismaClient with DATABASE_URL from .env...');
  // Force 1 connection to prevent pool exhaustion
  let testUrl = url;
  if (!testUrl.includes('connection_limit')) {
    testUrl += (testUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
  } else {
    testUrl = testUrl.replace(/connection_limit=\d+/, 'connection_limit=1');
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: testUrl } },
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    const res = await prisma.$queryRaw`SELECT 1 as test;`;
    console.log('Query raw result:', res);
  } catch (err) {
    console.error('Prisma query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
