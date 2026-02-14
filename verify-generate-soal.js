const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking GenerateSoalHistory...');
    const histories = await prisma.generateSoalHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        GenerateSoalHistoryDetail: true,
      }
    });

    console.log(`Found ${histories.length} history records.`);

    histories.forEach(h => {
      console.log(`\nID: ${h.id}`);
      console.log(`Name: ${h.name}`);
      console.log(`Category: ${h.kategori} (Difficulty: ${h.tingkatKesulitan})`);
      console.log(`Questions Requested: ${h.jumlahSoal}`);
      console.log(`Questions Generated: ${h.GenerateSoalHistoryDetail.length}`);
      console.log(`Waktu: ${h.waktu} minutes`);
      console.log(`Score: ${h.score}`);
      console.log(`Created At: ${h.createdAt}`);
    });

  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
