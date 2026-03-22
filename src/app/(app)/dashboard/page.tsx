import { LazyEarningsTrendChart } from "@/components/charts/lazy-earnings-trend-chart";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SummaryCard } from "@/components/summary-card";
import { ShiftHistoryTable } from "@/components/shift-history-table";
import { GoalProgressPanel } from "@/components/goal-progress-panel";
import { DashboardFilterForm } from "@/components/dashboard-filter-form";
import { formatCurrency, formatWeekday } from "@/lib/formatters";
import {
  getDashboardSnapshot,
  getPreviousPeriodTotals,
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";
import { listGoals } from "@/lib/goals-repository";
import { computeGoalProgress } from "@/lib/goals-progress";
import { getUserSettings } from "@/lib/settings-repository";

function formatShiftLabel(value: string | null) {
  return value && value.trim().length > 0 ? value : "Unspecified";
}

type DashboardPageSearchParams = {
  preset?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardPageSearchParams>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const preset: ShiftListFilters["preset"] =
    resolvedSearchParams.preset === "week" ||
    resolvedSearchParams.preset === "month" ||
    resolvedSearchParams.preset === "custom" ||
    resolvedSearchParams.preset === "pay"
      ? resolvedSearchParams.preset
      : "all";

  const settings = await getUserSettings();

  const filters: ShiftListFilters = {
    preset,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
    location: resolvedSearchParams.location,
    role: resolvedSearchParams.role,
    payPeriodSettings: {
      type: settings.payPeriodType,
      anchor: settings.payPeriodAnchor,
    },
  };

  const [snapshot, allRows, goals, prevTotals] = await Promise.all([
    getDashboardSnapshot(filters, settings.payPeriodAnchor),
    listShiftRecords(),
    listGoals(),
    getPreviousPeriodTotals(filters),
  ]);
  const goalProgress = computeGoalProgress(
    goals,
    allRows,
    new Date(),
    settings.payPeriodAnchor,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Earnings overview
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Track your recent performance with weekly and monthly totals, hourly
          trends, and key shift highlights.
        </p>
        <DashboardFilterForm
          preset={preset}
          startDate={resolvedSearchParams.startDate}
          endDate={resolvedSearchParams.endDate}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Total earned this week"
          value={snapshot.weekTotalEarned}
          delta={{ prev: snapshot.prevWeekTotalEarned, label: "vs last week" }}
        />
        <SummaryCard
          label="Total earned this month"
          value={snapshot.monthTotalEarned}
          delta={{
            prev: snapshot.prevMonthTotalEarned,
            label: "vs last month",
          }}
        />
        <SummaryCard
          label="Average hourly rate"
          value={snapshot.weightedAverageHourlyRate}
          delta={
            prevTotals
              ? {
                  prev: prevTotals.weightedAverageHourlyRate,
                  label: prevTotals.label,
                }
              : undefined
          }
        />
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-slate-950 px-4 py-4 text-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Best shift
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {snapshot.bestShift
              ? formatCurrency(snapshot.bestShift.totalEarned)
              : "No shifts yet"}
          </p>
          {snapshot.bestShift ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-200">
              <div>
                <dt className="text-slate-400">Date</dt>
                <dd className="font-medium text-slate-100">
                  {snapshot.bestShift.shiftDate}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Day</dt>
                <dd className="font-medium text-slate-100">
                  {formatWeekday(snapshot.bestShift.shiftDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Role</dt>
                <dd className="font-medium text-slate-100">
                  {formatShiftLabel(snapshot.bestShift.role)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Location</dt>
                <dd className="font-medium text-slate-100">
                  {formatShiftLabel(snapshot.bestShift.location)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">Shift type</dt>
                <dd className="font-medium text-slate-100">
                  {formatShiftLabel(snapshot.bestShift.shiftType)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              Log your first shift to unlock this summary.
            </p>
          )}
        </div>
        <SummaryCard
          label="Total hours worked"
          value={snapshot.totalHours}
          kind="decimal"
          delta={
            prevTotals
              ? { prev: prevTotals.totalHours, label: prevTotals.label }
              : undefined
          }
        />
        <SummaryCard
          label="Number of shifts"
          value={snapshot.totalShifts}
          kind="number"
        />
      </section>

      <GoalProgressPanel goals={goalProgress} />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <LazyEarningsTrendChart data={snapshot.earningsSeries} />

        <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-medium text-slate-300">Insights</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
            {snapshot.insights.map((insight) => (
              <li
                key={insight}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Recent shifts
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Latest entries
          </h2>
        </div>
        <ShiftHistoryTable rows={snapshot.recentShifts} />
      </section>
    </div>
  );
}
