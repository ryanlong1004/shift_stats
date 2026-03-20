import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import { getSampleShiftById, getSampleShiftRows } from "@/lib/sample-data";
import {
  buildDashboardSnapshot,
  buildShiftSnapshot,
  type DashboardSnapshot,
  type ShiftRecord,
} from "@/lib/shift-records";
import {
  calculateShiftPreview,
  shiftFormSchema,
  type ShiftFormValues,
} from "@/lib/shift-form";
import { formatUtcDateToDateOnly, parseDateOnlyToUtc } from "@/lib/date-only";

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type ShiftListFilters = {
  preset?: "all" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
};

type NormalizedShiftListFilters = {
  preset: "all" | "week" | "month" | "custom";
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  role: string | null;
};

function normalizeFilters(
  filters?: ShiftListFilters,
): NormalizedShiftListFilters {
  const preset =
    filters?.preset === "week" ||
    filters?.preset === "month" ||
    filters?.preset === "custom"
      ? filters.preset
      : "all";
  const normalizeDate = (value: string | undefined) => {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
  };
  const normalizeText = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    preset,
    startDate: normalizeDate(filters?.startDate),
    endDate: normalizeDate(filters?.endDate),
    location: normalizeText(filters?.location),
    role: normalizeText(filters?.role),
  };
}

function resolveDateRange(filters: NormalizedShiftListFilters) {
  if (filters.preset === "week") {
    const now = new Date();

    return {
      startDate: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      endDate: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }

  if (filters.preset === "month") {
    const now = new Date();

    return {
      startDate: format(startOfMonth(now), "yyyy-MM-dd"),
      endDate: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }

  if (filters.preset === "custom") {
    return {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  return {
    startDate: null,
    endDate: null,
  };
}

function applyFilters(rows: ShiftRecord[], filters?: ShiftListFilters) {
  const normalized = normalizeFilters(filters);
  const { startDate, endDate } = resolveDateRange(normalized);
  const location = normalized.location?.toLowerCase() ?? null;
  const role = normalized.role?.toLowerCase() ?? null;

  return rows.filter((row) => {
    if (startDate && row.shiftDate < startDate) {
      return false;
    }

    if (endDate && row.shiftDate > endDate) {
      return false;
    }

    if (location) {
      const rowLocation = row.location?.toLowerCase() ?? "";

      if (rowLocation !== location) {
        return false;
      }
    }

    if (role) {
      const rowRole = row.role?.toLowerCase() ?? "";

      if (rowRole !== role) {
        return false;
      }
    }

    return true;
  });
}

function decimalToNumber(
  value: { toString(): string } | number | null | undefined,
) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(value.toString());
}

async function getCurrentUserContext() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const name = session?.user?.name ?? "Shiftstats Demo";

  if (!email) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isDatabaseConfigured()) {
    return { email, userId: null };
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
    },
    create: {
      email,
      name,
      userSettings: {
        create: {
          currencyCode: "USD",
          timezone: "America/Chicago",
          trackBasePay: true,
          splitTipsByType: true,
        },
      },
    },
  });

  return { email, userId: user.id };
}

function mapDatabaseShift(shift: {
  id: string;
  shiftDate: Date;
  inputMode: "hours" | "timeRange";
  startTime: string | null;
  endTime: string | null;
  hoursWorked: { toString(): string };
  cashTips: { toString(): string };
  cardTips: { toString(): string };
  basePay: { toString(): string };
  otherIncome: { toString(): string };
  totalEarned: { toString(): string };
  location: string | null;
  role: string | null;
  notes: string | null;
}): ShiftRecord {
  const shiftDate = formatUtcDateToDateOnly(shift.shiftDate);
  const hoursWorked = decimalToNumber(shift.hoursWorked);
  const cashTips = decimalToNumber(shift.cashTips);
  const cardTips = decimalToNumber(shift.cardTips);
  const basePay = decimalToNumber(shift.basePay);
  const otherIncome = decimalToNumber(shift.otherIncome);
  const totalEarned = Number(
    (basePay * hoursWorked + cashTips + cardTips + otherIncome).toFixed(2),
  );

  return {
    id: shift.id,
    shiftDate,
    inputMode: shift.inputMode,
    startTime: shift.startTime,
    endTime: shift.endTime,
    totalEarned,
    hoursWorked,
    hourlyRate:
      hoursWorked > 0 ? Number((totalEarned / hoursWorked).toFixed(2)) : 0,
    dayName: format(parseISO(shiftDate), "EEEE"),
    cashTips,
    cardTips,
    basePay,
    otherIncome,
    location: shift.location,
    role: shift.role,
    notes: shift.notes,
  };
}

function buildPersistenceData(values: ShiftFormValues) {
  const validated = shiftFormSchema.parse(values);
  const preview = calculateShiftPreview(validated);

  return {
    shiftDate: parseDateOnlyToUtc(validated.shiftDate),
    inputMode: validated.inputMode,
    startTime:
      validated.inputMode === "timeRange" && validated.startTime
        ? validated.startTime
        : null,
    endTime:
      validated.inputMode === "timeRange" && validated.endTime
        ? validated.endTime
        : null,
    hoursWorked: preview.hoursWorked.toFixed(2),
    cashTips: (validated.cashTips.trim() || "0").toString(),
    cardTips: (validated.cardTips.trim() || "0").toString(),
    basePay: (validated.basePay.trim() || "0").toString(),
    otherIncome: (validated.otherIncome.trim() || "0").toString(),
    totalEarned: preview.totalEarned.toFixed(2),
    location: validated.location.trim() || null,
    role: validated.role.trim() || null,
    notes: validated.notes.trim() || null,
  };
}

export async function listShiftRecords(filters?: ShiftListFilters) {
  await getCurrentUserContext();

  const normalized = normalizeFilters(filters);
  const { startDate, endDate } = resolveDateRange(normalized);

  if (!isDatabaseConfigured()) {
    return applyFilters(await getSampleShiftRows(), filters);
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const where: {
    userId?: string;
    shiftDate?: {
      gte?: Date;
      lte?: Date;
    };
    location?: {
      equals: string;
      mode: "insensitive";
    };
    role?: {
      equals: string;
      mode: "insensitive";
    };
  } = {
    userId: userId ?? undefined,
  };

  if (startDate || endDate) {
    where.shiftDate = {};

    if (startDate) {
      where.shiftDate.gte = parseDateOnlyToUtc(startDate);
    }

    if (endDate) {
      const endDateUtc = parseDateOnlyToUtc(endDate);
      endDateUtc.setUTCHours(23, 59, 59, 999);
      where.shiftDate.lte = endDateUtc;
    }
  }

  if (normalized.location) {
    where.location = {
      equals: normalized.location,
      mode: "insensitive",
    };
  }

  if (normalized.role) {
    where.role = {
      equals: normalized.role,
      mode: "insensitive",
    };
  }

  const rows = await prisma.shift.findMany({
    where,
    orderBy: [{ shiftDate: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(mapDatabaseShift);
}

export async function getShiftRecordById(id: string) {
  await getCurrentUserContext();

  if (!isDatabaseConfigured()) {
    return getSampleShiftById(id);
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const shift = await prisma.shift.findFirst({
    where: { id, userId: userId ?? undefined },
  });

  return shift ? mapDatabaseShift(shift) : null;
}

export async function getDashboardSnapshot(
  filters?: ShiftListFilters,
): Promise<DashboardSnapshot> {
  const rows = await listShiftRecords(filters);
  return buildDashboardSnapshot(rows);
}

export async function getShiftSnapshot(filters?: ShiftListFilters) {
  const rows = await listShiftRecords(filters);
  return buildShiftSnapshot(rows);
}

export async function createShift(values: ShiftFormValues) {
  await getCurrentUserContext();

  if (!isDatabaseConfigured()) {
    return {
      ok: false as const,
      status: 503,
      message:
        "DATABASE_URL is not configured yet. Write actions are disabled while the app is in sample-data mode.",
    };
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const created = await prisma.shift.create({
    data: {
      userId: userId ?? "",
      ...buildPersistenceData(values),
    },
  });

  return {
    ok: true as const,
    shift: mapDatabaseShift(created),
  };
}

export async function importShifts(values: ShiftFormValues[]) {
  await getCurrentUserContext();

  if (!isDatabaseConfigured()) {
    return {
      ok: false as const,
      status: 503,
      message:
        "DATABASE_URL is not configured yet. Import actions are disabled while the app is in sample-data mode.",
    };
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const created = await prisma.$transaction(
    values.map((value) =>
      prisma.shift.create({
        data: {
          userId: userId ?? "",
          ...buildPersistenceData(value),
        },
      }),
    ),
  );

  return {
    ok: true as const,
    count: created.length,
    shifts: created.map(mapDatabaseShift),
  };
}

export async function updateShift(id: string, values: ShiftFormValues) {
  await getCurrentUserContext();

  if (!isDatabaseConfigured()) {
    return {
      ok: false as const,
      status: 503,
      message:
        "DATABASE_URL is not configured yet. Write actions are disabled while the app is in sample-data mode.",
    };
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const existing = await prisma.shift.findFirst({
    where: { id, userId: userId ?? undefined },
  });

  if (!existing) {
    return {
      ok: false as const,
      status: 404,
      message: "Shift not found.",
    };
  }

  const updated = await prisma.shift.update({
    where: { id: existing.id },
    data: buildPersistenceData(values),
  });

  return {
    ok: true as const,
    shift: mapDatabaseShift(updated),
  };
}

export async function deleteShift(id: string) {
  await getCurrentUserContext();

  if (!isDatabaseConfigured()) {
    return {
      ok: false as const,
      status: 503,
      message:
        "DATABASE_URL is not configured yet. Delete actions are disabled while the app is in sample-data mode.",
    };
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();
  const existing = await prisma.shift.findFirst({
    where: { id, userId: userId ?? undefined },
  });

  if (!existing) {
    return {
      ok: false as const,
      status: 404,
      message: "Shift not found.",
    };
  }

  await prisma.shift.delete({ where: { id: existing.id } });

  return {
    ok: true as const,
  };
}
