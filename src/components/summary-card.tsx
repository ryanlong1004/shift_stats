import { formatCurrency, formatDecimal } from "@/lib/formatters";

export function SummaryCard({
  label,
  value,
  tone = "light",
  kind = "currency",
}: {
  label: string;
  value: number;
  tone?: "light" | "dark";
  kind?: "currency" | "decimal" | "number";
}) {
  const formatted =
    kind === "currency"
      ? formatCurrency(value)
      : kind === "decimal"
        ? formatDecimal(value)
        : String(value);

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
    </div>
  );
}
