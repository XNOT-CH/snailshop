import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const bucketArgIndex = process.argv.indexOf("--bucket");
const bucketName =
  bucketArgIndex >= 0 ? process.argv[bucketArgIndex + 1] : process.env.CLOUDFLARE_R2_UPLOADS_BUCKET;

if (!bucketName) {
  console.error("Missing bucket name. Use --bucket <name> or CLOUDFLARE_R2_UPLOADS_BUCKET.");
  process.exit(1);
}

const sources = [
  {
    localRoot: path.join(process.cwd(), "storage", "uploads"),
    keyPrefix: "uploads",
  },
  {
    localRoot: path.join(process.cwd(), "storage", "private", "slips"),
    keyPrefix: "private/slips",
  },
  {
    localRoot: path.join(process.cwd(), "storage", "chat-media"),
    keyPrefix: "chat-media",
  },
];
const allowedExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root, current = root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, fullPath));
    } else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function toObjectKey(source, filePath) {
  const relativePath = path.relative(source.localRoot, filePath).split(path.sep).join("/");
  return `${source.keyPrefix}/${relativePath}`;
}

function uploadFile(filePath, objectKey) {
  const target = `${bucketName}/${objectKey}`;
  const result = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", target, "--file", filePath],
    { stdio: "inherit", shell: process.platform === "win32" }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to upload ${filePath} to ${target}`);
  }
}

const plannedUploads = [];

for (const source of sources) {
  const files = await collectFiles(source.localRoot);
  for (const filePath of files) {
    plannedUploads.push({
      filePath,
      objectKey: toObjectKey(source, filePath),
    });
  }
}

if (plannedUploads.length === 0) {
  console.log("No local storage files found to migrate.");
  process.exit(0);
}

console.log(`${apply ? "Uploading" : "Dry run:"} ${plannedUploads.length} file(s) to R2 bucket ${bucketName}.`);

for (const upload of plannedUploads) {
  console.log(`${upload.filePath} -> r2://${bucketName}/${upload.objectKey}`);
  if (apply) {
    uploadFile(upload.filePath, upload.objectKey);
  }
}

if (!apply) {
  console.log("Dry run only. Re-run with --apply to upload files.");
}
