export {};

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

function getTokenFromResetUrl(resetUrl: string) {
  const parsed = new URL(resetUrl);
  const token = parsed.searchParams.get("token")?.trim();

  if (!token) {
    fail(`Reset URL did not include a token. URL: ${resetUrl}`);
  }

  return token;
}

async function verifyEmailIfRequired(
  baseUrl: string,
  signupPayload: {
    requiresEmailVerification?: boolean;
    verificationUrl?: string;
  },
) {
  if (!signupPayload.requiresEmailVerification) {
    return;
  }

  if (!signupPayload.verificationUrl) {
    fail(
      "Signup required email verification but verificationUrl was missing. Set AUTH_EXPOSE_EMAIL_VERIFICATION_URL=true for smoke testing.",
    );
  }

  const token = getTokenFromResetUrl(signupPayload.verificationUrl);
  const verificationResponse = await fetch(
    `${baseUrl}/api/email-verification/verify`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
      redirect: "manual",
    },
  );

  if (verificationResponse.status !== 200) {
    const body = await verificationResponse.text();
    fail(
      `Email verification failed. Status: ${verificationResponse.status}. Response: ${body}`,
    );
  }
}

async function main() {
  const baseUrl = (
    process.env.SMOKE_BASE_URL ?? "http://localhost:3003"
  ).replace(/\/$/, "");

  const now = Date.now();
  const email = `smoke-reset-${now}@shiftstats.local`;
  const name = "Smoke Reset User";
  const initialPassword = `SmokePass-${now}-a`;
  const nextPassword = `SmokePass-${now}-b`;

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      redirect: "manual",
    });

    return response;
  }

  const signupResponse = await request("/api/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password: initialPassword,
      confirmPassword: initialPassword,
    }),
  });

  if (signupResponse.status !== 201) {
    const body = await signupResponse.text();
    fail(`Signup failed. Status: ${signupResponse.status}. Response: ${body}`);
  }

  const signupPayload = (await signupResponse.json()) as {
    requiresEmailVerification?: boolean;
    verificationUrl?: string;
  };

  await verifyEmailIfRequired(baseUrl, signupPayload);

  const resetRequestResponse = await request("/api/password-reset/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (resetRequestResponse.status !== 200) {
    const body = await resetRequestResponse.text();
    fail(
      `Password reset request failed. Status: ${resetRequestResponse.status}. Response: ${body}`,
    );
  }

  const resetRequestPayload = (await resetRequestResponse.json()) as {
    message?: string;
    resetUrl?: string;
  };

  if (!resetRequestPayload.resetUrl) {
    fail(
      "Password reset request did not return resetUrl. Set AUTH_EXPOSE_RESET_URL=true for smoke testing.",
    );
  }

  const token = getTokenFromResetUrl(resetRequestPayload.resetUrl);

  const resetConfirmResponse = await request("/api/password-reset/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      token,
      password: nextPassword,
      confirmPassword: nextPassword,
    }),
  });

  if (resetConfirmResponse.status !== 200) {
    const body = await resetConfirmResponse.text();
    fail(
      `Password reset confirm failed. Status: ${resetConfirmResponse.status}. Response: ${body}`,
    );
  }

  const jar = new CookieJar();

  const csrfResponse = await request("/api/auth/csrf");
  if (csrfResponse.status !== 200) {
    fail(`Failed to fetch CSRF token. Status: ${csrfResponse.status}`);
  }

  const csrfSetCookies = csrfResponse.headers.getSetCookie?.() ?? [];
  jar.addFromSetCookie(csrfSetCookies);

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfPayload.csrfToken;

  if (!csrfToken) {
    fail("CSRF token was not returned by /api/auth/csrf.");
  }

  const callbackForm = new URLSearchParams({
    csrfToken,
    email,
    password: nextPassword,
    callbackUrl: `${baseUrl}/dashboard`,
    json: "true",
  });

  const callbackResponse = await fetch(
    `${baseUrl}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: jar.toHeaderValue(),
      },
      body: callbackForm.toString(),
      redirect: "manual",
    },
  );

  const callbackSetCookies = callbackResponse.headers.getSetCookie?.() ?? [];
  jar.addFromSetCookie(callbackSetCookies);

  if (![200, 302].includes(callbackResponse.status)) {
    const body = await callbackResponse.text();
    fail(
      `Credential callback after reset failed. Status: ${callbackResponse.status}. Response: ${body}`,
    );
  }

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    headers: {
      cookie: jar.toHeaderValue(),
    },
    redirect: "manual",
  });

  if (sessionResponse.status !== 200) {
    fail(
      `Session endpoint failed after reset sign-in. Status: ${sessionResponse.status}`,
    );
  }

  const session = (await sessionResponse.json()) as {
    user?: { email?: string } | null;
  } | null;

  if (session?.user?.email?.toLowerCase() !== email.toLowerCase()) {
    fail(
      `Reset flow login returned unexpected user. Expected ${email}, got ${session?.user?.email ?? "none"}.`,
    );
  }

  console.log("Password reset smoke checks passed.");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Verified reset flow for: ${email}`);
}

main().catch((error) => {
  console.error("Password reset smoke checks failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
