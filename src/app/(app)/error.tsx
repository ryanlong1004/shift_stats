"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_36%),linear-gradient(135deg,#fff6e7_0%,#f3efe7_36%,#dbe9f4_100%)] px-6">
      <div className="w-full max-w-md overflow-hidden rounded-4xl border border-white/70 bg-white/70 px-8 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Service disruption
          </p>
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          We&rsquo;re having trouble connecting
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Shiftstats can&rsquo;t reach the database right now. This is usually a
          temporary issue with our database provider. Your data is safe — please
          try again in a few minutes.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="https://neonstatus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Check status page
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
