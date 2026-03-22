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
} from "date-fns";

import type {
  GoalRecord,
  GoalMetric,
  GoalPeriod,
} from "@/lib/goals-repository";
import type { ShiftRecord } from "@/lib/shift-records";

export type GoalProgress = GoalRecord & {
  current: number;
  pct: number; // 0–100+, capped at 150 for display safety
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
