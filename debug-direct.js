const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[DEBUG] Testing DB Connection (Direct)...');
  try {
    const menus = await prisma.sidebarMenu.findMany();
    console.log('[DEBUG] Menus found:', menus.length);
    console.log(JSON.stringify(menus, null, 2));
  } catch (error) {
    console.error('[DEBUG] Error fetching menus:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
