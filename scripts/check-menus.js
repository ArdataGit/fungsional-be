const { PrismaClient } = require('@prisma/client');
const database = new PrismaClient();

async function check() {
  try {
    const menus = await database.sidebarMenu.findMany();
    console.log('Current Menus in DB:', JSON.stringify(menus, null, 2));
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await database.$disconnect();
  }
}

check();
