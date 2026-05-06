# Workflow File Notes

This folder contains GitHub Actions workflows.

## Current workflow map

- `sonarcloud.yml`
  installs dependencies with `npm ci`, runs `npm run test:coverage`, then runs `npm run sonar:scan`

## Read with

- `.github/AGENTS.md`
- `package.json`
- `scripts/AGENTS.md`
- `scripts/sonar/AGENTS.md`
