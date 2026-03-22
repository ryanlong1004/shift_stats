import { AccountForm } from "@/components/account-form";
import { SettingsForm } from "@/components/settings-form";
import { getUserSettings } from "@/lib/settings-repository";
import { getAccountProfile } from "@/lib/account-repository";

export default async function SettingsPage() {
  const [settings, profile] = await Promise.all([
    getUserSettings(),
    getAccountProfile(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          User preferences
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Update your currency preference, timezone, and shift tracking options.
          Settings are saved to your account and used across all views.
        </p>
      </section>

      <AccountForm initialProfile={profile} />
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
