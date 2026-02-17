const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { id: 3, name: 'IPA' },
    { id: 4, name: 'IPS' }
  ];

  const difficulties = ['mudah', 'sedang', 'sulit'];
  
  const questionsPerCategory = 200;
  
  for (const cat of categories) {
    console.log(`Seeding ${questionsPerCategory} questions for ${cat.name}...`);
    
    const data = [];
    for (let i = 1; i <= questionsPerCategory; i++) {
      const difficulty = difficulties[i % difficulties.length];
      const correctIndex = Math.floor(Math.random() * 5);
      
      const choices = ['A', 'B', 'C', 'D', 'E'].map((label, idx) => ({
        id: idx,
        value: `${cat.name} Question ${i} Choice ${label}`,
        isCorrect: idx === correctIndex
      }));

      data.push({
        soal: `Berapakah hasil dari pertanyaan ${cat.name} nomor ${i}? (Tingkat: ${difficulty})`,
        jawaban: JSON.stringify(choices),
        jawabanShow: '',
        jawabanSelect: correctIndex,
        isCorrect: false,
        pembahasan: `Ini adalah pembahasan untuk soal ${cat.name} nomor ${i}`,
        point: 5,
        kkm: 80,
        maxPoint: 5,
        category: cat.name,
        categoryKet: `Kategori ${cat.name}`,
        subCategory: `${cat.name} Sub`,
        generateSoalCategoryId: cat.id,
        tingkatkesulitansoal: difficulty,
        tipePenilaian: 'BENAR_SALAH'
      });
    }

    // Bulk insert
    await prisma.soalGenerateSoal.createMany({
      data: data
    });
    
    console.log(`Successfully seeded ${questionsPerCategory} questions for ${cat.name}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
