import { NextResponse } from "next/server";

import {
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";
import { formatCurrency, formatDecimal } from "@/lib/formatters";

function escapeCSVValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      preset?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      role?: string;
      shiftType?: string;
      includeNotes?: boolean;
    };

    const filters: ShiftListFilters = {
      preset:
        body.preset === "week" ||
        body.preset === "month" ||
        body.preset === "custom"
          ? body.preset
          : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      location: body.location,
      role: body.role,
      shiftType: body.shiftType,
    };

    const rows = await listShiftRecords(filters);

    const headers = [
      "Date",
      "Hours Worked",
      "Total Earned",
      "Hourly Rate",
      "Cash Tips",
      "Card Tips",
      "Base Pay",
      "Other Income",
      "Location",
      "Role",
      "Shift Type",
    ];

    if (body.includeNotes) {
      headers.push("Notes");
    }

    const headerRow = headers.map(escapeCSVValue).join(",");

    const dataRows = rows.map((row) => {
      const values = [
        row.shiftDate,
        formatDecimal(row.hoursWorked),
        formatCurrency(row.totalEarned),
        formatCurrency(row.hourlyRate),
        formatCurrency(row.cashTips),
        formatCurrency(row.cardTips),
        formatCurrency(row.basePay),
        formatCurrency(row.otherIncome),
        row.location ?? "",
        row.role ?? "",
        row.shiftType ?? "",
      ];

      if (body.includeNotes) {
        values.push(row.notes ?? "");
      }

      return values.map(escapeCSVValue).join(",");
    });

    const csv = [headerRow, ...dataRows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shifts-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
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
