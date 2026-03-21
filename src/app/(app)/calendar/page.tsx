import Link from "next/link";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from "date-fns";

import { formatCurrency } from "@/lib/formatters";
import { listShiftRecords } from "@/lib/shift-repository";

type CalendarPageSearchParams = {
  month?: string;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveMonth(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return startOfMonth(new Date());
  }

  const parsed = parse(`${value}-01`, "yyyy-MM-dd", new Date());
  return startOfMonth(parsed);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const monthStart = resolveMonth(resolvedSearchParams.month);
  const monthEnd = endOfMonth(monthStart);

  const rows = await listShiftRecords({
    preset: "custom",
    startDate: format(monthStart, "yyyy-MM-dd"),
    endDate: format(monthEnd, "yyyy-MM-dd"),
  });

  const totalsByDate = new Map<string, number>();
  for (const row of rows) {
    totalsByDate.set(
      row.shiftDate,
      (totalsByDate.get(row.shiftDate) ?? 0) + row.totalEarned,
    );
  }

  const maxTotal = Math.max(...Array.from(totalsByDate.values()), 0);

  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays: Date[] = [];

  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    calendarDays.push(day);
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Calendar
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Monthly earnings map
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Scan daily totals by month. Darker bars indicate higher earnings for
          the month. Select a day to jump into filtered shift history.
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            href={`/calendar?month=${prevMonth}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Previous month
          </Link>
          <p className="text-lg font-semibold text-slate-950">
            {format(monthStart, "MMMM yyyy")}
          </p>
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Next month
          </Link>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="mb-3 grid grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTotal = totalsByDate.get(dateKey) ?? 0;
            const intensity = maxTotal > 0 ? dayTotal / maxTotal : 0;
            const inMonth = isSameMonth(day, monthStart);
            const barWidth = dayTotal > 0 ? Math.max(12, Math.round(intensity * 100)) : 0;

            return (
              <Link
                key={dateKey}
                href={`/shifts?preset=custom&startDate=${dateKey}&endDate=${dateKey}`}
                className={`min-h-24 rounded-xl border px-2 py-2 transition sm:min-h-28 sm:px-3 ${
                  inMonth
                    ? "border-slate-200 bg-white hover:border-slate-900/30 hover:shadow-sm"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-semibold ${inMonth ? "text-slate-700" : "text-slate-400"}`}>
                    {format(day, "d")}
                  </span>
                  <span className={`text-[10px] ${inMonth ? "text-slate-500" : "text-slate-400"}`}>
                    {format(day, "EEE")}
                  </span>
                </div>

                <p className={`mt-3 text-xs sm:text-sm ${inMonth ? "text-slate-900" : "text-slate-400"}`}>
                  {dayTotal > 0 ? formatCurrency(dayTotal) : "No shifts"}
                </p>

                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-slate-900"
                    style={{ width: `${barWidth}%`, opacity: dayTotal > 0 ? 0.35 + intensity * 0.65 : 0 }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
