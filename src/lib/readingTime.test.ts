import assert from "node:assert/strict";
import { test } from "node:test";

import { readingTime, WORDS_PER_MINUTE } from "./readingTime.ts";

const words = (count: number) =>
  Array.from({ length: count }, () => "word").join(" ");

test("an empty body still reads as one minute", () => {
  assert.equal(readingTime(""), 1);
  assert.equal(readingTime("   \n  "), 1);
});

test("rounds up at the minute boundary", () => {
  assert.equal(readingTime(words(WORDS_PER_MINUTE)), 1);
  assert.equal(readingTime(words(WORDS_PER_MINUTE + 1)), 2);
});

test("newlines and code fences count as whitespace", () => {
  assert.equal(readingTime("a\nb\n\n```ts\nconst c = 1\n```\n"), 1);
});
