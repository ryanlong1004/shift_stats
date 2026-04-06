import { listGoals } from "@/lib/goals-repository";
import { GoalsClient } from "@/components/goals-client";

export default async function GoalsPage() {
  const goals = await listGoals();

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Goals
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Earnings &amp; hours targets
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-8">
          Set daily, weekly, monthly, or yearly targets for take-home pay, hours
          worked, or average hourly rate. Progress is shown on the dashboard and
          analytics pages.
        </p>
      </section>

      <GoalsClient initialGoals={goals} />
    </div>
  );
}
