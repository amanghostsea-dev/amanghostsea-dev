const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function test(name, file) {
  const envContent = fs.readFileSync(file, 'utf8');
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

  let testUrl = url;
  if (!testUrl.includes('connection_limit')) {
    testUrl += (testUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
  } else {
    testUrl = testUrl.replace(/connection_limit=\d+/, 'connection_limit=1');
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: testUrl } },
  });

  try {
    console.log(`Testing ${name}...`);
    const res = await prisma.$queryRaw`SELECT 1 as test;`;
    console.log(`${name} SUCCESS:`, res);
  } catch (err) {
    console.error(`${name} FAILED:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await test('NEW DB (.env)', '.env');
  await test('OLD DB (.env.production)', '.env.production');
}

run();
