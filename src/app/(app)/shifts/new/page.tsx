import { ShiftForm } from "@/components/shift-form";
import { isDatabaseConfigured } from "@/lib/shift-repository";

export default function NewShiftPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Add Shift
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Add a new shift
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Enter your shift details to calculate total earnings and hourly rate
          before saving.
        </p>
      </section>

      <ShiftForm mode="create" persistenceEnabled={isDatabaseConfigured()} />
    </div>
  );
}
