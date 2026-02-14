const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tableName = 'GenerateSoalHistory';
    
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ${tableName}
    `;
    
    // Convert BigInt to Number if necessary
    const count = Number(tableExists[0].count);

    if (count === 0) {
      console.log(`Table ${tableName} does not exist. Creating...`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE \`GenerateSoalHistory\` (
            \`id\` INTEGER NOT NULL AUTO_INCREMENT,
            \`name\` VARCHAR(191) NOT NULL,
            \`kkm\` INTEGER NOT NULL,
            \`jumlahSoal\` INTEGER NOT NULL,
            \`tingkatKesulitan\` VARCHAR(191) NOT NULL,
            \`kategori\` VARCHAR(191) NOT NULL,
            \`score\` INTEGER NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,
            \`userId\` INTEGER NOT NULL,
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      console.log(`Adding Foreign Key constraints...`);
      try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE \`GenerateSoalHistory\` ADD CONSTRAINT \`GenerateSoalHistory_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
          `);
      } catch (e) {
          console.log('Constraint might already exist or failed:', e.message);
      }
      
      console.log(`Table ${tableName} created successfully.`);
    } else {
      console.log(`Table ${tableName} exists. Checking for 'score' column...`);
      
      const columns = await prisma.$queryRaw`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ${tableName} 
        AND COLUMN_NAME = 'score'
      `;
      
      if (columns.length === 0) {
        console.log(`Column 'score' missing. Adding column...`);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`GenerateSoalHistory\` ADD COLUMN \`score\` INTEGER NOT NULL DEFAULT 0;
        `);
        console.log(`Column 'score' added successfully.`);
      } else {
        console.log(`Column 'score' already exists.`);
      }

      const columnsWaktu = await prisma.$queryRaw`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ${tableName} 
        AND COLUMN_NAME = 'waktu'
      `;
      
      if (columnsWaktu.length === 0) {
        console.log(`Column 'waktu' missing. Adding column...`);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`GenerateSoalHistory\` ADD COLUMN \`waktu\` INTEGER NOT NULL DEFAULT 0;
        `);
        console.log(`Column 'waktu' added successfully.`);
      } else {
        console.log(`Column 'waktu' already exists.`);
      }
    }

    // --- GenerateSoalHistoryDetail ---
    const detailTableName = 'GenerateSoalHistoryDetail';
    const detailTableExists = await prisma.$queryRaw`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ${detailTableName}
    `;
    const detailCount = Number(detailTableExists[0].count);

    if (detailCount === 0) {
      console.log(`Table ${detailTableName} does not exist. Creating...`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE \`GenerateSoalHistoryDetail\` (
            \`id\` INTEGER NOT NULL AUTO_INCREMENT,
            \`soal\` TEXT NOT NULL,
            \`jawaban\` TEXT NOT NULL,
            \`jawabanShow\` TEXT NOT NULL,
            \`jawabanSelect\` INTEGER NOT NULL,
            \`isCorrect\` BOOLEAN NOT NULL DEFAULT false,
            \`pembahasan\` TEXT NOT NULL,
            \`point\` INTEGER NOT NULL DEFAULT 0,
            \`kkm\` INTEGER NOT NULL DEFAULT 0,
            \`maxPoint\` INTEGER NOT NULL DEFAULT 0,
            \`category\` VARCHAR(191) NOT NULL,
            \`categoryKet\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,
            \`duration\` INTEGER NOT NULL DEFAULT 0,
            \`subCategory\` VARCHAR(255) NOT NULL,
            \`tipePenilaian\` ENUM('BENAR_SALAH', 'POINT') NOT NULL DEFAULT 'BENAR_SALAH',
            \`generateSoalCategoryId\` INTEGER NOT NULL,
            \`tingkatkesulitansoal\` ENUM('mudah', 'sedang', 'sulit') NOT NULL DEFAULT 'mudah',
            \`generateSoalHistoryId\` INTEGER NOT NULL,
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);

      console.log(`Adding Foreign Key constraints for ${detailTableName}...`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`GenerateSoalHistoryDetail\` ADD CONSTRAINT \`GenerateSoalHistoryDetail_generateSoalCategoryId_fkey\` FOREIGN KEY (\`generateSoalCategoryId\`) REFERENCES \`GenerateSoalCategory\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`GenerateSoalHistoryDetail\` ADD CONSTRAINT \`GenerateSoalHistoryDetail_generateSoalHistoryId_fkey\` FOREIGN KEY (\`generateSoalHistoryId\`) REFERENCES \`GenerateSoalHistory\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      } catch (e) {
         console.log('Constraint might already exist or failed:', e.message);
      }
      
      console.log(`Table ${detailTableName} created successfully.`);
    } else {
        console.log(`Table ${detailTableName} already exists.`);
    }

  } catch (error) {
    console.error('Error executing manual migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
