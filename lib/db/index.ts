import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Singleton pool for dev (prevents too many connections with hot reload)
const globalForDb = globalThis as unknown as {
    pool: mysql.Pool | undefined;
};

const isProduction = process.env.NODE_ENV === "production";

function normalizeDbUrl(rawUrl: string) {
    if (!rawUrl) {
        return rawUrl;
    }

    try {
        const parsedUrl = new URL(rawUrl);

        // On Windows/local dev, forcing IPv4 avoids intermittent localhost resolution timeouts.
        if (parsedUrl.hostname === "localhost") {
            parsedUrl.hostname = "127.0.0.1";
        }

        return parsedUrl.toString();
    } catch {
        return rawUrl.replace("@localhost:", "@127.0.0.1:");
    }
}

const dbUrl = normalizeDbUrl(process.env.DATABASE_URL ?? "");
const isTiDB = dbUrl.includes("tidbcloud.com");
// Pool size cap per Node process. Default raised from 5 -> 20 for prod to avoid
// starving concurrent DB-touching requests. Tunable via DB_CONNECTION_LIMIT.
// NOTE: when scaling to N replicas, keep N * limit under MySQL max_connections.
const connectionLimit =
    Number(process.env.DB_CONNECTION_LIMIT) || (isProduction ? 20 : 10);
const poolOptions = {
    uri: dbUrl,
    waitForConnections: true,
    connectionLimit,
    charset: "utf8mb4",
    timezone: "+00:00",
    connectTimeout: 10000,
    ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
};

const pool = globalForDb.pool ?? mysql.createPool(poolOptions);

if (!isProduction) globalForDb.pool = pool;

export const rawDbPool = pool;
export const db = drizzle(pool, { schema, mode: "planetscale" });

// Re-export schema for convenience
export * from "./schema";
