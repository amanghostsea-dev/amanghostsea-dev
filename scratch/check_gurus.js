const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allGurus = await prisma.user.findMany({
    where: { role: 'Guru' },
    select: { id: true, username: true, name: true, role: true }
  });
  console.log('All Guru users:', JSON.stringify(allGurus, null, 2));
}

main().finally(() => prisma.$disconnect());
