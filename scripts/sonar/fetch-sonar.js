/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

function loadSonarProperties() {
  const propertiesPath = path.resolve(__dirname, "../../sonar-project.properties");
  const content = fs.readFileSync(propertiesPath, "utf8");
  const properties = {};
  let currentKey = null;
  let currentValue = "";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (currentKey) {
      currentValue += line.endsWith("\\") ? line.slice(0, -1) : line;
      if (!line.endsWith("\\")) {
        properties[currentKey] = currentValue;
        currentKey = null;
        currentValue = "";
      }
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (value.endsWith("\\")) {
      currentKey = key;
      currentValue = value.slice(0, -1);
      continue;
    }

    properties[key] = value;
  }

  return properties;
}

async function fetchIssues() {
  try {
    const properties = loadSonarProperties();
    const token = process.env.SONAR_TOKEN;
    const projectKey =
      process.env.SONAR_PROJECT_KEY || properties["sonar.projectKey"];
    const hostUrl =
      process.env.SONAR_HOST_URL ||
      properties["sonar.host.url"] ||
      "https://sonarcloud.io";

    if (!token) {
      console.error("Missing SONAR_TOKEN environment variable.");
      process.exit(1);
    }

    if (!projectKey) {
      console.error("Missing Sonar project key.");
      process.exit(1);
    }

    const base64Token = Buffer.from(`${token}:`).toString("base64");
    const url = new URL("/api/issues/search", hostUrl);

    url.searchParams.set("componentKeys", projectKey);
    url.searchParams.set("ps", "500");
    url.searchParams.set("resolved", "false");
    url.searchParams.set("statuses", "OPEN,CONFIRMED,REOPENED");

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${base64Token}`,
      },
    });

    if (!res.ok) {
      console.error("Failed to fetch:", res.status, res.statusText);
      process.exit(1);
    }

    const data = await res.json();
    const simplified =
      data.issues?.map((issue) => ({
        key: issue.key,
        rule: issue.rule,
        component: issue.component,
        line: issue.line,
        message: issue.message,
        severity: issue.severity,
        type: issue.type,
      })) || [];

    const outPath = path.join(__dirname, "sonar-current-issues.json");
    fs.writeFileSync(outPath, JSON.stringify(simplified, null, 2));
    console.log(`Saved ${simplified.length} issues to ${outPath}`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fetchIssues();
