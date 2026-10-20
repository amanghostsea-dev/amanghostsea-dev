import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Membuat / memperbarui akun Verifikator PPDB...');
  const user = await prisma.user.upsert({
    where: { username: 'ppdb' },
    update: {
      name: 'Panitia PPDB (Verifikator)',
      password: 'ppdb123',
      role: 'Panitia PPDB',
      status: 'Aktif'
    },
    create: {
      name: 'Panitia PPDB (Verifikator)',
      username: 'ppdb',
      password: 'ppdb123',
      role: 'Panitia PPDB',
      status: 'Aktif'
    }
  });
  console.log('Akun Verifikator PPDB berhasil disiapkan:');
  console.log({
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
