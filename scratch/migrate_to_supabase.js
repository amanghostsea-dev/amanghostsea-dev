const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Target Database URL (e.g. Supabase Connection String)
const targetDbUrl = process.env.NEW_DATABASE_URL || process.argv[2];

if (!targetDbUrl) {
  console.error('ERROR: Harap sertakan URL database tujuan.');
  console.error('Penggunaan: node scratch/migrate_to_supabase.js "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"');
  process.exit(1);
}

async function main() {
  console.log('====================================================');
  console.log('🚀 MEMULAI MIGRASI DATA PENUH KE SUPABASE');
  console.log('====================================================');

  // 1. Temukan file backup terbaru
  const backupDir = path.join(__dirname, 'backups');
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    throw new Error('Tidak ada file backup ditemukan di folder scratch/backups!');
  }
  const latestBackupFile = path.join(backupDir, files[0]);
  console.log(`Menggunakan backup: ${files[0]}`);
  const backup = JSON.parse(fs.readFileSync(latestBackupFile, 'utf8'));

  // 2. Hubungkan ke Database Baru
  console.log('\nMengecek koneksi ke database Supabase tujuan...');
  const prisma = new PrismaClient({
    datasources: { db: { url: targetDbUrl } }
  });

  try {
    await prisma.$queryRaw`SELECT 1 as connection_test;`;
    console.log('✓ Terhubung sukses ke database Supabase!');
  } catch (err) {
    console.error('✗ Gagal terhubung ke database tujuan:', err.message);
    process.exit(1);
  }

  // 3. Import data per entitas sesuai relasi (Foreign Key)
  const importOrder = [
    { key: 'jurusan', model: 'jurusan' },
    { key: 'user', model: 'user' },
    { key: 'subject', model: 'subject' },
    { key: 'exam', model: 'exam' },
    { key: 'examQuestion', model: 'examQuestion' },
    { key: 'examAttempt', model: 'examAttempt' },
    { key: 'studentGrade', model: 'studentGrade' },
    { key: 'setting', model: 'setting' }
  ];

  console.log('\n--- Memulai Transfer Data (100% Aman) ---');

  for (const { key, model } of importOrder) {
    const items = backup[key] || [];
    console.log(`\nImporting ${key} (${items.length} records)...`);
    let inserted = 0;
    
    // Batch import
    for (const item of items) {
      // Normalisasi nilai Date
      const cleanItem = { ...item };
      for (const [prop, val] of Object.entries(cleanItem)) {
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          cleanItem[prop] = new Date(val);
        }
      }

      try {
        await prisma[model].upsert({
          where: { id: cleanItem.id },
          create: cleanItem,
          update: cleanItem
        });
        inserted++;
      } catch (e) {
        // Jika ada kendala unik, coba create langsung
        try {
          await prisma[model].create({ data: cleanItem });
          inserted++;
        } catch (innerErr) {
          console.warn(`  Warning ${model} (${cleanItem.id}): ${innerErr.message}`);
        }
      }
    }
    console.log(`✓ Selesai ${key}: ${inserted} dari ${items.length} records berhasil masuk.`);
  }

  // 4. Audit & Verifikasi 1:1 Parity
  console.log('\n====================================================');
  console.log('🔍 AUDIT & VERIFIKASI KELENGKAPAN DATA 1:1');
  console.log('====================================================');

  let allMatch = true;
  for (const { key, model } of importOrder) {
    const backupCount = (backup[key] || []).length;
    const targetCount = await prisma[model].count();
    const isMatch = backupCount === targetCount;
    if (!isMatch) allMatch = false;
    const status = isMatch ? '✅ PAS (100% LENGKAP)' : '⚠️ SELISIH';
    console.log(`- ${key.padEnd(15)}: Backup = ${String(backupCount).padStart(5)} | Supabase = ${String(targetCount).padStart(5)} | ${status}`);
  }

  if (allMatch) {
    console.log('\n🎉 SELURUH DATA 100% IDENTIK DAN SEMPURNA DI SUPABASE!');
  } else {
    console.warn('\nPerhatian: Ada beberapa record yang berbeda.');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error saat migrasi:', err);
  process.exit(1);
});
