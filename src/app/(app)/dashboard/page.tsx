import { LazyEarningsTrendChart } from "@/components/charts/lazy-earnings-trend-chart";
import { SummaryCard } from "@/components/summary-card";
import { ShiftHistoryTable } from "@/components/shift-history-table";
import {
  getDashboardSnapshot,
  type ShiftListFilters,
} from "@/lib/shift-repository";

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
  const resolvedSearchParams = await searchParams;
  const preset: ShiftListFilters["preset"] =
    resolvedSearchParams.preset === "week" ||
    resolvedSearchParams.preset === "month" ||
    resolvedSearchParams.preset === "custom"
      ? resolvedSearchParams.preset
      : "all";
  const filters: ShiftListFilters = {
    preset,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
    location: resolvedSearchParams.location,
    role: resolvedSearchParams.role,
  };

  const snapshot = await getDashboardSnapshot(filters);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Sample-driven earnings overview
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          This route is using the screenshot-derived CSV as the temporary source
          of truth while database-backed dashboard queries are being built.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Total earned this week"
          value={snapshot.weekTotalEarned}
        />
        <SummaryCard
          label="Total earned this month"
          value={snapshot.monthTotalEarned}
        />
        <SummaryCard
          label="Average hourly rate"
          value={snapshot.weightedAverageHourlyRate}
        />
        <SummaryCard
          label="Best shift"
          value={snapshot.bestShift?.totalEarned ?? 0}
          tone="dark"
        />
        <SummaryCard
          label="Total hours worked"
          value={snapshot.totalHours}
          kind="decimal"
        />
        <SummaryCard
          label="Number of shifts"
          value={snapshot.totalShifts}
          kind="number"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <LazyEarningsTrendChart data={snapshot.earningsSeries} />

        <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
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
