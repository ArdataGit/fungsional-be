const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const history = await prisma.generateSoalHistory.findMany();
  const output = {
    users,
    history
  };
  fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
}

main().catch(err => {
  fs.writeFileSync('debug_error.txt', err.stack);
}).finally(() => prisma.$disconnect());
