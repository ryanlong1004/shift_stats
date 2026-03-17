"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type ExportShiftsButtonProps = {
  filters?: {
    preset?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    role?: string;
  };
};

export function ExportShiftsButton({ filters }: ExportShiftsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  async function handleExport() {
    setIsExporting(true);

    try {
      const response = await fetch("/api/shifts/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...filters,
          includeNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("content-disposition")
          ?.split('filename="')[1]
          ?.split('"')[0] ||
        `shifts-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowOptions(false);
    } catch {
      alert("Failed to export shifts. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>

      {showOptions ? (
        <div className="absolute right-0 top-full mt-2 z-10 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(event) => setIncludeNotes(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Include notes</span>
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting ? "Exporting..." : "Download"}
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
