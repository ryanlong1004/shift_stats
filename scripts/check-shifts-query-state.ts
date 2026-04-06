import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildEditShiftHref,
  buildClearFiltersHref,
  buildPresetHref,
  buildShiftsHref,
  parseShiftsQueryState,
  sanitizeReturnTo,
  type ShiftsPageSearchParams,
} from "../src/lib/shifts-query-state";
import {
  formatUtcDateToDateOnly,
  parseDateOnlyToUtc,
} from "../src/lib/date-only";
import {
  buildDashboardSnapshot,
  type ShiftRecord,
} from "../src/lib/shift-records";
import { parseShiftImportCsv } from "../src/lib/shift-import";

function parseQuery(url: string) {
  const [, query = ""] = url.split("?");
  return new URLSearchParams(query);
}

function runChecks() {
  const defaults = parseShiftsQueryState({});
  assert.equal(defaults.preset, "all");
  assert.equal(defaults.sortBy, "date");
  assert.equal(defaults.sortOrder, "desc");
  assert.equal(defaults.page, 1);
  assert.equal(defaults.pageSize, 25);

  const normalized = parseShiftsQueryState({
    preset: "week",
    sortBy: "earnings",
    sortOrder: "asc",
    page: "3",
    pageSize: "50",
  });
  assert.equal(normalized.preset, "week");
  assert.equal(normalized.sortBy, "earnings");
  assert.equal(normalized.sortOrder, "asc");
  assert.equal(normalized.page, 3);
  assert.equal(normalized.pageSize, 50);

  const invalid = parseShiftsQueryState({
    preset: "invalid",
    sortOrder: "sideways",
    page: "-2",
    pageSize: "17",
  });
  assert.equal(invalid.preset, "all");
  assert.equal(invalid.sortOrder, "desc");
  assert.equal(invalid.page, 1);
  assert.equal(invalid.pageSize, 25);

  const searchParams: ShiftsPageSearchParams = {
    preset: "custom",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    location: "Downtown",
    role: "Host",
  };

  const href = buildShiftsHref(searchParams, normalized, 2);
  const hrefQuery = parseQuery(href);
  assert.equal(hrefQuery.get("preset"), "custom");
  assert.equal(hrefQuery.get("startDate"), "2026-03-01");
  assert.equal(hrefQuery.get("endDate"), "2026-03-31");
  assert.equal(hrefQuery.get("location"), "Downtown");
  assert.equal(hrefQuery.get("role"), "Host");
  assert.equal(hrefQuery.get("sortBy"), "earnings");
  assert.equal(hrefQuery.get("sortOrder"), "asc");
  assert.equal(hrefQuery.get("pageSize"), "50");
  assert.equal(hrefQuery.get("page"), "2");

  const presetHref = buildPresetHref(searchParams, normalized, "month");
  const presetQuery = parseQuery(presetHref);
  assert.equal(presetQuery.get("preset"), "month");
  assert.equal(presetQuery.get("location"), "Downtown");
  assert.equal(presetQuery.get("role"), "Host");
  assert.equal(presetQuery.get("startDate"), null);
  assert.equal(presetQuery.get("endDate"), null);
  assert.equal(presetQuery.get("page"), "1");

  const clearHref = buildClearFiltersHref(normalized);
  const clearQuery = parseQuery(clearHref);
  assert.equal(clearQuery.get("sortBy"), "earnings");
  assert.equal(clearQuery.get("sortOrder"), "asc");
  assert.equal(clearQuery.get("pageSize"), "50");
  assert.equal(clearQuery.get("page"), "1");
  assert.equal(clearQuery.get("preset"), null);
  assert.equal(clearQuery.get("location"), null);

  assert.equal(sanitizeReturnTo(undefined), undefined);
  assert.equal(sanitizeReturnTo("/shifts?page=2"), "/shifts?page=2");
  assert.equal(sanitizeReturnTo("https://evil.site"), undefined);
  assert.equal(sanitizeReturnTo("/dashboard"), undefined);

  assert.equal(
    buildEditShiftHref("shift-123", "/shifts?page=3&sortBy=hours"),
    "/shifts/shift-123/edit?returnTo=%2Fshifts%3Fpage%3D3%26sortBy%3Dhours",
  );
  assert.equal(
    buildEditShiftHref("shift-123", "/dashboard"),
    "/shifts/shift-123/edit",
  );

  const deleteButtonPath = path.join(
    process.cwd(),
    "src/components/delete-shift-button.tsx",
  );
  const deleteButtonSource = readFileSync(deleteButtonPath, "utf8");
  assert.ok(
    deleteButtonSource.includes("router.refresh();"),
    "Delete button must refresh router after successful delete",
  );
  assert.ok(
    deleteButtonSource.includes("Confirm delete"),
    "Delete button should keep explicit inline confirmation action",
  );
  assert.ok(
    !deleteButtonSource.includes("window.confirm"),
    "Delete flow should not regress to browser confirm dialog",
  );

  const parsedUtcDate = parseDateOnlyToUtc("2026-03-17");
  assert.equal(parsedUtcDate.toISOString(), "2026-03-17T00:00:00.000Z");
  assert.equal(formatUtcDateToDateOnly(parsedUtcDate), "2026-03-17");

  const weekdayConsistencyRows: ShiftRecord[] = [
    {
      id: "weekday-regression-1",
      shiftDate: "2026-03-14",
      inputMode: "hours",
      startTime: null,
      endTime: null,
      totalEarned: 300,
      hoursWorked: 7,
      hourlyRate: 42.86,
      dayName: "Friday",
      cashTips: 0,
      cardTips: 0,
      basePay: 0,
      otherIncome: 300,
      salesAmount: null,
      tipPct: null,
      location: null,
      role: null,
      shiftType: null,
      notes: null,
    },
  ];

  const weekdayConsistencySnapshot = buildDashboardSnapshot(
    weekdayConsistencyRows,
  );
  assert.equal(
    weekdayConsistencySnapshot.bestWeekday,
    "Saturday",
    "Best weekday should be derived from shiftDate, not stale dayName",
  );

  const importExamplePath = path.join(
    process.cwd(),
    "shifts-export-2026-03-20.csv",
  );
  const importExampleCsv = readFileSync(importExamplePath, "utf8");
  const parsedImport = parseShiftImportCsv(importExampleCsv);
  assert.equal(parsedImport.rows.length, 7);
  assert.equal(parsedImport.rows[0]?.shiftDate, "2026-03-19");
  assert.equal(parsedImport.rows[0]?.hoursWorked, "4.00");
  assert.equal(parsedImport.rows[0]?.basePay, "9.00");
  assert.equal(parsedImport.rows[0]?.location, "Camelot");
  assert.equal(parsedImport.rows[3]?.otherIncome, "255.00");

  const appShellPath = path.join(process.cwd(), "src/components/app-shell.tsx");
  const appShellSource = readFileSync(appShellPath, "utf8");
  assert.ok(
    appShellSource.includes('href: "/calendar"') &&
      appShellSource.includes('label: "Calendar"'),
    "Primary nav must include Calendar route",
  );
  assert.ok(
    appShellSource.includes('href: "/schedule"') &&
      appShellSource.includes('label: "Schedule"'),
    "Primary nav must include Schedule route",
  );

  const calendarPagePath = path.join(
    process.cwd(),
    "src/app/(app)/calendar/page.tsx",
  );
  const calendarPageSource = readFileSync(calendarPagePath, "utf8");
  assert.ok(
    calendarPageSource.includes("/calendar?month=${prevMonth}"),
    "Calendar page should expose previous month navigation",
  );
  assert.ok(
    calendarPageSource.includes("/calendar?month=${nextMonth}"),
    "Calendar page should expose next month navigation",
  );
  assert.ok(
    calendarPageSource.includes("if (!isValid(parsed))"),
    "Calendar page should guard invalid month query values",
  );
  assert.ok(
    calendarPageSource.includes(
      "/shifts?preset=custom&startDate=${dateKey}&endDate=${dateKey}",
    ),
    "Calendar day click should deep-link to single-day custom filter",
  );

  const schedulePagePath = path.join(
    process.cwd(),
    "src/app/(app)/schedule/page.tsx",
  );
  const schedulePageSource = readFileSync(schedulePagePath, "utf8");
  assert.ok(
    schedulePageSource.includes("/schedule?week=${prevWeek}"),
    "Schedule page should expose previous week navigation",
  );
  assert.ok(
    schedulePageSource.includes("/schedule?week=${nextWeek}"),
    "Schedule page should expose next week navigation",
  );
  assert.ok(
    schedulePageSource.includes("if (!isValid(parsed))"),
    "Schedule page should guard invalid week query values",
  );
  assert.ok(
    schedulePageSource.includes('href="/shifts/new"'),
    "Schedule page should include add-shift shortcut on empty days",
  );

  console.log("Shifts query-state regression checks passed.");
}

runChecks();
