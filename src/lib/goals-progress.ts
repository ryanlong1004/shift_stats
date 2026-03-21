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

function periodInterval(period: GoalPeriod, ref: Date) {
  switch (period) {
    case "daily":
      return { start: startOfDay(ref), end: endOfDay(ref) };
    case "weekly":
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
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
): number {
  const interval = periodInterval(period, ref);
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
): GoalProgress[] {
  return goals.map((goal) => {
    const current = computeCurrent(goal.metricType, allRows, goal.period, ref);
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
