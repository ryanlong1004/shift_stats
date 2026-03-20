import { NextResponse } from "next/server";

import { parseShiftImportCsv } from "@/lib/shift-import";
import { importShifts } from "@/lib/shift-repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      csvText?: string;
    };

    if (!body.csvText?.trim()) {
      return NextResponse.json(
        { message: "CSV content is required." },
        { status: 400 },
      );
    }

    const parsed = parseShiftImportCsv(body.csvText);
    const result = await importShifts(parsed.rows);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        count: result.count,
        warnings: parsed.warnings,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    throw error;
  }
}
