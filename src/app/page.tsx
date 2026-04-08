import {
  ArrowRight,
  ChartSpline,
  Clock3,
  DollarSign,
  TableProperties,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LazyEarningsTrendChart } from "@/components/charts/lazy-earnings-trend-chart";
import { LazyWeekdayPerformanceChart } from "@/components/charts/lazy-weekday-performance-chart";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import { isDatabaseConfigured } from "@/lib/shift-repository";
import {
  getSampleDashboardSnapshot,
  getSampleShiftSnapshot,
} from "@/lib/sample-data";

export default async function Home() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  const snapshot = await getSampleShiftSnapshot();
  const dashboardSnapshot = await getSampleDashboardSnapshot();
  const bestShift = snapshot.bestShift;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%),linear-gradient(135deg,_#fff6e7_0%,_#f3efe7_36%,_#dbe9f4_100%)] px-6 py-8 text-slate-900 sm:px-10 lg:px-14">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                Shiftstats
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Know exactly what your time is worth, shift by shift.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
                  Log shifts, set earnings goals, explore your calendar and
                  schedule, and compare periods side-by-side — everything you
                  need to understand your real hourly performance.
                </p>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Total earned"
                  value={formatCurrency(snapshot.totalEarned)}
                />
                <StatCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Hours logged"
                  value={formatDecimal(snapshot.totalHours)}
                />
                <StatCard
                  icon={<ChartSpline className="h-4 w-4" />}
                  label="Weighted hourly"
                  value={formatCurrency(snapshot.weightedAverageHourlyRate)}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-950 px-5 py-5 text-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                    {isDatabaseConfigured()
                      ? "Current performance snapshot"
                      : "Recent performance snapshot"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Current snapshot
                  </h2>
                </div>
                <div className="rounded-full bg-white/10 p-2 text-cyan-200">
                  <TableProperties className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <SnapshotRow
                  label="Shifts tracked"
                  value={String(snapshot.totalShifts)}
                />
                <SnapshotRow
                  label="Average shift"
                  value={formatCurrency(snapshot.averageShiftEarnings)}
                />
                <SnapshotRow
                  label="Best weekday"
                  value={snapshot.bestWeekday}
                />
                <SnapshotRow
                  label="Best shift"
                  value={
                    bestShift
                      ? `${formatCurrency(bestShift.totalEarned)} on ${bestShift.shiftDate}`
                      : "No shifts yet"
                  }
                />
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  What you can do
                </p>
                <ol className="mt-4 space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                      1
                    </span>
                    <span>
                      Log shifts with hours, base pay, tips, roles, and notes.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                      2
                    </span>
                    <span>
                      Set earnings goals and track progress with visual
                      indicators.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                      3
                    </span>
                    <span>
                      Browse your monthly calendar or weekly schedule for shift
                      history.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                      4
                    </span>
                    <span>
                      Compare period-over-period earnings to spot trends and
                      improvements.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                      5
                    </span>
                    <span>
                      Export filtered history as CSV or import from an existing
                      file.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Recent shifts
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Snapshot of tracked earnings
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white">
                Ready to review
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-900/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-950 text-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Hourly</th>
                    <th className="px-4 py-3 font-medium">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 bg-white/70"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.shiftDate}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatCurrency(row.totalEarned)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDecimal(row.hoursWorked)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatCurrency(row.hourlyRate)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.dayName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-900/10 bg-[#0f172a] p-6 text-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
              Platform highlights
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Built for day-to-day use
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <FeatureCard
                title="Shift tracking"
                body="Capture dates, times, roles, compensation types, and notes with live total calculations."
              />
              <FeatureCard
                title="Goals & progress"
                body="Set weekly or monthly earnings targets and watch them fill with visual progress indicators."
              />
              <FeatureCard
                title="Calendar & schedule"
                body="Browse a monthly calendar or navigate week-by-week to review your shift history."
              />
              <FeatureCard
                title="Analytics & trends"
                body="Period-over-period comparison charts and earnings breakdowns to spot your strongest shifts."
              />
              <FeatureCard
                title="Pay period support"
                body="Configure your pay period start day and filter earnings by pay cycle across all views."
              />
              <FeatureCard
                title="CSV import & export"
                body="Import data from an existing file or download filtered shift history for payroll records."
              />
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Analytics preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              See your data come to life
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Charts below are driven by sample data — your real analytics
              update as you log shifts.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <LazyEarningsTrendChart data={dashboardSnapshot.earningsSeries} />
            <LazyWeekdayPerformanceChart
              data={dashboardSnapshot.weekdaySeries}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span className="rounded-full bg-amber-100 p-2 text-amber-700">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-none last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-50">{value}</span>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{body}</p>
    </div>
  );
}
