import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCourseKeyword } from "../src/utils/course-keyword.ts";
import { parseCourseInput } from "../src/utils/course-input.ts";

test("parseCourseInput trims valid input", () => {
  assert.deepEqual(
    parseCourseInput({ title: "  React  ", description: "  组件基础  " }),
    { title: "React", description: "组件基础" },
  );
});

test("parseCourseInput rejects invalid input", () => {
  assert.throws(
    () => parseCourseInput({ title: "", description: "" }),
    TypeError,
  );
});

test("normalizeCourseKeyword trims blanks and returns undefined for empty input", () => {
  assert.equal(normalizeCourseKeyword("  web  ", ["  web  "]), "web");
  assert.equal(normalizeCourseKeyword("   ", ["   "]), undefined);
  assert.equal(normalizeCourseKeyword(undefined, undefined), undefined);
});

test("normalizeCourseKeyword rejects repeated or overlong values", () => {
  assert.throws(
    () => normalizeCourseKeyword("web", ["web", "react"]),
    /请求参数不合法/,
  );
  assert.throws(
    () => normalizeCourseKeyword("课".repeat(81), ["课".repeat(81)]),
    /请求参数不合法/,
  );
});
