import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
}

const hoursArgIndex = process.argv.indexOf("--hours");
const hoursValue = hoursArgIndex >= 0 ? Number(process.argv[hoursArgIndex + 1]) : 24;
const lookbackHours = Number.isFinite(hoursValue) && hoursValue > 0 ? hoursValue : 24;
const isTiDB = DATABASE_URL.includes("tidbcloud.com");

function printSection(title, rows) {
    console.log(`\n=== ${title} (${rows.length}) ===`);
    if (!rows.length) {
        console.log("none");
        return;
    }

    console.table(rows);
}

async function main() {
    console.log(`Checking commerce anomalies for the last ${lookbackHours} hour(s)...`);

    const conn = await mysql.createConnection({
        uri: DATABASE_URL,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
    });

    try {
        const [orphanOrders] = await conn.execute(
            `SELECT o.id, o.userId, o.totalPrice, o.status, o.purchasedAt
             FROM \`Order\` o
             LEFT JOIN Product p ON p.orderId = o.id
             WHERE o.status = 'COMPLETED'
               AND o.purchasedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR)
               AND p.id IS NULL
             ORDER BY o.purchasedAt DESC
             LIMIT 100`,
            [lookbackHours],
        );

        const [soldWithoutOrder] = await conn.execute(
            `SELECT p.id, p.name, p.category, p.updatedAt
             FROM Product p
             WHERE p.isSold = 1
               AND p.updatedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR)
               AND p.orderId IS NULL
             ORDER BY p.updatedAt DESC
             LIMIT 100`,
            [lookbackHours],
        );

        const [brokenOrderRefs] = await conn.execute(
            `SELECT p.id, p.name, p.orderId, p.updatedAt
             FROM Product p
             LEFT JOIN \`Order\` o ON o.id = p.orderId
             WHERE p.orderId IS NOT NULL
               AND p.updatedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR)
               AND o.id IS NULL
             ORDER BY p.updatedAt DESC
             LIMIT 100`,
            [lookbackHours],
        );

        const [stalePendingTopups] = await conn.execute(
            `SELECT t.id, t.userId, t.amount, t.status, t.transactionRef, t.createdAt
             FROM Topup t
             WHERE t.status = 'PENDING'
               AND t.createdAt <= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
               AND t.createdAt >= DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY t.createdAt ASC
             LIMIT 100`,
            [lookbackHours],
        );

        printSection("Completed orders without linked product", orphanOrders);
        printSection("Sold products missing orderId", soldWithoutOrder);
        printSection("Products pointing to missing orders", brokenOrderRefs);
        printSection("Pending topups older than 30 minutes", stalePendingTopups);

        const totalIssues =
            orphanOrders.length
            + soldWithoutOrder.length
            + brokenOrderRefs.length
            + stalePendingTopups.length;

        console.log(`\nTotal suspicious records: ${totalIssues}`);
        process.exitCode = totalIssues > 0 ? 2 : 0;
    } finally {
        await conn.end();
    }
}

main().catch((error) => {
    console.error("Failed to reconcile commerce data:", error instanceof Error ? error.message : error);
    process.exit(1);
});
