import { DataSource } from "typeorm";
import { RolePermissionSchema } from "./schemas";
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
  entities: [RolePermissionSchema],
});

async function run() {
  await ds.initialize();
  console.log("✅ Connected");
  const rows = await ds.getRepository("RolePermission").find({
    order: { role: "ASC", permissionKey: "ASC" } as never,
  }) as Array<{ role: string; permissionKey: string; granted: boolean }>;
  console.log(`Total rows: ${rows.length}`);
  rows.forEach((r) => console.log(`  ${r.role.padEnd(16)} ${r.permissionKey.padEnd(25)} ${r.granted}`));
  await ds.destroy();
}

run().catch((e) => { console.error("❌", e.message); process.exit(1); });
