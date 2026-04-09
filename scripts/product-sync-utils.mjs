import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { config as loadDotEnv } from "dotenv";

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

export function loadEnvFile({ appEnv = "production" } = {}) {
    const envPath = appEnv === "development" && fs.existsSync(".env.development.local")
        ? ".env.development.local"
        : ".env.local";

    loadDotEnv({ path: envPath, override: true });

    const dbUrl = normalizeDbUrl(process.env.DATABASE_URL ?? "");
    if (!dbUrl) {
        throw new Error(`DATABASE_URL is missing in ${envPath}`);
    }

    return { envPath, dbUrl };
}

export async function createDbConnection(dbUrl) {
    return mysql.createConnection({
        uri: dbUrl,
        charset: "utf8mb4",
    });
}

export function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

export function getDefaultExportPath() {
    return path.join(process.cwd(), "backups", "product-sync", "products-dev-export.json");
}

export function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJsonFile(filePath, value) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function formatNowIso() {
    return new Date().toISOString();
}

