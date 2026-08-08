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
const { FavoriteService } =
  require("../dist/service/favorite.service.js") as typeof import("../src/service/favorite.service.ts");
const { FootballRepository } =
  require("../dist/service/football.repository.js") as typeof import("../src/service/football.repository.ts");
const { FavoriteController } =
  require("../dist/controller/favorite.controller.js") as typeof import("../src/controller/favorite.controller.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-favorite-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createFavoriteService(): InstanceType<typeof FavoriteService> {
  const service = new FavoriteService();
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
  const controller = new FavoriteController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();
  const authService = createAuthService();

  controller.authService = authService;
  controller.favoriteService = createFavoriteService();
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

test("007 AC-01 favorite match appears in my favorites", () => {
  const authService = createAuthService();
  const favoriteService = createFavoriteService();
  const user = createUser(authService, "favorite_ac01");

  const favorite = favoriteService.favoriteMatch(user, "1");
  const list = favoriteService.listMyFavorites(user);

  assert.equal(favorite.data.match.id, 1);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].match.id, 1);
});

test("007 AC-02 unfavorite removes match from my favorites", () => {
  const authService = createAuthService();
  const favoriteService = createFavoriteService();
  const user = createUser(authService, "favorite_ac02");

  favoriteService.favoriteMatch(user, "1");
  favoriteService.unfavoriteMatch(user, "1");

  assert.deepEqual(favoriteService.listMyFavorites(user).data, []);
});

test("007 AC-03 repeated favorite keeps only one item", () => {
  const authService = createAuthService();
  const favoriteService = createFavoriteService();
  const user = createUser(authService, "favorite_ac03");

  const first = favoriteService.favoriteMatch(user, "1");
  const second = favoriteService.favoriteMatch(user, "1");

  assert.equal(first.data.id, second.data.id);
  assert.equal(favoriteService.countFavorites(user.id, 1), 1);
});

test("007 AC-04 rejects unauthenticated favorite writes", async () => {
  const { controller, headers } = createController();
  const favorite = await controller.favoriteMatch("1");

  assert.equal(controller.ctx?.status, 401);
  assert.equal("error" in favorite, true);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);

  if (controller.ctx) {
    controller.ctx.status = 200;
  }
  const unfavorite = await controller.unfavoriteMatch("1");

  assert.equal(controller.ctx?.status, 401);
  assert.ok(unfavorite);
  assert.equal("error" in unfavorite, true);
});

test("007 favorite controller returns 204 for idempotent unfavorite", async () => {
  const { authService, controller, cookieJar } = createController();
  const login = authService.login({
    username: "admin",
    password: "Admin12345",
  });
  cookieJar.set("sid", login.sessionId);

  const response = await controller.unfavoriteMatch("1");

  assert.equal(controller.ctx?.status, 204);
  assert.equal(response, undefined);
});

test("007 favorites reject missing matches without leaking internals", () => {
  const authService = createAuthService();
  const favoriteService = createFavoriteService();
  const user = createUser(authService, "favorite_missing");

  assert.throws(() => favoriteService.favoriteMatch(user, "999"), {
    code: "NOT_FOUND",
    status: 404,
  });
});
