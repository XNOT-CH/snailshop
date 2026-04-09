import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import fs from "node:fs";

const explicitDbUrl = process.env.DATABASE_URL;
const envPath = process.env.APP_ENV === "development" && fs.existsSync(".env.development.local")
    ? ".env.development.local"
    : ".env.local";

config({ path: envPath });

const rawUrl = explicitDbUrl || process.env.DATABASE_URL || "mysql://root:@localhost:3306/my_game_store";

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dialect: "mysql",
    dbCredentials: {
        url: rawUrl,
    },
});
