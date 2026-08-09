import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { AdminCommentController } =
  require("../dist/controller/admin-comment.controller.js") as typeof import("../src/controller/admin-comment.controller.ts");
const { CommentController } =
  require("../dist/controller/comment.controller.js") as typeof import("../src/controller/comment.controller.ts");
const { AuthService } =
  require("../dist/service/auth.service.js") as typeof import("../src/service/auth.service.ts");
const { CommentService } =
  require("../dist/service/comment.service.js") as typeof import("../src/service/comment.service.ts");
const { AdminDataService } =
  require("../dist/service/admin-data.service.js") as typeof import("../src/service/admin-data.service.ts");
const { FootballRepository } =
  require("../dist/service/football.repository.js") as typeof import("../src/service/football.repository.ts");
const { PasswordService } =
  require("../dist/service/password.service.js") as typeof import("../src/service/password.service.ts");
const { UserRepository } =
  require("../dist/service/user.repository.js") as typeof import("../src/service/user.repository.ts");

function createAuthService(): InstanceType<typeof AuthService> {
  const service = new AuthService();
  const passwordService = new PasswordService();
  const storePath = join(
    mkdtempSync(join(tmpdir(), "football-comment-test-")),
    "auth-store.json",
  );

  service.passwordService = passwordService;
  service.userRepository = new UserRepository(storePath, passwordService);

  return service;
}

function createCommentService(authService: InstanceType<typeof AuthService>) {
  const service = new CommentService();
  service.footballRepository = new FootballRepository();
  service.userRepository = authService.userRepository;

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
  const commentController = new CommentController();
  const adminController = new AdminCommentController();
  const cookieJar = new Map<string, string>();
  const headers = new Map<string, string>();
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const ctx = {
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

  commentController.authService = authService;
  commentController.commentService = commentService;
  commentController.ctx = ctx;
  adminController.authService = authService;
  adminController.commentService = commentService;
  adminController.ctx = ctx;

  return {
    adminController,
    authService,
    commentController,
    cookieJar,
    headers,
  };
}

function login(
  authService: InstanceType<typeof AuthService>,
  username: string,
  password: string,
) {
  return authService.login({ username, password }).sessionId;
}

test("008 AC-01 and AC-02 create visible pending comments for any match status", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const user = createUser(authService, "comment_ac01");

  const scheduled = commentService.createMatchComment(user, "1", {
    content: "赛前看好主队",
  });
  const live = commentService.createMatchComment(user, "2", {
    content: "比赛中节奏很快",
  });
  const finished = commentService.createMatchComment(user, "3", {
    content: "赛后复盘很精彩",
  });

  assert.equal(scheduled.data.moderationStatus, "PENDING");
  assert.equal(scheduled.data.visible, true);
  assert.equal(live.data.visible, true);
  assert.equal(finished.data.visible, true);
  assert.equal(
    commentService
      .listMatchComments("1", {})
      .data.some((comment) => comment.id === scheduled.data.id),
    true,
  );
});

test("008 AC-03 paginates comments with stable ascending order", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const user = createUser(authService, "comment_ac03");
  const createdIds = Array.from({ length: 7 }, (_, index) => {
    return commentService.createMatchComment(user, "4", {
      content: `分页评论 ${index + 1}`,
    }).data.id;
  });

  const firstPage = commentService.listMatchComments("4", {
    page: "1",
    pageSize: "3",
  });
  const thirdPage = commentService.listMatchComments("4", {
    page: "3",
    pageSize: "3",
  });

  assert.equal(firstPage.pagination.total >= 7, true);
  assert.deepEqual(
    firstPage.data.slice(-3).map((comment) => comment.id),
    createdIds.slice(0, 3),
  );
  assert.equal(
    thirdPage.data.some((comment) => comment.id === createdIds[6]),
    true,
  );
});

test("008 AC-03 paginates larger comment sets with page size bounds", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const user = createUser(authService, "comment_ac03_large");
  const match = new AdminDataService().createMatch({
    stageId: 1,
    homeTeamId: 1,
    awayTeamId: 6,
    startsAt: "2027-04-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
  }).data;
  const createdIds = Array.from({ length: 120 }, (_, index) => {
    return commentService.createMatchComment(user, match.id, {
      content: `大量分页评论 ${index + 1}`,
    }).data.id;
  });

  const firstPage = commentService.listMatchComments(match.id, {
    page: "1",
    pageSize: "100",
  });
  const secondPage = commentService.listMatchComments(match.id, {
    page: "2",
    pageSize: "100",
  });
  const emptyPage = commentService.listMatchComments(match.id, {
    page: "3",
    pageSize: "100",
  });

  assert.equal(firstPage.pagination.pageSize, 100);
  assert.equal(firstPage.pagination.total >= 120, true);
  assert.deepEqual(
    firstPage.data.slice(-100).map((comment) => comment.id),
    createdIds.slice(0, 100),
  );
  assert.deepEqual(
    secondPage.data.slice(-20).map((comment) => comment.id),
    createdIds.slice(100),
  );
  assert.equal(
    emptyPage.data.some((comment) => createdIds.includes(comment.id)),
    false,
  );
  assert.equal(emptyPage.pagination.total, firstPage.pagination.total);
  assert.throws(
    () =>
      commentService.listMatchComments(match.id, {
        page: "1",
        pageSize: "101",
      }),
    { code: "VALIDATION_FAILED", status: 400 },
  );
});

test("008 AC-04 author can edit their own comment", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const user = createUser(authService, "comment_ac04");
  const comment = commentService.createMatchComment(user, "1", {
    content: "原始内容",
  });

  const response = commentService.updateComment(user, comment.data.id, {
    content: "更新后的内容",
  });

  assert.equal(response.data.content, "更新后的内容");
  assert.equal(
    commentService
      .listMatchComments("1", {})
      .data.some((item) => item.content === "更新后的内容"),
    true,
  );
});

test("008 AC-04 and AC-05 handle edit and delete interleavings safely", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const owner = createUser(authService, "comment_interleave_owner");
  const other = createUser(authService, "comment_interleave_other");
  const deletedBeforeEdit = commentService.createMatchComment(owner, "1", {
    content: "先删后改",
  });
  const editedBeforeDelete = commentService.createMatchComment(owner, "1", {
    content: "先改后删",
  });
  const deletedBeforeUnauthorized = commentService.createMatchComment(
    owner,
    "1",
    {
      content: "删除后越权访问",
    },
  );

  commentService.deleteComment(owner, deletedBeforeEdit.data.id);
  assert.throws(
    () =>
      commentService.updateComment(owner, deletedBeforeEdit.data.id, {
        content: "删除后不能编辑",
      }),
    { code: "NOT_FOUND", status: 404 },
  );

  const updated = commentService.updateComment(
    owner,
    editedBeforeDelete.data.id,
    {
      content: "编辑后删除",
    },
  );
  assert.equal(updated.data.content, "编辑后删除");
  commentService.deleteComment(owner, editedBeforeDelete.data.id);
  assert.equal(
    commentService
      .listMatchComments("1", {})
      .data.some((comment) => comment.id === editedBeforeDelete.data.id),
    false,
  );

  commentService.deleteComment(owner, deletedBeforeUnauthorized.data.id);
  assert.throws(
    () =>
      commentService.updateComment(other, deletedBeforeUnauthorized.data.id, {
        content: "删除后越权编辑",
      }),
    { code: "NOT_FOUND", status: 404 },
  );
  assert.throws(
    () =>
      commentService.deleteComment(other, deletedBeforeUnauthorized.data.id),
    { code: "NOT_FOUND", status: 404 },
  );
});

test("008 AC-05 non-author cannot edit or delete comments", () => {
  const authService = createAuthService();
  const commentService = createCommentService(authService);
  const owner = createUser(authService, "comment_owner");
  const other = createUser(authService, "comment_other");
  const comment = commentService.createMatchComment(owner, "2", {
    content: "只有作者可以改",
  });

  assert.throws(
    () =>
      commentService.updateComment(other, comment.data.id, {
        content: "越权编辑",
      }),
    { code: "FORBIDDEN", status: 403 },
  );
  assert.throws(() => commentService.deleteComment(other, comment.data.id), {
    code: "FORBIDDEN",
    status: 403,
  });
});

test("008 AC-06 admin can update moderation status", async () => {
  const { adminController, authService, commentController, cookieJar } =
    createController();
  const user = createUser(authService, "comment_moderated");
  cookieJar.set("sid", login(authService, "comment_moderated", "password123"));
  const created = await commentController.createMatchComment("3", {
    content: "需要审核的评论",
  });

  if (!("data" in created)) {
    assert.fail("comment should be created");
  }

  cookieJar.set("sid", login(authService, "admin", "Admin12345"));
  const moderated = await adminController.moderateComment(
    String(created.data.id),
    { moderationStatus: "APPROVED" },
  );

  if (!("data" in moderated)) {
    assert.fail("comment should be moderated");
  }

  assert.equal(moderated.data.author.id, user.id);
  assert.equal(moderated.data.moderationStatus, "APPROVED");
  assert.equal(moderated.data.visible, true);
});

test("008 AC-07 rejects unauthenticated comment creation", async () => {
  const { commentController, headers } = createController();
  const response = await commentController.createMatchComment("1", {
    content: "未登录不能发",
  });

  assert.equal(commentController.ctx?.status, 401);
  assert.equal("error" in response, true);
  assert.equal(headers.get("X-Request-Id")?.startsWith("req-"), true);
});

test("008 comment controller sets 201 Location and delete returns 204", async () => {
  const { authService, commentController, cookieJar, headers } =
    createController();
  createUser(authService, "comment_http");
  cookieJar.set("sid", login(authService, "comment_http", "password123"));
  const created = await commentController.createMatchComment("1", {
    content: "HTTP 边界测试",
  });

  if (!("data" in created)) {
    assert.fail("comment should be created");
  }

  assert.equal(commentController.ctx?.status, 201);
  assert.equal(headers.get("Location"), `/api/comments/${created.data.id}`);

  const deleted = await commentController.deleteComment(
    String(created.data.id),
  );

  assert.equal(commentController.ctx?.status, 204);
  assert.equal(deleted, undefined);
});
