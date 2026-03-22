import {
  endOfMonth,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type ShiftRecord = {
  id: string;
  shiftDate: string;
  inputMode: "hours" | "timeRange";
  startTime: string | null;
  endTime: string | null;
  totalEarned: number;
  hoursWorked: number;
  hourlyRate: number;
  dayName: string;
  cashTips: number;
  cardTips: number;
  basePay: number;
  otherIncome: number;
  salesAmount: number | null;
  tipPct: number | null; // (totalTips / salesAmount) * 100 when salesAmount is present
  location: string | null;
  role: string | null;
  shiftType: string | null;
  notes: string | null;
};

export type ShiftSnapshot = {
  rows: ShiftRecord[];
  totalShifts: number;
  totalEarned: number;
  totalHours: number;
  averageShiftEarnings: number;
  weightedAverageHourlyRate: number;
  bestWeekday: string;
  bestShift: ShiftRecord | null;
};

export type DashboardSnapshot = ShiftSnapshot & {
  weekTotalEarned: number;
  monthTotalEarned: number;
  prevWeekTotalEarned: number;
  prevMonthTotalEarned: number;
  recentShifts: ShiftRecord[];
  earningsSeries: Array<{
    label: string;
    weekday: string;
    earned: number;
    hourlyRate: number;
  }>;
  weekdaySeries: Array<{ label: string; hourlyRate: number }>;
  insights: string[];
  bestWeekdayRate: number;
  averages: {
    perShift: { earned: number; hours: number };
    perWeek: { earned: number; hours: number };
    perMonth: { earned: number; hours: number };
  };
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function getWeekdayFromShiftDate(shiftDate: string) {
  return format(parseISO(shiftDate), "EEEE");
}

export function buildShiftSnapshot(rows: ShiftRecord[]): ShiftSnapshot {
  if (rows.length === 0) {
    return {
      rows: [],
      totalShifts: 0,
      totalEarned: 0,
      totalHours: 0,
      averageShiftEarnings: 0,
      weightedAverageHourlyRate: 0,
      bestWeekday: "N/A",
      bestShift: null,
    };
  }

  const totalEarned = rows.reduce((sum, row) => sum + row.totalEarned, 0);
  const totalHours = rows.reduce((sum, row) => sum + row.hoursWorked, 0);
  const averageShiftEarnings = totalEarned / rows.length;
  const weightedAverageHourlyRate =
    totalHours > 0 ? totalEarned / totalHours : 0;
  const bestShift = rows.reduce((best, row) => {
    if (!best || row.totalEarned > best.totalEarned) {
      return row;
    }

    return best;
  }, rows[0] ?? null);

  const weekdayMap = new Map<string, { earned: number; hours: number }>();

  for (const row of rows) {
    const weekday = getWeekdayFromShiftDate(row.shiftDate);
    const current = weekdayMap.get(weekday) ?? { earned: 0, hours: 0 };
    current.earned += row.totalEarned;
    current.hours += row.hoursWorked;
    weekdayMap.set(weekday, current);
  }

  const bestWeekday = Array.from(weekdayMap.entries()).reduce(
    (best, [dayName, totals]) => {
      const rate = totals.hours > 0 ? totals.earned / totals.hours : 0;

      if (!best || rate > best.rate) {
        return { dayName, rate };
      }

      return best;
    },
    undefined as { dayName: string; rate: number } | undefined,
  )?.dayName;

  return {
    rows,
    totalShifts: rows.length,
    totalEarned: round(totalEarned),
    totalHours: round(totalHours),
    averageShiftEarnings: round(averageShiftEarnings),
    weightedAverageHourlyRate: round(weightedAverageHourlyRate),
    bestWeekday: bestWeekday ?? "N/A",
    bestShift,
  };
}

export function buildDashboardSnapshot(
  rows: ShiftRecord[],
  allRows?: ShiftRecord[],
): DashboardSnapshot {
  const base = buildShiftSnapshot(rows);

  if (rows.length === 0) {
    return {
      ...base,
      weekTotalEarned: 0,
      monthTotalEarned: 0,
      prevWeekTotalEarned: 0,
      prevMonthTotalEarned: 0,
      recentShifts: [],
      earningsSeries: [],
      weekdaySeries: [],
      insights: [
        "No shifts have been recorded yet.",
        "Add your first shift to unlock weekly and monthly comparisons.",
        "Once data exists, this page will calculate hourly trends and best weekdays.",
      ],
      bestWeekdayRate: 0,
      averages: {
        perShift: { earned: 0, hours: 0 },
        perWeek: { earned: 0, hours: 0 },
        perMonth: { earned: 0, hours: 0 },
      },
    };
  }

  const sortedRows = [...rows].sort((left, right) =>
    right.shiftDate.localeCompare(left.shiftDate),
  );

  // Period totals (week/month) are always computed from unfiltered allRows so
  // they don't change when the user switches the period chip.
  const periodRows = allRows
    ? [...allRows].sort((l, r) => r.shiftDate.localeCompare(l.shiftDate))
    : sortedRows;

  const referenceDate = parseISO(sortedRows[0].shiftDate);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  const weekRows = periodRows.filter((row) =>
    isWithinInterval(parseISO(row.shiftDate), {
      start: weekStart,
      end: referenceDate,
    }),
  );
  const monthRows = periodRows.filter(
    (row) =>
      isSameMonth(parseISO(row.shiftDate), referenceDate) &&
      isWithinInterval(parseISO(row.shiftDate), {
        start: monthStart,
        end: monthEnd,
      }),
  );

  const weekTotalEarned = round(
    weekRows.reduce((sum, row) => sum + row.totalEarned, 0),
  );
  const monthTotalEarned = round(
    monthRows.reduce((sum, row) => sum + row.totalEarned, 0),
  );

  // Previous week
  const prevWeekStart = startOfWeek(subWeeks(weekStart, 1), {
    weekStartsOn: 1,
  });
  const prevWeekEnd = subDays(weekStart, 1);
  const prevWeekRows = periodRows.filter((row) =>
    isWithinInterval(parseISO(row.shiftDate), {
      start: prevWeekStart,
      end: prevWeekEnd,
    }),
  );
  const prevWeekTotalEarned = round(
    prevWeekRows.reduce((sum, row) => sum + row.totalEarned, 0),
  );

  // Previous month
  const prevMonthRef = subMonths(referenceDate, 1);
  const prevMonthRows = periodRows.filter((row) =>
    isSameMonth(parseISO(row.shiftDate), prevMonthRef),
  );
  const prevMonthTotalEarned = round(
    prevMonthRows.reduce((sum, row) => sum + row.totalEarned, 0),
  );

  // Averages across shifts, weeks, and months
  const distinctWeeks = new Set(
    sortedRows.map((row) =>
      format(
        startOfWeek(parseISO(row.shiftDate), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      ),
    ),
  );
  const numWeeks = Math.max(distinctWeeks.size, 1);
  const distinctMonths = new Set(
    sortedRows.map((row) => format(parseISO(row.shiftDate), "yyyy-MM")),
  );
  const numMonths = Math.max(distinctMonths.size, 1);
  const averages = {
    perShift: {
      earned: round(base.totalEarned / base.totalShifts),
      hours: round(base.totalHours / base.totalShifts),
    },
    perWeek: {
      earned: round(base.totalEarned / numWeeks),
      hours: round(base.totalHours / numWeeks),
    },
    perMonth: {
      earned: round(base.totalEarned / numMonths),
      hours: round(base.totalHours / numMonths),
    },
  };

  const weekdayMap = new Map<string, { earned: number; hours: number }>();

  for (const row of sortedRows) {
    const weekday = getWeekdayFromShiftDate(row.shiftDate);
    const current = weekdayMap.get(weekday) ?? { earned: 0, hours: 0 };
    current.earned += row.totalEarned;
    current.hours += row.hoursWorked;
    weekdayMap.set(weekday, current);
  }

  const weekdaySeries = Array.from(weekdayMap.entries()).map(
    ([label, totals]) => ({
      label: label.slice(0, 3),
      hourlyRate: round(totals.hours > 0 ? totals.earned / totals.hours : 0),
    }),
  );

  // Find best weekday rate from the weekdaySeries to ensure consistency
  const bestWeekdayEntry = weekdaySeries.reduce(
    (best, current) => {
      if (!best || current.hourlyRate > best.hourlyRate) {
        return { label: current.label, hourlyRate: current.hourlyRate };
      }
      return best;
    },
    undefined as { label: string; hourlyRate: number } | undefined,
  );

  const insights = [
    `Average shift earnings are ${round(base.averageShiftEarnings).toFixed(2)} dollars across the current data.`,
    `${bestWeekdayEntry?.label ?? "N/A"} is the strongest weekday at ${(bestWeekdayEntry?.hourlyRate ?? 0).toFixed(2)} dollars per hour.`,
    base.bestShift
      ? `The top shift is ${base.bestShift.shiftDate} at ${base.bestShift.totalEarned.toFixed(2)} total earned over ${base.bestShift.hoursWorked.toFixed(2)} hours.`
      : "No best shift is available until at least one shift exists.",
  ];

  return {
    ...base,
    weekTotalEarned,
    monthTotalEarned,
    prevWeekTotalEarned,
    prevMonthTotalEarned,
    recentShifts: sortedRows.slice(0, 5),
    earningsSeries: [...sortedRows].reverse().map((row) => ({
      label: format(parseISO(row.shiftDate), "MMM d"),
      weekday: getWeekdayFromShiftDate(row.shiftDate),
      earned: row.totalEarned,
      hourlyRate: row.hourlyRate,
    })),
    weekdaySeries,
    insights,
    bestWeekdayRate: bestWeekdayEntry?.hourlyRate ?? 0,
    averages,
  };
}
