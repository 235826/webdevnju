import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { FootballController } =
  require("../dist/controller/football.controller.js") as typeof import("../src/controller/football.controller.ts");
const { FootballService } =
  require("../dist/service/football.service.js") as typeof import("../src/service/football.service.ts");
const { FootballRepository } =
  require("../dist/service/football.repository.js") as typeof import("../src/service/football.repository.ts");

function createFootballService(): InstanceType<typeof FootballService> {
  const service = new FootballService();
  service.footballRepository = new FootballRepository();

  return service;
}

function createController() {
  const controller = new FootballController();
  const headers = new Map<string, string>();

  controller.footballService = createFootballService();
  controller.ctx = {
    status: 200,
    get(name: string) {
      return headers.get(name) ?? "";
    },
    set(name: string, value: string) {
      headers.set(name, value);
    },
  } as never;

  return { controller, headers };
}

test("AC-01 lists competitions with names and basic information", () => {
  const service = createFootballService();
  const response = service.listCompetitions();

  assert.equal(response.data.length >= 2, true);
  assert.equal(typeof response.data[0].name, "string");
  assert.equal(typeof response.data[0].description, "string");
  assert.equal(Number.isNaN(Date.parse(response.data[0].createdAt)), false);
});

test("AC-02 lists competition matches grouped by their stages", () => {
  const service = createFootballService();
  const competition = service.getCompetition("1");
  const matches = service.listMatches({ competitionId: "1" });
  const stageNames = new Set(matches.data.map((match) => match.stage.name));

  assert.equal(competition.data.name, "校园冠军杯");
  assert.equal(stageNames.has("A 组"), true);
  assert.equal(stageNames.has("淘汰赛"), true);
});

test("AC-03 returns an empty match list when no match satisfies filters", () => {
  const service = createFootballService();
  const response = service.listMatches({
    competitionId: "999",
    status: "FINISHED",
  });

  assert.deepEqual(response.data, []);
});

test("AC-04 returns match details with competition, stage, teams, time, and status", () => {
  const service = createFootballService();
  const response = service.getMatch("1");

  assert.equal(response.data.competition.name, "校园冠军杯");
  assert.equal(response.data.stage.name, "A 组");
  assert.equal(response.data.homeTeam.name, "软件学院");
  assert.equal(response.data.awayTeam.name, "人工智能学院");
  assert.equal(Number.isNaN(Date.parse(response.data.startsAt)), false);
  assert.equal(response.data.status, "SCHEDULED");
});

test("AC-05 returns safe errors for missing resources and invalid filters", async () => {
  const { controller, headers } = createController();
  const missingMatch = await controller.getMatch("999");

  assert.equal(controller.ctx?.status, 404);
  assert.equal("error" in missingMatch, true);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);
  assert.doesNotMatch(JSON.stringify(missingMatch), /Seed|Error:|repository/i);

  const invalidQuery = await controller.listMatches({ status: "DELAYED" });

  assert.equal(controller.ctx?.status, 400);
  assert.equal("error" in invalidQuery, true);
  assert.doesNotMatch(JSON.stringify(invalidQuery), /Seed|Error:|repository/i);
});
