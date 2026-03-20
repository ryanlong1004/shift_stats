import { formatCurrency, formatDecimal } from "@/lib/formatters";

export function SummaryCard({
  label,
  value,
  tone = "light",
  kind = "currency",
  delta,
}: {
  label: string;
  value: number;
  tone?: "light" | "dark";
  kind?: "currency" | "decimal" | "number";
  delta?: { prev: number; label?: string };
}) {
  const formatted =
    kind === "currency"
      ? formatCurrency(value)
      : kind === "decimal"
        ? formatDecimal(value)
        : String(value);

  const deltaAmount = delta ? value - delta.prev : null;
  const deltaPct =
    delta && delta.prev > 0 ? ((value - delta.prev) / delta.prev) * 100 : null;
  const isUp = deltaAmount !== null && deltaAmount >= 0;

  return (
    <div
      className={`rounded-[1.5rem] border px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] ${
        tone === "dark"
          ? "border-slate-900/10 bg-slate-950 text-white"
          : "border-slate-900/10 bg-white/80 text-slate-950"
      }`}
    >
      <p
        className={`text-sm ${tone === "dark" ? "text-slate-300" : "text-slate-600"}`}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{formatted}</p>
      {delta && deltaAmount !== null && delta.prev > 0 ? (
        <p
          className={`mt-2 text-xs font-medium ${
            isUp ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {isUp ? "▲" : "▼"} {formatCurrency(Math.abs(deltaAmount))}
          {deltaPct !== null
            ? ` (${isUp ? "+" : ""}${deltaPct.toFixed(0)}%)`
            : ""}
          {delta.label ? (
            <span className="ml-1 font-normal text-slate-400">
              {delta.label}
            </span>
          ) : null}
        </p>
      ) : delta && delta.prev === 0 ? (
        <p className="mt-2 text-xs text-slate-400">No prior period data</p>
      ) : null}
    </div>
  );
}
