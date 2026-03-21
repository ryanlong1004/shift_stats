"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/formatters";
import type { GoalProgress } from "@/lib/goals-progress";
import type { GoalPeriod, GoalMetric } from "@/lib/goals-repository";

const periodLabels: Record<GoalPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const metricLabels: Record<GoalMetric, string> = {
  takeHome: "Take-home",
  hours: "Hours",
  avgHourly: "Avg $/hr",
};

function formatValue(metric: GoalMetric, value: number) {
  if (metric === "hours") return `${value.toFixed(2)} hrs`;
  return formatCurrency(value);
}

function GoalDonut({ goal }: { goal: GoalProgress }) {
  const filled = Math.min(goal.pct, 100);
  const remaining = 100 - filled;
  const done = goal.pct >= 100;
  const color = done ? "#16a34a" : goal.pct >= 60 ? "#ca8a04" : "#0f172a";

  const data = [
    { name: "Progress", value: filled },
    { name: "Remaining", value: remaining > 0 ? remaining : 0 },
  ];

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {periodLabels[goal.period]}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">
        {metricLabels[goal.metricType]}
      </p>

      <div className="relative mt-3 h-28 w-28">
        <PieChart width={112} height={112}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={52}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="#e2e8f0" />
          </Pie>
          <Tooltip
            formatter={(val, name) => {
              const num = typeof val === "number" ? val : Number(val ?? 0);
              return name === "Progress"
                ? [`${num.toFixed(1)}%`, "Progress"]
                : [`${num.toFixed(1)}%`, "Remaining"];
            }}
          />
        </PieChart>
        {/* centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none text-slate-950">
            {goal.pct.toFixed(0)}%
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        {formatValue(goal.metricType, goal.current)}{" "}
        <span className="text-slate-400">
          / {formatValue(goal.metricType, goal.targetValue)}
        </span>
      </p>
    </div>
  );
}

export function GoalProgressPanel({ goals }: { goals: GoalProgress[] }) {
  if (goals.length === 0) return null;

  return (
    <section className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-semibold text-slate-700">Goal progress</p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {goals.map((g) => (
          <GoalDonut key={g.id} goal={g} />
        ))}
      </div>
    </section>
  );
}
