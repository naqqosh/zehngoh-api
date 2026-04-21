/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

// Expected JSON format (nested):
// [
//   { "nameUz": "Kitoblar", "nameRu": "Книги", "isActive": true, "children": [
//       { "nameUz": "Badiiy", "nameRu": "Художественная" },
//       { "nameUz": "Ilmiy",  "nameRu": "Научная" }
//   ]},
//   { "nameUz": "Elektronika", "nameRu": "Электроника" }
// ]

async function upsertCategory(node, parentId = null) {
  if (!node || !node.nameUz || !node.nameRu) {
    throw new Error(`Invalid category node (need nameUz and nameRu): ${JSON.stringify(node)}`);
  }

  const data = {
    nameUz: node.nameUz,
    nameRu: node.nameRu,
    parentId: parentId ?? null,
    isActive: node.isActive !== undefined ? !!node.isActive : true,
  };

  let cat;
  if (data.parentId === null) {
    // Root category: can't use composite unique with NULL in Prisma upsert
    const existing = await prisma.category.findFirst({ where: { parentId: null, nameUz: data.nameUz } });
    if (existing) {
      cat = await prisma.category.update({
        where: { id: existing.id },
        data: { nameRu: data.nameRu, isActive: data.isActive },
      });
    } else {
      cat = await prisma.category.create({ data });
    }
  } else {
    // Child category: composite unique upsert works
    cat = await prisma.category.upsert({
      where: { parentId_nameUz: { parentId: data.parentId, nameUz: data.nameUz } },
      update: { nameRu: data.nameRu, isActive: data.isActive },
      create: data,
    });
  }

  // Recursively process children (if any)
  if (Array.isArray(node.children) && node.children.length) {
    for (const child of node.children) {
      await upsertCategory(child, cat.id);
    }
  }

  return cat;
}

async function main() {
  const jsonPath = process.env.CATEGORIES_FILE
    ? path.resolve(process.env.CATEGORIES_FILE)
    : path.join(__dirname, 'categories.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Categories JSON not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const input = JSON.parse(raw);

  // Expect nested input; if flat is needed, we can add a converter later
  const nodes = input;
  if (!Array.isArray(nodes)) throw new Error('Top-level JSON must be an array');

  let created = 0;
  let updated = 0;

  for (const node of nodes) {
    // upsertCategory will update or create as needed
    const before = await prisma.category.findFirst({ where: { parentId: null, nameUz: node.nameUz } });
    await upsertCategory(node, null);
    const after = await prisma.category.findFirst({ where: { parentId: null, nameUz: node.nameUz } });
    if (!before && after) created += 1; else updated += 1;
  }

  console.log(`Categories seeding finished. created=${created}, updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
