"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Service disruption
              </p>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              We&rsquo;re having trouble connecting
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Shiftstats can&rsquo;t reach the database right now. This is
              usually a temporary outage. Your data is safe — please try again
              in a few minutes.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <a
                href="https://neonstatus.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
      </body>
    </html>
  );
}
