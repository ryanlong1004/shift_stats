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

type WeekdayPoint = {
  label: string;
  hourlyRate: number;
};

export function WeekdayPerformanceChart({ data }: { data: WeekdayPoint[] }) {
  return (
    <div className="h-[320px] w-full rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-medium text-slate-600">Weekday performance</p>
      <div className="mt-4 h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              vertical={false}
            />
            <XAxis dataKey="label" stroke="#475569" />
            <YAxis stroke="#475569" />
            <Tooltip />
            <Bar dataKey="hourlyRate" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
