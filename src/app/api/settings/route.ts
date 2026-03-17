import { NextResponse } from "next/server";

import {
  updateUserSettings,
  userSettingsSchema,
} from "@/lib/settings-repository";

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = userSettingsSchema.safeParse(body);

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
    const result = await updateUserSettings(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message, fieldErrors: result.fieldErrors },
        { status: result.status },
      );
    }

    return NextResponse.json({ settings: result.settings });
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
