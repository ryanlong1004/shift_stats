import Link from "next/link";

import { LazyEarningsTrendChart } from "@/components/charts/lazy-earnings-trend-chart";
import { LazyWeekdayPerformanceChart } from "@/components/charts/lazy-weekday-performance-chart";
import { SummaryCard } from "@/components/summary-card";
import {
  getDashboardSnapshot,
  type ShiftListFilters,
} from "@/lib/shift-repository";

type AnalyticsPageSearchParams = {
  preset?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
};

const filterPresets = [
  { value: "all", label: "All" },
  { value: "week", label: "Current week" },
  { value: "month", label: "Current month" },
  { value: "custom", label: "Custom" },
] as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsPageSearchParams>;
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
          Analytics
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Performance trends from sample data
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          These visuals are the temporary analytics layer until the
          database-backed aggregate queries replace the sample helper.
        </p>
      </section>

      <form
        method="GET"
        className="grid gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-5"
      >
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Preset</span>
          <select
            name="preset"
            defaultValue={preset}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            {filterPresets.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Start date</span>
          <input
            type="date"
            name="startDate"
            defaultValue={resolvedSearchParams.startDate ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">End date</span>
          <input
            type="date"
            name="endDate"
            defaultValue={resolvedSearchParams.endDate ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Location</span>
          <input
            type="text"
            name="location"
            placeholder="Filter location"
            defaultValue={resolvedSearchParams.location ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Role</span>
          <input
            type="text"
            name="role"
            placeholder="Filter role"
            defaultValue={resolvedSearchParams.role ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <div className="md:col-span-2 xl:col-span-5 flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Apply filters
          </button>
          <Link
            href="/analytics"
            className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Current filter: {preset === "all" ? "All shifts" : preset}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Date range: {resolvedSearchParams.startDate ?? "-"} to{" "}
          {resolvedSearchParams.endDate ?? "-"}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Location: {resolvedSearchParams.location || "All"}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Role: {resolvedSearchParams.role || "All"}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Moving 7-shift average"
          value={snapshot.averageShiftEarnings}
        />
        <SummaryCard
          label="Best weekday rate"
          value={snapshot.bestWeekdayRate}
        />
        <SummaryCard
          label="Weekly hours"
          value={snapshot.totalHours}
          kind="decimal"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <LazyEarningsTrendChart data={snapshot.earningsSeries} />
        <LazyWeekdayPerformanceChart data={snapshot.weekdaySeries} />
      </section>
    </div>
  );
}
