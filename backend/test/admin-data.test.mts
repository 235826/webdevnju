import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { AdminDataController } =
  require("../dist/controller/admin-data.controller.js") as typeof import("../src/controller/admin-data.controller.ts");
const { AdminDataService } =
  require("../dist/service/admin-data.service.js") as typeof import("../src/service/admin-data.service.ts");
const { AuthService } =
  require("../dist/service/auth.service.js") as typeof import("../src/service/auth.service.ts");
const { CommentService } =
  require("../dist/service/comment.service.js") as typeof import("../src/service/comment.service.ts");
const { FavoriteService } =
  require("../dist/service/favorite.service.js") as typeof import("../src/service/favorite.service.ts");
const { FootballService } =
  require("../dist/service/football.service.js") as typeof import("../src/service/football.service.ts");
const { PasswordService } =
  require("../dist/service/password.service.js") as typeof import("../src/service/password.service.ts");
const { PredictionService } =
  require("../dist/service/prediction.service.js") as typeof import("../src/service/prediction.service.ts");
const { UserRepository } =
  require("../dist/service/user.repository.js") as typeof import("../src/service/user.repository.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-admin-data-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createController() {
  const controller = new AdminDataController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();
  const authService = createAuthService();

  controller.authService = authService;
  controller.adminDataService = new AdminDataService();
  controller.ctx = {
    status: 200,
    get(name: string) {
      return headers.get(name) ?? "";
    },
    set(name: string, value: string) {
      headers.set(name, value);
    },
    cookies: {
      get(name: string) {
        return cookieJar.get(name);
      },
    },
  } as never;

  return { authService, controller, cookieJar, headers };
}

function login(
  authService: InstanceType<typeof AuthService>,
  username: string,
  password: string,
) {
  return authService.login({ username, password }).sessionId;
}

test("010 AC-01 admin-created data is visible through public browsing APIs", () => {
  const adminDataService = new AdminDataService();
  const footballService = new FootballService();
  const competition = adminDataService.createCompetition({
    name: "测试管理赛事",
    description: "管理员创建",
  }).data;
  const stage = adminDataService.createStage({
    competitionId: competition.id,
    name: "测试管理阶段",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 99,
  }).data;
  const homeTeam = adminDataService.createTeam({
    name: "测试管理主队",
    shortName: "主队",
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const awayTeam = adminDataService.createTeam({
    name: "测试管理客队",
    shortName: "客队",
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const match = adminDataService.createMatch({
    stageId: stage.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: "2026-11-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  }).data;

  assert.equal(
    footballService.getCompetition(String(competition.id)).data.name,
    competition.name,
  );
  assert.equal(
    footballService.getTeam(String(homeTeam.id)).data.name,
    homeTeam.name,
  );
  assert.equal(
    footballService.getMatch(String(match.id)).data.homeTeam.name,
    homeTeam.name,
  );
});

test("010 AC-02 admin updates base data and public APIs expose the update", () => {
  const adminDataService = new AdminDataService();
  const footballService = new FootballService();
  const competition = adminDataService.createCompetition({
    name: "待编辑赛事",
    description: "旧描述",
  }).data;
  const stage = adminDataService.createStage({
    competitionId: competition.id,
    name: "待编辑阶段",
    type: "GROUP",
    groupName: "A",
    sortOrder: 100,
  }).data;
  const homeTeam = adminDataService.createTeam({
    name: "待编辑主队",
    shortName: "旧主",
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const awayTeam = adminDataService.createTeam({
    name: "待编辑客队",
    shortName: "旧客",
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const match = adminDataService.createMatch({
    stageId: stage.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: "2026-12-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: "A",
    knockoutRound: null,
    bracketPosition: null,
  }).data;

  adminDataService.updateCompetition(competition.id, {
    name: "已编辑赛事",
    description: "新描述",
  });
  adminDataService.updateStage(stage.id, {
    competitionId: competition.id,
    name: "已编辑阶段",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 101,
  });
  adminDataService.updateTeam(homeTeam.id, {
    name: "已编辑主队",
    shortName: "新主",
    logoUrl: null,
    openLigaDbTeamId: null,
  });
  adminDataService.updateMatch(match.id, {
    stageId: stage.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: "2026-12-02T10:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  });

  const updatedMatch = footballService.getMatch(String(match.id)).data;
  assert.equal(updatedMatch.competition.name, "已编辑赛事");
  assert.equal(updatedMatch.stage.name, "已编辑阶段");
  assert.equal(updatedMatch.homeTeam.name, "已编辑主队");
  assert.equal(updatedMatch.status, "LIVE");
});

test("010 AC-03 admin deletes allowed base data and public APIs stop returning it", () => {
  const adminDataService = new AdminDataService();
  const footballService = new FootballService();
  const competition = adminDataService.createCompetition({
    name: "待删除赛事",
    description: "",
  }).data;
  const stage = adminDataService.createStage({
    competitionId: competition.id,
    name: "待删除阶段",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 102,
  }).data;
  const homeTeam = adminDataService.createTeam({
    name: "待删除主队",
    shortName: null,
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const awayTeam = adminDataService.createTeam({
    name: "待删除客队",
    shortName: null,
    logoUrl: null,
    openLigaDbTeamId: null,
  }).data;
  const match = adminDataService.createMatch({
    stageId: stage.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: "2027-01-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  }).data;

  adminDataService.deleteCompetition(competition.id);

  assert.throws(() => footballService.getCompetition(String(competition.id)), {
    name: "NotFoundError",
  });
  assert.throws(() => footballService.getStage(String(stage.id)), {
    name: "NotFoundError",
  });
  assert.throws(() => footballService.getMatch(String(match.id)), {
    name: "NotFoundError",
  });
});

test("010 AC-03 deleting a match also removes predictions, favorites, and comments", () => {
  const adminDataService = new AdminDataService();
  const authService = createAuthService();
  const favoriteService = new FavoriteService();
  const predictionService = new PredictionService();
  const commentService = new CommentService();
  commentService.userRepository = authService.userRepository;
  const user = authService.register({
    username: "cascade_user",
    password: "password123",
  }).data;
  const match = adminDataService.createMatch({
    stageId: 1,
    homeTeamId: 1,
    awayTeamId: 6,
    startsAt: "2027-03-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  }).data;

  favoriteService.favoriteMatch(user, match.id);
  predictionService.createMyPrediction(user, match.id, {
    homeScore: 1,
    awayScore: 0,
  });
  commentService.createMatchComment(user, match.id, {
    content: "删除前评论",
  });
  assert.equal(favoriteService.countFavorites(user.id, match.id), 1);
  assert.equal(predictionService.countActivePredictions(user.id, match.id), 1);
  assert.equal(commentService.countComments(match.id), 1);

  adminDataService.deleteMatch(match.id);

  assert.equal(favoriteService.countFavorites(user.id, match.id), 0);
  assert.equal(predictionService.countActivePredictions(user.id, match.id), 0);
  assert.equal(commentService.countComments(match.id), 0);
});

test("010 AC-04 normal users cannot write admin data", async () => {
  const { authService, controller, cookieJar } = createController();
  authService.register({
    username: "admin_data_user",
    password: "password123",
  });
  cookieJar.set("sid", login(authService, "admin_data_user", "password123"));

  const response = await controller.createCompetition({
    name: "无权限赛事",
    description: "",
  });

  assert.equal(controller.ctx?.status, 403);
  assert.equal("error" in response, true);
});

test("010 AC-05 unauthenticated users cannot write admin data", async () => {
  const { controller, headers } = createController();

  const response = await controller.createCompetition({
    name: "未登录赛事",
    description: "",
  });

  assert.equal(controller.ctx?.status, 401);
  assert.equal("error" in response, true);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);
});

test("010 AC-06 invalid stage type, missing relations, and invalid time are rejected", () => {
  const adminDataService = new AdminDataService();

  assert.throws(
    () =>
      adminDataService.createStage({
        competitionId: 1,
        name: "非法阶段",
        type: "BAD",
        groupName: null,
        sortOrder: 1,
      }),
    { name: "ValidationError" },
  );
  assert.throws(
    () =>
      adminDataService.createStage({
        competitionId: 999999,
        name: "缺失赛事",
        type: "LEAGUE",
        groupName: null,
        sortOrder: 1,
      }),
    { name: "NotFoundError" },
  );
  assert.throws(
    () =>
      adminDataService.createMatch({
        stageId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        startsAt: "not-a-date",
        status: "SCHEDULED",
        groupName: null,
        knockoutRound: null,
        bracketPosition: null,
      }),
    { name: "ValidationError" },
  );
  assert.throws(
    () =>
      adminDataService.createMatch({
        stageId: 1,
        homeTeamId: 1,
        awayTeamId: 1,
        startsAt: "2027-02-01T10:00:00.000Z",
        status: "SCHEDULED",
        groupName: null,
        knockoutRound: null,
        bracketPosition: null,
      }),
    { name: "ValidationError" },
  );
});
