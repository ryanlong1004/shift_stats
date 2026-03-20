"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

const exampleHeaders = [
  "Date",
  "Hours Worked",
  "Total Earned",
  "Hourly Rate",
  "Cash Tips",
  "Card Tips",
  "Base Pay",
  "Other Income",
  "Location",
  "Role",
];

export function ImportShiftsForm() {
  const [csvText, setCsvText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lineCount = useMemo(() => {
    const trimmed = csvText.trim();
    return trimmed ? trimmed.split(/\r?\n/).length : 0;
  }, [csvText]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setStatusMessage(null);
    setWarnings([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setWarnings([]);

    try {
      const response = await fetch("/api/shifts/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvText }),
      });

      const payload = (await response.json()) as {
        message?: string;
        count?: number;
        warnings?: string[];
      };

      if (!response.ok) {
        setStatusMessage(payload.message ?? "Import failed.");
        return;
      }

      setWarnings(payload.warnings ?? []);
      setStatusMessage(`Imported ${payload.count ?? 0} shifts successfully.`);
      setCsvText("");
    } catch {
      setStatusMessage(
        "Import request failed before the file could be processed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
      >
        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Upload CSV file
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Or paste CSV content
            </span>
            <textarea
              rows={14}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder="Paste the exported CSV here"
              className="min-h-64 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {lineCount > 0
              ? `${lineCount} CSV lines loaded.`
              : "No CSV loaded yet."}
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !csvText.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Upload className="h-4 w-4" />
            {isSubmitting ? "Importing..." : "Import shifts"}
          </button>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {statusMessage}
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Import warnings</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>

      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Accepted format
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Use the export CSV layout
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This importer is designed for the current Shiftstats export format.
            It accepts dollar-formatted money fields and blank location or role
            cells.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-200">
            {exampleHeaders.join(", ")}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Notes
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>Hours are imported in total-hours mode.</li>
            <li>
              Total earned and hourly rate are recalculated from pay fields
              during import.
            </li>
            <li>Optional Notes column is supported if present.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
