import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

process.chdir(projectRoot);

function canListen(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, host);
  });
}

async function findAvailablePort(startPort, host) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await canListen(port, host)) {
      return port;
    }
  }

  throw new Error(`No available port found starting at ${startPort}`);
}

const host = "127.0.0.1";
const requestedPort = Number.parseInt(process.env.PORT || "3001", 10);
const port = await findAvailablePort(requestedPort, host);

if (port !== requestedPort) {
  console.log(`Port ${requestedPort} is busy, starting dev server on ${port} instead.`);
}

const env = {
  ...process.env,
  PORT: String(port),
};

const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", host, "--port", String(port)], {
  cwd: projectRoot,
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start Next.js dev server:", error);
  process.exit(1);
});
