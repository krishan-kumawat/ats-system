import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });
import {
  UserSchema,
  JobSchema,
  CandidateSchema,
  ApplicationSchema,
  ScorecardSchema,
  FounderApprovalSchema,
  AuditLogSchema,
  RolePermissionSchema,
  JobAssignmentSchema,
} from "./schemas";

declare global {
  // eslint-disable-next-line no-var
  var __typeormDataSource: DataSource | undefined;
}

function isNetworkError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT";
}

function createDataSource(): DataSource {
  return new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
    synchronize: false,
    logging: false,
    entities: [
      UserSchema,
      JobSchema,
      CandidateSchema,
      ApplicationSchema,
      ScorecardSchema,
      FounderApprovalSchema,
      AuditLogSchema,
      RolePermissionSchema,
      JobAssignmentSchema,
    ],
    migrations: ["src/db/migrations/*.ts"],
    extra: {
      max: 5,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
    },
  });
}

async function connect(): Promise<DataSource> {
  if (!global.__typeormDataSource) {
    global.__typeormDataSource = createDataSource();
  }
  const ds = global.__typeormDataSource;
  if (!ds.isInitialized) {
    await ds.initialize();
  }
  return ds;
}

async function reconnect(): Promise<DataSource> {
  // Destroy the stale pool and create a fresh connection.
  if (global.__typeormDataSource?.isInitialized) {
    try { await global.__typeormDataSource.destroy(); } catch { /* ignore */ }
  }
  global.__typeormDataSource = createDataSource();
  await global.__typeormDataSource.initialize();
  return global.__typeormDataSource;
}

/**
 * Run `fn` with a live DataSource. On ECONNRESET/ECONNREFUSED/ETIMEDOUT the
 * stale pool is destroyed, a fresh connection is made, and `fn` retries once.
 * Neon suspends idle computes; this handles the wake-up reset transparently.
 */
export async function withDb<T>(fn: (ds: DataSource) => Promise<T>): Promise<T> {
  let ds = await connect();
  try {
    return await fn(ds);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    // Pool was stale — reconnect and retry once.
    ds = await reconnect();
    return fn(ds);
  }
}

// Keep getDataSource for the server actions that call it directly.
export async function getDataSource(): Promise<DataSource> {
  return connect();
}
