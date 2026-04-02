import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

const cwd = process.cwd();
const envFiles = [".env.local", ".env"];

for (const envFile of envFiles) {
  const fullPath = path.join(cwd, envFile);
  if (fs.existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: false });
  }
}

const requiredVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ENCRYPTION_KEY",
  "CSRF_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "ALLOWED_ORIGIN",
  "CRON_SECRET",
];

const recommendedVars = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EASYSLIP_TOKEN",
];

const missingRequired = requiredVars.filter((name) => !process.env[name]?.trim());
const missingRecommended = recommendedVars.filter((name) => !process.env[name]?.trim());

const errors = [];

const encryptionKey = process.env.ENCRYPTION_KEY;
if (encryptionKey && Buffer.byteLength(encryptionKey, "utf8") !== 32) {
  errors.push("ENCRYPTION_KEY must be exactly 32 bytes.");
}

const csrfSecret = process.env.CSRF_SECRET;
if (csrfSecret && Buffer.byteLength(csrfSecret, "utf8") < 32) {
  errors.push("CSRF_SECRET should be at least 32 bytes.");
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (siteUrl && !/^https?:\/\//.test(siteUrl)) {
  errors.push("NEXT_PUBLIC_SITE_URL must start with http:// or https://");
}

const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (allowedOrigin && !/^https?:\/\//.test(allowedOrigin)) {
  errors.push("ALLOWED_ORIGIN must start with http:// or https://");
}

console.log("Deploy validation summary");
console.log(`Required missing: ${missingRequired.length}`);
console.log(`Recommended missing: ${missingRecommended.length}`);
console.log(`Rule errors: ${errors.length}`);

if (missingRequired.length > 0) {
  console.log("\nMissing required variables:");
  for (const name of missingRequired) {
    console.log(`- ${name}`);
  }
}

if (missingRecommended.length > 0) {
  console.log("\nMissing recommended variables:");
  for (const name of missingRecommended) {
    console.log(`- ${name}`);
  }
}

if (errors.length > 0) {
  console.log("\nConfiguration errors:");
  for (const error of errors) {
    console.log(`- ${error}`);
  }
}

if (missingRequired.length > 0 || errors.length > 0) {
  process.exit(1);
}

console.log("\nDeploy configuration looks good.");
