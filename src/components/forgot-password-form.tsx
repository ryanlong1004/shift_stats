"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus(null);
    setResetUrl(null);

    startTransition(async () => {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as {
        message?: string;
        resetUrl?: string;
      };

      setStatus(
        payload.message ??
          "If an account exists for that email, a reset link has been generated.",
      );

      if (payload.resetUrl) {
        setResetUrl(payload.resetUrl);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
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
          autoComplete="email"
          required
        />
      </div>

      {status ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p>{status}</p>
          {resetUrl ? (
            <p className="mt-2 break-all">
              Dev reset link:{" "}
              <Link
                href={resetUrl}
                className="font-medium underline underline-offset-4"
              >
                {resetUrl}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Sending..." : "Send reset link"}
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
    </form>
  );
}
