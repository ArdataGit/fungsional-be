const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking GenerateSoalCategory...');
    const categories = await prisma.generateSoalCategory.findMany();
    console.log(`Found ${categories.length} categories.`);
    console.log(categories);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
