"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { formatCurrency } from "@/lib/formatters";
import type {
  GoalRecord,
  GoalPeriod,
  GoalMetric,
} from "@/lib/goals-repository";
import { GOAL_PERIODS, GOAL_METRICS } from "@/lib/goals-repository";

const periodLabels: Record<GoalPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const metricLabels: Record<GoalMetric, string> = {
  takeHome: "Take-home pay ($)",
  hours: "Hours worked",
  avgHourly: "Avg hourly rate ($/hr)",
};

function metricUnit(metric: GoalMetric) {
  return metric === "hours" ? "hrs" : "$";
}

function formatGoalValue(metric: GoalMetric, value: number) {
  if (metric === "hours") {
    return `${value.toFixed(2)} hrs`;
  }
  return formatCurrency(value);
}

export function GoalsClient({ initialGoals }: { initialGoals: GoalRecord[] }) {
  const [goals, setGoals] = useState<GoalRecord[]>(initialGoals);
  const [period, setPeriod] = useState<GoalPeriod>("weekly");
  const [metricType, setMetricType] = useState<GoalMetric>("takeHome");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numeric = parseFloat(targetValue);
    if (isNaN(numeric) || numeric <= 0) {
      setError("Target must be a positive number.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, metricType, targetValue: numeric }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to save goal.");
        return;
      }

      const data = await res.json();
      setGoals((prev) => {
        const existing = prev.findIndex(
          (g) =>
            g.period === data.goal.period &&
            g.metricType === data.goal.metricType,
        );
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = data.goal;
          return next;
        }
        return [...prev, data.goal];
      });
      setTargetValue("");
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });

      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    });
  }

  const cardClass =
    "rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      {/* Add / Edit goal form */}
      <div className={cardClass}>
        <p className="text-sm font-semibold text-slate-700">
          Add or update a goal
        </p>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <label className="block space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Period</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
            >
              {GOAL_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {periodLabels[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Metric</span>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as GoalMetric)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
            >
              {GOAL_METRICS.map((m) => (
                <option key={m} value={m}>
                  {metricLabels[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">
              Target ({metricUnit(metricType)})
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={metricType === "hours" ? "e.g. 35" : "e.g. 600"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save goal"}
          </button>
        </form>
      </div>

      {/* Goals list */}
      <div className={cardClass}>
        <p className="text-sm font-semibold text-slate-700">Active goals</p>
        {goals.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No goals set yet. Use the form to add your first target.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {periodLabels[goal.period]} —{" "}
                    {metricLabels[goal.metricType]}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Target: {formatGoalValue(goal.metricType, goal.targetValue)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={isPending}
                  className="ml-4 rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  aria-label="Delete goal"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
