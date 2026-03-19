/**
 * Sets up the local E2E test database.
 * Run via: npm run test:e2e:setup
 *
 * Steps:
 *  1. Load .env.test into the process environment
 *  2. Create the inventory_test database if it doesn't exist
 *  3. Run Prisma migrations against it
 *  4. Run the test seed (prisma/seed-test.ts)
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import { Client } from "pg";
import path from "path";

// Load .env.test — override any existing DATABASE_URL so this script
// always targets the test database, never dev or production.
config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

const databaseUrl = process.env.DATABASE_URL!;

async function createDatabaseIfMissing() {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1); // strip leading "/"

  // Connect to the default "postgres" database to run CREATE DATABASE
  url.pathname = "/postgres";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`  ✓ Created database: ${dbName}`);
  } else {
    console.log(`  ✓ Database already exists: ${dbName}`);
  }

  await client.end();
}

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", env: { ...process.env } });
}

async function main() {
  console.log("Setting up E2E test database...\n");

  await createDatabaseIfMissing();

  console.log("Running migrations...");
  run("npx prisma migrate deploy");

  console.log("\nRunning test seed...");
  run("npx tsx prisma/seed-test.ts");

  console.log("\nTest database is ready. Run: npm run test:e2e");
}

main().catch((e) => {
  console.error("\nSetup failed:", e.message);
  process.exit(1);
});
