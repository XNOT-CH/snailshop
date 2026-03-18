// eslint-disable-next-line @typescript-eslint/no-require-imports
const scanner = require('sonarqube-scanner').default;

scanner(
  {
    serverUrl: "http://localhost:9000",
    options: {
      "sonar.token": "squ_875339ee4dcff7578a4fff1eb559fb530b228b1d",
      "sonar.projectKey": "my-game-store",
      "sonar.projectName": "My Game Store",
      "sonar.sources": "app,components,lib",
      "sonar.exclusions": "**/node_modules/**,**/.next/**,**/*.test.*,components/ui/**,components/emails/**",
      "sonar.javascript.lcov.reportPaths": "coverage/lcov.info"
    },
  },
  () => process.exit()
);
