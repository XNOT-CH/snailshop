import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Singleton pool for dev (prevents too many connections with hot reload)
const globalForDb = globalThis as unknown as {
    pool: mysql.Pool | undefined;
};

const pool = globalForDb.pool ?? mysql.createPool({
    uri: process.env.DATABASE_URL!,
    waitForConnections: true,
    connectionLimit: 10,
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });

// Re-export schema for convenience
export * from "./schema";
