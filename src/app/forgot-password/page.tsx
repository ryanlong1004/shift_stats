import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a password reset link for your Shiftstats account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%),linear-gradient(135deg,_#fff6e7_0%,_#f3efe7_36%,_#dbe9f4_100%)] px-6 py-10 text-slate-900 sm:px-10 lg:px-14">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
            Password reset
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Reset your password securely.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
            Enter your account email and we will generate a password reset link.
            For privacy, the same confirmation message is returned whether or
            not the email exists.
          </p>
        </div>

        <ForgotPasswordForm />
      </section>
    </main>
  );
}
