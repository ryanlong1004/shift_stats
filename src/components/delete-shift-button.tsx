"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteShiftButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this shift? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/shifts/${encodeURIComponent(shiftId)}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          setError(payload.message ?? "Unable to delete this shift right now.");
          return;
        }

        router.refresh();
      } catch {
        setError("The request failed before the shift could be deleted.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center rounded-full border border-rose-300/60 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
