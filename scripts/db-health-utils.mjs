import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { config as loadEnv } from "dotenv";

export function loadProjectEnv(cwd = process.cwd()) {
  const envFiles = [".env.local", ".env"];

  for (const envFile of envFiles) {
    const fullPath = path.join(cwd, envFile);
    if (fs.existsSync(fullPath)) {
      loadEnv({ path: fullPath, override: false });
    }
  }
}

function normalizeDbUrl(rawUrl) {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.hostname === "localhost") {
      parsedUrl.hostname = "127.0.0.1";
    }
    return parsedUrl.toString();
  } catch {
    return rawUrl.replace("@localhost:", "@127.0.0.1:");
  }
}

function maskDbUrl(rawUrl) {
  return rawUrl.replace(/:([^@]+)@/, ":***@");
}

const requiredColumns = [
  { table: "User", column: "ticketBalance" },
  { table: "SeasonPassReward", column: "imageUrl" },
];

const requiredIndexes = [
  { table: "SeasonPassPlan", index: "idx_season_pass_plan_active", columns: ["isActive"] },
  { table: "SeasonPassSubscription", index: "idx_season_pass_subscription_user_status", columns: ["userId", "status"] },
  { table: "SeasonPassSubscription", index: "idx_season_pass_subscription_user_status_endAt", columns: ["userId", "status", "endAt"] },
  { table: "SeasonPassSubscription", index: "idx_season_pass_subscription_endAt", columns: ["endAt"] },
  { table: "SeasonPassClaim", index: "idx_season_pass_claim_user_created", columns: ["userId", "createdAt"] },
  { table: "SeasonPassClaim", index: "uq_season_pass_claim_subscription_day", columns: ["subscriptionId", "dayNumber"] },
  { table: "SeasonPassReward", index: "idx_season_pass_reward_plan_day", columns: ["planId", "dayNumber"] },
  { table: "Order", index: "idx_order_user_status", columns: ["userId", "status"] },
];

const requiredQueryPlans = [
  {
    name: "season-pass-active-subscription",
    sql: "EXPLAIN SELECT id FROM SeasonPassSubscription WHERE userId = ? AND status = 'ACTIVE' AND endAt >= UTC_TIMESTAMP() ORDER BY endAt DESC LIMIT 1",
    params: ["db-health-user"],
    expectedIndex: "idx_season_pass_subscription_user_status_endAt",
  },
  {
    name: "promo-completed-order-check",
    sql: "EXPLAIN SELECT id FROM `Order` FORCE INDEX (idx_order_user_status) WHERE userId = ? AND status = 'COMPLETED' LIMIT 1",
    params: ["db-health-user"],
    expectedIndex: "idx_order_user_status",
  },
];

export async function validateDatabaseHealth({ cwd = process.cwd(), log = console.log } = {}) {
  loadProjectEnv(cwd);

  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!rawUrl.trim()) {
    throw new Error("DATABASE_URL is required to validate database health.");
  }

  const dbUrl = normalizeDbUrl(rawUrl);
  const isTiDB = dbUrl.includes("tidbcloud.com");
  const errors = [];
  let connection;

  try {
    log(`Checking database health against ${maskDbUrl(dbUrl)}`);
    try {
      connection = await mysql.createConnection({
        uri: dbUrl,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        unavailable: true,
        errors: [`Database is unavailable: ${message}`],
      };
    }

    const [databaseRows] = await connection.execute("SELECT DATABASE() AS db");
    const databaseName = databaseRows?.[0]?.db;

    if (!databaseName) {
      errors.push("Could not determine current database name.");
    } else {
      for (const requirement of requiredColumns) {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) AS count
           FROM information_schema.columns
           WHERE table_schema = ?
             AND table_name = ?
             AND column_name = ?`,
          [databaseName, requirement.table, requirement.column],
        );
        const count = Number(rows?.[0]?.count ?? 0);
        if (count === 0) {
          errors.push(`Missing required column ${requirement.table}.${requirement.column}`);
        }
      }

      for (const requirement of requiredIndexes) {
        const [rows] = await connection.execute(
          `SELECT column_name
           FROM information_schema.statistics
           WHERE table_schema = ?
             AND table_name = ?
             AND index_name = ?
           ORDER BY seq_in_index`,
          [databaseName, requirement.table, requirement.index],
        );
        const columnRows = Array.isArray(rows) ? rows : [];
        if (columnRows.length === 0) {
          errors.push(`Missing required index ${requirement.index} on ${requirement.table}`);
          continue;
        }

        if (Array.isArray(requirement.columns)) {
          const actualColumns = columnRows.map((row) => row.column_name ?? row.COLUMN_NAME).filter(Boolean);
          const expectedColumns = requirement.columns;
          if (actualColumns.join(",") !== expectedColumns.join(",")) {
            errors.push(
              `Index ${requirement.index} on ${requirement.table} has unexpected columns (${actualColumns.join(",")}); expected (${expectedColumns.join(",")})`,
            );
          }
        }
      }

      for (const requirement of requiredQueryPlans) {
        const [rows] = await connection.execute(requirement.sql, requirement.params);
        const planRow = Array.isArray(rows) ? rows[0] : null;
        const actualKey = planRow?.key ?? planRow?.KEY ?? null;
        if (actualKey !== requirement.expectedIndex) {
          errors.push(
            `Query plan ${requirement.name} is using ${actualKey ?? "no index"} instead of ${requirement.expectedIndex}`,
          );
        }
      }
    }
  } finally {
    await connection?.end();
  }

  return {
    ok: errors.length === 0,
    unavailable: false,
    errors,
  };
}
