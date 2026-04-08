import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildDashboardSnapshot,
  buildShiftSnapshot,
  type ShiftRecord,
} from "@/lib/shift-records";

// Dummy metadata applied per-row so chart tooltips show realistic values
// instead of "Unspecified".
const SAMPLE_ROW_META: Array<{
  location: string;
  role: string;
  shiftType: string;
}> = [
  { location: "Downtown", role: "Server", shiftType: "Dinner" },
  { location: "Westside", role: "Bartender", shiftType: "Brunch" },
  { location: "Downtown", role: "Server", shiftType: "Lunch" },
  { location: "Westside", role: "Host", shiftType: "Dinner" },
];

async function readRows(): Promise<ShiftRecord[]> {
  const filePath = path.join(
    process.cwd(),
    "sample-data",
    "initial-shifts.csv",
  );
  const contents = await readFile(filePath, "utf8");
  const [, ...lines] = contents.trim().split(/\r?\n/);

  return lines.filter(Boolean).map((line, i) => {
    const [shiftDate, totalEarned, hoursWorked, hourlyRate, dayName] =
      line.split(",");
    const meta = SAMPLE_ROW_META[i % SAMPLE_ROW_META.length];

    return {
      id: shiftDate,
      shiftDate,
      inputMode: "hours",
      startTime: null,
      endTime: null,
      totalEarned: Number(totalEarned),
      hoursWorked: Number(hoursWorked),
      hourlyRate: Number(hourlyRate),
      dayName,
      cashTips: 0,
      cardTips: 0,
      basePay: 0,
      otherIncome: Number(totalEarned),
      salesAmount: null,
      tipPct: null,
      location: meta.location,
      role: meta.role,
      shiftType: meta.shiftType,
      notes: `Imported from starter sample (${dayName}, ${hourlyRate}/hr).`,
    };
  });
}

export async function getSampleShiftRows() {
  return readRows();
}

export async function getSampleShiftSnapshot() {
  return buildShiftSnapshot(await readRows());
}

export async function getSampleDashboardSnapshot() {
  return buildDashboardSnapshot(await readRows());
}

export async function getSampleShiftById(id: string) {
  const rows = await readRows();

  return rows.find((row) => row.id === id) ?? null;
}
