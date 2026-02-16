const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'src', 'database', 'schema.prisma');

try {
  console.log(`[DEBUG] Reading schema from: ${schemaPath}`);
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (schemaContent.includes('model SidebarMenu')) {
    console.log('[SUCCESS] "model SidebarMenu" found in schema.prisma!');
  } else {
    console.error('[ERROR] "model SidebarMenu" NOT found in schema.prisma!');
    console.error('The file content might be outdated.');
  }
} catch (error) {
  console.error('[ERROR] Could not read schema file:', error.message);
}
