"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type DashboardFilterFormProps = {
  preset: string;
  startDate?: string;
  endDate?: string;
};

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getLastWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysToLastMonday = day === 0 ? 13 : day + 6;
  const start = new Date(now);
  start.setDate(now.getDate() - daysToLastMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function DashboardFilterForm({
  preset,
  startDate = "",
  endDate = "",
}: DashboardFilterFormProps) {
  const router = useRouter();
  const [showCustomForm, setShowCustomForm] = useState(preset === "custom");
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const lastWeekRange = getLastWeekRange();
  const lastMonthRange = getLastMonthRange();
  const isLastWeek =
    preset === "custom" &&
    startDate === lastWeekRange.startDate &&
    endDate === lastWeekRange.endDate;
  const isLastMonth =
    preset === "custom" &&
    startDate === lastMonthRange.startDate &&
    endDate === lastMonthRange.endDate;

  function pushCustomRange(range: { startDate: string; endDate: string }) {
    const params = new URLSearchParams();
    params.set("preset", "custom");
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);
    router.push(`/dashboard?${params.toString()}`);
  }

  function handleApplyCustom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("preset", "custom");
    if (localStartDate) params.set("startDate", localStartDate);
    if (localEndDate) params.set("endDate", localEndDate);
    router.push(`/dashboard?${params.toString()}`);
  }

  function handleClearCustom() {
    router.push("/dashboard");
  }

  const chipClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-slate-950 text-white"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-4">
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: "All time" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
            { value: "pay", label: "Pay period" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => router.push(`/dashboard?preset=${chip.value}`)}
            className={chipClass(
              preset === chip.value && !isLastWeek && !isLastMonth,
            )}
          >
            {chip.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => pushCustomRange(lastWeekRange)}
          className={chipClass(isLastWeek)}
        >
          Last week
        </button>

        <button
          type="button"
          onClick={() => pushCustomRange(lastMonthRange)}
          className={chipClass(isLastMonth)}
        >
          Last month
        </button>

        <button
          type="button"
          onClick={() => setShowCustomForm(!showCustomForm)}
          className={chipClass(
            preset === "custom" && !isLastWeek && !isLastMonth,
          )}
        >
          Custom
        </button>
      </div>

      {showCustomForm && (
        <form
          onSubmit={handleApplyCustom}
          className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Start date</span>
              <input
                type="date"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">End date</span>
              <input
                type="date"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
            {preset === "custom" && (
              <button
                type="button"
                onClick={handleClearCustom}
                className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
