import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addDays,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfWeek,
  subWeeks,
  addWeeks,
} from "date-fns";

import { formatCurrency } from "@/lib/formatters";
import { auth } from "@/auth";
import { listShiftRecords } from "@/lib/shift-repository";
import { getUserSettings } from "@/lib/settings-repository";

type SchedulePageSearchParams = {
  week?: string;
};

function getWeekStartsOn(anchor: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const normalized = anchor.toLowerCase();

  switch (normalized) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    default:
      return 1;
  }
}

function resolveWeekStart(
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  value?: string,
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return startOfWeek(new Date(), { weekStartsOn });
  }

  const parsed = parse(value, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) {
    return startOfWeek(new Date(), { weekStartsOn });
  }

  return startOfWeek(parsed, { weekStartsOn });
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SchedulePageSearchParams>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const settings = await getUserSettings();
  const weekStartsOn = getWeekStartsOn(settings.payPeriodAnchor);
  const weekStart = resolveWeekStart(weekStartsOn, resolvedSearchParams.week);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn });

  const rows = await listShiftRecords({
    preset: "custom",
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
  });

  const rowsByDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = rowsByDate.get(row.shiftDate) ?? [];
    existing.push(row);
    rowsByDate.set(row.shiftDate, existing);
  }

  for (const [key, dayRows] of rowsByDate.entries()) {
    rowsByDate.set(
      key,
      [...dayRows].sort((a, b) => {
        const aTime = a.startTime ?? "99:99";
        const bTime = b.startTime ?? "99:99";
        return aTime.localeCompare(bTime);
      }),
    );
  }

  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const prevWeek = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Schedule
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Weekly agenda
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Review the week day by day, see shift roles and locations at a glance,
          and jump to add shifts on empty days.
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            href={`/schedule?week=${prevWeek}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Previous week
          </Link>
          <p className="text-sm font-semibold text-slate-900 sm:text-base">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
          <Link
            href={`/schedule?week=${nextWeek}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Next week
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayRows = rowsByDate.get(dateKey) ?? [];
          const dayTotal = dayRows.reduce(
            (sum, row) => sum + row.totalEarned,
            0,
          );

          return (
            <article
              key={dateKey}
              className="rounded-[1.35rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {format(day, "EEEE")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {format(day, "MMM d")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(dayTotal)}
                </p>
              </div>

              {dayRows.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <p>No shifts scheduled.</p>
                  <Link
                    href="/shifts/new"
                    className="mt-2 inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    Add shift
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dayRows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {row.startTime && row.endTime
                              ? `${row.startTime} - ${row.endTime}`
                              : `${row.hoursWorked.toFixed(2)} hrs`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {(row.role ?? "No role") +
                              " • " +
                              (row.location ?? "No location")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-950">
                            {formatCurrency(row.totalEarned)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(row.hourlyRate)}/hr
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
