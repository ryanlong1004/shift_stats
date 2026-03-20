import Link from "next/link";

import { LazyEarningsTrendChart } from "@/components/charts/lazy-earnings-trend-chart";
import { LazyWeekdayPerformanceChart } from "@/components/charts/lazy-weekday-performance-chart";
import { SummaryCard } from "@/components/summary-card";
import { formatCurrency } from "@/lib/formatters";
import {
  getDashboardSnapshot,
  getDistinctLocationsAndRoles,
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

  const [snapshot, { locations, roles }] = await Promise.all([
    getDashboardSnapshot(filters),
    getDistinctLocationsAndRoles(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Analytics
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Performance trends
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Explore how earnings and hourly rates change by date, weekday,
          location, and role.
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
          <select
            name="location"
            defaultValue={resolvedSearchParams.location ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Role</span>
          <select
            name="role"
            defaultValue={resolvedSearchParams.role ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Current filter
          </p>
          <p className="mt-2 text-base font-medium text-slate-900">
            {preset === "all" ? "All shifts" : preset}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Date range
          </p>
          <p className="mt-2 text-base font-medium text-slate-900">
            {resolvedSearchParams.startDate ?? "-"} to{" "}
            {resolvedSearchParams.endDate ?? "-"}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Location
          </p>
          <p className="mt-2 text-base font-medium text-slate-900">
            {resolvedSearchParams.location || "All"}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Role
          </p>
          <p className="mt-2 text-base font-medium text-slate-900">
            {resolvedSearchParams.role || "All"}
          </p>
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

      <section className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Averages
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Per shift</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.averages.perShift.earned)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.averages.perShift.hours.toFixed(2)} hrs avg
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Per week</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.averages.perWeek.earned)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.averages.perWeek.hours.toFixed(2)} hrs avg
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Per month</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.averages.perMonth.earned)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.averages.perMonth.hours.toFixed(2)} hrs avg
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/85 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Best weekday
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {snapshot.bestWeekday}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatCurrency(snapshot.bestWeekdayRate)} average hourly rate.
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/85 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Top shift
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {snapshot.bestShift
              ? formatCurrency(snapshot.bestShift.totalEarned)
              : "No shifts yet"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {snapshot.bestShift
              ? `${snapshot.bestShift.shiftDate} over ${snapshot.bestShift.hoursWorked.toFixed(2)} hours`
              : "Log your first shift to unlock this summary."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <LazyEarningsTrendChart data={snapshot.earningsSeries} />
        <LazyWeekdayPerformanceChart data={snapshot.weekdaySeries} />
      </section>
    </div>
  );
}
