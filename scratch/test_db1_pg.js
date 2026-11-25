const { Client } = require('pg');

async function testPg(name, connectionString) {
  console.log(`=== Testing ${name} ===`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`${name}: Connected successfully!`);
    const res = await client.query('SELECT current_database(), current_user, count(*) from "ExamAttempt";');
    console.log(`${name} query result:`, res.rows);
    await client.end();
  } catch (err) {
    console.error(`${name} connection error:`, err.message);
    try { await client.end(); } catch {}
  }
}

async function run() {
  const db1 = 'postgres://febc0a2b6cfe15d368ca6e53a684adcab742b2d493d39285514f8792e7c3bf4d:sk_TFZftJ4olPYiF-zvWYFBt@db.prisma.io:5432/postgres?sslmode=require';
  const db2 = 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require';
  await testPg('DB2 (Active)', db2);
  await testPg('DB1 (Old)', db1);
}

run();
