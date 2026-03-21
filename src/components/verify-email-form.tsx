"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type VerifyEmailFormProps = {
  token: string;
};

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    setError(null);
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/email-verification/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok) {
        setError(
          payload.message ??
            payload.fieldErrors?.token?.[0] ??
            "Unable to verify email.",
        );
        return;
      }

      setStatus(payload.message ?? "Email verified successfully.");
      setTimeout(() => {
        router.push("/login");
      }, 800);
    });
  }

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {status ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {status}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleVerify}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Verifying..." : "Verify email"}
      </button>

      <p className="text-sm text-slate-600">
        Back to{" "}
        <Link
          href="/login"
          className="font-medium text-slate-950 underline-offset-4 hover:underline"
        >
          sign in
        </Link>
      </p>
    </div>
  );
}
