const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categoryId = 3;
  const count = await prisma.soalGenerateSoal.count({
    where: { generateSoalCategoryId: categoryId }
  });
  console.log(`Current questions in category ${categoryId}: ${count}`);
  
  const latest = await prisma.soalGenerateSoal.findMany({
    where: { generateSoalCategoryId: categoryId },
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log('Latest 5 questions:', JSON.stringify(latest, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
