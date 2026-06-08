const bcrypt = require('bcryptjs');

async function maakHash() {
  const hash = await bcrypt.hash('student123', 10);
  console.log('Hash:', hash);
}

maakHash();