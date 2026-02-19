const generateUniqueINV = () => {
  // Use timestamp + random payload to ensure uniqueness
  // Format: INV-YYYYMMDD-HHmmss-RANDOM(3 digits)
  // or simple INV-TIMESTAMP-RANDOM
  const timestamp = Date.now().toString(); // 13 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 digits
  
  // Total length: 4 (INV-) + 13 + 3 = 20 chars
  const invoice = `INV-${timestamp}${random}`;

  return invoice;
};
module.exports = generateUniqueINV;
