import { NextRequest, NextResponse } from "next/server";

import { handlers } from "@/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

function isCredentialSignInAttempt(request: NextRequest) {
  return request.url.endsWith("/callback/credentials");
}

export async function POST(request: NextRequest) {
  if (isCredentialSignInAttempt(request)) {
    const rateLimit = consumeRateLimit(request, {
      key: "credential-signin",
      maxRequests: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many sign-in attempts. Try again in a few minutes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }
  }

  return handlers.POST(request);
}
