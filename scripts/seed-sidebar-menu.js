const { PrismaClient } = require('@prisma/client');
const database = new PrismaClient();

const initialMenus = [
  {
    title: 'Home',
    link: '/',
    icon: 'IconHome2',
    isActive: true,
    hasBadge: false,
    order: 1,
  },
  {
    title: 'Generate Soal Otomatis',
    link: '/generate-soal',
    icon: 'IconBuildingStore',
    isActive: true,
    hasBadge: true,
    order: 2,
  },
  {
    title: 'Paket Pembelian',
    link: '/paket-pembelian',
    icon: 'IconBuildingStore',
    isActive: true,
    hasBadge: false,
    order: 3,
  },
  {
    title: 'My Tickets',
    link: '/my-tickets',
    icon: 'IconTicket',
    isActive: true,
    hasBadge: false,
    order: 4,
  },
  {
    title: 'Event',
    link: '/event',
    icon: 'IconCalendarEvent',
    isActive: true,
    hasBadge: false,
    order: 5,
  },
  {
    title: 'Riwayat Pembelian',
    link: '/paket-pembelian/riwayat',
    icon: 'IconBrandCashapp',
    isActive: true,
    hasBadge: false,
    order: 6,
  }
];

async function seed() {
  try {
    for (const menu of initialMenus) {
      await database.sidebarMenu.upsert({
        where: { id: 0 }, // Just to use upsert, we'll actually use create if not exist
        create: menu,
        update: menu,
      });
    }
    // Since id: 0 won't match, let's just use createMany or check exists
    console.log('Seeding finished!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await database.$disconnect();
  }
}

// More reliable seed for existing items
async function robustSeed() {
    try {
        for (const menu of initialMenus) {
            const exists = await database.sidebarMenu.findFirst({
                where: { link: menu.link }
            });
            if (!exists) {
                await database.sidebarMenu.create({ data: menu });
            }
        }
        console.log('Robust seeding finished!');
    } catch (error) {
        console.error('Robust seeding failed:', error);
    } finally {
        await database.$disconnect();
    }
}

robustSeed();
