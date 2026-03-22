"use client";

import dynamic from "next/dynamic";

const EarningsTrendChart = dynamic(
  () =>
    import("@/components/charts/earnings-trend-chart").then(
      (module) => module.EarningsTrendChart,
    ),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

export function LazyEarningsTrendChart({
  data,
}: {
  data: Array<{
    label: string;
    weekday: string;
    earned: number;
    hourlyRate: number;
    location: string | null;
    role: string | null;
    shiftType: string | null;
  }>;
}) {
  return <EarningsTrendChart data={data} />;
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full animate-pulse rounded-[1.5rem] border border-slate-900/10 bg-white/70" />
  );
}
