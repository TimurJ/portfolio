import assert from "node:assert/strict";
import { test } from "node:test";

import { formatLongDate, formatMonthYear, isoDate } from "./dates.ts";

const published = new Date("2026-09-19");

test("formats a publish date for the row and the article header", () => {
  assert.equal(formatMonthYear(published), "September 2026");
  assert.equal(formatLongDate(published), "19 September 2026");
});

test("round-trips a date-only ISO string", () => {
  assert.equal(isoDate(published), "2026-09-19");
});

/* Fails with a local-zone formatter on any machine west of UTC, where UTC
   midnight on the 1st is still the evening of the 30th. */
test("formats in UTC, so the first of the month stays the first", () => {
  const firstOfMonth = new Date("2026-10-01T00:00:00Z");
  assert.equal(formatMonthYear(firstOfMonth), "October 2026");
  assert.equal(formatLongDate(firstOfMonth), "1 October 2026");
});
