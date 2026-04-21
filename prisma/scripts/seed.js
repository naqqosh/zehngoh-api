/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("../generated/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || "kamoliddinbekxudoyberdi@gmail.com";
  const password = process.env.SEED_PASSWORD || "qwer123#";
  const fullName = process.env.SEED_FULL_NAME || "Savdogar";

  const store = {
    storeName: "Test Seller Store",
    slug: "test-seller",
    skuPrefix: "TESTSEL",
  };

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, fullName },
      include: { seller: true },
    });
    console.log("Updated existing user password");
  } else {
    // Generate a likely-unique dummy phone number
    const phone =
      "998" + Math.floor(10_000_000 + Math.random() * 89_999_999).toString();
    user = await prisma.user.create({
      data: {
        email,
        phone,
        fullName,
        passwordHash,
        sellers: { create: store },
      },
      include: { sellers: true },
    });
    console.log("Created new user + shop");
  }

  // Ensure at least one shop exists (in case user existed without shops)
  const shops = await prisma.seller.findMany({ where: { userId: user.id } });
  if (shops.length === 0) {
    await prisma.seller.create({ data: { userId: user.id, ...store } });
    console.log("Attached a shop to user");
  }

  console.log({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    sellerIds: (
      await prisma.seller.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
    ).map((s) => s.id),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
