/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const issuesPath = path.join(__dirname, "sonar-current-issues.json");
const issues = JSON.parse(fs.readFileSync(issuesPath, "utf8"));

const byRule = {};
const byComponent = {};

issues.forEach((issue) => {
    byRule[issue.rule] = (byRule[issue.rule] || 0) + 1;
    byComponent[issue.component] = (byComponent[issue.component] || 0) + 1;
});

console.log("--- By Rule ---");
Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`${k}: ${v}`));

console.log("\n--- By Component (Top 10) ---");
Object.entries(byComponent).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`${k}: ${v}`));
