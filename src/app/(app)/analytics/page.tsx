import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LazyCompareEarningsTrendChart } from "@/components/charts/lazy-compare-earnings-trend-chart";
import { LazyWeekdayPerformanceChart } from "@/components/charts/lazy-weekday-performance-chart";
import { SummaryCard } from "@/components/summary-card";
import { GoalProgressPanel } from "@/components/goal-progress-panel";
import { formatCurrency, formatWeekday } from "@/lib/formatters";
import {
  getDashboardSnapshot,
  getDistinctLocationsAndRoles,
  getPreviousPeriodSeries,
  getPreviousPeriodTotals,
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";
import { listGoals } from "@/lib/goals-repository";
import { computeGoalProgress } from "@/lib/goals-progress";
import { getUserSettings } from "@/lib/settings-repository";

type AnalyticsPageSearchParams = {
  preset?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
  shiftType?: string;
  excludeOutliers?: string;
  outlierSensitivity?: string;
  forecastScenario?: string;
  forecastHorizon?: string;
};

const FORECAST_HORIZON_OPTIONS = [
  { value: "7", label: "7 days", days: 7 },
  { value: "14", label: "14 days", days: 14 },
  { value: "30", label: "30 days", days: 30 },
] as const;

const FORECAST_SCENARIOS = [
  {
    value: "base",
    label: "Base case",
    expectedMultiplier: 1,
    volatilityMultiplier: 1,
  },
  {
    value: "conservative",
    label: "Conservative",
    expectedMultiplier: 0.9,
    volatilityMultiplier: 1.15,
  },
  {
    value: "aggressive",
    label: "Aggressive",
    expectedMultiplier: 1.1,
    volatilityMultiplier: 0.9,
  },
] as const;

const OUTLIER_SENSITIVITY_OPTIONS = [
  { value: "1", label: "Strict (1.0x IQR)", multiplier: 1 },
  { value: "1.5", label: "Balanced (1.5x IQR)", multiplier: 1.5 },
  { value: "2", label: "Relaxed (2.0x IQR)", multiplier: 2 },
  { value: "3", label: "Very relaxed (3.0x IQR)", multiplier: 3 },
] as const;

const filterPresets = [
  { value: "all", label: "All" },
  { value: "week", label: "Current week" },
  { value: "month", label: "Current month" },
  { value: "pay", label: "Pay period" },
  { value: "custom", label: "Custom" },
] as const;

function formatShiftLabel(value: string | null) {
  return value && value.trim().length > 0 ? value : "Unspecified";
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPct(value: number) {
  if (value > 0) {
    return `+${value.toFixed(1)}%`;
  }

  return `${value.toFixed(1)}%`;
}

function formatSignedCurrency(value: number) {
  if (value > 0) {
    return `+${formatCurrency(value)}`;
  }

  return formatCurrency(value);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getConfidenceBadgeClass(label: "Low" | "Medium" | "High") {
  if (label === "High") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (label === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function formatOutlierBand(band: { lower: number; upper: number } | null) {
  if (!band) {
    return "Not enough variation";
  }

  const displayLowerBound = Math.max(0, band.lower);

  return `${formatCurrency(displayLowerBound)} to ${formatCurrency(band.upper)}`;
}

function getForecastSparkline(
  history: number[],
  projectedDaily: number,
  horizonDays: number,
) {
  const width = 640;
  const height = 140;
  const padding = 12;
  const projectedPoints = Math.max(horizonDays, 1);
  const projectedSeries = Array.from({ length: projectedPoints }, () =>
    round(projectedDaily),
  );
  const combined = [...history, ...projectedSeries];
  const maxValue = Math.max(...combined, 1);
  const minValue = Math.min(...combined, 0);
  const range = Math.max(maxValue - minValue, 1);

  const toPoint = (value: number, index: number, total: number) => {
    const x =
      total <= 1
        ? padding
        : padding + (index / (total - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const historyPoints = history.map((value, index) =>
    toPoint(value, index, combined.length),
  );
  const projectionPoints = projectedSeries.map((value, index) =>
    toPoint(value, history.length + index, combined.length),
  );

  const splitIndex = Math.max(history.length - 1, 0);
  const splitX =
    combined.length <= 1
      ? padding
      : padding + (splitIndex / (combined.length - 1)) * (width - padding * 2);

  return {
    width,
    height,
    splitX,
    historyPath: historyPoints.join(" "),
    projectionPath: projectionPoints.join(" "),
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsPageSearchParams>;
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
  const excludeOutliers =
    resolvedSearchParams.excludeOutliers === "1" ||
    resolvedSearchParams.excludeOutliers === "true";
  const selectedOutlierSensitivity =
    OUTLIER_SENSITIVITY_OPTIONS.find(
      (option) => option.value === resolvedSearchParams.outlierSensitivity,
    ) ?? OUTLIER_SENSITIVITY_OPTIONS[1];
  const outlierIqrMultiplier = selectedOutlierSensitivity.multiplier;
  const selectedForecastScenario =
    FORECAST_SCENARIOS.find(
      (option) => option.value === resolvedSearchParams.forecastScenario,
    ) ?? FORECAST_SCENARIOS[0];
  const selectedForecastHorizon =
    FORECAST_HORIZON_OPTIONS.find(
      (option) => option.value === resolvedSearchParams.forecastHorizon,
    ) ?? FORECAST_HORIZON_OPTIONS[0];

  const filters: ShiftListFilters = {
    preset,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
    location: resolvedSearchParams.location,
    role: resolvedSearchParams.role,
    shiftType: resolvedSearchParams.shiftType,
    payPeriodSettings: {
      type: settings.payPeriodType,
      anchor: settings.payPeriodAnchor,
    },
  };

  const [
    snapshot,
    { locations, roles, shiftTypes },
    allRows,
    goals,
    prevSeries,
    prevTotals,
  ] = await Promise.all([
    getDashboardSnapshot(filters, settings.payPeriodAnchor, {
      excludeOutliers,
      outlierIqrMultiplier,
      forecastHorizonDays: selectedForecastHorizon.days,
    }),
    getDistinctLocationsAndRoles(),
    listShiftRecords(),
    listGoals(),
    getPreviousPeriodSeries(filters, {
      excludeOutliers,
      outlierIqrMultiplier,
    }),
    getPreviousPeriodTotals(filters, {
      excludeOutliers,
      outlierIqrMultiplier,
    }),
  ]);
  const goalProgress = computeGoalProgress(
    goals,
    allRows,
    new Date(),
    settings.payPeriodAnchor,
  );
  const activeFilters: Array<{ label: string; value: string }> = [];

  if (preset !== "all") {
    const presetLabel =
      filterPresets.find((option) => option.value === preset)?.label ?? preset;
    activeFilters.push({ label: "Preset", value: presetLabel });
  }

  if (resolvedSearchParams.startDate || resolvedSearchParams.endDate) {
    activeFilters.push({
      label: "Date",
      value: `${resolvedSearchParams.startDate ?? "-"} to ${resolvedSearchParams.endDate ?? "-"}`,
    });
  }

  if (resolvedSearchParams.location?.trim()) {
    activeFilters.push({
      label: "Location",
      value: resolvedSearchParams.location,
    });
  }

  if (resolvedSearchParams.role?.trim()) {
    activeFilters.push({
      label: "Role",
      value: resolvedSearchParams.role,
    });
  }

  if (resolvedSearchParams.shiftType?.trim()) {
    activeFilters.push({
      label: "Shift type",
      value: resolvedSearchParams.shiftType,
    });
  }

  if (excludeOutliers) {
    activeFilters.push({
      label: "Anomalies",
      value: "Excluded from metrics",
    });
  }

  if (resolvedSearchParams.outlierSensitivity?.trim()) {
    activeFilters.push({
      label: "Sensitivity",
      value: selectedOutlierSensitivity.label,
    });
  }

  if (selectedForecastScenario.value !== "base") {
    activeFilters.push({
      label: "Forecast",
      value: selectedForecastScenario.label,
    });
  }

  if (selectedForecastHorizon.days !== 7) {
    activeFilters.push({
      label: "Horizon",
      value: selectedForecastHorizon.label,
    });
  }

  const scenarioExpectedProjection = round(
    snapshot.forecast.projected.expected *
      selectedForecastScenario.expectedMultiplier,
  );
  const scenarioVolatilityProjection = round(
    snapshot.forecast.dailyVolatility *
      Math.sqrt(snapshot.forecast.horizonDays) *
      selectedForecastScenario.volatilityMultiplier,
  );
  const scenarioLowProjection = round(
    Math.max(0, scenarioExpectedProjection - scenarioVolatilityProjection),
  );
  const scenarioHighProjection = round(
    scenarioExpectedProjection + scenarioVolatilityProjection,
  );
  const scenarioProjectedDaily =
    snapshot.forecast.horizonDays > 0
      ? scenarioExpectedProjection / snapshot.forecast.horizonDays
      : 0;
  const recent14DailyAvg = round(
    snapshot.forecast.historyDailyEarned
      .slice(-14)
      .reduce((sum, value) => sum + value, 0) / 14,
  );
  const projectionDailyDelta = round(scenarioProjectedDaily - recent14DailyAvg);
  const projectionDailyDeltaPct =
    recent14DailyAvg > 0
      ? round((projectionDailyDelta / recent14DailyAvg) * 100)
      : 0;
  const sparkline = getForecastSparkline(
    snapshot.forecast.historyDailyEarned,
    scenarioProjectedDaily,
    snapshot.forecast.horizonDays,
  );

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
          location, role, and shift type.
        </p>
      </section>

      <form
        method="GET"
        className="grid gap-4 rounded-3xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-6"
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

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Shift type</span>
          <select
            name="shiftType"
            defaultValue={resolvedSearchParams.shiftType ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All shift types</option>
            {shiftTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-6 flex items-center gap-3">
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

          <label className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              name="excludeOutliers"
              value="1"
              defaultChecked={excludeOutliers}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            Exclude anomalies
          </label>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            Sensitivity
            <select
              name="outlierSensitivity"
              defaultValue={selectedOutlierSensitivity.value}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-slate-900"
            >
              {OUTLIER_SENSITIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            Forecast scenario
            <select
              name="forecastScenario"
              defaultValue={selectedForecastScenario.value}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-slate-900"
            >
              {FORECAST_SCENARIOS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            Forecast horizon
            <select
              name="forecastHorizon"
              defaultValue={selectedForecastHorizon.value}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-slate-900"
            >
              {FORECAST_HORIZON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {activeFilters.length > 0 ? (
        <section className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Active filters
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <span
                key={`${filter.label}-${filter.value}`}
                className="inline-flex items-center rounded-full border border-slate-300/80 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                <span className="font-semibold text-slate-900">
                  {filter.label}:
                </span>
                <span className="ml-1">{filter.value}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total earned"
          value={snapshot.totalEarned}
          delta={
            prevTotals
              ? { prev: prevTotals.totalEarned, label: prevTotals.label }
              : undefined
          }
        />
        <SummaryCard
          label="Total hours"
          value={snapshot.totalHours}
          kind="decimal"
          delta={
            prevTotals
              ? { prev: prevTotals.totalHours, label: prevTotals.label }
              : undefined
          }
        />
        <SummaryCard
          label="Avg hourly rate"
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
        <SummaryCard
          label="Best weekday rate"
          value={snapshot.bestWeekdayRate}
        />
      </section>

      <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
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

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {[
            { label: "By role", rows: snapshot.averages.byRole },
            { label: "By location", rows: snapshot.averages.byLocation },
            { label: "By shift type", rows: snapshot.averages.byShiftType },
          ].map((group) => (
            <div
              key={group.label}
              className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {group.label}
              </p>
              {group.rows.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {group.rows.slice(0, 5).map((row) => (
                    <li
                      key={`${group.label}-${row.label}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">
                          {row.label}
                        </p>
                        <p className="text-xs text-slate-600">
                          {row.shifts} {row.shifts === 1 ? "shift" : "shifts"}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-6 text-xs">
                        <div>
                          <p className="text-slate-500">Avg earned</p>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(row.avgEarned)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Avg hours</p>
                          <p className="font-medium text-slate-900">
                            {row.avgHours.toFixed(2)} hrs
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Not enough shifts in this view yet.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase 4 diagnostics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Earnings pace
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Month-to-date vs model expectation
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">
              Month-to-date actual
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.pace.monthToDateEarned)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Day {snapshot.pace.daysElapsed} of {snapshot.pace.daysInMonth}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">
              Model-expected by today
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.pace.expectedByToday)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Based on 30-day daily mean
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Pace gap</p>
            <p
              className={`mt-2 text-xl font-semibold ${snapshot.pace.paceGap >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {formatSignedCurrency(snapshot.pace.paceGap)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatSignedPct(snapshot.pace.paceGapPct)} vs expectation
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">
              Projected month total
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(snapshot.pace.projectedMonthTotal)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.pace.daysRemaining} days remaining
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Month progress</span>
            <span>
              {snapshot.pace.daysElapsed}/{snapshot.pace.daysInMonth} days (
              {formatPct(snapshot.pace.elapsedPct)})
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800 transition-all"
              style={{ width: `${snapshot.pace.elapsedPct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Earnings progress</span>
            <span>
              {snapshot.pace.projectedMonthTotal > 0
                ? formatPct(
                    Math.min(
                      (snapshot.pace.monthToDateEarned /
                        snapshot.pace.projectedMonthTotal) *
                        100,
                      100,
                    ),
                  )
                : "—"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${snapshot.pace.paceGap >= 0 ? "bg-emerald-500" : "bg-rose-400"}`}
              style={{
                width: `${snapshot.pace.projectedMonthTotal > 0 ? Math.min((snapshot.pace.monthToDateEarned / snapshot.pace.projectedMonthTotal) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase 4 diagnostics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Rolling baselines
            </h2>
          </div>
          <p className="text-xs text-slate-500">Daily averages and variance</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {snapshot.baselines.windows.map((window) => (
            <div
              key={window.windowDays}
              className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4"
            >
              <p className="text-xs font-medium text-slate-500">
                Last {window.windowDays} days
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatCurrency(window.dailyAvgEarned)} / day
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {window.dailyAvgHours.toFixed(2)} hrs/day • {window.shifts}{" "}
                shifts
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-4">
          <p className="text-xs font-medium text-slate-500">
            Current view baseline
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {formatCurrency(snapshot.baselines.currentPeriod.dailyAvgEarned)} /
            day
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Across {snapshot.baselines.currentPeriod.spanDays} days and{" "}
            {snapshot.baselines.currentPeriod.shifts} shifts
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Earnings vs 30d:{" "}
              {formatSignedPct(snapshot.baselines.varianceVs30.earnedPct)}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Hours vs 30d:{" "}
              {formatSignedPct(snapshot.baselines.varianceVs30.hoursPct)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase 4 diagnostics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {snapshot.forecast.horizonDays}-day forecast
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Based on the last 30 calendar days
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Low estimate</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(scenarioLowProjection)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Expected</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(scenarioExpectedProjection)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">High estimate</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(scenarioHighProjection)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">Model inputs</p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getConfidenceBadgeClass(snapshot.forecast.confidence.label)}`}
            >
              {snapshot.forecast.confidence.label} confidence (
              {snapshot.forecast.confidence.score.toFixed(0)})
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Mean daily earnings:{" "}
            {formatCurrency(snapshot.forecast.meanDailyEarned)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Daily volatility:{" "}
            {formatCurrency(snapshot.forecast.dailyVolatility)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Coverage: {snapshot.forecast.sample.activeDays}/
            {snapshot.forecast.sample.windowDays} active days (
            {formatPct(snapshot.forecast.sample.activeDayCoveragePct)})
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Shifts in window: {snapshot.forecast.sample.shiftsInWindow}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Scenario: {selectedForecastScenario.label}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Recent 14d daily avg: {formatCurrency(recent14DailyAvg)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Daily delta vs 14d: {formatSignedCurrency(projectionDailyDelta)}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Delta pct: {formatSignedPct(projectionDailyDeltaPct)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-4">
          <p className="text-xs font-medium text-slate-500">
            Trend with projection
          </p>
          <svg
            viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
            className="mt-3 h-28 w-full"
            role="img"
            aria-label="Forecast trend sparkline"
          >
            <line
              x1={sparkline.splitX}
              y1={8}
              x2={sparkline.splitX}
              y2={sparkline.height - 8}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
            <polyline
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.5"
              points={sparkline.historyPath}
            />
            <polyline
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              points={sparkline.projectionPath}
            />
          </svg>
          <p className="mt-2 text-xs text-slate-500">
            Solid line: last 30 days. Dashed line: projected daily run-rate for
            the selected horizon.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase 4 diagnostics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Shift profitability breakdowns
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Weighted rates, share, and sample size
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {[
            { label: "By role", rows: snapshot.profitability.byRole },
            { label: "By location", rows: snapshot.profitability.byLocation },
            {
              label: "By shift type",
              rows: snapshot.profitability.byShiftType,
            },
          ].map((group) => (
            <div
              key={group.label}
              className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {group.label}
              </p>
              {group.rows.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {group.rows.slice(0, 5).map((row) => (
                    <li
                      key={`${group.label}-${row.label}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">
                          {row.label}
                        </p>
                        <p className="text-xs text-slate-600">
                          {row.shifts} {row.shifts === 1 ? "shift" : "shifts"}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                        <div>
                          <p className="text-slate-500">Total</p>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(row.totalEarned)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hourly</p>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(row.weightedHourlyRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Share</p>
                          <p className="font-medium text-slate-900">
                            {formatPct(row.contributionPct)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Not enough shifts in this view yet.
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">Anomaly rate</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatPct(snapshot.outliers.anomalyPct)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.outliers.anomalyCount} flagged of{" "}
              {snapshot.outliers.totalRows} shifts
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">
              Total-earned band
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatOutlierBand(snapshot.outliers.thresholds.totalEarned)}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              IQR x {outlierIqrMultiplier.toFixed(1)} threshold
            </p>
          </div>
          <div className="rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">
              Hourly-rate band
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatOutlierBand(snapshot.outliers.thresholds.hourlyRate)}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              IQR x {outlierIqrMultiplier.toFixed(1)} threshold
            </p>
          </div>
        </div>

        {snapshot.outliers.topAnomalies.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Top anomalies
            </p>
            <ul className="mt-3 space-y-2">
              {snapshot.outliers.topAnomalies.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      {row.shiftDate}
                    </p>
                    <p className="text-xs text-slate-600">
                      {row.reasons.join(" + ")}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {formatCurrency(row.totalEarned)} earned at{" "}
                    {formatCurrency(row.hourlyRate)}/hr
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatShiftLabel(row.role)} @{" "}
                    {formatShiftLabel(row.location)} •{" "}
                    {formatShiftLabel(row.shiftType)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
          {snapshot.bestShift ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-500">Date</dt>
                <dd className="font-medium text-slate-800">
                  {snapshot.bestShift.shiftDate}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Day</dt>
                <dd className="font-medium text-slate-800">
                  {formatWeekday(snapshot.bestShift.shiftDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-800">
                  {formatShiftLabel(snapshot.bestShift.role)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-800">
                  {formatShiftLabel(snapshot.bestShift.location)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Shift type</dt>
                <dd className="font-medium text-slate-800">
                  {formatShiftLabel(snapshot.bestShift.shiftType)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Log your first shift to unlock this summary.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <LazyCompareEarningsTrendChart
          data={snapshot.earningsSeries}
          prevData={prevSeries}
        />
        <LazyWeekdayPerformanceChart data={snapshot.weekdaySeries} />
      </section>

      <GoalProgressPanel goals={goalProgress} />
    </div>
  );
}
