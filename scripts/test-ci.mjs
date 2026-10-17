import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";

const PORT = process.env.TEST_PORT || "3100";
const BASE = `http://127.0.0.1:${PORT}`;

function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function waitForExit(child, label) {
  const [code, signal] = await once(child, "exit");
  if (code !== 0) {
    throw new Error(`${label} failed (code ${code}, signal ${signal ?? "none"})`);
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("server did not become healthy in 60s");
}

async function main() {
  console.log("[test:ci] building");
  await waitForExit(run("npm", ["run", "build"]), "build");

  console.log(`[test:ci] starting production server on ${BASE}`);
  const server = run("node_modules/.bin/next", ["start", "-p", PORT], {
    env: { ...process.env, PORT },
  });

  const stop = () => {
    if (!server.killed) server.kill("SIGTERM");
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });

  try {
    await waitForServer();
    console.log("[test:ci] running API tests");
    const tests = run("node", ["--test", "tests/api.test.mjs"], {
      env: { ...process.env, TEST_BASE_URL: BASE },
    });
    await waitForExit(tests, "api tests");
    console.log("[test:ci] all green");
  } finally {
    stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
