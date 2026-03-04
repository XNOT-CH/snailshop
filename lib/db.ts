// This file intentionally replaces the old PrismaClient export.
// All db access now goes through Drizzle ORM (lib/db/index.ts).
export { db } from "./db/index";
export * from "./db/schema";
