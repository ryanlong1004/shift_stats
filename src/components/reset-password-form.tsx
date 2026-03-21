"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok) {
        setError(
          payload.message ??
            payload.fieldErrors?.confirmPassword?.[0] ??
            payload.fieldErrors?.password?.[0] ??
            payload.fieldErrors?.token?.[0] ??
            "Unable to reset password.",
        );
        return;
      }

      setStatus(payload.message ?? "Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login");
      }, 800);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

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
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Updating..." : "Update password"}
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
