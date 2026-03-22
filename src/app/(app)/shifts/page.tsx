import Link from "next/link";
import { redirect } from "next/navigation";

import { ExportShiftsButton } from "@/components/export-shifts-button";
import { ShiftHistoryTable } from "@/components/shift-history-table";
import { auth } from "@/auth";
import {
  buildClearFiltersHref,
  buildPresetHref,
  buildShiftsHref,
  pageSizeOptions,
  parseShiftsQueryState,
  type ShiftsPageSearchParams,
} from "@/lib/shifts-query-state";
import {
  listShiftRecords,
  type ShiftListFilters,
} from "@/lib/shift-repository";
import { getUserSettings } from "@/lib/settings-repository";

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
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const settings = await getUserSettings();
  const queryState = parseShiftsQueryState(resolvedSearchParams);
  const preset: ShiftListFilters["preset"] = queryState.preset;
  const filters: ShiftListFilters = {
    preset,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
    location: resolvedSearchParams.location,
    role: resolvedSearchParams.role,
    shiftType: resolvedSearchParams.shiftType,
    payPeriodSettings: {
      type: settings.payPeriodType,
      anchor: settings.payPeriodAnchor,
    },
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
  const shiftTypeOptions = Array.from(
    new Set(allRows.map((row) => row.shiftType).filter(Boolean)),
  ) as string[];

  const sortBy = queryState.sortBy;
  const sortOrder = queryState.sortOrder;
  const currentPage = queryState.page;
  const pageSize = queryState.pageSize;

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

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = sortedRows.slice(startIndex, startIndex + pageSize);
  const rangeStart = totalRows === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, totalRows);

  const currentListHref = buildShiftsHref(
    resolvedSearchParams,
    queryState,
    safePage,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Shift history
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Shift history
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            Filter by time range, location, role, and shift type to quickly find
            the shifts you need.
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
              shiftType: resolvedSearchParams.shiftType,
            }}
          />
          <Link
            href="/shifts/import"
            className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Import CSV
          </Link>
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
        className="grid gap-4 rounded-3xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-6"
      >
        <input type="hidden" name="sortBy" value={sortBy} />
        <input type="hidden" name="sortOrder" value={sortOrder} />
        <input type="hidden" name="pageSize" value={String(pageSize)} />
        <input type="hidden" name="page" value="1" />

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

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Shift type</span>
          <select
            name="shiftType"
            defaultValue={resolvedSearchParams.shiftType ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-900"
          >
            <option value="">All shift types</option>
            {shiftTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-6 flex items-center gap-3">
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

      <section className="space-y-3 rounded-[1.25rem] border border-slate-900/10 bg-white/85 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] md:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Quick filters
          </p>
          <Link
            href={buildClearFiltersHref(queryState)}
            className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            Reset
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildPresetHref(resolvedSearchParams, queryState, "all")}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              preset === "all"
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All
          </Link>
          <Link
            href={buildPresetHref(resolvedSearchParams, queryState, "week")}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              preset === "week"
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            This week
          </Link>
          <Link
            href={buildPresetHref(resolvedSearchParams, queryState, "month")}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              preset === "month"
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            This month
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Use the full filter form above for custom dates, location, and role.
        </p>
      </section>

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

      <div className="rounded-3xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
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

          <input type="hidden" name="pageSize" value={String(pageSize)} />
          <input type="hidden" name="page" value="1" />

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

      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-900/10 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {rangeStart}-{rangeEnd} of {totalRows} shifts
        </p>
        <form method="GET" className="flex items-center gap-2">
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
          <input type="hidden" name="sortBy" value={sortBy} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
          <input type="hidden" name="page" value="1" />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Rows per page</span>
            <select
              name="pageSize"
              defaultValue={String(pageSize)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 outline-none transition focus:border-slate-900"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Update
          </button>
        </form>
      </div>

      <ShiftHistoryTable rows={paginatedRows} returnTo={currentListHref} />

      <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-900/10 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <span>
          Page {safePage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={buildShiftsHref(
              resolvedSearchParams,
              queryState,
              Math.max(1, safePage - 1),
            )}
            aria-disabled={safePage <= 1}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 font-medium transition ${
              safePage <= 1
                ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-900/10 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Previous
          </Link>
          <Link
            href={buildShiftsHref(
              resolvedSearchParams,
              queryState,
              Math.min(totalPages, safePage + 1),
            )}
            aria-disabled={safePage >= totalPages}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 font-medium transition ${
              safePage >= totalPages
                ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-900/10 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Next
          </Link>
        </div>
      </div>

      <Link
        href="/shifts/new"
        className="fixed bottom-20 right-4 z-20 inline-flex items-center rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_34px_rgba(15,23,42,0.35)] transition hover:bg-slate-800 md:hidden"
      >
        + Add shift
      </Link>
    </div>
  );
}
