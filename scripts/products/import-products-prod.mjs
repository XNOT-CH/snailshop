import path from "node:path";
import { createDbConnection, getDefaultExportPath, loadEnvFile, readJsonFile } from "./product-sync-utils.mjs";

const importPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : getDefaultExportPath();

function hasStock(secretData) {
    return typeof secretData === "string" && secretData.trim().length > 0;
}

function parseProducts(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.products)) {
        throw new Error("Invalid export file: expected a top-level 'products' array.");
    }

    return payload.products;
}

async function main() {
    const { envPath, dbUrl } = loadEnvFile({ appEnv: "production" });
    const payload = readJsonFile(importPath);
    const products = parseProducts(payload);

    if (products.length === 0) {
        console.log("No products found in export file.");
        return;
    }

    const connection = await createDbConnection(dbUrl);

    let createdCount = 0;
    let updatedCount = 0;
    let preservedLiveStateCount = 0;

    try {
        await connection.beginTransaction();

        for (const product of products) {
            const [existingRows] = await connection.execute(
                "SELECT id, orderId FROM Product WHERE id = ? LIMIT 1",
                [product.id]
            );

            const existing = existingRows[0];
            const stockAvailable = hasStock(product.secretData);
            const commonValues = [
                product.name,
                product.description ?? null,
                product.price,
                product.discountPrice ?? null,
                product.imageUrl ?? null,
                product.category,
                product.currency ?? "THB",
            ];
            const displayValues = [
                product.isFeatured ? 1 : 0,
                Number(product.sortOrder ?? 0),
                product.autoDeleteAfterSale == null ? null : Number(product.autoDeleteAfterSale),
            ];

            if (!existing) {
                await connection.execute(
                    `
                        INSERT INTO Product (
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
                            isSold,
                            isFeatured,
                            sortOrder,
                            autoDeleteAfterSale,
                            createdAt,
                            updatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        product.id,
                        ...commonValues,
                        product.secretData ?? "",
                        product.stockSeparator ?? "newline",
                        stockAvailable ? 0 : 1,
                        ...displayValues,
                        product.createdAt ?? new Date(),
                        product.updatedAt ?? new Date(),
                    ]
                );
                createdCount += 1;
                continue;
            }

            if (existing.orderId) {
                await connection.execute(
                    `
                        UPDATE Product
                        SET
                            name = ?,
                            description = ?,
                            price = ?,
                            discountPrice = ?,
                            imageUrl = ?,
                            category = ?,
                            currency = ?,
                            isFeatured = ?,
                            sortOrder = ?,
                            autoDeleteAfterSale = ?,
                            updatedAt = NOW()
                        WHERE id = ?
                    `,
                    [...commonValues, ...displayValues, product.id]
                );
                updatedCount += 1;
                preservedLiveStateCount += 1;
                continue;
            }

            await connection.execute(
                `
                    UPDATE Product
                    SET
                        name = ?,
                        description = ?,
                        price = ?,
                        discountPrice = ?,
                        imageUrl = ?,
                        category = ?,
                        currency = ?,
                        isFeatured = ?,
                        sortOrder = ?,
                        autoDeleteAfterSale = ?,
                        secretData = ?,
                        stockSeparator = ?,
                        isSold = ?,
                        updatedAt = NOW()
                    WHERE id = ?
                `,
                [
                    ...commonValues,
                    ...displayValues,
                    product.secretData ?? "",
                    product.stockSeparator ?? "newline",
                    stockAvailable ? 0 : 1,
                    product.id,
                ]
            );
            updatedCount += 1;
        }

        await connection.commit();

        console.log(`Imported products into production DB using ${envPath}.`);
        console.log(`Source file: ${importPath}`);
        console.log(`Created: ${createdCount}`);
        console.log(`Updated: ${updatedCount}`);
        if (preservedLiveStateCount > 0) {
            console.log(`Preserved live order/stock state for sold products: ${preservedLiveStateCount}`);
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error("Failed to import products into production:", error instanceof Error ? error.message : error);
    process.exit(1);
});
