"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

type WeekdayPoint = {
  label: string;
  hourlyRate: number;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: WeekdayPoint }>;
}

function CustomWeekdayTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">
        <p className="font-medium">{payload[0].payload.label}</p>
        <p className="text-slate-300">
          Hourly Rate: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export function WeekdayPerformanceChart({ data }: { data: WeekdayPoint[] }) {
  const formatAxisCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }

    return `$${Math.round(value)}`;
  };

  return (
    <div className="h-[340px] w-full rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:h-[360px]">
      <p className="text-sm font-medium text-slate-600">Weekday performance</p>
      <p className="mt-1 text-xs text-slate-400">Tap bars for exact values</p>
      <div className="mt-3 h-[260px] w-full sm:h-[280px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={260}
        >
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              vertical={false}
            />
            <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="#475569"
              width={44}
              tick={{ fontSize: 11 }}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip content={<CustomWeekdayTooltip />} />
            <Bar dataKey="hourlyRate" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
