/**
 * Adds isActive column to users table (default TRUE).
 * Run once: npx tsx src/db/migrate-user-active.ts
 */

import { DataSource } from "typeorm";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

const ds = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: false,
  entities: [],
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }
  await ds.initialize();
  console.log("✅  Connected");

  await ds.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE
  `);
  console.log("✅  users.isActive column ready (all existing users set to active)");

  await ds.destroy();
  console.log("✅  Migration complete.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
