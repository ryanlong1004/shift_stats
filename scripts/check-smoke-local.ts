import { spawn } from "node:child_process";

const LOCAL_PORT = process.env.SMOKE_LOCAL_PORT ?? "3103";
const BASE_URL = `http://localhost:${LOCAL_PORT}`;

function runCommand(
  command: string,
  args: string[],
  env?: Record<string, string>,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
      },
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} exited with code ${code}`),
      );
    });
  });
}

async function waitForServer(baseUrl: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, {
        redirect: "manual",
      });

      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for server at ${baseUrl}`);
}

async function main() {
  const smokeEnv: Record<string, string> = {
    AUTH_SECRET:
      process.env.AUTH_SECRET ?? "local-smoke-secret-change-before-production",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
    AUTH_DEMO_EMAIL: process.env.AUTH_DEMO_EMAIL ?? "demo@shiftstats.local",
    AUTH_DEMO_PASSWORD: process.env.AUTH_DEMO_PASSWORD ?? "shiftstats-demo",
    PORT: LOCAL_PORT,
    SMOKE_BASE_URL: BASE_URL,
  };

  console.log("Building app for local production smoke test...");
  await runCommand("npm", ["run", "build"]);

  console.log(`Starting standalone server on ${BASE_URL}...`);
  const server = spawn("npm", ["run", "start"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ...smokeEnv,
    },
  });

  let serverExited = false;
  server.on("exit", () => {
    serverExited = true;
  });

  const cleanupServer = () => {
    if (!serverExited) {
      server.kill("SIGTERM");
    }
  };

  process.on("SIGINT", () => {
    cleanupServer();
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    cleanupServer();
    process.exit(1);
  });

  try {
    await waitForServer(BASE_URL, 30_000);

    console.log("Running authenticated smoke checks...");
    await runCommand("npm", ["run", "check:smoke"], smokeEnv);

    console.log("Local production smoke checks completed successfully.");
  } finally {
    cleanupServer();
  }
}

main().catch((error) => {
  console.error("Local production smoke checks failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
