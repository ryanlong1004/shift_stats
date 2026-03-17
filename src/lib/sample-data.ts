import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildDashboardSnapshot,
  buildShiftSnapshot,
  type ShiftRecord,
} from "@/lib/shift-records";

async function readRows(): Promise<ShiftRecord[]> {
  const filePath = path.join(
    process.cwd(),
    "sample-data",
    "initial-shifts.csv",
  );
  const contents = await readFile(filePath, "utf8");
  const [, ...lines] = contents.trim().split(/\r?\n/);

  return lines.filter(Boolean).map((line) => {
    const [shiftDate, totalEarned, hoursWorked, hourlyRate, dayName] =
      line.split(",");

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
      location: null,
      role: null,
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
