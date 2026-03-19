import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── System Settings ──────────────────────────────────────
  const settings = [
    {
      key: "session_timeout_minutes",
      value: "90",
      description: "Auto-logout timeout in minutes",
    },
    {
      key: "edit_window_minutes",
      value: "5",
      description: "Post-submission edit window in minutes",
    },
    {
      key: "require_adjustment_notes",
      value: "true",
      description: "Force notes on inventory adjustments",
    },
    {
      key: "low_stock_threshold_percent",
      value: "20",
      description: "Yellow warning threshold as percentage of reorder level",
    },
    {
      key: "expiry_alert_days",
      value: "7",
      description: "Days before expiry to trigger warning",
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }
  console.log(`  ✓ ${settings.length} system settings`);

  // ─── Categories ───────────────────────────────────────────
  const categories = [
    { name: "Meat & Poultry", displayOrder: 1 },
    { name: "Seafood", displayOrder: 2 },
    { name: "Vegetables & Herbs", displayOrder: 3 },
    { name: "Dry Goods & Grains", displayOrder: 4 },
    { name: "Sauces & Condiments", displayOrder: 5 },
    { name: "Dairy & Eggs", displayOrder: 6 },
    { name: "Beverages", displayOrder: 7 },
    { name: "Packaging & Supplies", displayOrder: 8 },
    { name: "Frozen Items", displayOrder: 9 },
    { name: "Miscellaneous", displayOrder: 10 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { displayOrder: category.displayOrder },
      create: category,
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // ─── Default Owner Account ────────────────────────────────
  const ownerEmail = "owner@inventory.local";
  const passwordHash = await hash("changeme123", 12);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash,
      authType: "password",
      fullName: "Default Owner",
      role: "owner",
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`  ✓ Default owner account (${ownerEmail})`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
