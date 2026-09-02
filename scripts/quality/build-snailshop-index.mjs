import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Rebuilds the generated half of snailshop.md from the code itself.
//
// snailshop.md is the project's knowledge index. Anything in it that can be
// derived from source is derived here instead of typed by hand, because the
// AGENTS.md layer proved that hand-written paths rot silently: 115 of them
// pointed at files that no longer existed before they were repaired.
//
//   node scripts/quality/build-snailshop-index.mjs           rewrite the block
//   node scripts/quality/build-snailshop-index.mjs --check   fail if stale

const ROOT = process.cwd();
const TARGET = path.join(ROOT, "snailshop.md");
const BEGIN = "<!-- BEGIN GENERATED -->";
const END = "<!-- END GENERATED -->";
const BIG_FILE_LINES = 600;

const tracked = (pattern) =>
  execFileSync("git", ["ls-files", pattern], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

async function buildTableIndex() {
  const source = await read("lib/db/schema.ts");
  const lines = source.split("\n");
  const rows = [];

  lines.forEach((line, index) => {
    const match = line.match(/^export const (\w+) = mysqlTable\("([^"]+)"/);
    if (match) {
      rows.push({ export: match[1], table: match[2], line: index + 1 });
    }
  });

  const body = rows
    .map((r) => `| \`${r.table}\` | \`${r.export}\` | \`lib/db/schema.ts:${r.line}\` |`)
    .join("\n");

  return [
    `### Database tables (${rows.length})`,
    "",
    "Jump straight to the line instead of reading the whole 800-line schema.",
    "",
    "| MySQL table | drizzle export | defined at |",
    "|---|---|---|",
    body,
  ].join("\n");
}

async function buildRouteIndex() {
  const files = tracked("app/api/**/route.ts").sort();
  const rows = [];

  for (const file of files) {
    const source = await read(file);
    const methods = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)]
      .map((m) => m[1]);
    const url = "/" + file.replace(/^app\//, "").replace(/\/route\.ts$/, "");
    rows.push({ url, methods: methods.length ? methods.join(", ") : "—", file });
  }

  const body = rows.map((r) => `| \`${r.url}\` | ${r.methods} |`).join("\n");

  return [
    `### API routes (${rows.length})`,
    "",
    "The handler for each one lives at the matching `app/<url>/route.ts`.",
    "",
    "| Route | Methods |",
    "|---|---|",
    body,
  ].join("\n");
}

async function buildBigFileIndex() {
  const files = [...tracked("*.ts"), ...tracked("*.tsx"), ...tracked("*.css")];
  const entries = [];

  for (const file of files) {
    if (file.startsWith("tests/")) continue;
    const source = await read(file);
    const lines = source.split("\n");
    if (lines.length < BIG_FILE_LINES) continue;

    const landmarks = [];
    lines.forEach((line, index) => {
      // TypeScript: top-level declarations worth jumping to.
      const fn = line.match(/^(?:export )?(?:default )?(?:async )?function (\w+)/);
      const topConst = line.match(/^(?:export )?const (\w+) = (?:function|\(|async|\{)/);

      // CSS: a banner comment names the section on its own line, either
      // `/* ==== */ NAME /* ==== */` across three lines, or `/* Name */`.
      const bannerOpen = /^\/\* ={5,}\s*$/.test(line);
      const banner = bannerOpen
        ? lines.slice(index + 1, index + 3).map((l) => l.trim()).find(Boolean)
        : null;
      const oneLine = line.match(/^\/\* ([A-Z][^*]{3,60}?) \*\/$/);
      const atRule = line.match(/^(@layer \w+|@theme \w+|:root)/);

      const name = fn?.[1] ?? topConst?.[1] ?? banner ?? oneLine?.[1] ?? atRule?.[1];
      if (name) landmarks.push(`${name.replace(/\s+/g, " ")}:${index + 1}`);
    });

    entries.push({
      file,
      lines: lines.length,
      landmarks: landmarks.slice(0, 8).join(", ") || "—",
    });
  }

  entries.sort((a, b) => b.lines - a.lines);
  const body = entries
    .map((e) => `| \`${e.file}\` | ${e.lines} | ${e.landmarks} |`)
    .join("\n");

  return [
    `### Files over ${BIG_FILE_LINES} lines (${entries.length})`,
    "",
    "Read a range, not the file. Landmarks are `name:line`.",
    "",
    "| File | Lines | Landmarks |",
    "|---|---|---|",
    body,
  ].join("\n");
}

async function buildScriptIndex() {
  const pkg = JSON.parse(await read("package.json"));
  const body = Object.entries(pkg.scripts)
    .map(([name, command]) => `| \`npm run ${name}\` | \`${command}\` |`)
    .join("\n");

  return [
    `### npm scripts (${Object.keys(pkg.scripts).length})`,
    "",
    "| Command | Runs |",
    "|---|---|",
    body,
  ].join("\n");
}

// One fact, one home. snailshop.md's ownership table says which file owns what; this
// enforces it for the rules that were actually found duplicated, so a copy-paste into a
// second file fails the check instead of quietly drifting apart.
//
// Each entry: the phrase, the file allowed to state it, and where else it may be
// mentioned only as a pointer.
const SINGLE_SOURCE = [
  { phrase: "A push applies the whole", owner: "CLAUDE.md" },
  { phrase: "There is no Workers/Vercel path", owner: "CLAUDE.md" },
  { phrase: "verify it\nis green", owner: "CLAUDE.md" },
  { phrase: "because that is what the person reading the dashboard can act on", owner: "CLAUDE.md" },
  { phrase: "Preserve Thai user-facing text", owner: "CLAUDE.md" },
];
const SINGLE_SOURCE_FILES = ["CLAUDE.md", "snailshop.md", "AGENTS.md", "README.md"];

async function checkSingleSource() {
  const contents = new Map();
  for (const file of SINGLE_SOURCE_FILES) {
    contents.set(file, await read(file));
  }

  const problems = [];
  for (const { phrase, owner } of SINGLE_SOURCE) {
    const holders = SINGLE_SOURCE_FILES.filter((f) => contents.get(f).includes(phrase));
    if (!holders.includes(owner)) {
      problems.push(`"${phrase}" is missing from its owner ${owner}`);
    }
    for (const extra of holders.filter((f) => f !== owner)) {
      problems.push(`"${phrase}" is stated in ${extra} as well as its owner ${owner} — link instead of repeating`);
    }
  }
  return problems;
}

async function main() {
  const check = process.argv.includes("--check");
  const current = await readFile(TARGET, "utf8");

  const duplicated = await checkSingleSource();
  if (duplicated.length) {
    console.error("A rule is stated in more than one place:");
    for (const problem of duplicated) console.error(`  ${problem}`);
    process.exit(1);
  }

  const beginAt = current.indexOf(BEGIN);
  const endAt = current.indexOf(END);
  if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
    console.error(`snailshop.md is missing the ${BEGIN} / ${END} markers.`);
    process.exit(1);
  }

  const sections = [
    await buildTableIndex(),
    await buildRouteIndex(),
    await buildBigFileIndex(),
    await buildScriptIndex(),
  ];

  const generated = [
    BEGIN,
    "",
    "<!-- Rebuilt by `npm run knowledge:build`. Do not edit this block by hand. -->",
    "",
    sections.join("\n\n"),
    "",
    END,
  ].join("\n");

  const next = current.slice(0, beginAt) + generated + current.slice(endAt + END.length);

  if (next === current) {
    console.log("snailshop.md index is up to date.");
    return;
  }

  if (check) {
    console.error("snailshop.md index is stale. Run `npm run knowledge:build`.");
    process.exit(1);
  }

  await writeFile(TARGET, next, "utf8");
  console.log("snailshop.md index rebuilt.");
}

await main();
