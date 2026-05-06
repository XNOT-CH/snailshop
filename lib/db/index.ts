import { drizzle } from "drizzle-orm/mysql2";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Singleton pool for dev (prevents too many connections with hot reload)
const globalForDb = globalThis as unknown as {
    pool: mysql.Pool | undefined;
};

const isProduction = process.env.NODE_ENV === "production";

function getHyperdrivePoolOptions(): mysql.PoolOptions | null {
    try {
        const hyperdrive = getCloudflareContext().env.HYPERDRIVE;
        if (!hyperdrive) {
            return null;
        }

        return {
            host: hyperdrive.host,
            user: hyperdrive.user,
            password: hyperdrive.password,
            database: hyperdrive.database,
            port: hyperdrive.port,
            waitForConnections: true,
            connectionLimit: 5,
            charset: "utf8mb4",
            timezone: "+00:00",
            connectTimeout: 10000,
            disableEval: true,
        } as mysql.PoolOptions;
    } catch {
        return null;
    }
}

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
const poolOptions = (isProduction ? getHyperdrivePoolOptions() : null) ?? {
    uri: dbUrl,
    waitForConnections: true,
    connectionLimit: isProduction ? 5 : 10,
    charset: "utf8mb4",
    timezone: "+00:00",
    connectTimeout: 10000,
    ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
};

const pool = globalForDb.pool ?? mysql.createPool(poolOptions);

if (!isProduction) globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "planetscale" });

// Re-export schema for convenience
export * from "./schema";
