import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

// Load .env.test so the E2E test server always hits inventory_test,
// not the dev database. Next.js env loading won't overwrite vars
// that are already present in process.env, so this takes precedence.
const testEnv = config({
  path: path.resolve(__dirname, ".env.test"),
}).parsed ?? {};

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3001" },
  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    // Reuse if already running (e.g. `npm run dev:test`), otherwise start one.
    reuseExistingServer: true,
    timeout: 120_000,
    env: testEnv,
  },
});
