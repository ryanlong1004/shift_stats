import { NextResponse } from "next/server";

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
