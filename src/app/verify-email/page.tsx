import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { VerifyEmailForm } from "@/components/verify-email-form";

type VerifyEmailPageSearchParams = {
  token?: string;
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<VerifyEmailPageSearchParams>;
}) {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token?.trim() ?? "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%),linear-gradient(135deg,_#fff6e7_0%,_#f3efe7_36%,_#dbe9f4_100%)] px-6 py-10 text-slate-900 sm:px-10 lg:px-14">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
            Email verification
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Verify your account email.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
            Complete verification to activate credential sign-in when email
            verification is enabled.
          </p>
        </div>

        {token ? (
          <VerifyEmailForm token={token} />
        ) : (
          <div className="space-y-4 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="font-medium">Verification token is missing.</p>
            <p>Open this page using the full email verification link.</p>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 font-medium text-white"
            >
              Back to signup
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
