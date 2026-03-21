"use client";

import dynamic from "next/dynamic";

const CompareEarningsTrendChart = dynamic(
  () =>
    import("@/components/charts/compare-earnings-trend-chart").then(
      (m) => m.CompareEarningsTrendChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full animate-pulse rounded-[1.5rem] border border-slate-900/10 bg-white/70" />
    ),
  },
);

type EarningsPoint = {
  label: string;
  weekday: string;
  earned: number;
  hourlyRate: number;
};

export function LazyCompareEarningsTrendChart({
  data,
  prevData,
}: {
  data: EarningsPoint[];
  prevData: EarningsPoint[];
}) {
  return <CompareEarningsTrendChart data={data} prevData={prevData} />;
}
