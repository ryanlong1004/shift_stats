import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/password-reset-repository";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, {
    key: "password-reset-request",
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message:
          "Too many password reset requests from this network. Try again in a few minutes.",
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
  const result = await requestPasswordReset(body);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      message: result.message,
      resetUrl: result.resetUrl,
    },
    { status: 200 },
  );
}
