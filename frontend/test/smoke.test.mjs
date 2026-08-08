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
  assert.match(source, /\/api\/auth\/me/);
  assert.match(source, /type AuthMode = "login" \| "register"/);
  assert.match(source, /`\/api\/auth\/\$\{mode\}`/);
  assert.match(source, /\/api\/auth\/logout/);
  assert.match(source, /\/competitions/);
  assert.doesNotMatch(source, /legacy dashboard/i);
});

test("competition browsing pages are wired to the documented API paths", async () => {
  const competitionsPath = path.join(
    process.cwd(),
    "src/app/competitions/page.tsx",
  );
  const competitionDetailPath = path.join(
    process.cwd(),
    "src/app/competitions/[competitionId]/page.tsx",
  );
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );

  const [competitions, competitionDetail, matchDetail] = await Promise.all([
    readFile(competitionsPath, "utf8"),
    readFile(competitionDetailPath, "utf8"),
    readFile(matchDetailPath, "utf8"),
  ]);

  assert.match(competitions, /\/api\/competitions/);
  assert.match(competitionDetail, /\/api\/competitions\/\$\{competitionId\}/);
  assert.match(
    competitionDetail,
    /\/api\/matches\?competitionId=\$\{competitionId\}/,
  );
  assert.match(matchDetail, /\/api\/matches\/\$\{matchId\}/);
  assert.match(competitions, /正在加载赛事/);
  assert.match(competitionDetail, /该赛事暂无比赛/);
  assert.match(matchDetail, /比赛详情/);
});

test("team pages are wired to the documented API paths", async () => {
  const teamsPath = path.join(process.cwd(), "src/app/teams/page.tsx");
  const teamDetailPath = path.join(
    process.cwd(),
    "src/app/teams/[teamId]/page.tsx",
  );
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );

  const [teams, teamDetail, matchDetail] = await Promise.all([
    readFile(teamsPath, "utf8"),
    readFile(teamDetailPath, "utf8"),
    readFile(matchDetailPath, "utf8"),
  ]);

  assert.match(teams, /\/api\/teams/);
  assert.match(teamDetail, /\/api\/teams\/\$\{teamId\}/);
  assert.match(teamDetail, /外部球队资料暂不可用/);
  assert.match(matchDetail, /\/teams\/\$\{state\.match\.homeTeam\.id\}/);
  assert.match(matchDetail, /\/teams\/\$\{state\.match\.awayTeam\.id\}/);
});
