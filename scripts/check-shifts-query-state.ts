import assert from "node:assert/strict";

import {
  buildClearFiltersHref,
  buildPresetHref,
  buildShiftsHref,
  parseShiftsQueryState,
  type ShiftsPageSearchParams,
} from "../src/lib/shifts-query-state";

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

  console.log("Shifts query-state regression checks passed.");
}

runChecks();
