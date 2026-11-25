const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    take: 10,
    select: { id: true, name: true, role: true, studentClass: true, username: true }
  });
  console.log('Sample users:', users);

  const distinctRoles = await prisma.user.groupBy({ by: ['role'], _count: { id: true } });
  console.log('Roles:', distinctRoles);

  const distinctClasses = await prisma.user.groupBy({ by: ['studentClass'], _count: { id: true } });
  console.log('Classes in User:', distinctClasses);

  await prisma.$disconnect();
}

main();
