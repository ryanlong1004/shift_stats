import { NextResponse } from "next/server";

import {
  createShift,
  getShiftSnapshot,
  isDatabaseConfigured,
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";
import { shiftFormSchema } from "@/lib/shift-form";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const presetParam = searchParams.get("preset");
    const preset: ShiftListFilters["preset"] =
      presetParam === "week" ||
      presetParam === "month" ||
      presetParam === "custom"
        ? presetParam
        : undefined;
    const filters: ShiftListFilters = {
      preset,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      location: searchParams.get("location") ?? undefined,
      role: searchParams.get("role") ?? undefined,
    };
    const rows = await listShiftRecords(filters);
    const snapshot = await getShiftSnapshot(filters);

    return NextResponse.json({
      mode: isDatabaseConfigured() ? "database" : "sample",
      rows,
      snapshot,
    });
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
  const parsed = shiftFormSchema.safeParse(body);

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
    const result = await createShift(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({ shift: result.shift }, { status: 201 });
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
