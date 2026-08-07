import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("frontend test runner is configured", () => {
  assert.equal(typeof fetch, "function");
});

test("home page is no longer wired to the legacy dashboard", async () => {
  const pagePath = path.join(process.cwd(), "src/app/page.tsx");
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /足球赛事信息与互动预测平台/);
  assert.match(source, /\/api\/health/);
  assert.doesNotMatch(source, /legacy dashboard/i);
});
