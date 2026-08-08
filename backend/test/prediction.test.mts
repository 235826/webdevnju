import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { AuthService } =
  require("../dist/service/auth.service.js") as typeof import("../src/service/auth.service.ts");
const { UserRepository } =
  require("../dist/service/user.repository.js") as typeof import("../src/service/user.repository.ts");
const { PasswordService } =
  require("../dist/service/password.service.js") as typeof import("../src/service/password.service.ts");
const { PredictionService } =
  require("../dist/service/prediction.service.js") as typeof import("../src/service/prediction.service.ts");
const { FootballRepository } =
  require("../dist/service/football.repository.js") as typeof import("../src/service/football.repository.ts");
const { PredictionController } =
  require("../dist/controller/prediction.controller.js") as typeof import("../src/controller/prediction.controller.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-prediction-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createPredictionService(): InstanceType<typeof PredictionService> {
  const service = new PredictionService();
  service.footballRepository = new FootballRepository();

  return service;
}

function createUser(
  authService: InstanceType<typeof AuthService>,
  username: string,
) {
  authService.register({ username, password: "password123" });
  return authService.login({ username, password: "password123" }).response.data;
}

function createController() {
  const controller = new PredictionController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();
  const authService = createAuthService();

  controller.authService = authService;
  controller.predictionService = createPredictionService();
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

test("AC-01 creates an active prediction for an authenticated user before kickoff", () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac01");

  const response = predictionService.createMyPrediction(user, "1", {
    homeScore: 2,
    awayScore: 1,
  });
  const current = predictionService.getMyPrediction(user, "1");

  assert.equal(response.data.matchId, 1);
  assert.equal(response.data.userId, user.id);
  assert.equal(response.data.isActive, true);
  assert.deepEqual(current.data, response.data);
});

test("AC-02 updates a prediction and keeps a single active prediction", () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac02");

  const first = predictionService.createMyPrediction(user, "1", {
    homeScore: 1,
    awayScore: 0,
  });
  const second = predictionService.updateMyPrediction(user, "1", {
    homeScore: 3,
    awayScore: 2,
  });
  const current = predictionService.getMyPrediction(user, "1");

  assert.notEqual(second.data.id, first.data.id);
  assert.equal(first.data.isActive, false);
  assert.equal(first.data.supersededAt !== null, true);
  assert.equal(current.data?.homeScore, 3);
  assert.equal(predictionService.countActivePredictions(user.id, 1), 1);
});

test("AC-03 rejects creating a prediction after kickoff", () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac03");

  assert.throws(
    () =>
      predictionService.createMyPrediction(user, "3", {
        homeScore: 1,
        awayScore: 1,
      }),
    { code: "PREDICTION_LOCKED", status: 409 },
  );
  assert.equal(predictionService.countActivePredictions(user.id, 3), 0);
});

test("AC-04 rejects updating after kickoff and leaves the active prediction unchanged", () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac04");

  const original = predictionService.createMyPrediction(user, "1", {
    homeScore: 1,
    awayScore: 0,
  });
  const repository = new FootballRepository();
  const futureMatch = repository.findMatch(1);
  assert.ok(futureMatch);

  predictionService.footballRepository = {
    findMatch(matchId: number) {
      if (matchId !== 1) {
        return repository.findMatch(matchId);
      }

      return {
        ...futureMatch,
        startsAt: "2026-07-01T00:00:00.000Z",
      };
    },
  } as never;

  assert.throws(
    () =>
      predictionService.updateMyPrediction(user, "1", {
        homeScore: 4,
        awayScore: 4,
      }),
    { code: "PREDICTION_LOCKED", status: 409 },
  );
  assert.deepEqual(
    predictionService.getMyPrediction(user, "1").data,
    original.data,
  );
});

test("AC-05 rejects unauthenticated prediction requests at the controller boundary", async () => {
  const { controller, headers } = createController();
  const response = await controller.createMyMatchPrediction("1", {
    homeScore: 1,
    awayScore: 0,
  });

  assert.equal(controller.ctx?.status, 401);
  assert.equal("error" in response, true);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);
});

test("AC-06 concurrent creates leave at most one active prediction", async () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac06");

  await Promise.all(
    [0, 1, 2, 3, 4].map((score) =>
      Promise.resolve(
        predictionService.createMyPrediction(user, "4", {
          homeScore: score,
          awayScore: 0,
        }),
      ),
    ),
  );

  assert.equal(predictionService.countActivePredictions(user.id, 4), 1);
});

test("AC-07 rejects missing, non-integer, and negative scores", () => {
  const authService = createAuthService();
  const predictionService = createPredictionService();
  const user = createUser(authService, "predictor_ac07");
  const activeCountBefore = predictionService.countActivePredictions(
    user.id,
    1,
  );

  assert.throws(
    () => predictionService.createMyPrediction(user, "1", { homeScore: 1 }),
    { code: "VALIDATION_FAILED", status: 400 },
  );
  assert.throws(
    () =>
      predictionService.createMyPrediction(user, "1", {
        homeScore: 1.5,
        awayScore: 0,
      }),
    { code: "VALIDATION_FAILED", status: 400 },
  );
  assert.throws(
    () =>
      predictionService.createMyPrediction(user, "1", {
        homeScore: -1,
        awayScore: 0,
      }),
    { code: "VALIDATION_FAILED", status: 400 },
  );
  assert.equal(
    predictionService.countActivePredictions(user.id, 1),
    activeCountBefore,
  );
});

test("prediction controller sets 201 Location and lists only current user predictions", async () => {
  const { authService, controller, cookieJar, headers } = createController();
  const user = createUser(authService, "predictor_http");
  const otherUser = createUser(authService, "predictor_http_other");
  const login = authService.login({
    username: "predictor_http",
    password: "password123",
  });

  cookieJar.set("sid", login.sessionId);
  const response = await controller.createMyMatchPrediction("1", {
    homeScore: 2,
    awayScore: 0,
  });
  controller.predictionService.createMyPrediction(otherUser, "4", {
    homeScore: 0,
    awayScore: 1,
  });
  const listResponse = await controller.listMyPredictions();

  assert.equal(controller.ctx?.status, 201);
  assert.equal(headers.get("Location"), "/api/matches/1/prediction");
  if (!("data" in response) || !("data" in listResponse)) {
    assert.fail("prediction controller should return successful data payloads");
  }
  assert.equal(
    listResponse.data.every((prediction) => prediction.userId === user.id),
    true,
  );
});
