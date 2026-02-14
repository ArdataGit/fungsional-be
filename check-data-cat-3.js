const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categoryId = 2;
  const count = await prisma.soalGenerateSoal.count({
    where: {
      generateSoalCategoryId: categoryId,
    },
  });

  const category = await prisma.generateSoalCategory.findUnique({
    where: {
      id: categoryId,
    },
  });

  console.log(`Category ID ${categoryId} (${category ? category.name : 'Unknown'}) has ${count} questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
