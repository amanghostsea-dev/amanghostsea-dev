const { PrismaClient } = require('@prisma/client');

const passwordEncoded = encodeURIComponent('@@Rahman253@@');
console.log('Encoded password:', passwordEncoded);

const urls = {
  'Session Pooler (5432)': `postgresql://postgres.hozzlhyocyhnylgxkneq:${passwordEncoded}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  'Transaction Pooler (6543)': `postgresql://postgres.hozzlhyocyhnylgxkneq:${passwordEncoded}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  'Direct URL (5432)': `postgresql://postgres:${passwordEncoded}@db.hozzlhyocyhnylgxkneq.supabase.co:5432/postgres`
};

async function test(name, url) {
  console.log(`Testing ${name}...`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const res = await prisma.$queryRaw`SELECT 1 as connected, current_database() as db, version() as ver;`;
    console.log(`✓ ${name} SUCCESS:`, res);
    return true;
  } catch (e) {
    console.error(`✗ ${name} FAILED:`, e.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  for (const [name, url] of Object.entries(urls)) {
    const ok = await test(name, url);
    if (ok) {
      console.log(`\nRecommended active URL: ${name}`);
    }
  }
}

run();
