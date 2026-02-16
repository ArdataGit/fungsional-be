const database = require('#database');

async function main() {
  console.log('[DEBUG] Testing DB Connection...');
  try {
    const menus = await database.sidebarMenu.findMany();
    console.log('[DEBUG] Menus found:', menus.length);
    console.log(JSON.stringify(menus, null, 2));
  } catch (error) {
    console.error('[DEBUG] Error fetching menus:', error);
  } finally {
    await database.$disconnect();
  }
}

main();
