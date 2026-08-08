import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Match } from "../src/types/football.ts";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { AdminMatchController } =
  require("../dist/controller/admin-match.controller.js") as typeof import("../src/controller/admin-match.controller.ts");
const { AuthService } =
  require("../dist/service/auth.service.js") as typeof import("../src/service/auth.service.ts");
const { UserRepository } =
  require("../dist/service/user.repository.js") as typeof import("../src/service/user.repository.ts");
const { PasswordService } =
  require("../dist/service/password.service.js") as typeof import("../src/service/password.service.ts");
const { MatchResultService } =
  require("../dist/service/match-result.service.js") as typeof import("../src/service/match-result.service.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-result-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createMatchResultService() {
  const service = new MatchResultService();
  const baseMatch: Match = {
    id: 100,
    competition: {
      id: 10,
      name: "测试赛事",
      description: "测试",
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    stage: {
      id: 20,
      competitionId: 10,
      name: "测试阶段",
      type: "GROUP",
      groupName: "A",
      sortOrder: 1,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    homeTeam: {
      id: 30,
      name: "主队",
      shortName: "主",
      logoUrl: null,
      openLigaDbTeamId: null,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    awayTeam: {
      id: 31,
      name: "客队",
      shortName: "客",
      logoUrl: null,
      openLigaDbTeamId: null,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    startsAt: "2026-09-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: "A",
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
  let currentMatch = baseMatch;

  service.footballRepository = {
    updateMatchResult(
      id: number,
      result: { homeScore: number; awayScore: number },
    ) {
      if (id !== currentMatch.id) {
        return undefined;
      }

      currentMatch = {
        ...currentMatch,
        status: "FINISHED",
        result: {
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          updatedAt: "2026-08-08T01:00:00.000Z",
        },
        updatedAt: "2026-08-08T01:00:00.000Z",
      };

      return currentMatch;
    },
  } as never;

  return { service, getCurrentMatch: () => currentMatch };
}

function createController() {
  const controller = new AdminMatchController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();
  const authService = createAuthService();
  const { service, getCurrentMatch } = createMatchResultService();

  controller.authService = authService;
  controller.matchResultService = service;
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

  return { authService, controller, cookieJar, getCurrentMatch, headers };
}

function login(
  authService: InstanceType<typeof AuthService>,
  username: string,
  password: string,
) {
  return authService.login({ username, password }).sessionId;
}

test("AC-01 admin saves a match result and the match response reflects it", () => {
  const { service } = createMatchResultService();
  const response = service.updateMatchResult("100", {
    homeScore: 2,
    awayScore: 1,
  });

  assert.equal(response.data.status, "FINISHED");
  assert.equal(response.data.result?.homeScore, 2);
  assert.equal(response.data.result?.awayScore, 1);
});

test("AC-02 admin can overwrite an existing match result", () => {
  const { service } = createMatchResultService();
  service.updateMatchResult("100", { homeScore: 2, awayScore: 1 });
  const response = service.updateMatchResult("100", {
    homeScore: 3,
    awayScore: 3,
  });

  assert.equal(response.data.result?.homeScore, 3);
  assert.equal(response.data.result?.awayScore, 3);
});

test("AC-03 normal users cannot write match results", async () => {
  const { authService, controller, cookieJar, getCurrentMatch } =
    createController();
  authService.register({ username: "result_user", password: "password123" });
  cookieJar.set("sid", login(authService, "result_user", "password123"));

  const response = await controller.updateMatchResult("100", {
    homeScore: 1,
    awayScore: 1,
  });

  assert.equal(controller.ctx?.status, 403);
  assert.equal("error" in response, true);
  assert.equal(getCurrentMatch().result, null);
});

test("AC-04 unauthenticated users cannot write match results", async () => {
  const { controller, getCurrentMatch, headers } = createController();
  const response = await controller.updateMatchResult("100", {
    homeScore: 1,
    awayScore: 1,
  });

  assert.equal(controller.ctx?.status, 401);
  assert.equal("error" in response, true);
  assert.equal(getCurrentMatch().result, null);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);
});

test("AC-05 invalid result input is rejected and does not write", async () => {
  const { authService, controller, cookieJar, getCurrentMatch } =
    createController();
  cookieJar.set("sid", login(authService, "admin", "Admin12345"));

  const missing = await controller.updateMatchResult("100", { homeScore: 1 });
  const decimal = await controller.updateMatchResult("100", {
    homeScore: 1.5,
    awayScore: 0,
  });
  const negative = await controller.updateMatchResult("100", {
    homeScore: -1,
    awayScore: 0,
  });

  assert.equal("error" in missing, true);
  assert.equal("error" in decimal, true);
  assert.equal("error" in negative, true);
  assert.equal(controller.ctx?.status, 400);
  assert.equal(getCurrentMatch().result, null);
});

test("admin result controller returns safe not found errors", async () => {
  const { authService, controller, cookieJar } = createController();
  cookieJar.set("sid", login(authService, "admin", "Admin12345"));
  const response = await controller.updateMatchResult("999", {
    homeScore: 1,
    awayScore: 0,
  });

  assert.equal(controller.ctx?.status, 404);
  assert.equal("error" in response, true);
  assert.doesNotMatch(JSON.stringify(response), /Seed|Error:|repository/i);
});
