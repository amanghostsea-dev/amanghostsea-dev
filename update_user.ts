import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { role: 'Super Admin' }
  });
  console.log("Updated role to 'Super Admin'");
}

main().catch(console.error).finally(() => prisma.$disconnect());
