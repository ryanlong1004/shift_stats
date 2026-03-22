export type ShiftsPageSearchParams = {
  preset?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  role?: string;
  shiftType?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  pageSize?: string;
};

export const pageSizeOptions = [10, 25, 50] as const;

export type ShiftsQueryState = {
  preset: "all" | "week" | "month" | "custom";
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: (typeof pageSizeOptions)[number];
};

export function normalizePreset(
  value: string | undefined,
): ShiftsQueryState["preset"] {
  return value === "week" || value === "month" || value === "custom"
    ? value
    : "all";
}

export function parseShiftsQueryState(
  searchParams: ShiftsPageSearchParams,
): ShiftsQueryState {
  const rawPage = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPageSize = Number.parseInt(searchParams.pageSize ?? "25", 10);
  const pageSize = pageSizeOptions.includes(
    rawPageSize as (typeof pageSizeOptions)[number],
  )
    ? (rawPageSize as (typeof pageSizeOptions)[number])
    : 25;

  return {
    preset: normalizePreset(searchParams.preset),
    sortBy: searchParams.sortBy ?? "date",
    sortOrder: searchParams.sortOrder === "asc" ? "asc" : "desc",
    page,
    pageSize,
  };
}

function appendFilters(
  params: URLSearchParams,
  searchParams: ShiftsPageSearchParams,
) {
  if (searchParams.preset) {
    params.set("preset", searchParams.preset);
  }
  if (searchParams.startDate) {
    params.set("startDate", searchParams.startDate);
  }
  if (searchParams.endDate) {
    params.set("endDate", searchParams.endDate);
  }
  if (searchParams.location) {
    params.set("location", searchParams.location);
  }
  if (searchParams.role) {
    params.set("role", searchParams.role);
  }
  if (searchParams.shiftType) {
    params.set("shiftType", searchParams.shiftType);
  }
}

export function buildShiftsHref(
  searchParams: ShiftsPageSearchParams,
  state: Pick<ShiftsQueryState, "sortBy" | "sortOrder" | "pageSize">,
  nextPage: number,
) {
  const params = new URLSearchParams();
  appendFilters(params, searchParams);
  params.set("sortBy", state.sortBy);
  params.set("sortOrder", state.sortOrder);
  params.set("pageSize", String(state.pageSize));
  params.set("page", String(nextPage));

  return `/shifts?${params.toString()}`;
}

export function buildPresetHref(
  searchParams: ShiftsPageSearchParams,
  state: Pick<ShiftsQueryState, "sortBy" | "sortOrder" | "pageSize">,
  nextPreset: "all" | "week" | "month",
) {
  const params = new URLSearchParams();

  if (nextPreset !== "all") {
    params.set("preset", nextPreset);
  }

  if (searchParams.location) {
    params.set("location", searchParams.location);
  }
  if (searchParams.role) {
    params.set("role", searchParams.role);
  }
  if (searchParams.shiftType) {
    params.set("shiftType", searchParams.shiftType);
  }

  params.set("sortBy", state.sortBy);
  params.set("sortOrder", state.sortOrder);
  params.set("pageSize", String(state.pageSize));
  params.set("page", "1");

  return `/shifts?${params.toString()}`;
}

export function buildClearFiltersHref(
  state: Pick<ShiftsQueryState, "sortBy" | "sortOrder" | "pageSize">,
) {
  const params = new URLSearchParams();
  params.set("sortBy", state.sortBy);
  params.set("sortOrder", state.sortOrder);
  params.set("pageSize", String(state.pageSize));
  params.set("page", "1");

  return `/shifts?${params.toString()}`;
}

export function sanitizeReturnTo(returnTo: string | undefined) {
  if (!returnTo) {
    return undefined;
  }

  // Only allow in-app return paths for shifts pages.
  if (!returnTo.startsWith("/shifts")) {
    return undefined;
  }

  return returnTo;
}

export function buildEditShiftHref(id: string, returnTo?: string) {
  const baseHref = `/shifts/${encodeURIComponent(id)}/edit`;
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (!safeReturnTo) {
    return baseHref;
  }

  return `${baseHref}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}
