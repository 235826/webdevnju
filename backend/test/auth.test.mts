import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { AuthService } =
  require("../dist/service/auth.service.js") as typeof import("../src/service/auth.service.ts");
const { AuthController } =
  require("../dist/controller/auth.controller.js") as typeof import("../src/controller/auth.controller.ts");
const { UserRepository } =
  require("../dist/service/user.repository.js") as typeof import("../src/service/user.repository.ts");
const { PasswordService } =
  require("../dist/service/password.service.js") as typeof import("../src/service/password.service.ts");
const { buildApiErrorResponse } =
  require("../dist/utils/http-errors.js") as typeof import("../src/utils/http-errors.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-auth-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createController() {
  const controller = new AuthController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();

  controller.authService = createAuthService();
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
      set(name: string, value: string) {
        if (value) {
          cookieJar.set(name, value);
        } else {
          cookieJar.delete(name);
        }
      },
    },
  } as never;

  return { controller, cookieJar, headers };
}

test("AC-01 registers a normal user without exposing password hash", () => {
  const service = createAuthService();
  const response = service.register({
    username: " learner ",
    password: "password123",
  });

  assert.equal(response.data.username, "learner");
  assert.equal(response.data.role, "USER");
  assert.equal("passwordHash" in response.data, false);
});

test("AC-02 logs in and resolves the current user from the session", () => {
  const service = createAuthService();
  service.register({ username: "player1", password: "password123" });

  const login = service.login({
    username: "player1",
    password: "password123",
  });
  const currentUser = service.getCurrentUser(login.sessionId);

  assert.equal(currentUser.data.username, "player1");
  assert.equal(currentUser.data.role, "USER");
});

test("AC-03 rejects unauthenticated protected access", () => {
  const service = createAuthService();

  assert.throws(() => service.requireUser(undefined), {
    code: "UNAUTHORIZED",
    status: 401,
  });
});

test("AC-04 rejects a normal user from administrator capability", () => {
  const service = createAuthService();
  service.register({ username: "player2", password: "password123" });
  const login = service.login({
    username: "player2",
    password: "password123",
  });

  assert.throws(() => service.requireAdmin(login.sessionId), {
    code: "FORBIDDEN",
    status: 403,
  });
});

test("AC-05 seeds an administrator account that can log in", () => {
  const service = createAuthService();
  const login = service.login({
    username: "admin",
    password: "Admin12345",
  });

  assert.equal(login.response.data.username, "admin");
  assert.equal(login.response.data.role, "ADMIN");
});

test("AC-06 returns safe authentication failures", () => {
  const service = createAuthService();

  try {
    service.login({ username: "admin", password: "wrong-password" });
    assert.fail("login should fail");
  } catch (error) {
    const response = buildApiErrorResponse(error, "req-test");
    const serialized = JSON.stringify(response.body);

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "UNAUTHORIZED");
    assert.doesNotMatch(serialized, /wrong-password/);
    assert.doesNotMatch(serialized, /passwordHash/);
    assert.doesNotMatch(serialized, /auth-store/);
    assert.doesNotMatch(serialized, /Error:/);
  }
});

test("auth controller follows status, cookie, and request-id contract", async () => {
  const { controller, cookieJar, headers } = createController();

  const registerResponse = await controller.register({
    username: "apiuser",
    password: "password123",
  });

  assert.equal(controller.ctx?.status, 201);
  assert.equal("data" in registerResponse, true);
  assert.ok("data" in registerResponse);
  assert.equal(registerResponse.data.username, "apiuser");
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);

  const loginResponse = await controller.login({
    username: "apiuser",
    password: "password123",
  });

  assert.equal("data" in loginResponse, true);
  assert.ok("data" in loginResponse);
  assert.equal(loginResponse.data.username, "apiuser");
  assert.equal(typeof cookieJar.get("sid"), "string");

  const meResponse = await controller.me();

  assert.equal("data" in meResponse, true);
  assert.ok("data" in meResponse);
  assert.equal(meResponse.data.username, "apiuser");

  await controller.logout();

  assert.equal(controller.ctx?.status, 204);
  assert.equal(cookieJar.has("sid"), false);

  const unauthenticatedResponse = await controller.me();

  assert.equal(controller.ctx?.status, 401);
  assert.equal("error" in unauthenticatedResponse, true);
});
