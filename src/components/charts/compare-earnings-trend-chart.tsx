"use client";

import { useState } from "react";
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
import { formatCurrency } from "@/lib/formatters";

type EarningsPoint = {
  label: string;
  weekday: string;
  earned: number;
  hourlyRate: number;
  location: string | null;
  role: string | null;
  shiftType: string | null;
  isAnomaly?: boolean;
  anomalyReasons?: string[];
};

function formatShiftLabel(value: string | null) {
  return value && value.trim().length > 0 ? value : "Unspecified";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: EarningsPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{payload[0].payload.label}</p>
      <p className="text-slate-400">{payload[0].payload.weekday}</p>
      <p className="text-slate-300">
        Role: {formatShiftLabel(payload[0].payload.role)}
      </p>
      <p className="text-slate-300">
        Location: {formatShiftLabel(payload[0].payload.location)}
      </p>
      <p className="text-slate-300">
        Shift type: {formatShiftLabel(payload[0].payload.shiftType)}
      </p>
      {payload[0].payload.isAnomaly ? (
        <p className="text-rose-300">
          Anomaly: {(payload[0].payload.anomalyReasons ?? []).join(" + ")}
        </p>
      ) : null}
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-300">
          {entry.dataKey === "earned"
            ? "Earnings"
            : entry.dataKey === "hourlyRate"
              ? "Hourly Rate"
              : entry.dataKey === "prevEarned"
                ? "Prev Earnings"
                : "Prev Rate"}
          : {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

type MergedPoint = {
  label: string;
  weekday: string;
  earned: number;
  hourlyRate: number;
  location: string | null;
  role: string | null;
  shiftType: string | null;
  isAnomaly?: boolean;
  anomalyReasons?: string[];
  anomalyEarned?: number;
  prevEarned?: number;
  prevHourlyRate?: number;
};

function mergeData(
  current: EarningsPoint[],
  prev: EarningsPoint[],
): MergedPoint[] {
  const maxLen = Math.max(current.length, prev.length);
  return Array.from({ length: maxLen }, (_, i) => ({
    label: current[i]?.label ?? prev[i]?.label ?? `${i + 1}`,
    weekday: current[i]?.weekday ?? prev[i]?.weekday ?? "",
    earned: current[i]?.earned ?? 0,
    hourlyRate: current[i]?.hourlyRate ?? 0,
    location: current[i]?.location ?? prev[i]?.location ?? null,
    role: current[i]?.role ?? prev[i]?.role ?? null,
    shiftType: current[i]?.shiftType ?? prev[i]?.shiftType ?? null,
    isAnomaly: current[i]?.isAnomaly ?? false,
    anomalyReasons: current[i]?.anomalyReasons ?? [],
    anomalyEarned: current[i]?.isAnomaly ? current[i].earned : undefined,
    prevEarned: prev[i]?.earned,
    prevHourlyRate: prev[i]?.hourlyRate,
  }));
}

export function CompareEarningsTrendChart({
  data,
  prevData,
}: {
  data: EarningsPoint[];
  prevData: EarningsPoint[];
}) {
  const [compare, setCompare] = useState(false);

  const chartData: MergedPoint[] = compare
    ? mergeData(data, prevData)
    : data.map((point) => ({
        ...point,
        isAnomaly: point.isAnomaly ?? false,
        anomalyReasons: point.anomalyReasons ?? [],
        anomalyEarned: point.isAnomaly ? point.earned : undefined,
      }));
  const hasPrev = prevData.length > 0;

  const formatAxisCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value)}`;
  };

  return (
    <div className="h-[360px] w-full rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:h-[380px]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">
          Earnings and hourly rate
        </p>
        {hasPrev && (
          <button
            onClick={() => setCompare((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              compare
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {compare ? "Comparing" : "Compare"}
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> Earnings
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Hourly rate
        </span>
        {compare && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Prev
            earnings
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Anomaly
          marker
        </span>
      </div>
      <div className="mt-3 h-[270px] w-full sm:h-[288px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={260}
        >
          <ComposedChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#475569"
              tick={{ fontSize: 11 }}
              minTickGap={14}
            />
            <YAxis
              yAxisId="left"
              stroke="#475569"
              width={44}
              tick={{ fontSize: 11 }}
              tickFormatter={formatAxisCurrency}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#475569"
              width={44}
              tick={{ fontSize: 11 }}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
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
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="anomalyEarned"
              stroke="transparent"
              dot={{ r: 5, fill: "#f43f5e", stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{
                r: 6,
                fill: "#e11d48",
                stroke: "#fff",
                strokeWidth: 1.5,
              }}
              connectNulls={false}
            />
            {compare && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevEarned"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
