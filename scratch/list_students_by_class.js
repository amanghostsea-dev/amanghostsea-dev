const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const classes = ['X TJKT 1', 'X MPLB 1', 'X DKV 1', 'XI MPLB 1', 'XI TJKT 1'];
  for (const c of classes) {
    const users = await prisma.user.findMany({
      where: { studentClass: c, role: 'SISWA' },
      select: { id: true, name: true, username: true, nisn: true, studentClass: true },
      orderBy: { name: 'asc' }
    });
    console.log(`\n=== CLASS ${c} (${users.length} students) ===`);
    users.forEach((u, idx) => {
      console.log(`${idx + 1}. ${u.name} (NISN: ${u.nisn || u.username})`);
    });
  }
  await prisma.$disconnect();
}

main();
