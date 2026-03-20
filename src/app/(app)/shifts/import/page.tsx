import { ImportShiftsForm } from "@/components/import-shifts-form";
import { isDatabaseConfigured } from "@/lib/shift-repository";

export default function ImportShiftsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Import CSV
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Import shifts from CSV
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Upload a Shiftstats export file or paste CSV content to create shifts
          in bulk.
        </p>
        {!isDatabaseConfigured() ? (
          <p className="mt-3 text-sm text-amber-700">
            Import is unavailable until `DATABASE_URL` is configured.
          </p>
        ) : null}
      </section>

      <ImportShiftsForm />
    </div>
  );
}
