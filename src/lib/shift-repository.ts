import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  addDays,
  subDays,
} from "date-fns";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import { getSampleShiftById, getSampleShiftRows } from "@/lib/sample-data";
import {
  buildDashboardSnapshot,
  buildShiftSnapshot,
  excludeOutlierRows,
  type DashboardSnapshotOptions,
  type DashboardSnapshot,
  type WeekStartAnchor,
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
  preset?: "all" | "week" | "month" | "custom" | "pay";
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
  shiftType?: string;
  payPeriodSettings?: {
    type: "weekly" | "biweekly";
    anchor: string; // day name e.g. "monday"
  };
};

type NormalizedShiftListFilters = {
  preset: "all" | "week" | "month" | "custom" | "pay";
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  role: string | null;
  shiftType: string | null;
  payPeriodSettings?: ShiftListFilters["payPeriodSettings"];
};

function normalizeFilters(
  filters?: ShiftListFilters,
): NormalizedShiftListFilters {
  const preset =
    filters?.preset === "week" ||
    filters?.preset === "month" ||
    filters?.preset === "custom" ||
    filters?.preset === "pay"
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
    shiftType: normalizeText(filters?.shiftType),
    payPeriodSettings: filters?.payPeriodSettings,
  };
}

const dayNameToWeekStartsOn: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function resolvePayPeriodRange(
  settings?: ShiftListFilters["payPeriodSettings"],
) {
  const anchor = settings?.anchor ?? "monday";
  const type = settings?.type ?? "weekly";
  const weekStartsOn = dayNameToWeekStartsOn[anchor] ?? 1;
  const now = new Date();
  const periodStart = startOfWeek(now, { weekStartsOn });
  const periodEnd =
    type === "biweekly"
      ? subDays(addDays(periodStart, 14), 1)
      : subDays(addDays(periodStart, 7), 1);
  return {
    startDate: format(periodStart, "yyyy-MM-dd"),
    endDate: format(periodEnd, "yyyy-MM-dd"),
  };
}

function getWeekStartsOnFromSettings(
  settings?: ShiftListFilters["payPeriodSettings"],
): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const anchor = settings?.anchor?.toLowerCase() ?? "monday";
  return dayNameToWeekStartsOn[anchor] ?? 1;
}

function resolveDateRange(filters: NormalizedShiftListFilters) {
  if (filters.preset === "week") {
    const now = new Date();
    const weekStartsOn = getWeekStartsOnFromSettings(filters.payPeriodSettings);

    return {
      startDate: format(startOfWeek(now, { weekStartsOn }), "yyyy-MM-dd"),
      endDate: format(endOfWeek(now, { weekStartsOn }), "yyyy-MM-dd"),
    };
  }

  if (filters.preset === "month") {
    const now = new Date();

    return {
      startDate: format(startOfMonth(now), "yyyy-MM-dd"),
      endDate: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }

  if (filters.preset === "pay") {
    return resolvePayPeriodRange(filters.payPeriodSettings);
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
  const shiftType = normalized.shiftType?.toLowerCase() ?? null;

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

    if (shiftType) {
      const rowShiftType = row.shiftType?.toLowerCase() ?? "";

      if (rowShiftType !== shiftType) {
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
  salesAmount: { toString(): string } | null;
  location: string | null;
  role: string | null;
  shiftType: string | null;
  notes: string | null;
}): ShiftRecord {
  const shiftDate = formatUtcDateToDateOnly(shift.shiftDate);
  const hoursWorked = decimalToNumber(shift.hoursWorked);
  const cashTips = decimalToNumber(shift.cashTips);
  const cardTips = decimalToNumber(shift.cardTips);
  const basePay = decimalToNumber(shift.basePay);
  const otherIncome = decimalToNumber(shift.otherIncome);
  const salesAmount = shift.salesAmount
    ? decimalToNumber(shift.salesAmount)
    : null;
  const totalEarned = Number(
    (basePay * hoursWorked + cashTips + cardTips + otherIncome).toFixed(2),
  );
  const totalTips = cashTips + cardTips;
  const tipPct =
    salesAmount && salesAmount > 0
      ? Number(((totalTips / salesAmount) * 100).toFixed(2))
      : null;

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
    salesAmount,
    tipPct,
    location: shift.location,
    role: shift.role,
    shiftType: shift.shiftType,
    notes: shift.notes,
  };
}

function buildPersistenceData(
  values: ShiftFormValues,
  options?: { includeShiftType?: boolean; includeSalesAmount?: boolean },
) {
  const validated = shiftFormSchema.parse(values);
  const preview = calculateShiftPreview(validated);
  const includeShiftType = options?.includeShiftType ?? true;
  const includeSalesAmount = options?.includeSalesAmount ?? true;

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
    salesAmount: includeSalesAmount
      ? validated.salesAmount.trim() || null
      : null,
    location: validated.location.trim() || null,
    role: validated.role.trim() || null,
    shiftType: includeShiftType ? validated.shiftType.trim() || null : null,
    notes: validated.notes.trim() || null,
  };
}

function isClientFieldMismatchError(error: unknown, fields: string[]) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const hasFieldMatch = fields.some((field) =>
    message.includes(field.toLowerCase()),
  );

  if (!hasFieldMatch) {
    return false;
  }

  return (
    message.includes("unknown argument") ||
    message.includes("unknown field") ||
    message.includes("did you mean")
  );
}

function isPersistenceFieldMismatchError(error: unknown) {
  return isClientFieldMismatchError(error, ["shifttype", "salesamount"]);
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
    shiftType?: {
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

  if (normalized.shiftType) {
    where.shiftType = {
      equals: normalized.shiftType,
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
  weekStartAnchor: WeekStartAnchor = "monday",
  options?: DashboardSnapshotOptions,
): Promise<DashboardSnapshot> {
  const [filteredRows, allRows] = await Promise.all([
    listShiftRecords(filters),
    listShiftRecords(),
  ]);
  return buildDashboardSnapshot(
    filteredRows,
    allRows,
    weekStartAnchor,
    options,
  );
}

export type EarningsSeries = DashboardSnapshot["earningsSeries"];

export async function getPreviousPeriodSeries(
  filters?: ShiftListFilters,
  options?: DashboardSnapshotOptions,
): Promise<EarningsSeries> {
  const normalizedPreset = filters?.preset ?? "all";
  if (normalizedPreset === "all" || normalizedPreset === "custom") {
    return [];
  }

  const now = new Date();
  let prevStartDate: string | null = null;
  let prevEndDate: string | null = null;

  if (normalizedPreset === "week") {
    const weekStartsOn = getWeekStartsOnFromSettings(
      filters?.payPeriodSettings,
    );
    const thisWeekStart = startOfWeek(now, { weekStartsOn });
    const prevStart = startOfWeek(
      new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      { weekStartsOn },
    );
    const prevEnd = new Date(thisWeekStart.getTime() - 1);
    prevStartDate = format(prevStart, "yyyy-MM-dd");
    prevEndDate = format(prevEnd, "yyyy-MM-dd");
  } else if (normalizedPreset === "month") {
    const prevMonthStart = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const prevMonthEnd = endOfMonth(prevMonthStart);
    prevStartDate = format(prevMonthStart, "yyyy-MM-dd");
    prevEndDate = format(prevMonthEnd, "yyyy-MM-dd");
  } else if (normalizedPreset === "pay") {
    const currentRange = resolvePayPeriodRange(filters?.payPeriodSettings);
    if (!currentRange.startDate) return [];
    const currentStart = parseISO(currentRange.startDate);
    const periodDays = filters?.payPeriodSettings?.type === "biweekly" ? 14 : 7;
    const prevStart = new Date(
      currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    const prevEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    prevStartDate = format(prevStart, "yyyy-MM-dd");
    prevEndDate = format(prevEnd, "yyyy-MM-dd");
  }

  if (!prevStartDate || !prevEndDate) return [];

  const prevRowsRaw = await listShiftRecords({
    preset: "custom",
    startDate: prevStartDate,
    endDate: prevEndDate,
    location: filters?.location,
    role: filters?.role,
    shiftType: filters?.shiftType,
  });
  const prevRows = options?.excludeOutliers
    ? excludeOutlierRows(prevRowsRaw, options.outlierIqrMultiplier)
    : prevRowsRaw;

  return [...prevRows]
    .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate))
    .map((row, i) => ({
      label: `P${i + 1}`,
      weekday: row.dayName,
      earned: row.totalEarned,
      hourlyRate: row.hourlyRate,
      location: row.location,
      role: row.role,
      shiftType: row.shiftType,
      isAnomaly: false,
      anomalyReasons: [],
    }));
}

export type PreviousPeriodTotals = {
  totalEarned: number;
  totalHours: number;
  weightedAverageHourlyRate: number;
  label: string;
};

export async function getPreviousPeriodTotals(
  filters?: ShiftListFilters,
  options?: DashboardSnapshotOptions,
): Promise<PreviousPeriodTotals | null> {
  const normalizedPreset = filters?.preset ?? "all";
  if (
    normalizedPreset === "all" ||
    normalizedPreset === "custom" ||
    !isDatabaseConfigured()
  ) {
    return null;
  }

  const now = new Date();
  let prevStartDate: string | null = null;
  let prevEndDate: string | null = null;
  let label = "vs previous period";

  if (normalizedPreset === "week") {
    const weekStartsOn = getWeekStartsOnFromSettings(
      filters?.payPeriodSettings,
    );
    const thisWeekStart = startOfWeek(now, { weekStartsOn });
    const prevStart = startOfWeek(
      new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      { weekStartsOn },
    );
    const prevEnd = new Date(thisWeekStart.getTime() - 1);
    prevStartDate = format(prevStart, "yyyy-MM-dd");
    prevEndDate = format(prevEnd, "yyyy-MM-dd");
    label = "vs last week";
  } else if (normalizedPreset === "month") {
    const prevMonthStart = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const prevMonthEnd = endOfMonth(prevMonthStart);
    prevStartDate = format(prevMonthStart, "yyyy-MM-dd");
    prevEndDate = format(prevMonthEnd, "yyyy-MM-dd");
    label = "vs last month";
  } else if (normalizedPreset === "pay") {
    const currentRange = resolvePayPeriodRange(filters?.payPeriodSettings);
    if (!currentRange.startDate) return null;
    const currentStart = parseISO(currentRange.startDate);
    const periodDays = filters?.payPeriodSettings?.type === "biweekly" ? 14 : 7;
    const prevStart = new Date(
      currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    const prevEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    prevStartDate = format(prevStart, "yyyy-MM-dd");
    prevEndDate = format(prevEnd, "yyyy-MM-dd");
    label = "vs previous pay period";
  }

  if (!prevStartDate || !prevEndDate) return null;

  const prevRowsRaw = await listShiftRecords({
    preset: "custom",
    startDate: prevStartDate,
    endDate: prevEndDate,
    location: filters?.location,
    role: filters?.role,
    shiftType: filters?.shiftType,
  });
  const prevRows = options?.excludeOutliers
    ? excludeOutlierRows(prevRowsRaw, options.outlierIqrMultiplier)
    : prevRowsRaw;

  const totalEarned = Number(
    prevRows.reduce((sum, r) => sum + r.totalEarned, 0).toFixed(2),
  );
  const totalHours = Number(
    prevRows.reduce((sum, r) => sum + r.hoursWorked, 0).toFixed(2),
  );
  const weightedAverageHourlyRate = Number(
    (totalHours > 0 ? totalEarned / totalHours : 0).toFixed(2),
  );

  return { totalEarned, totalHours, weightedAverageHourlyRate, label };
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
  let created;

  try {
    created = await prisma.shift.create({
      data: {
        userId: userId ?? "",
        ...buildPersistenceData(values),
      },
    });
  } catch (error) {
    if (!isPersistenceFieldMismatchError(error)) {
      throw error;
    }

    try {
      created = await prisma.shift.create({
        data: {
          userId: userId ?? "",
          ...buildPersistenceData(values, {
            includeShiftType: !isClientFieldMismatchError(error, ["shifttype"]),
            includeSalesAmount: !isClientFieldMismatchError(error, [
              "salesamount",
            ]),
          }),
        },
      });
    } catch (secondError) {
      if (!isPersistenceFieldMismatchError(secondError)) {
        throw secondError;
      }

      created = await prisma.shift.create({
        data: {
          userId: userId ?? "",
          ...buildPersistenceData(values, {
            includeShiftType: false,
            includeSalesAmount: false,
          }),
        },
      });
    }
  }

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
  let created;

  try {
    created = await prisma.$transaction(
      values.map((value) =>
        prisma.shift.create({
          data: {
            userId: userId ?? "",
            ...buildPersistenceData(value),
          },
        }),
      ),
    );
  } catch (error) {
    if (!isPersistenceFieldMismatchError(error)) {
      throw error;
    }

    try {
      created = await prisma.$transaction(
        values.map((value) =>
          prisma.shift.create({
            data: {
              userId: userId ?? "",
              ...buildPersistenceData(value, {
                includeShiftType: !isClientFieldMismatchError(error, [
                  "shifttype",
                ]),
                includeSalesAmount: !isClientFieldMismatchError(error, [
                  "salesamount",
                ]),
              }),
            },
          }),
        ),
      );
    } catch (secondError) {
      if (!isPersistenceFieldMismatchError(secondError)) {
        throw secondError;
      }

      created = await prisma.$transaction(
        values.map((value) =>
          prisma.shift.create({
            data: {
              userId: userId ?? "",
              ...buildPersistenceData(value, {
                includeShiftType: false,
                includeSalesAmount: false,
              }),
            },
          }),
        ),
      );
    }
  }

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

  let updated;

  try {
    updated = await prisma.shift.update({
      where: { id: existing.id },
      data: buildPersistenceData(values),
    });
  } catch (error) {
    if (!isPersistenceFieldMismatchError(error)) {
      throw error;
    }

    try {
      updated = await prisma.shift.update({
        where: { id: existing.id },
        data: buildPersistenceData(values, {
          includeShiftType: !isClientFieldMismatchError(error, ["shifttype"]),
          includeSalesAmount: !isClientFieldMismatchError(error, [
            "salesamount",
          ]),
        }),
      });
    } catch (secondError) {
      if (!isPersistenceFieldMismatchError(secondError)) {
        throw secondError;
      }

      updated = await prisma.shift.update({
        where: { id: existing.id },
        data: buildPersistenceData(values, {
          includeShiftType: false,
          includeSalesAmount: false,
        }),
      });
    }
  }

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

export async function getDistinctLocationsAndRoles(): Promise<{
  locations: string[];
  roles: string[];
  shiftTypes: string[];
}> {
  if (!isDatabaseConfigured()) {
    return { locations: [], roles: [], shiftTypes: [] };
  }

  const prisma = getPrismaClient();
  const { userId } = await getCurrentUserContext();

  const [locationRows, roleRows] = await Promise.all([
    prisma.shift.findMany({
      where: { userId: userId ?? undefined, location: { not: null } },
      select: { location: true },
      distinct: ["location"],
      orderBy: { location: "asc" },
    }),
    prisma.shift.findMany({
      where: { userId: userId ?? undefined, role: { not: null } },
      select: { role: true },
      distinct: ["role"],
      orderBy: { role: "asc" },
    }),
  ]);

  let shiftTypeRows: Array<{ shiftType: string | null }> = [];

  try {
    shiftTypeRows = await prisma.shift.findMany({
      where: { userId: userId ?? undefined, shiftType: { not: null } },
      select: { shiftType: true },
      distinct: ["shiftType"],
      orderBy: { shiftType: "asc" },
    });
  } catch (error) {
    // Gracefully handle a stale generated Prisma client that doesn't yet know
    // about shiftType. Location/role filters still work while the app restarts.
    if (
      !(error instanceof Error) ||
      !error.message.toLowerCase().includes("shifttype")
    ) {
      throw error;
    }
  }

  return {
    locations: locationRows.map((r) => r.location as string),
    roles: roleRows.map((r) => r.role as string),
    shiftTypes: shiftTypeRows.map((r) => r.shiftType as string),
  };
}
