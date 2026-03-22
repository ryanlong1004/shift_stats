import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

import type {
  GoalRecord,
  GoalMetric,
  GoalPeriod,
} from "@/lib/goals-repository";
import type {
  ShiftRecord,
  ForecastDiagnostics,
  RollingBaselineDiagnostics,
} from "@/lib/shift-records";

export type GoalProgress = GoalRecord & {
  current: number;
  pct: number; // 0–100+, capped at 150 for display safety
};

export type GoalHitEstimate = GoalProgress & {
  remaining: number;
  daysRemainingInPeriod: number;
  projectedAdditional: number;
  hitProbabilityPct: number; // 0–100
  onTrack: boolean;
};

type WeekStartAnchor =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const WEEK_STARTS_ON: Record<WeekStartAnchor, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function periodInterval(
  period: GoalPeriod,
  ref: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
) {
  switch (period) {
    case "daily":
      return { start: startOfDay(ref), end: endOfDay(ref) };
    case "weekly":
      return {
        start: startOfWeek(ref, { weekStartsOn }),
        end: endOfWeek(ref, { weekStartsOn }),
      };
    case "monthly":
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    case "yearly":
      return { start: startOfYear(ref), end: endOfYear(ref) };
  }
}

function computeCurrent(
  metric: GoalMetric,
  rows: ShiftRecord[],
  period: GoalPeriod,
  ref: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): number {
  const interval = periodInterval(period, ref, weekStartsOn);
  const periodRows = rows.filter((r) =>
    isWithinInterval(parseISO(r.shiftDate), interval),
  );

  if (metric === "takeHome") {
    return periodRows.reduce((sum, r) => sum + r.totalEarned, 0);
  }
  if (metric === "hours") {
    return periodRows.reduce((sum, r) => sum + r.hoursWorked, 0);
  }
  // avgHourly — weighted avg across period rows
  const totalHours = periodRows.reduce((sum, r) => sum + r.hoursWorked, 0);
  if (totalHours === 0) return 0;
  const totalEarned = periodRows.reduce((sum, r) => sum + r.totalEarned, 0);
  return totalEarned / totalHours;
}

export function computeGoalProgress(
  goals: GoalRecord[],
  allRows: ShiftRecord[],
  ref: Date = new Date(),
  weekStartAnchor: WeekStartAnchor = "monday",
): GoalProgress[] {
  const weekStartsOn = WEEK_STARTS_ON[weekStartAnchor];

  return goals.map((goal) => {
    const current = computeCurrent(
      goal.metricType,
      allRows,
      goal.period,
      ref,
      weekStartsOn,
    );
    const pct =
      goal.targetValue > 0
        ? Math.min((current / goal.targetValue) * 100, 150)
        : 0;
    return {
      ...goal,
      current: Math.round(current * 100) / 100,
      pct: Math.round(pct * 10) / 10,
    };
  });
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun approximation, max error ~0.001
  if (z < -6) return 0;
  if (z > 6) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - phi * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

function periodDaysRemaining(
  period: GoalPeriod,
  ref: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): number {
  switch (period) {
    case "daily":
      return 0;
    case "weekly":
      return differenceInCalendarDays(endOfWeek(ref, { weekStartsOn }), ref);
    case "monthly":
      return differenceInCalendarDays(endOfMonth(ref), ref);
    case "yearly":
      return differenceInCalendarDays(endOfYear(ref), ref);
  }
}

export function computeGoalHitEstimates(
  goals: GoalProgress[],
  forecast: ForecastDiagnostics,
  baselines: RollingBaselineDiagnostics,
  ref: Date = new Date(),
  weekStartAnchor: WeekStartAnchor = "monday",
): GoalHitEstimate[] {
  const weekStartsOn = WEEK_STARTS_ON[weekStartAnchor];
  const meanDailyEarned = forecast.meanDailyEarned;
  const dailyVolatility = forecast.dailyVolatility;
  const meanDailyHours =
    baselines.windows.find((w) => w.windowDays === 30)?.dailyAvgHours ??
    baselines.currentPeriod.dailyAvgHours;

  return goals.map((goal) => {
    const remaining = Math.max(0, goal.targetValue - goal.current);
    const daysRemainingInPeriod = periodDaysRemaining(
      goal.period,
      ref,
      weekStartsOn,
    );

    let projectedAdditional = 0;
    let hitProbabilityPct = 0;

    if (remaining === 0) {
      projectedAdditional = 0;
      hitProbabilityPct = 100;
    } else if (daysRemainingInPeriod === 0) {
      projectedAdditional = 0;
      hitProbabilityPct = 0;
    } else if (goal.metricType === "takeHome") {
      projectedAdditional =
        Math.round(meanDailyEarned * daysRemainingInPeriod * 100) / 100;
      const projectedStdDev =
        dailyVolatility * Math.sqrt(daysRemainingInPeriod);
      const z =
        projectedStdDev > 0
          ? (projectedAdditional - remaining) / projectedStdDev
          : projectedAdditional >= remaining
            ? 6
            : -6;
      hitProbabilityPct = Math.round(normalCDF(z) * 100);
    } else if (goal.metricType === "hours") {
      projectedAdditional =
        Math.round(meanDailyHours * daysRemainingInPeriod * 100) / 100;
      // assume ~30% relative std dev for hours
      const projectedStdDev =
        meanDailyHours * 0.3 * Math.sqrt(daysRemainingInPeriod);
      const z =
        projectedStdDev > 0
          ? (projectedAdditional - remaining) / projectedStdDev
          : projectedAdditional >= remaining
            ? 6
            : -6;
      hitProbabilityPct = Math.round(normalCDF(z) * 100);
    } else {
      // avgHourly — rate goal, not accumulating; use point estimate vs target
      projectedAdditional = 0;
      hitProbabilityPct =
        goal.targetValue > 0
          ? Math.min(100, Math.round((goal.current / goal.targetValue) * 100))
          : 0;
    }

    return {
      ...goal,
      remaining: Math.round(remaining * 100) / 100,
      daysRemainingInPeriod,
      projectedAdditional,
      hitProbabilityPct: Math.min(100, Math.max(0, hitProbabilityPct)),
      onTrack: hitProbabilityPct >= 50,
    };
  });
}
