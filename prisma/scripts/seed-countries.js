/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  const jsonPath = process.env.COUNTRIES_FILE
    ? path.resolve(process.env.COUNTRIES_FILE)
    : path.join(__dirname, 'countries.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Countries JSON not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const input = JSON.parse(raw);
  if (!Array.isArray(input)) throw new Error('Top-level JSON must be an array');

  let created = 0;
  let updated = 0;

  for (const c of input) {
    if (!c.id || (!c.nameUz && !c.nameRu && !c.name)) {
      throw new Error(`Invalid country: ${JSON.stringify(c)}`);
    }
    const nameUz = c.nameUz || c.name || '';
    const nameRu = c.nameRu || c.name || '';
    if (!nameUz || !nameRu) {
      console.warn(`Warning: missing nameUz/nameRu for ${c.id}. Using available value for both.`);
    }
    const existing = await prisma.country.findUnique({ where: { id: c.id } });
    if (existing) {
      await prisma.country.update({ where: { id: c.id }, data: { nameUz, nameRu } });
      updated += 1;
    } else {
      await prisma.country.create({ data: { id: c.id, nameUz, nameRu } });
      created += 1;
    }
  }

  console.log(`Countries seeding finished. created=${created}, updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
