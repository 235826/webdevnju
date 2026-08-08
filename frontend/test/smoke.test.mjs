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
  assert.match(source, /\/me\/favorites/);
  assert.match(source, /\/admin\/matches/);
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
  assert.match(competitionDetail, /stageViewHref/);
  assert.match(competitionDetail, /查看积分榜/);
  assert.match(competitionDetail, /查看淘汰赛图/);
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
  assert.match(teamDetail, /\/api\/teams\/\$\{teamId\}\/external-profile/);
  assert.match(teamDetail, /OpenLigaDB 补充资料/);
  assert.match(teamDetail, /暂无可匹配的 OpenLigaDB 球队资料/);
  assert.match(matchDetail, /\/teams\/\$\{state\.match\.homeTeam\.id\}/);
  assert.match(matchDetail, /\/teams\/\$\{state\.match\.awayTeam\.id\}/);
});

test("prediction UI is wired to the documented API paths", async () => {
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );
  const predictionsPath = path.join(
    process.cwd(),
    "src/app/me/predictions/page.tsx",
  );

  const [matchDetail, predictions] = await Promise.all([
    readFile(matchDetailPath, "utf8"),
    readFile(predictionsPath, "utf8"),
  ]);

  assert.match(matchDetail, /\/api\/matches\/\$\{match\.id\}\/prediction/);
  assert.match(matchDetail, /\/api\/matches\/\$\{match\.id\}\/predictions/);
  assert.match(matchDetail, /比赛已经开始，预测已锁定/);
  assert.match(matchDetail, /我的预测/);
  assert.match(predictions, /\/api\/users\/me\/predictions/);
  assert.match(predictions, /暂无预测/);
});

test("admin match result UI is wired to the documented API path", async () => {
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );
  const matchDetail = await readFile(matchDetailPath, "utf8");

  assert.match(matchDetail, /\/api\/admin\/matches\/\$\{match\.id\}\/result/);
  assert.match(matchDetail, /结果录入/);
  assert.match(matchDetail, /保存结果/);
});

test("admin match data UI is wired to the documented API paths", async () => {
  const adminMatchesPath = path.join(
    process.cwd(),
    "src/app/admin/matches/page.tsx",
  );
  const adminMatches = await readFile(adminMatchesPath, "utf8");

  assert.match(adminMatches, /\/api\/auth\/me/);
  assert.match(adminMatches, /\/api\/competitions/);
  assert.match(adminMatches, /\/api\/stages/);
  assert.match(adminMatches, /\/api\/teams/);
  assert.match(adminMatches, /\/api\/admin\/matches/);
  assert.match(adminMatches, /\/api\/admin\/competitions/);
  assert.match(adminMatches, /\/api\/admin\/stages/);
  assert.match(adminMatches, /\/api\/admin\/teams/);
  assert.match(adminMatches, /后台数据管理/);
  assert.match(adminMatches, /创建比赛/);
  assert.match(adminMatches, /删除/);
});

test("favorite UI is wired to the documented API paths", async () => {
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );
  const favoritesPath = path.join(
    process.cwd(),
    "src/app/me/favorites/page.tsx",
  );

  const [matchDetail, favorites] = await Promise.all([
    readFile(matchDetailPath, "utf8"),
    readFile(favoritesPath, "utf8"),
  ]);

  assert.match(matchDetail, /\/api\/users\/me\/favorites/);
  assert.match(matchDetail, /\/api\/matches\/\$\{match\.id\}\/favorite/);
  assert.match(matchDetail, /收藏比赛/);
  assert.match(matchDetail, /取消收藏/);
  assert.match(favorites, /\/api\/users\/me\/favorites/);
  assert.match(favorites, /暂无收藏/);
});

test("comment UI is wired to the documented API paths", async () => {
  const matchDetailPath = path.join(
    process.cwd(),
    "src/app/matches/[matchId]/page.tsx",
  );
  const matchDetail = await readFile(matchDetailPath, "utf8");

  assert.match(matchDetail, /\/api\/matches\/\$\{match\.id\}\/comments/);
  assert.match(matchDetail, /\/api\/comments\/\$\{commentId\}/);
  assert.match(
    matchDetail,
    /\/api\/admin\/comments\/\$\{commentId\}\/moderation/,
  );
  assert.match(matchDetail, /评论讨论/);
  assert.match(matchDetail, /发表评论/);
  assert.match(matchDetail, /暂无评论/);
});

test("standings and bracket pages are wired to the documented API paths", async () => {
  const standingsPath = path.join(
    process.cwd(),
    "src/app/stages/[stageId]/standings/page.tsx",
  );
  const bracketPath = path.join(
    process.cwd(),
    "src/app/stages/[stageId]/bracket/page.tsx",
  );

  const [standings, bracket] = await Promise.all([
    readFile(standingsPath, "utf8"),
    readFile(bracketPath, "utf8"),
  ]);

  assert.match(standings, /\/api\/stages\/\$\{stageId\}\/standings/);
  assert.match(standings, /积分榜/);
  assert.match(standings, /净胜/);
  assert.match(bracket, /\/api\/stages\/\$\{stageId\}\/bracket/);
  assert.match(bracket, /淘汰赛图/);
  assert.match(bracket, /位置/);
});
