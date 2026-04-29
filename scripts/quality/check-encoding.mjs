import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "components", "lib", "hooks", "scripts", "tests", "types"];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".css",
  ".mjs",
  ".cjs",
]);
const IGNORED_SEGMENTS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage"]);
const makeToken = (...codePoints) => String.fromCodePoint(...codePoints);
const MOJIBAKE_TOKENS = [
  makeToken(0x0e42, 0x201d, 0x20ac),
  makeToken(0x0e42, 0x20ac),
  makeToken(0x0e40, 0x0e18, 0x0e03),
  makeToken(0x0e40, 0x0e18, 0x0e05),
  makeToken(0x0e40, 0x0e18, 0x0e0a),
  makeToken(0x0e40, 0x0e18, 0x0e12),
  makeToken(0x0e40, 0x0e18, 0x0e14),
  makeToken(0x0e40, 0x0e18, 0x0e17),
  makeToken(0x0e40, 0x0e18, 0x0e1f),
];

function shouldScan(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    return false;
  }

  const parts = filePath.split(path.sep);
  return !parts.some((part) => IGNORED_SEGMENTS.has(part));
}

function findIssues(text) {
  const issues = [];

  for (let index = 0; index < text.length; index += 1) {
    const codePoint = text.charCodeAt(index);

    if (codePoint === 0xfffd) {
      issues.push(`contains replacement character U+FFFD at char ${index + 1}`);
      continue;
    }

    if (codePoint >= 0x80 && codePoint <= 0x9f) {
      issues.push(`contains control character U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} at char ${index + 1}`);
    }
  }

  const lines = text.split(/\r?\n/u);
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    for (const token of MOJIBAKE_TOKENS) {
      if (line.includes(token)) {
        issues.push(`contains suspicious mojibake token "${token}" on line ${lineNumber + 1}`);
      }
    }
  }

  return [...new Set(issues)];
}

async function* walkFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (IGNORED_SEGMENTS.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
      continue;
    }

    if (entry.isFile() && shouldScan(fullPath)) {
      yield fullPath;
    }
  }
}

const failures = [];

for (const scanRoot of SCAN_ROOTS) {
  const absoluteRoot = path.join(ROOT, scanRoot);

  try {
    for await (const filePath of walkFiles(absoluteRoot)) {
      let text;

      try {
        text = await readFile(filePath, "utf8");
      } catch (error) {
        failures.push({
          filePath,
          issue: `failed to read as UTF-8: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }

      const issues = findIssues(text);
      for (const issue of issues) {
        failures.push({ filePath, issue });
      }
    }
  } catch {
    // Missing directories are fine.
  }
}

if (failures.length > 0) {
  console.error("Encoding check failed.");
  for (const failure of failures) {
    console.error(`- ${path.relative(ROOT, failure.filePath)}: ${failure.issue}`);
  }
  process.exit(1);
}

console.log("Encoding check passed.");
