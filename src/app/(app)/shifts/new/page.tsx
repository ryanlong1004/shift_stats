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
          Shift form shell
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          The MVP form is now wired for the roadmap field list, validation
          rules, and live calculations. Persistence is the next step once
          database-backed route handlers are in place.
        </p>
      </section>

      <ShiftForm mode="create" persistenceEnabled={isDatabaseConfigured()} />
    </div>
  );
}
