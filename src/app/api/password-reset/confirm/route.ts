import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import { confirmPasswordReset } from "@/lib/password-reset-repository";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, {
    key: "password-reset-confirm",
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message:
          "Too many password reset attempts. Wait a few minutes before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json();
  const result = await confirmPasswordReset(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ message: result.message }, { status: 200 });
}
