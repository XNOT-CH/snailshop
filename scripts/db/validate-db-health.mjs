import process from "node:process";
import { validateDatabaseHealth } from "./db-health-utils.mjs";

const result = await validateDatabaseHealth();

console.log("Database health summary");
console.log(`Errors: ${result.errors.length}`);

if (!result.ok) {
  console.log("\nDatabase health errors:");
  for (const error of result.errors) {
    console.log(`- ${error}`);
  }
  process.exit(1);
}

console.log("\nDatabase health looks good.");
