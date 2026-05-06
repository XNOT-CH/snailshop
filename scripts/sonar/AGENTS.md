# Sonar Script Notes

This folder contains Sonar-related automation.

## Use this folder for

- scan execution
- fetching Sonar results
- summarizing Sonar findings

## Actual command flow

- Local scan:
  `npm run sonar:scan`
  runs `node scripts/sonar/run-sonar.js`
- Pull current issues:
  `npm run sonar:fetch`
  runs `node scripts/sonar/fetch-sonar.js`
- Summarize fetched issues:
  `npm run sonar:summary`
  runs `node scripts/sonar/summarize-sonar.js`

## CI note

- GitHub Actions Sonar workflow runs `npm run test:coverage` before `npm run sonar:scan`
