import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current Users:');
  users.forEach(u => console.log(`- ${u.name} (@${u.username}) | Role: ${u.role} | Status: ${u.status}`));

  const bkkUser = await prisma.user.upsert({
    where: { username: 'bkk' },
    update: {
      name: 'Pengelola BKK',
      password: 'bkk123',
      role: 'Admin BKK',
      status: 'Aktif'
    },
    create: {
      name: 'Pengelola BKK',
      username: 'bkk',
      password: 'bkk123',
      role: 'Admin BKK',
      status: 'Aktif'
    }
  });

  console.log('\nBKK User successfully created/updated:');
  console.log(bkkUser);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
