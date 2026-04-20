/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const scanner = require("sonarqube-scanner").default;

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

const properties = loadSonarProperties();
const serverUrl =
  process.env.SONAR_HOST_URL ||
  properties["sonar.host.url"] ||
  "https://sonarcloud.io";
const token = process.env.SONAR_TOKEN;

if (!token) {
  console.error("Missing SONAR_TOKEN environment variable.");
  process.exit(1);
}

const options = {
  ...properties,
  "sonar.projectKey":
    process.env.SONAR_PROJECT_KEY || properties["sonar.projectKey"],
  "sonar.organization":
    process.env.SONAR_ORGANIZATION || properties["sonar.organization"],
};

delete options["sonar.host.url"];

scanner(
  {
    serverUrl,
    options: {
      ...options,
      "sonar.token": token,
    },
  },
  () => process.exit()
);
