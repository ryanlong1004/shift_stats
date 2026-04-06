import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ContactForm } from "@/components/contact-form";
import { getAccountProfile } from "@/lib/account-repository";
import { isMailerConfigured } from "@/lib/mailer";

export default async function ContactPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const profile = await getAccountProfile();
  const mailerReady = isMailerConfigured();

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Contact
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-8">
          Report a bug, request a feature, or ask a question. We&apos;ll get
          back to you as soon as possible.
        </p>
      </section>

      {mailerReady ? (
        <ContactForm defaultEmail={profile.email} defaultName={profile.name} />
      ) : (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-900 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <p className="font-semibold">Contact form unavailable</p>
          <p className="mt-1">
            Email delivery is not configured on this instance. Please contact
            the administrator directly.
          </p>
        </div>
      )}
    </div>
  );
}
