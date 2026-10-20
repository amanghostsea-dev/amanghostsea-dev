import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users:', users);

  if (users.length === 0) {
    console.log('No users found. Creating admin user...');
    const admin = await prisma.user.create({
      data: {
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'Super Admin',
        status: 'Aktif'
      },
    });
    console.log('Admin user created:', admin);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
