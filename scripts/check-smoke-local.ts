import { spawn } from "node:child_process";
import { createServer } from "node:net";

async function resolveLocalPort() {
  const configuredPort = process.env.SMOKE_LOCAL_PORT;

  if (configuredPort) {
    return configuredPort;
  }

  return new Promise<string>((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to determine free port.")));
        return;
      }

      const port = String(address.port);
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

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
  const localPort = await resolveLocalPort();
  const baseUrl = `http://localhost:${localPort}`;
  const smokeEnv: Record<string, string> = {
    AUTH_SECRET:
      process.env.AUTH_SECRET ?? "local-smoke-secret-change-before-production",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
    AUTH_EXPOSE_RESET_URL: process.env.AUTH_EXPOSE_RESET_URL ?? "true",
    AUTH_EXPOSE_EMAIL_VERIFICATION_URL:
      process.env.AUTH_EXPOSE_EMAIL_VERIFICATION_URL ?? "true",
    AUTH_REQUIRE_EMAIL_VERIFICATION:
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION ?? "false",
    AUTH_DEMO_EMAIL: process.env.AUTH_DEMO_EMAIL ?? "demo@shiftstats.local",
    AUTH_DEMO_PASSWORD: process.env.AUTH_DEMO_PASSWORD ?? "shiftstats-demo",
    PORT: localPort,
    SMOKE_BASE_URL: baseUrl,
  };

  console.log("Applying Prisma migrations for smoke test database...");
  await runCommand("npm", ["run", "prisma:migrate:deploy"], smokeEnv);

  console.log("Building app for local production smoke test...");
  await runCommand("npm", ["run", "build"]);

  console.log(`Starting standalone server on ${baseUrl}...`);
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
    await waitForServer(baseUrl, 30_000);

    console.log("Running authenticated smoke checks...");
    await runCommand("npm", ["run", "check:smoke"], smokeEnv);

    console.log("Running password reset smoke checks...");
    await runCommand("npm", ["run", "check:smoke:reset"], smokeEnv);

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
