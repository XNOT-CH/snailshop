import mysql from "mysql2/promise";
import { config as loadEnv } from "dotenv";
import crypto from "node:crypto";

for (const envFile of [".env.local", ".env"]) {
  loadEnv({ path: envFile, override: false });
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

const dbUrl = normalizeDbUrl(process.env.DATABASE_URL ?? "");
if (!dbUrl.trim()) {
  throw new Error("DATABASE_URL is required.");
}

const setupConnection = await mysql.createConnection(dbUrl);
const txA = await mysql.createConnection(dbUrl);
const txB = await mysql.createConnection(dbUrl);

const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const productId = `lock-product-${suffix}`;

try {
  await setupConnection.execute(
    "INSERT INTO Product (id, name, price, category, currency, secretData, stockSeparator, isSold, isFeatured, sortOrder, createdAt, updatedAt) VALUES (?, 'Lock Verification Product', '100.00', 'test', 'THB', 'lock-code', 'newline', 0, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
    [productId],
  );

  await txA.beginTransaction();
  const [firstRows] = await txA.execute(
    "SELECT id, isSold FROM Product WHERE id = ? FOR UPDATE",
    [productId],
  );
  const firstRow = Array.isArray(firstRows) ? firstRows[0] : null;
  if (!firstRow || Number(firstRow.isSold) !== 0) {
    throw new Error("Initial lock verification row is not in the expected unsold state.");
  }

  await txB.beginTransaction();
  const secondSelectPromise = txB.execute(
    "SELECT id, isSold FROM Product WHERE id = ? FOR UPDATE",
    [productId],
  );

  await new Promise((resolve) => setTimeout(resolve, 150));
  await txA.execute(
    "UPDATE Product SET isSold = 1, updatedAt = UTC_TIMESTAMP() WHERE id = ?",
    [productId],
  );
  await txA.commit();

  const [secondRows] = await secondSelectPromise;
  const secondRow = Array.isArray(secondRows) ? secondRows[0] : null;
  if (!secondRow || Number(secondRow.isSold) !== 1) {
    throw new Error("Concurrent lock verification did not observe the sold row after the first transaction committed.");
  }
  await txB.rollback();

  console.log("Purchase locking verification passed.");
  console.log(`Verified product row lock handoff for ${productId}`);
} finally {
  try {
    await txA.rollback();
  } catch {}
  try {
    await txB.rollback();
  } catch {}
  await setupConnection.execute("DELETE FROM Product WHERE id = ?", [productId]);
  await Promise.allSettled([txA.end(), txB.end(), setupConnection.end()]);
}
