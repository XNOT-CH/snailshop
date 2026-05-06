import path from "node:path";
import { createDbConnection, formatNowIso, getDefaultExportPath, loadEnvFile, writeJsonFile } from "./product-sync-utils.mjs";

const exportPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : getDefaultExportPath();

async function main() {
    const { envPath, dbUrl } = loadEnvFile({ appEnv: "development" });
    const connection = await createDbConnection(dbUrl);

    try {
        const [rows] = await connection.execute(`
            SELECT
                id,
                name,
                description,
                price,
                discountPrice,
                imageUrl,
                category,
                currency,
                secretData,
                stockSeparator,
                isFeatured,
                sortOrder,
                autoDeleteAfterSale,
                createdAt,
                updatedAt
            FROM Product
            ORDER BY createdAt DESC
        `);

        const products = rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: row.price == null ? null : String(row.price),
            discountPrice: row.discountPrice == null ? null : String(row.discountPrice),
            imageUrl: row.imageUrl,
            category: row.category,
            currency: row.currency,
            secretData: row.secretData,
            stockSeparator: row.stockSeparator,
            isFeatured: Boolean(row.isFeatured),
            sortOrder: Number(row.sortOrder ?? 0),
            autoDeleteAfterSale: row.autoDeleteAfterSale == null ? null : Number(row.autoDeleteAfterSale),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));

        writeJsonFile(exportPath, {
            exportedAt: formatNowIso(),
            source: {
                appEnv: "development",
                envFile: envPath,
            },
            productCount: products.length,
            products,
        });

        console.log(`Exported ${products.length} products from dev DB.`);
        console.log(`File: ${exportPath}`);
        console.log("Note: This export includes product stock/secret data. Keep the file private.");
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error("Failed to export products from dev:", error instanceof Error ? error.message : error);
    process.exit(1);
});

