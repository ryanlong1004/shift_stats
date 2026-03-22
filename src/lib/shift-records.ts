import {
  differenceInCalendarDays,
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
    location: string | null;
    role: string | null;
    shiftType: string | null;
    isAnomaly: boolean;
    anomalyReasons: string[];
  }>;
  weekdaySeries: Array<{
    label: string;
    hourlyRate: number;
    location: string | null;
    role: string | null;
    shiftType: string | null;
  }>;
  insights: string[];
  bestWeekdayRate: number;
  averages: {
    perShift: { earned: number; hours: number };
    perWeek: { earned: number; hours: number };
    perMonth: { earned: number; hours: number };
  };
  profitability: {
    byRole: ProfitabilityBreakdownRow[];
    byLocation: ProfitabilityBreakdownRow[];
    byShiftType: ProfitabilityBreakdownRow[];
  };
  outliers: OutlierDiagnostics;
  baselines: RollingBaselineDiagnostics;
  forecast: ForecastDiagnostics;
};

export type ForecastDiagnostics = {
  horizonDays: number;
  meanDailyEarned: number;
  dailyVolatility: number;
  historyDailyEarned: number[];
  sample: {
    windowDays: number;
    activeDays: number;
    activeDayCoveragePct: number;
    shiftsInWindow: number;
  };
  confidence: {
    score: number;
    label: "Low" | "Medium" | "High";
  };
  projected: {
    low: number;
    expected: number;
    high: number;
  };
};

export type RollingBaselineWindow = {
  windowDays: number;
  shifts: number;
  totalEarned: number;
  totalHours: number;
  dailyAvgEarned: number;
  dailyAvgHours: number;
};

export type RollingBaselineDiagnostics = {
  currentPeriod: {
    shifts: number;
    spanDays: number;
    dailyAvgEarned: number;
    dailyAvgHours: number;
  };
  windows: RollingBaselineWindow[];
  varianceVs30: {
    earnedPct: number;
    hoursPct: number;
  };
};

export type ProfitabilityBreakdownRow = {
  label: string;
  shifts: number;
  totalEarned: number;
  totalHours: number;
  weightedHourlyRate: number;
  contributionPct: number;
};

export type OutlierThresholdBand = {
  lower: number;
  upper: number;
};

export type OutlierAnomalyRow = {
  id: string;
  shiftDate: string;
  totalEarned: number;
  hourlyRate: number;
  location: string | null;
  role: string | null;
  shiftType: string | null;
  reasons: string[];
};

export type OutlierDiagnostics = {
  excluded: boolean;
  totalRows: number;
  anomalyCount: number;
  anomalyPct: number;
  thresholds: {
    totalEarned: OutlierThresholdBand | null;
    hourlyRate: OutlierThresholdBand | null;
  };
  topAnomalies: OutlierAnomalyRow[];
};

export type DashboardSnapshotOptions = {
  excludeOutliers?: boolean;
  outlierIqrMultiplier?: number;
  forecastHorizonDays?: number;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function getWeekdayFromShiftDate(shiftDate: string) {
  return format(parseISO(shiftDate), "EEEE");
}

export type WeekStartAnchor =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const WEEKDAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const WEEKDAY_START_INDEX: Record<WeekStartAnchor, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function getOrderedWeekdays(weekStartAnchor: WeekStartAnchor) {
  const startIndex = WEEKDAY_START_INDEX[weekStartAnchor];
  return [
    ...WEEKDAY_ORDER.slice(startIndex),
    ...WEEKDAY_ORDER.slice(0, startIndex),
  ];
}

function getWeekStartsOn(
  weekStartAnchor: WeekStartAnchor,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return ((WEEKDAY_START_INDEX[weekStartAnchor] + 1) % 7) as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;
}

function normalizeBreakdownLabel(value: string | null) {
  return value && value.trim().length > 0 ? value.trim() : "Unspecified";
}

function buildProfitabilityBreakdown(
  rows: ShiftRecord[],
  totalEarnedAcrossRows: number,
  getLabel: (row: ShiftRecord) => string,
): ProfitabilityBreakdownRow[] {
  const grouped = new Map<
    string,
    { shifts: number; totalEarned: number; totalHours: number }
  >();

  for (const row of rows) {
    const label = getLabel(row);
    const current = grouped.get(label) ?? {
      shifts: 0,
      totalEarned: 0,
      totalHours: 0,
    };

    grouped.set(label, {
      shifts: current.shifts + 1,
      totalEarned: current.totalEarned + row.totalEarned,
      totalHours: current.totalHours + row.hoursWorked,
    });
  }

  const rowsForBreakdown = Array.from(grouped.entries()).map(
    ([label, values]) => {
      const weightedHourlyRate =
        values.totalHours > 0 ? values.totalEarned / values.totalHours : 0;

      return {
        label,
        shifts: values.shifts,
        totalEarned: round(values.totalEarned),
        totalHours: round(values.totalHours),
        weightedHourlyRate: round(weightedHourlyRate),
        contributionPct:
          totalEarnedAcrossRows > 0
            ? round((values.totalEarned / totalEarnedAcrossRows) * 100)
            : 0,
      };
    },
  );

  return rowsForBreakdown.sort((left, right) => {
    if (right.totalEarned !== left.totalEarned) {
      return right.totalEarned - left.totalEarned;
    }

    if (right.weightedHourlyRate !== left.weightedHourlyRate) {
      return right.weightedHourlyRate - left.weightedHourlyRate;
    }

    return left.label.localeCompare(right.label);
  });
}

function getPctVariance(value: number, baseline: number) {
  if (baseline <= 0) {
    return 0;
  }

  return round(((value - baseline) / baseline) * 100);
}

function getRollingWindowStats(
  rows: ShiftRecord[],
  referenceDate: Date,
  windowDays: number,
): RollingBaselineWindow {
  const startDate = subDays(referenceDate, windowDays - 1);
  const windowRows = rows.filter((row) =>
    isWithinInterval(parseISO(row.shiftDate), {
      start: startDate,
      end: referenceDate,
    }),
  );
  const totalEarned = round(
    windowRows.reduce((sum, row) => sum + row.totalEarned, 0),
  );
  const totalHours = round(
    windowRows.reduce((sum, row) => sum + row.hoursWorked, 0),
  );

  return {
    windowDays,
    shifts: windowRows.length,
    totalEarned,
    totalHours,
    dailyAvgEarned: round(totalEarned / windowDays),
    dailyAvgHours: round(totalHours / windowDays),
  };
}

function getDailyEarningsSeries(
  rows: ShiftRecord[],
  referenceDate: Date,
  windowDays: number,
) {
  const totalsByDate = new Map<string, number>();

  for (const row of rows) {
    const current = totalsByDate.get(row.shiftDate) ?? 0;
    totalsByDate.set(row.shiftDate, current + row.totalEarned);
  }

  return Array.from({ length: windowDays }, (_, index) => {
    const day = subDays(referenceDate, windowDays - 1 - index);
    const key = format(day, "yyyy-MM-dd");
    return round(totalsByDate.get(key) ?? 0);
  });
}

function getMean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getStdDev(values: number[], mean: number) {
  if (values.length < 2) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getForecastConfidence(score: number): "Low" | "Medium" | "High" {
  if (score >= 75) {
    return "High";
  }

  if (score >= 45) {
    return "Medium";
  }

  return "Low";
}

function quantile(sortedValues: number[], q: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function buildIqrBand(
  values: number[],
  iqrMultiplier: number,
): OutlierThresholdBand | null {
  if (values.length < 4) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const q1 = quantile(sortedValues, 0.25);
  const q3 = quantile(sortedValues, 0.75);
  const iqr = q3 - q1;

  if (iqr === 0) {
    return null;
  }

  const margin = iqr * iqrMultiplier;
  return {
    lower: round(q1 - margin),
    upper: round(q3 + margin),
  };
}

function getBandScore(value: number, band: OutlierThresholdBand | null) {
  if (!band) {
    return 0;
  }

  if (value < band.lower) {
    return (band.lower - value) / Math.max(Math.abs(band.lower), 1);
  }

  if (value > band.upper) {
    return (value - band.upper) / Math.max(Math.abs(band.upper), 1);
  }

  return 0;
}

function sanitizeOutlierIqrMultiplier(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1.5;
  }

  if (value < 1) {
    return 1;
  }

  if (value > 3) {
    return 3;
  }

  return round(value);
}

function sanitizeForecastHorizonDays(value: number | undefined) {
  if (value === 14 || value === 30) {
    return value;
  }

  return 7;
}

function getOutlierDiagnostics(
  rows: ShiftRecord[],
  outlierIqrMultiplier = 1.5,
): {
  diagnostics: OutlierDiagnostics;
  inlierRows: ShiftRecord[];
  anomalyReasonById: Map<string, string[]>;
} {
  const totalEarnedBand = buildIqrBand(
    rows.map((row) => row.totalEarned),
    outlierIqrMultiplier,
  );
  const hourlyRateBand = buildIqrBand(
    rows.map((row) => row.hourlyRate),
    outlierIqrMultiplier,
  );
  const anomalies: Array<{
    row: ShiftRecord;
    score: number;
    reasons: string[];
  }> = [];
  const inlierRows: ShiftRecord[] = [];
  const anomalyReasonById = new Map<string, string[]>();

  for (const row of rows) {
    const reasons: string[] = [];

    if (
      totalEarnedBand &&
      (row.totalEarned < totalEarnedBand.lower ||
        row.totalEarned > totalEarnedBand.upper)
    ) {
      reasons.push("Total earned");
    }

    if (
      hourlyRateBand &&
      (row.hourlyRate < hourlyRateBand.lower ||
        row.hourlyRate > hourlyRateBand.upper)
    ) {
      reasons.push("Hourly rate");
    }

    if (reasons.length > 0) {
      const score =
        getBandScore(row.totalEarned, totalEarnedBand) +
        getBandScore(row.hourlyRate, hourlyRateBand);

      anomalyReasonById.set(row.id, reasons);
      anomalies.push({ row, score, reasons });
      continue;
    }

    inlierRows.push(row);
  }

  const topAnomalies = [...anomalies]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.row.shiftDate.localeCompare(left.row.shiftDate);
    })
    .slice(0, 5)
    .map(({ row, reasons }) => ({
      id: row.id,
      shiftDate: row.shiftDate,
      totalEarned: row.totalEarned,
      hourlyRate: row.hourlyRate,
      location: row.location,
      role: row.role,
      shiftType: row.shiftType,
      reasons,
    }));

  return {
    diagnostics: {
      excluded: false,
      totalRows: rows.length,
      anomalyCount: anomalies.length,
      anomalyPct:
        rows.length > 0 ? round((anomalies.length / rows.length) * 100) : 0,
      thresholds: {
        totalEarned: totalEarnedBand,
        hourlyRate: hourlyRateBand,
      },
      topAnomalies,
    },
    inlierRows,
    anomalyReasonById,
  };
}

export function excludeOutlierRows(
  rows: ShiftRecord[],
  outlierIqrMultiplier?: number,
) {
  const sanitizedMultiplier =
    sanitizeOutlierIqrMultiplier(outlierIqrMultiplier);
  return getOutlierDiagnostics(rows, sanitizedMultiplier).inlierRows;
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

  const weekdayMap = new Map<string, number>();

  for (const row of rows) {
    const weekday = getWeekdayFromShiftDate(row.shiftDate);
    const currentBest = weekdayMap.get(weekday) ?? 0;
    weekdayMap.set(weekday, Math.max(currentBest, row.hourlyRate));
  }

  const bestWeekday = Array.from(weekdayMap.entries()).reduce(
    (best, [dayName, rate]) => {
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
  weekStartAnchor: WeekStartAnchor = "monday",
  options: DashboardSnapshotOptions = {},
): DashboardSnapshot {
  const outlierIqrMultiplier = sanitizeOutlierIqrMultiplier(
    options.outlierIqrMultiplier,
  );
  const forecastHorizonDays = sanitizeForecastHorizonDays(
    options.forecastHorizonDays,
  );
  const referenceDate = new Date();
  const sortedRows = [...rows].sort((left, right) =>
    right.shiftDate.localeCompare(left.shiftDate),
  );
  const {
    diagnostics: rawOutlierDiagnostics,
    inlierRows,
    anomalyReasonById,
  } = getOutlierDiagnostics(sortedRows, outlierIqrMultiplier);
  const excludeOutliers = options.excludeOutliers === true;
  const workingRows = excludeOutliers ? inlierRows : sortedRows;
  const base = buildShiftSnapshot(workingRows);

  // Period totals (week/month) are always computed from unfiltered allRows so
  // they don't change when the user switches the period chip.
  const periodRowsRaw = allRows
    ? [...allRows].sort((l, r) => r.shiftDate.localeCompare(l.shiftDate))
    : sortedRows;
  const periodRows = excludeOutliers
    ? excludeOutlierRows(periodRowsRaw, outlierIqrMultiplier)
    : periodRowsRaw;

  const weekStartsOn = getWeekStartsOn(weekStartAnchor);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn });
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
    weekStartsOn,
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
    workingRows.map((row) =>
      format(
        startOfWeek(parseISO(row.shiftDate), { weekStartsOn }),
        "yyyy-MM-dd",
      ),
    ),
  );
  const numWeeks = Math.max(distinctWeeks.size, 1);
  const distinctMonths = new Set(
    workingRows.map((row) => format(parseISO(row.shiftDate), "yyyy-MM")),
  );
  const numMonths = Math.max(distinctMonths.size, 1);
  const hasShifts = base.totalShifts > 0;
  const averages = {
    perShift: {
      earned: hasShifts ? round(base.totalEarned / base.totalShifts) : 0,
      hours: hasShifts ? round(base.totalHours / base.totalShifts) : 0,
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

  const weekdayBestShiftMap = new Map<string, ShiftRecord>();

  for (const row of workingRows) {
    const weekday = getWeekdayFromShiftDate(row.shiftDate);
    const currentBest = weekdayBestShiftMap.get(weekday);

    if (!currentBest || row.hourlyRate > currentBest.hourlyRate) {
      weekdayBestShiftMap.set(weekday, row);
    }
  }

  const orderedWeekdays = getOrderedWeekdays(weekStartAnchor);

  const weekdaySeries = orderedWeekdays
    .map((weekday) => {
      const row = weekdayBestShiftMap.get(weekday);

      if (!row) {
        return null;
      }

      return {
        label: weekday.slice(0, 3),
        hourlyRate: round(row.hourlyRate),
        location: row.location,
        role: row.role,
        shiftType: row.shiftType,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

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

  const formatShiftLabel = (value: string | null) =>
    value && value.trim().length > 0 ? value : "Unspecified";

  const insights = [
    `Average shift earnings are ${round(base.averageShiftEarnings).toFixed(2)} dollars across the current data.`,
    `${base.bestWeekday} is the strongest weekday at ${(bestWeekdayEntry?.hourlyRate ?? 0).toFixed(2)} dollars per hour.`,
    base.bestShift
      ? `Top shift: ${base.bestShift.shiftDate} (${getWeekdayFromShiftDate(base.bestShift.shiftDate)}) • ${formatShiftLabel(base.bestShift.role)} @ ${formatShiftLabel(base.bestShift.location)} • ${formatShiftLabel(base.bestShift.shiftType)} • ${base.bestShift.totalEarned.toFixed(2)} over ${base.bestShift.hoursWorked.toFixed(2)} hours.`
      : "No best shift is available until at least one shift exists.",
  ];

  const baselineWindows = [7, 14, 30].map((windowDays) =>
    getRollingWindowStats(workingRows, referenceDate, windowDays),
  );
  const baseline30 = baselineWindows.find((window) => window.windowDays === 30);
  const currentSpanDays =
    workingRows.length > 0
      ? Math.max(
          1,
          differenceInCalendarDays(
            parseISO(workingRows[0].shiftDate),
            parseISO(workingRows[workingRows.length - 1].shiftDate),
          ) + 1,
        )
      : 1;
  const currentPeriodDailyAvgEarned = round(base.totalEarned / currentSpanDays);
  const currentPeriodDailyAvgHours = round(base.totalHours / currentSpanDays);
  const forecastWindowDays = 30;
  const dailyEarnedSeries = getDailyEarningsSeries(
    workingRows,
    referenceDate,
    forecastWindowDays,
  );
  const forecastWindowStart = subDays(referenceDate, forecastWindowDays - 1);
  const shiftsInWindow = workingRows.filter((row) =>
    isWithinInterval(parseISO(row.shiftDate), {
      start: forecastWindowStart,
      end: referenceDate,
    }),
  ).length;
  const activeDays = dailyEarnedSeries.filter((value) => value > 0).length;
  const activeDayCoveragePct = round((activeDays / forecastWindowDays) * 100);
  const coverageScore = (activeDays / forecastWindowDays) * 70;
  const densityScore = Math.min(shiftsInWindow / forecastWindowDays, 1) * 30;
  const confidenceScore = round(coverageScore + densityScore);
  const meanDailyEarnedRaw = getMean(dailyEarnedSeries);
  const dailyVolatilityRaw = getStdDev(dailyEarnedSeries, meanDailyEarnedRaw);
  const expectedProjection = round(meanDailyEarnedRaw * forecastHorizonDays);
  const volatilityProjection = round(
    dailyVolatilityRaw * Math.sqrt(forecastHorizonDays),
  );
  const lowProjection = round(
    Math.max(0, expectedProjection - volatilityProjection),
  );
  const highProjection = round(expectedProjection + volatilityProjection);

  return {
    ...base,
    weekTotalEarned,
    monthTotalEarned,
    prevWeekTotalEarned,
    prevMonthTotalEarned,
    recentShifts: workingRows.slice(0, 5),
    earningsSeries: [...workingRows].reverse().map((row) => ({
      label: format(parseISO(row.shiftDate), "MMM d"),
      weekday: getWeekdayFromShiftDate(row.shiftDate),
      earned: row.totalEarned,
      hourlyRate: row.hourlyRate,
      location: row.location,
      role: row.role,
      shiftType: row.shiftType,
      isAnomaly: anomalyReasonById.has(row.id),
      anomalyReasons: anomalyReasonById.get(row.id) ?? [],
    })),
    weekdaySeries,
    insights,
    bestWeekdayRate: bestWeekdayEntry?.hourlyRate ?? 0,
    averages,
    profitability: {
      byRole: buildProfitabilityBreakdown(
        workingRows,
        base.totalEarned,
        (row) => normalizeBreakdownLabel(row.role),
      ),
      byLocation: buildProfitabilityBreakdown(
        workingRows,
        base.totalEarned,
        (row) => normalizeBreakdownLabel(row.location),
      ),
      byShiftType: buildProfitabilityBreakdown(
        workingRows,
        base.totalEarned,
        (row) => normalizeBreakdownLabel(row.shiftType),
      ),
    },
    outliers: {
      ...rawOutlierDiagnostics,
      excluded: excludeOutliers,
    },
    baselines: {
      currentPeriod: {
        shifts: base.totalShifts,
        spanDays: currentSpanDays,
        dailyAvgEarned: currentPeriodDailyAvgEarned,
        dailyAvgHours: currentPeriodDailyAvgHours,
      },
      windows: baselineWindows,
      varianceVs30: {
        earnedPct: getPctVariance(
          currentPeriodDailyAvgEarned,
          baseline30?.dailyAvgEarned ?? 0,
        ),
        hoursPct: getPctVariance(
          currentPeriodDailyAvgHours,
          baseline30?.dailyAvgHours ?? 0,
        ),
      },
    },
    forecast: {
      horizonDays: forecastHorizonDays,
      meanDailyEarned: round(meanDailyEarnedRaw),
      dailyVolatility: round(dailyVolatilityRaw),
      historyDailyEarned: dailyEarnedSeries,
      sample: {
        windowDays: forecastWindowDays,
        activeDays,
        activeDayCoveragePct,
        shiftsInWindow,
      },
      confidence: {
        score: confidenceScore,
        label: getForecastConfidence(confidenceScore),
      },
      projected: {
        low: lowProjection,
        expected: expectedProjection,
        high: highProjection,
      },
    },
  };
}
