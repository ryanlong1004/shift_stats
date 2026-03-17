"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";

type EarningsPoint = {
  label: string;
  earned: number;
  hourlyRate: number;
};

export function EarningsTrendChart({ data }: { data: EarningsPoint[] }) {
  return (
    <div className="h-[320px] w-full rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-medium text-slate-600">
        Earnings and hourly rate
      </p>
      <div className="mt-4 h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              vertical={false}
            />
            <XAxis dataKey="label" stroke="#475569" />
            <YAxis yAxisId="left" stroke="#475569" />
            <YAxis yAxisId="right" orientation="right" stroke="#475569" />
            <Tooltip />
            <Bar
              yAxisId="left"
              dataKey="earned"
              fill="#0f172a"
              radius={[8, 8, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hourlyRate"
              stroke="#d97706"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
