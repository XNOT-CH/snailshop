import fs from 'fs';

const data = JSON.parse(fs.readFileSync('sonar-issues.json', 'utf-8'));

const summary = {
    total: data.total,
    severities: {},
    types: {}
};

data.issues.forEach(issue => {
    summary.severities[issue.severity] = (summary.severities[issue.severity] || 0) + 1;
    summary.types[issue.type] = (summary.types[issue.type] || 0) + 1;
});

console.log("SonarQube Scan Summary:");
console.log(`Total Issues: ${summary.total}`);
console.log("\nBy Severity:");
for (const [severity, count] of Object.entries(summary.severities)) {
    console.log(`- ${severity}: ${count}`);
}

console.log("\nBy Type:");
for (const [type, count] of Object.entries(summary.types)) {
    console.log(`- ${type}: ${count}`);
}
