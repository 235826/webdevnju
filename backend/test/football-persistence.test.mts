import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { FootballRepository } =
  require("../dist/service/football.repository.js") as typeof import("../src/service/football.repository.ts");

function createDatabasePath(name: string): string {
  return join(mkdtempSync(join(tmpdir(), "football-persistence-test-")), name);
}

function rebuildRepository(databasePath: string) {
  FootballRepository.closeConnection(databasePath);
  return new FootballRepository(databasePath);
}

test("013 AC-01 initializes real seed data in an empty SQLite database", () => {
  const databasePath = createDatabasePath("seed.sqlite");
  const repository = new FootballRepository(databasePath);

  assert.equal(
    repository.findCompetition(1)?.name,
    "1. Fußball-Bundesliga 2024/2025",
  );
  assert.equal(repository.findTeam(1)?.name, "FC Bayern München");
  assert.equal(repository.findMatch(1)?.homeTeam.name, "Borussia Dortmund");

  const recentCompetition = repository
    .listCompetitions()
    .find((competition) => competition.name === "近期足球比赛精选 2026-08");
  assert.ok(recentCompetition);

  const recentMatches = repository.listMatches({
    competitionId: recentCompetition.id,
  });
  const statusCounts = recentMatches.reduce<Record<string, number>>(
    (counts, match) => {
      counts[match.status] = (counts[match.status] ?? 0) + 1;
      return counts;
    },
    {},
  );

  assert.equal(recentMatches.length, 20);
  assert.deepEqual(statusCounts, {
    FINISHED: 7,
    LIVE: 6,
    SCHEDULED: 7,
  });
  assert.equal(repository.findMatch(5)?.result?.homeScore, 2);
  assert.equal(repository.findMatch(11)?.result?.awayScore, 0);

  FootballRepository.closeConnection(databasePath);
});

test("013 AC-02 persists admin-created base data after repository rebuild", () => {
  const databasePath = createDatabasePath("created-data.sqlite");
  const repository = new FootballRepository(databasePath);
  const competition = repository.createCompetition({
    name: "持久化测试赛事",
    description: "重建后仍可读取",
  });
  const stage = repository.createStage({
    competitionId: competition.id,
    name: "持久化测试阶段",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 300,
  });
  const homeTeam = repository.createTeam({
    name: "持久化主队",
    shortName: "主队",
    logoUrl: null,
    openLigaDbTeamId: null,
  });
  const awayTeam = repository.createTeam({
    name: "持久化客队",
    shortName: "客队",
    logoUrl: null,
    openLigaDbTeamId: null,
  });
  const match = repository.createMatch({
    stageId: stage.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: "2027-05-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  });

  const rebuilt = rebuildRepository(databasePath);

  assert.equal(rebuilt.findCompetition(competition.id)?.name, competition.name);
  assert.equal(rebuilt.findStage(stage.id)?.name, stage.name);
  assert.equal(rebuilt.findTeam(homeTeam.id)?.name, homeTeam.name);
  assert.equal(rebuilt.findMatch(match.id)?.awayTeam.name, awayTeam.name);

  FootballRepository.closeConnection(databasePath);
});

test("013 AC-03 persists match edits and results after repository rebuild", () => {
  const databasePath = createDatabasePath("result.sqlite");
  const repository = new FootballRepository(databasePath);
  const match = repository.createMatch({
    stageId: 1,
    homeTeamId: 1,
    awayTeamId: 6,
    startsAt: "2027-06-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  });

  repository.updateMatch(match.id, {
    stageId: 1,
    homeTeamId: 1,
    awayTeamId: 6,
    startsAt: "2027-06-02T10:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  });
  repository.updateMatchResult(match.id, { homeScore: 3, awayScore: 1 });

  const rebuilt = rebuildRepository(databasePath);
  const persisted = rebuilt.findMatch(match.id);

  assert.equal(persisted?.startsAt, "2027-06-02T10:00:00.000Z");
  assert.equal(persisted?.status, "FINISHED");
  assert.equal(persisted?.result?.homeScore, 3);
  assert.equal(persisted?.result?.awayScore, 1);

  FootballRepository.closeConnection(databasePath);
});

test("013 AC-04 keeps deleted base data deleted after repository rebuild", () => {
  const databasePath = createDatabasePath("deleted.sqlite");
  const repository = new FootballRepository(databasePath);
  const competition = repository.createCompetition({
    name: "待持久删除赛事",
    description: "",
  });
  const stage = repository.createStage({
    competitionId: competition.id,
    name: "待持久删除阶段",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 301,
  });
  const match = repository.createMatch({
    stageId: stage.id,
    homeTeamId: 1,
    awayTeamId: 6,
    startsAt: "2027-07-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  });

  assert.equal(repository.deleteCompetition(competition.id), true);

  const rebuilt = rebuildRepository(databasePath);

  assert.equal(rebuilt.findCompetition(competition.id), undefined);
  assert.equal(rebuilt.findStage(stage.id), undefined);
  assert.equal(rebuilt.findMatch(match.id), undefined);

  FootballRepository.closeConnection(databasePath);
});

test("013 AC-05 default SQLite database path is covered by gitignore", () => {
  const gitignore = readFileSync(
    join(process.cwd(), "..", ".gitignore"),
    "utf8",
  );

  assert.match(gitignore, /\/backend\/data\/\*/);
});
