/**
 * Test seed — deterministic data for E2E testing.
 *
 * Always run via `npm run test:e2e:setup` (or scripts/setup-test-db.ts),
 * which ensures DATABASE_URL points to inventory_test before this runs.
 *
 * Test credentials:
 *   Owner  — owner@test.local   / password: TestPass123!
 *   Staff  — staff@test.local   / PIN: 1234
 */
import { config } from "dotenv";
import path from "path";

// Guard: load .env.test so the DATABASE_URL is always inventory_test,
// even if this file is run standalone.
config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

// Safety check — refuse to run against anything that isn't the test DB.
if (!process.env.DATABASE_URL?.includes("inventory_test")) {
  console.error(
    "ERROR: DATABASE_URL does not point to inventory_test.\n" +
      "Run this seed via `npm run test:e2e:setup`, not directly."
  );
  process.exit(1);
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding test database...");

  // ─── Wipe existing data (order matters for FK constraints) ────────────────
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Cleared existing data");

  // ─── System Settings ──────────────────────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: [
      { key: "session_timeout_minutes", value: "90", description: "Auto-logout timeout in minutes" },
      { key: "edit_window_minutes", value: "5", description: "Post-submission edit window in minutes" },
      { key: "require_adjustment_notes", value: "true", description: "Force notes on inventory adjustments" },
      { key: "low_stock_threshold_percent", value: "20", description: "Yellow warning threshold as % of reorder level" },
      { key: "expiry_alert_days", value: "7", description: "Days before expiry to trigger warning" },
    ],
  });
  console.log("  ✓ System settings");

  // ─── Categories ───────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Meat & Poultry",       displayOrder: 1 } }),
    prisma.category.create({ data: { name: "Seafood",              displayOrder: 2 } }),
    prisma.category.create({ data: { name: "Vegetables & Herbs",   displayOrder: 3 } }),
    prisma.category.create({ data: { name: "Dry Goods & Grains",   displayOrder: 4 } }),
    prisma.category.create({ data: { name: "Dairy & Eggs",         displayOrder: 5 } }),
    prisma.category.create({ data: { name: "Beverages",            displayOrder: 6 } }),
    prisma.category.create({ data: { name: "Sauces & Condiments",  displayOrder: 7 } }),
    prisma.category.create({ data: { name: "Packaging & Supplies", displayOrder: 8 } }),
    prisma.category.create({ data: { name: "Frozen Items",         displayOrder: 9 } }),
    prisma.category.create({ data: { name: "Miscellaneous",        displayOrder: 10 } }),
  ]);

  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));
  console.log("  ✓ Categories");

  // ─── Users ────────────────────────────────────────────────────────────────
  const ownerPasswordHash = await hash("TestPass123!", 12);
  const staffPinHash = await hash("1234", 12);

  const owner = await prisma.user.create({
    data: {
      email: "owner@test.local",
      passwordHash: ownerPasswordHash,
      authType: "password",
      fullName: "Test Owner",
      role: "owner",
      isActive: true,
      mustChangePassword: false, // skip force-change screens in E2E
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@test.local",
      pinHash: staffPinHash,
      authType: "pin",
      fullName: "Test Staff",
      role: "staff",
      isActive: true,
      mustChangePassword: false,
      createdByUserId: owner.id,
    },
  });
  console.log("  ✓ Users (owner@test.local / TestPass123!, staff@test.local / PIN: 1234)");

  // ─── Items ────────────────────────────────────────────────────────────────
  // Covers: healthy stock, low stock, zero stock, expiration tracking,
  //         decimal quantities, and an inactive item.

  const chickenBreast = await prisma.item.create({
    data: {
      itemDescription: "Chicken Breast",
      categoryId: catByName["Meat & Poultry"].id,
      unitOfMeasure: "kg",
      allowsDecimal: true,
      tracksExpiration: false,
      quantityInStock: 50,
      currentUnitCostPhp: 180,
      reorderLevel: 10,
      primaryBusiness: "Shared",
      createdByUserId: owner.id,
    },
  });

  // Low stock: quantity (3) is below reorder level (10)
  const cookingOil = await prisma.item.create({
    data: {
      itemDescription: "Cooking Oil",
      categoryId: catByName["Dry Goods & Grains"].id,
      unitOfMeasure: "liter",
      allowsDecimal: true,
      tracksExpiration: false,
      quantityInStock: 3,
      currentUnitCostPhp: 120,
      reorderLevel: 10,
      primaryBusiness: "Shared",
      createdByUserId: owner.id,
    },
  });

  // Expiration tracking enabled — will have batches added below
  const freshMilk = await prisma.item.create({
    data: {
      itemDescription: "Fresh Milk",
      categoryId: catByName["Dairy & Eggs"].id,
      unitOfMeasure: "liter",
      allowsDecimal: true,
      tracksExpiration: true,
      quantityInStock: 20,
      currentUnitCostPhp: 85,
      reorderLevel: 5,
      primaryBusiness: "Arcy's Kitchen",
      createdByUserId: owner.id,
    },
  });

  // Zero stock — critical alert
  const fishSauce = await prisma.item.create({
    data: {
      itemDescription: "Fish Sauce",
      categoryId: catByName["Sauces & Condiments"].id,
      unitOfMeasure: "bottle",
      allowsDecimal: false,
      tracksExpiration: false,
      quantityInStock: 0,
      currentUnitCostPhp: 45,
      reorderLevel: 5,
      primaryBusiness: "Bale Kapampangan",
      createdByUserId: owner.id,
    },
  });

  // Decimal quantities
  const rice = await prisma.item.create({
    data: {
      itemDescription: "Rice (Sinandomeng)",
      categoryId: catByName["Dry Goods & Grains"].id,
      unitOfMeasure: "kg",
      allowsDecimal: true,
      tracksExpiration: false,
      quantityInStock: 150.5,
      currentUnitCostPhp: 55,
      reorderLevel: 20,
      primaryBusiness: "Shared",
      createdByUserId: owner.id,
    },
  });

  // Inactive item — visible in Inactive Items section on dashboard
  await prisma.item.create({
    data: {
      itemDescription: "Old Hot Sauce",
      categoryId: catByName["Sauces & Condiments"].id,
      unitOfMeasure: "bottle",
      allowsDecimal: false,
      tracksExpiration: false,
      quantityInStock: 2,
      currentUnitCostPhp: 60,
      reorderLevel: 0,
      isActive: false,
      createdByUserId: owner.id,
    },
  });

  console.log("  ✓ Items (6: healthy, low stock, zero stock, expiry-tracked, decimal, inactive)");

  // ─── Transactions ─────────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // Chicken Breast: add stock 3 days ago, then consumed yesterday
  await prisma.transaction.create({
    data: {
      itemId: chickenBreast.id,
      businessEntity: "Arcy's Kitchen",
      transactionType: "add",
      quantityChange: 50,
      stockAfterTransaction: 50,
      unitCostAtTransaction: 180,
      timestamp: daysAgo(3),
      loggedByUserId: owner.id,
      notes: "Weekly restock",
    },
  });

  await prisma.transaction.create({
    data: {
      itemId: chickenBreast.id,
      businessEntity: "Arcy's Kitchen",
      transactionType: "consume",
      quantityChange: -5,
      stockAfterTransaction: 45,
      unitCostAtTransaction: 180,
      timestamp: daysAgo(2),
      loggedByUserId: staff.id,
    },
  });

  await prisma.transaction.create({
    data: {
      itemId: chickenBreast.id,
      businessEntity: "Bale Kapampangan",
      transactionType: "consume",
      quantityChange: -10,
      stockAfterTransaction: 35,
      unitCostAtTransaction: 180,
      timestamp: daysAgo(1),
      loggedByUserId: staff.id,
    },
  });

  // Cooking Oil: an add and a big consume that brought it to low stock
  await prisma.transaction.create({
    data: {
      itemId: cookingOil.id,
      businessEntity: "Shared",
      transactionType: "add",
      quantityChange: 20,
      stockAfterTransaction: 20,
      unitCostAtTransaction: 120,
      timestamp: daysAgo(7),
      loggedByUserId: owner.id,
    },
  });

  await prisma.transaction.create({
    data: {
      itemId: cookingOil.id,
      businessEntity: "Arcy's Kitchen",
      transactionType: "consume",
      quantityChange: -17,
      stockAfterTransaction: 3,
      unitCostAtTransaction: 120,
      timestamp: daysAgo(1),
      loggedByUserId: staff.id,
      notes: "Used for weekend batch cooking",
    },
  });

  // Fresh Milk: two batches with different expiration dates
  // Batch 1: expiring in 3 days (triggers amber "expiring soon" alert)
  const expiringInThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  await prisma.transaction.create({
    data: {
      itemId: freshMilk.id,
      businessEntity: "Arcy's Kitchen",
      transactionType: "add",
      quantityChange: 12,
      stockAfterTransaction: 12,
      unitCostAtTransaction: 85,
      timestamp: daysAgo(4),
      loggedByUserId: staff.id,
      expirationDate: expiringInThreeDays,
    },
  });

  // Batch 2: already expired (triggers red "expired" alert)
  const twoDaysAgoDate = new Date(daysAgo(2).setHours(0, 0, 0, 0));
  await prisma.transaction.create({
    data: {
      itemId: freshMilk.id,
      businessEntity: "Arcy's Kitchen",
      transactionType: "add",
      quantityChange: 8,
      stockAfterTransaction: 20,
      unitCostAtTransaction: 85,
      timestamp: daysAgo(10),
      loggedByUserId: owner.id,
      expirationDate: twoDaysAgoDate,
    },
  });

  // Pending adjustment on Cooking Oil (submitted by staff, awaiting owner approval)
  await prisma.transaction.create({
    data: {
      itemId: cookingOil.id,
      businessEntity: "Shared",
      transactionType: "adjustment",
      quantityChange: -1,
      stockAfterTransaction: 2,
      unitCostAtTransaction: 120,
      timestamp: daysAgo(0),
      loggedByUserId: staff.id,
      adjustmentReason: "Damaged",
      adjustmentNotes: "One container was cracked during delivery",
      // No approvedByUserId / approvalTimestamp = pending
    },
  });

  console.log("  ✓ Transactions (add/consume history + 1 pending adjustment)");

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: owner.id,
        type: "low_stock",
        title: "Low Stock Alert",
        message: "Cooking Oil is below reorder level (3 liters remaining, reorder at 10).",
        itemId: cookingOil.id,
        isRead: false,
      },
      {
        userId: owner.id,
        type: "expiring_soon",
        title: "Expiring Soon",
        message: "Fresh Milk has a batch expiring in 3 days.",
        itemId: freshMilk.id,
        isRead: false,
      },
      {
        userId: owner.id,
        type: "expired",
        title: "Expired Stock",
        message: "Fresh Milk has an expired batch — submit an adjustment to write it off.",
        itemId: freshMilk.id,
        isRead: true,
      },
      {
        userId: owner.id,
        type: "adjustment_pending",
        title: "Adjustment Pending Approval",
        message: "Test Staff submitted a Damaged adjustment for Cooking Oil.",
        itemId: cookingOil.id,
        isRead: false,
      },
      {
        userId: staff.id,
        type: "adjustment_pending",
        title: "Adjustment Submitted",
        message: "Your adjustment for Cooking Oil (Damaged) is pending owner approval.",
        itemId: cookingOil.id,
        isRead: false,
      },
    ],
  });
  console.log("  ✓ Notifications");

  console.log("\nSeed complete.");
  console.log("─────────────────────────────────────────");
  console.log("  Owner:  owner@test.local  /  TestPass123!");
  console.log("  Staff:  staff@test.local  /  PIN: 1234");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
