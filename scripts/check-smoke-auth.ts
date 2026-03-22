export {};

type AssertOptions = {
  path: string;
  expectedStatuses: number[];
  context: string;
};

class CookieJar {
  private store = new Map<string, string>();

  addFromSetCookie(setCookies: string[]) {
    for (const rawCookie of setCookies) {
      const [nameValue] = rawCookie.split(";", 1);

      if (!nameValue) {
        continue;
      }

      const separator = nameValue.indexOf("=");

      if (separator < 0) {
        continue;
      }

      const name = nameValue.slice(0, separator).trim();
      const value = nameValue.slice(separator + 1).trim();

      if (!name) {
        continue;
      }

      this.store.set(name, value);
    }
  }

  toHeaderValue() {
    return [...this.store.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  hasCookies() {
    return this.store.size > 0;
  }
}

function fail(message: string): never {
  throw new Error(message);
}

function formatFetchFailure(baseUrl: string, path: string, error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);

  return [
    `Unable to reach ${baseUrl}${path}.`,
    "Start the app server first or use `npm run check:smoke:local` to build and boot a local production server automatically.",
    `Fetch error: ${reason}`,
  ].join(" ");
}

async function main() {
  const baseUrl = (
    process.env.SMOKE_BASE_URL ?? "http://localhost:3003"
  ).replace(/\/$/, "");
  const email =
    process.env.AUTH_DEMO_EMAIL ??
    (process.env.NODE_ENV === "production" ? "" : "demo@shift-stats.com");
  const password =
    process.env.AUTH_DEMO_PASSWORD ??
    (process.env.NODE_ENV === "production" ? "" : "demo");

  if (!email || !password) {
    fail(
      "Missing demo credentials. Set AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD.",
    );
  }

  const jar = new CookieJar();

  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);

    if (jar.hasCookies()) {
      headers.set("cookie", jar.toHeaderValue());
    }

    let response: Response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
        redirect: "manual",
      });
    } catch (error) {
      fail(formatFetchFailure(baseUrl, path, error));
    }

    const setCookies = response.headers.getSetCookie?.() ?? [];
    jar.addFromSetCookie(setCookies);

    return response;
  }

  async function assertStatus({
    path,
    expectedStatuses,
    context,
  }: AssertOptions) {
    const response = await request(path);

    if (!expectedStatuses.includes(response.status)) {
      fail(
        `${context} failed for ${path}. Expected ${expectedStatuses.join(", ")}, got ${response.status}.`,
      );
    }
  }

  // Public pages should always be reachable.
  await assertStatus({
    path: "/",
    expectedStatuses: [200],
    context: "Public home check",
  });
  await assertStatus({
    path: "/login",
    expectedStatuses: [200],
    context: "Login page check",
  });

  const csrfResponse = await request("/api/auth/csrf");
  if (csrfResponse.status !== 200) {
    fail(`Failed to fetch CSRF token. Status: ${csrfResponse.status}`);
  }

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfPayload.csrfToken;

  if (!csrfToken) {
    fail("CSRF token was not returned by /api/auth/csrf.");
  }

  const callbackForm = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/dashboard`,
    json: "true",
  });

  const callbackResponse = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: callbackForm.toString(),
  });

  if (![200, 302].includes(callbackResponse.status)) {
    const body = await callbackResponse.text();
    fail(
      `Credential callback failed. Status: ${callbackResponse.status}. Response: ${body}`,
    );
  }

  const sessionResponse = await request("/api/auth/session");
  if (sessionResponse.status !== 200) {
    fail(
      `Session endpoint failed after sign-in. Status: ${sessionResponse.status}`,
    );
  }

  const session = (await sessionResponse.json()) as {
    user?: { email?: string } | null;
  } | null;

  if (!session?.user?.email) {
    fail("Session did not include an authenticated user after sign-in.");
  }

  const dashboardResponse = await request("/dashboard");
  if (dashboardResponse.status !== 200) {
    fail(
      `Dashboard was not accessible after sign-in. Status: ${dashboardResponse.status}`,
    );
  }

  const shiftsApiResponse = await request("/api/shifts");
  if (shiftsApiResponse.status !== 200) {
    fail(
      `Shifts API was not accessible after sign-in. Status: ${shiftsApiResponse.status}`,
    );
  }

  console.log("Authenticated smoke checks passed.");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Signed in as: ${session.user.email}`);
  console.log(
    "Verified: /, /login, /api/auth/csrf, credentials callback, /api/auth/session, /dashboard, /api/shifts",
  );
}

main().catch((error) => {
  console.error("Authenticated smoke checks failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
