import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import type { Match, Stage, Team } from "../src/types/football.ts";

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
  const stages = service.listStages({ competitionId: "1" });
  const stageNames = new Set(matches.data.map((match) => match.stage.name));

  assert.equal(competition.data.name, "1. Fußball-Bundesliga 2024/2025");
  assert.equal(stageNames.has("1. Spieltag"), true);
  assert.equal(stageNames.has("34. Spieltag"), true);
  assert.deepEqual(
    stages.data.map((stage) => stage.name),
    ["1. Spieltag", "34. Spieltag"],
  );
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

  assert.equal(
    response.data.competition.name,
    "1. Fußball-Bundesliga 2024/2025",
  );
  assert.equal(response.data.stage.name, "1. Spieltag");
  assert.equal(response.data.homeTeam.name, "Borussia Dortmund");
  assert.equal(response.data.awayTeam.name, "Eintracht Frankfurt");
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

test("003 AC-01 lists teams with stable name and id sorting", () => {
  const service = createFootballService();
  const response = service.listTeams();
  const names = response.data.map((team) => team.name);

  assert.deepEqual(
    names,
    [...names].sort((left, right) => left.localeCompare(right, "zh-CN")),
  );
  assert.equal(names.includes("FC Bayern München"), true);
  assert.equal(names.includes("Borussia Dortmund"), true);
  assert.equal(names.includes("RB Leipzig"), true);
  assert.equal("openLigaDbTeamId" in response.data[0], true);
});

test("003 AC-02 and AC-04 return local team details without external data", () => {
  const service = createFootballService();
  const response = service.getTeam("1");

  assert.equal(response.data.name, "FC Bayern München");
  assert.equal(response.data.shortName, "Bayern");
  assert.equal(typeof response.data.logoUrl, "string");
  assert.equal(response.data.openLigaDbTeamId, 40);
});

test("003 AC-03 match details reference the unified team data", () => {
  const service = createFootballService();
  const match = service.getMatch("1").data;
  const homeTeam = service.getTeam(String(match.homeTeam.id)).data;
  const awayTeam = service.getTeam(String(match.awayTeam.id)).data;

  assert.deepEqual(match.homeTeam, homeTeam);
  assert.deepEqual(match.awayTeam, awayTeam);
});

test("003 team controller returns safe 404 errors", async () => {
  const { controller } = createController();
  const missingTeam = await controller.getTeam("999");

  assert.equal(controller.ctx?.status, 404);
  assert.equal("error" in missingTeam, true);
  assert.doesNotMatch(JSON.stringify(missingTeam), /Seed|Error:|repository/i);
});

test("006 AC-01 and AC-03 ranks league standings by points, goals, and configured order", () => {
  const service = createFootballService();
  service.footballRepository = createStandingsRepository(
    {
      id: 10,
      competitionId: 1,
      name: "测试联赛轮次",
      type: "LEAGUE",
      groupName: null,
      sortOrder: 1,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    [
      makeMatch(101, 10, makeTeam(1, "甲队"), makeTeam(2, "乙队"), {
        homeScore: 2,
        awayScore: 0,
      }),
      makeMatch(102, 10, makeTeam(3, "丙队"), makeTeam(4, "丁队"), {
        homeScore: 3,
        awayScore: 1,
      }),
      makeMatch(103, 10, makeTeam(2, "乙队"), makeTeam(4, "丁队"), {
        homeScore: 4,
        awayScore: 1,
      }),
      makeMatch(104, 10, makeTeam(1, "甲队"), makeTeam(3, "丙队"), null),
    ],
  );

  const response = service.getStageStandings("10");

  assert.equal(response.stageType, "LEAGUE");
  assert.equal(response.groups.length, 1);
  assert.equal(response.groups[0].groupName, null);
  assert.deepEqual(
    response.groups[0].rows.map((row) => [
      row.rank,
      row.team.name,
      row.played,
      row.goalDifference,
      row.goalsFor,
      row.points,
    ]),
    [
      [1, "丙队", 1, 2, 3, 3],
      [2, "甲队", 1, 2, 2, 3],
      [3, "乙队", 2, 1, 4, 3],
      [4, "丁队", 2, -5, 2, 0],
    ],
  );
});

test("006 AC-02 returns group standings separately", () => {
  const service = createFootballService();
  service.footballRepository = createStandingsRepository(
    {
      id: 20,
      competitionId: 1,
      name: "小组赛",
      type: "GROUP",
      groupName: null,
      sortOrder: 1,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    [
      makeMatch(201, 20, makeTeam(1, "甲队"), makeTeam(2, "乙队"), {
        homeScore: 1,
        awayScore: 0,
        groupName: "A",
      }),
      makeMatch(202, 20, makeTeam(3, "丙队"), makeTeam(4, "丁队"), {
        homeScore: 0,
        awayScore: 0,
        groupName: "B",
      }),
    ],
  );

  const response = service.getStageStandings("20");

  assert.deepEqual(
    response.groups.map((group) => [
      group.groupName,
      group.rows.map((row) => row.team.name),
    ]),
    [
      ["A", ["甲队", "乙队"]],
      ["B", ["丙队", "丁队"]],
    ],
  );
});

test("006 AC-04 returns knockout bracket rounds by bracket position", () => {
  const service = createFootballService();
  const response = service.getStageBracket("2");

  assert.equal(response.stageId, 2);
  assert.equal(response.rounds[0].round, "Endspiel");
  assert.equal(response.rounds[0].matches[0].bracketPosition, 1);
  assert.equal(
    response.rounds[0].matches[0].homeTeam.name,
    "DSC Arminia Bielefeld",
  );
});

test("006 AC-05 and AC-06 return distinguishable unsupported stage errors", async () => {
  const { controller } = createController();
  const standings = await controller.getStageStandings("2");

  assert.equal(controller.ctx?.status, 409);
  assert.equal("error" in standings, true);
  assert.match(JSON.stringify(standings), /UNSUPPORTED_STAGE_TYPE/);

  const bracket = await controller.getStageBracket("1");

  assert.equal(controller.ctx?.status, 409);
  assert.equal("error" in bracket, true);
  assert.match(JSON.stringify(bracket), /UNSUPPORTED_STAGE_TYPE/);
});

function createStandingsRepository(stage: Stage, matches: Match[]) {
  return {
    findStage(id: number) {
      return id === stage.id ? stage : undefined;
    },
    listMatches(filters: { stageId?: number }) {
      return matches.filter((match) => match.stage.id === filters.stageId);
    },
  } as never;
}

function makeTeam(id: number, name: string): Team {
  return {
    id,
    name,
    shortName: null,
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
}

function makeMatch(
  id: number,
  stageId: number,
  homeTeam: Team,
  awayTeam: Team,
  resultConfig: {
    homeScore: number;
    awayScore: number;
    groupName?: string;
  } | null,
): Match {
  const stage: Stage = {
    id: stageId,
    competitionId: 1,
    name: "测试阶段",
    type: resultConfig?.groupName ? "GROUP" : "LEAGUE",
    groupName: resultConfig?.groupName ?? null,
    sortOrder: 1,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };

  return {
    id,
    competition: {
      id: 1,
      name: "测试赛事",
      description: "测试赛事",
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    stage,
    homeTeam,
    awayTeam,
    startsAt: "2026-09-01T10:00:00.000Z",
    status: resultConfig ? "FINISHED" : "SCHEDULED",
    groupName: resultConfig?.groupName ?? null,
    knockoutRound: null,
    bracketPosition: null,
    result: resultConfig
      ? {
          homeScore: resultConfig.homeScore,
          awayScore: resultConfig.awayScore,
          updatedAt: "2026-09-02T10:00:00.000Z",
        }
      : null,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
}
