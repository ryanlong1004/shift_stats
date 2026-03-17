import Link from "next/link";

import { ExportShiftsButton } from "@/components/export-shifts-button";
import { ShiftHistoryTable } from "@/components/shift-history-table";
import {
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";

type ShiftsPageSearchParams = {
  preset?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: string;
};

const filterPresets = [
  { value: "all", label: "All" },
  { value: "week", label: "Current week" },
  { value: "month", label: "Current month" },
  { value: "custom", label: "Custom" },
] as const;

const sortOptions = [
  { value: "date", label: "Date" },
  { value: "earnings", label: "Total earnings" },
  { value: "hours", label: "Hours worked" },
  { value: "hourlyRate", label: "Hourly rate" },
] as const;

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<ShiftsPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const preset: ShiftListFilters["preset"] =
    resolvedSearchParams.preset === "week" ||
    resolvedSearchParams.preset === "month" ||
    resolvedSearchParams.preset === "custom"
      ? resolvedSearchParams.preset
      : "all";
  const filters: ShiftListFilters = {
    preset,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
    location: resolvedSearchParams.location,
    role: resolvedSearchParams.role,
  };

  const [rows, allRows] = await Promise.all([
    listShiftRecords(filters),
    listShiftRecords(),
  ]);
  const locationOptions = Array.from(
    new Set(allRows.map((row) => row.location).filter(Boolean)),
  ) as string[];
  const roleOptions = Array.from(
    new Set(allRows.map((row) => row.role).filter(Boolean)),
  ) as string[];

  const sortBy = resolvedSearchParams.sortBy ?? "date";
  const sortOrder = (resolvedSearchParams.sortOrder ?? "desc") as
    | "asc"
    | "desc";

  const sortedRows = [...rows].sort((a, b) => {
    let aVal: number | string = "";
    let bVal: number | string = "";

    if (sortBy === "date") {
      aVal = a.shiftDate;
      bVal = b.shiftDate;
    } else if (sortBy === "earnings") {
      aVal = a.totalEarned;
      bVal = b.totalEarned;
    } else if (sortBy === "hours") {
      aVal = a.hoursWorked;
      bVal = b.hoursWorked;
    } else if (sortBy === "hourlyRate") {
      aVal = a.hourlyRate;
      bVal = b.hourlyRate;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "desc"
        ? bVal.localeCompare(aVal)
        : aVal.localeCompare(bVal);
    }

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sortOrder === "desc" ? bNum - aNum : aNum - bNum;
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Shift history
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            Shift history with filters
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            Filter by time range, location, and role. The table remains
            authenticated and user-scoped across both sample and database modes.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ExportShiftsButton
            filters={{
              preset: resolvedSearchParams.preset,
              startDate: resolvedSearchParams.startDate,
              endDate: resolvedSearchParams.endDate,
              location: resolvedSearchParams.location,
              role: resolvedSearchParams.role,
            }}
          />
          <Link
            href="/shifts/new"
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add shift
          </Link>
        </div>
      </section>

      <form
        method="GET"
        className="grid gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-5"
      >
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Preset</span>
          <select
            name="preset"
            defaultValue={preset}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            {filterPresets.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Start date</span>
          <input
            type="date"
            name="startDate"
            defaultValue={resolvedSearchParams.startDate ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">End date</span>
          <input
            type="date"
            name="endDate"
            defaultValue={resolvedSearchParams.endDate ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Location</span>
          <select
            name="location"
            defaultValue={resolvedSearchParams.location ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All locations</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Role</span>
          <select
            name="role"
            defaultValue={resolvedSearchParams.role ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All roles</option>
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-5 flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Apply filters
          </button>
          <Link
            href="/shifts"
            className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Current filter: {preset === "all" ? "All shifts" : preset}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Date range: {resolvedSearchParams.startDate ?? "-"} to{" "}
          {resolvedSearchParams.endDate ?? "-"}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Location: {resolvedSearchParams.location || "All"}
        </div>
        <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          Sort: {sortOptions.find((o) => o.value === sortBy)?.label || "Date"} (
          {sortOrder})
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <form
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          {/* Preserve filter params */}
          {resolvedSearchParams.preset && (
            <input
              type="hidden"
              name="preset"
              value={resolvedSearchParams.preset}
            />
          )}
          {resolvedSearchParams.startDate && (
            <input
              type="hidden"
              name="startDate"
              value={resolvedSearchParams.startDate}
            />
          )}
          {resolvedSearchParams.endDate && (
            <input
              type="hidden"
              name="endDate"
              value={resolvedSearchParams.endDate}
            />
          )}
          {resolvedSearchParams.location && (
            <input
              type="hidden"
              name="location"
              value={resolvedSearchParams.location}
            />
          )}
          {resolvedSearchParams.role && (
            <input
              type="hidden"
              name="role"
              value={resolvedSearchParams.role}
            />
          )}

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Sort by</span>
            <select
              name="sortBy"
              defaultValue={sortBy}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Order</span>
            <select
              name="sortOrder"
              defaultValue={sortOrder}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Apply sort
          </button>
        </form>
      </div>

      <ShiftHistoryTable rows={sortedRows} />
    </div>
  );
}
