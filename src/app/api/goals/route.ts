import { NextResponse } from "next/server";

import { listGoals, upsertGoal, goalFormSchema } from "@/lib/goals-repository";

export async function GET() {
  try {
    const goals = await listGoals();
    return NextResponse.json({ goals });
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

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = goalFormSchema.safeParse(body);

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
    const result = await upsertGoal(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({ goal: result.goal });
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
