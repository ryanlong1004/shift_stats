"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DeleteShiftButtonProps = {
  shiftId: string;
  shiftDate?: string;
};

export function DeleteShiftButton({
  shiftId,
  shiftDate,
}: DeleteShiftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestDelete() {
    setIsConfirming(true);
    setError(null);
  }

  function cancelDelete() {
    setIsConfirming(false);
    setError(null);
  }

  function confirmDelete() {
    setIsConfirming(false);

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
      {isConfirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={confirmDelete}
            disabled={isPending}
            className="inline-flex items-center rounded-full border border-rose-300/60 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Confirm delete
          </button>
          <button
            type="button"
            onClick={cancelDelete}
            disabled={isPending}
            className="inline-flex items-center rounded-full border border-slate-300/60 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={requestDelete}
          disabled={isPending}
          aria-label={
            shiftDate ? `Delete shift on ${shiftDate}` : "Delete shift"
          }
          className="inline-flex items-center rounded-full border border-rose-300/60 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      )}

      {isConfirming ? (
        <p className="text-xs text-rose-600">Delete this shift permanently?</p>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
