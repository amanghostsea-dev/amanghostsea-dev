import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating admin password...');
  const user = await prisma.user.update({
    where: { username: 'admin' },
    data: { password: 'admin123' }
  });
  console.log('Admin password updated successfully to: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
