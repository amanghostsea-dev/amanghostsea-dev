const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443:sk__sEhfauJwpJFTdP5zYQVE@db.prisma.io:5432/postgres?sslmode=require&connection_limit=3'
    }
  }
});

async function main() {
  const assignments = await prisma.assignment.findMany();
  console.log('Assignments count:', assignments.length);
  const submissions = await prisma.assignmentSubmission.findMany();
  console.log('Submissions count:', submissions.length);
  await prisma.$disconnect();
}

main();
