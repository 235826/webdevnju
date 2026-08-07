import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { ApiController } = require("../dist/controller/api.controller.js") as {
  ApiController: new () => {
    health(): Promise<{ status: "ok"; service: string; timestamp: string }>;
  };
};

test("health controller returns the football platform health payload", async () => {
  const controller = new ApiController();
  const response = await controller.health();

  assert.equal(response.status, "ok");
  assert.equal(response.service, "football-platform-api");
  assert.equal(Number.isNaN(Date.parse(response.timestamp)), false);
});
