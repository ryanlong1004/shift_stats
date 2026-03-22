"use client";

import dynamic from "next/dynamic";

const WeekdayPerformanceChart = dynamic(
  () =>
    import("@/components/charts/weekday-performance-chart").then(
      (module) => module.WeekdayPerformanceChart,
    ),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

export function LazyWeekdayPerformanceChart({
  data,
}: {
  data: Array<{
    label: string;
    hourlyRate: number;
    location: string | null;
    role: string | null;
    shiftType: string | null;
  }>;
}) {
  return <WeekdayPerformanceChart data={data} />;
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full animate-pulse rounded-[1.5rem] border border-slate-900/10 bg-white/70" />
  );
}
