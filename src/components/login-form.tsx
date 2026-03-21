"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginFormProps = {
  defaultEmail?: string;
  defaultPassword?: string;
};

export function LoginForm({
  defaultEmail = "",
  defaultPassword = "",
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      // next-auth v5 beta.25: when redirect:false, it calls new URL(data.url)
      // which throws if the server returns a relative URL. Passing an absolute
      // callbackUrl ensures the server echoes it back as absolute.
      const absoluteCallbackUrl = callbackUrl.startsWith("http")
        ? callbackUrl
        : `${window.location.origin}${callbackUrl.startsWith("/") ? "" : "/"}${callbackUrl}`;

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: absoluteCallbackUrl,
      });

      if (!result || result.status === 429) {
        setError(
          "Too many sign-in attempts. Wait a few minutes and try again.",
        );
        return;
      }

      if (result.error) {
        setError(
          "Sign-in failed. Check the configured credentials and try again.",
        );
        return;
      }

      router.push(result.url ?? callbackUrl);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          required
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <div className="space-y-2 text-sm text-slate-600">
        <p className="text-left sm:text-right">
          <Link
            href="/forgot-password"
            className="font-medium text-slate-950 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </p>

        <p className="text-left sm:text-right">
          <Link
            href="/resend-verification"
            className="font-medium text-slate-950 underline-offset-4 hover:underline"
          >
            Need a new verification link?
          </Link>
        </p>

        <p className="text-left">
          Need an account?{" "}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-slate-950 underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}
