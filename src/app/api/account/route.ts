import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import {
  accountFormSchema,
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/account-repository";

export async function GET() {
  try {
    const profile = await getAccountProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
    }

    throw error;
  }
}

export async function PUT(request: Request) {
  const rateLimit = consumeRateLimit(request, {
    key: "account-update",
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message:
          "Too many account update attempts. Wait a few minutes before trying again.",
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
  const parsed = accountFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateAccountProfile(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message, fieldErrors: result.fieldErrors },
        { status: result.status },
      );
    }

    return NextResponse.json({ profile: result.profile });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
    }

    throw error;
  }
}
