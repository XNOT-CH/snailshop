import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VALID_COMMANDS = new Set(["check", "preview", "deploy", "build"]);
const command = process.argv[2] ?? "build";

if (!VALID_COMMANDS.has(command)) {
  console.error(`Unknown Cloudflare command "${command}". Use one of: ${[...VALID_COMMANDS].join(", ")}`);
  process.exit(1);
}

function run(executable, args) {
  const useShell = process.platform === "win32";
  const result = spawnSync(useShell ? [executable, ...args].join(" ") : executable, useShell ? [] : args, {
    cwd: process.cwd(),
    env: process.env,
    shell: useShell,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function findRequiredServerFileManifests(root) {
  const manifests = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.name === "required-server-files.json") {
        manifests.push(entryPath);
      }
    }
  }

  const nextDir = path.join(root, ".next");
  const primaryManifest = path.join(nextDir, "required-server-files.json");
  if (fs.existsSync(primaryManifest)) manifests.push(primaryManifest);
  walk(path.join(nextDir, "standalone"));

  return [...new Set(manifests)];
}

function patchRequiredServerFilesManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.config ??= {};

  let changed = false;
  if (manifest.config.skipTrailingSlashRedirect === undefined) {
    manifest.config.skipTrailingSlashRedirect = false;
    changed = true;
  }

  if (manifest.config.serverExternalPackages === undefined) {
    manifest.config.serverExternalPackages = [];
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Patched ${path.relative(process.cwd(), manifestPath)}`);
  }
}

run("npm", ["run", "build"]);

for (const manifestPath of findRequiredServerFileManifests(process.cwd())) {
  patchRequiredServerFilesManifest(manifestPath);
}

run("npx", ["--no-install", "opennextjs-cloudflare", "build", "--skipNextBuild"]);

if (command === "check") {
  run("npx", ["--no-install", "wrangler", "deploy", "--dry-run"]);
} else if (command === "preview") {
  run("npx", ["--no-install", "opennextjs-cloudflare", "preview"]);
} else if (command === "deploy") {
  run("npx", ["--no-install", "opennextjs-cloudflare", "deploy"]);
}
