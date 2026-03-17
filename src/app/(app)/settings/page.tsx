export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          User settings placeholder
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          These are the MVP settings targets from the spec. Persistence and
          user-scoped state will land after auth and database routes are wired.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettingCard label="Currency" value="USD" />
        <SettingCard label="Timezone" value="America/Chicago" />
        <SettingCard label="Track base pay" value="Enabled" />
        <SettingCard label="Split cash and card" value="Enabled" />
      </section>
    </div>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/80 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
