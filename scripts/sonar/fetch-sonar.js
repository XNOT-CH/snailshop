/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

async function fetchIssues() {
    try {
        const token = "squ_875339ee4dcff7578a4fff1eb559fb530b228b1d:";
        const base64Token = Buffer.from(token).toString("base64");
        
        const res = await fetch("http://localhost:9000/api/issues/search?componentKeys=my-game-store&ps=500&resolved=false&statuses=OPEN,CONFIRMED", {
            headers: {
                "Authorization": `Basic ${base64Token}`
            }
        });
        
        if (!res.ok) {
            console.error("Failed to fetch:", res.status, res.statusText);
            return;
        }
        
        const data = await res.json();
        
        // simplify output
        const simplified = data.issues?.map(i => ({
            key: i.key,
            rule: i.rule,
            component: i.component,
            line: i.line,
            message: i.message,
            type: i.type
        })) || [];
        
        const outPath = require("path").join(__dirname, "sonar-current-issues.json");
        fs.writeFileSync(outPath, JSON.stringify(simplified, null, 2));
        console.log(`Saved ${simplified.length} issues to scripts/sonar/sonar-current-issues.json`);
    } catch (err) {
        console.error("Error:", err);
    }
}

fetchIssues();
