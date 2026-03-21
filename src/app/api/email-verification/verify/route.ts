import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import { verifyEmailToken } from "@/lib/email-verification-repository";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, {
    key: "email-verification",
    maxRequests: 12,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message:
          "Too many verification attempts. Wait a few minutes before trying again.",
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
  const result = await verifyEmailToken(body);

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
