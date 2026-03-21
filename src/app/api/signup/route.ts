import { NextResponse } from "next/server";

import { createUserAccount } from "@/lib/signup-repository";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createUserAccount(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ user: result.user }, { status: 201 });
}
