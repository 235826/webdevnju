import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  close,
  createApp,
  createHttpRequest,
  mockClassProperty,
  restoreMocks,
} from "@midwayjs/mock";
import type { CourseService as CourseServiceInstance } from "../src/service/course.service";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { CourseService } = require("../dist/service/course.service.js") as {
  CourseService: new () => CourseServiceInstance;
};
const backendDirectory = fileURLToPath(new URL("..", import.meta.url));
const compiledSourceDirectory = join(backendDirectory, "dist");

type TestApplication = Awaited<ReturnType<typeof createApp>>;
type SeedCourse = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
};

describe("course API integration", { concurrency: false }, () => {
  test("AC-01: GET /api/health returns the documented healthy response", async () => {
    await withApi(async (request) => {
      const response = await request.get("/api/health").expect(200);

      assert.equal(response.body.status, "ok");
      assert.equal(response.body.service, "course-demo-api");
      assertIsoTimestamp(response.body.timestamp);
    });
  });

  test("AC-02: GET /api/courses sorts persisted courses by id", async () => {
    await withApi(
      async (request) => {
        const response = await request.get("/api/courses").expect(200);

        assertNonEmptyRequestId(response.headers["x-request-id"]);
        assert.deepEqual(
          response.body.data.map((course: SeedCourse) => course.id),
          [2, 7, 40],
        );
        assert.deepEqual(
          response.body.data.map((course: SeedCourse) => course.title),
          ["第二门", "第七门", "第四十门"],
        );
        response.body.data.forEach((course: SeedCourse) => {
          assertIsoTimestamp(course.createdAt);
        });
      },
      (databasePath) => {
        seedDatabase(databasePath, [
          {
            id: 40,
            title: "第四十门",
            description: "最后返回的课程",
            createdAt: "2026-07-12 03:00:00",
          },
          {
            id: 2,
            title: "第二门",
            description: "最先返回的课程",
            createdAt: "2026-07-12 01:00:00",
          },
          {
            id: 7,
            title: "第七门",
            description: "中间返回的课程",
            createdAt: "2026-07-12 02:00:00",
          },
        ]);
      },
    );
  });

  test("BR-02: GET /api/courses returns 200 with an empty data array", async () => {
    await withApi(async (request) => {
      const mockGroup = "empty-course-list";
      mockClassProperty(CourseService, "list", () => [], mockGroup);

      try {
        const emptyResponse = await request.get("/api/courses").expect(200);
        assertNonEmptyRequestId(emptyResponse.headers["x-request-id"]);
        assert.deepEqual(emptyResponse.body, { data: [] });
      } finally {
        restoreMocks(mockGroup);
      }
    });
  });

  test("AC-01: GET /api/courses treats blank keyword like omission", async () => {
    await withApi(
      async (request) => {
        const withoutKeyword = await request.get("/api/courses").expect(200);
        const blankKeyword = await request
          .get("/api/courses?keyword=%20%20%20")
          .expect(200);

        assertNonEmptyRequestId(withoutKeyword.headers["x-request-id"]);
        assertNonEmptyRequestId(blankKeyword.headers["x-request-id"]);
        assert.deepEqual(blankKeyword.body, withoutKeyword.body);
      },
      (databasePath) => {
        seedDatabase(databasePath, [
          {
            id: 4,
            title: "第四门",
            description: "完整列表保留排序",
            createdAt: "2026-07-12 04:00:00",
          },
          {
            id: 1,
            title: "第一门",
            description: "空白关键词等同省略",
            createdAt: "2026-07-12 01:00:00",
          },
        ]);
      },
    );
  });

  test("AC-02/03: GET /api/courses matches trimmed keyword across title and description case-insensitively", async () => {
    await withApi(
      async (request) => {
        const trimmedResponse = await request
          .get("/api/courses?keyword=%20web%20")
          .expect(200);
        const upperResponse = await request
          .get("/api/courses?keyword=WEB")
          .expect(200);

        assertNonEmptyRequestId(trimmedResponse.headers["x-request-id"]);
        assert.deepEqual(
          trimmedResponse.body.data.map((course: SeedCourse) => course.id),
          [2, 5],
        );
        assert.deepEqual(
          upperResponse.body.data.map((course: SeedCourse) => course.id),
          [2, 5],
        );
      },
      (databasePath) => {
        seedDatabase(databasePath, [
          {
            id: 2,
            title: "Web 组件设计",
            description: "标题命中",
            createdAt: "2026-07-12 02:00:00",
          },
          {
            id: 5,
            title: "接口工程",
            description: "通过 web API 描述契约",
            createdAt: "2026-07-12 05:00:00",
          },
          {
            id: 9,
            title: "数据库基础",
            description: "不应匹配",
            createdAt: "2026-07-12 09:00:00",
          },
        ]);
      },
    );
  });

  test("AC-04/05: GET /api/courses returns 200 empty data for no matches and treats % _ \\ literally", async () => {
    await withApi(async (request) => {
      const noMatchResponse = await request
        .get("/api/courses?keyword=missing")
        .expect(200);

      assert.deepEqual(noMatchResponse.body, { data: [] });

      for (const keyword of ["%", "_", "\\"]) {
        const response = await request
          .get(`/api/courses?keyword=${encodeURIComponent(keyword)}`)
          .expect(200);

        assert.deepEqual(response.body, { data: [] });
        assertNonEmptyRequestId(response.headers["x-request-id"]);
      }
    });
  });

  test("AC-06: GET /api/courses rejects repeated keyword query and overlong keyword", async (t) => {
    await withApi(async (request) => {
      await t.test("duplicate keyword", async () => {
        const response = await request
          .get("/api/courses?keyword=web&keyword=react")
          .expect(400);

        assert.equal(response.body.error.code, "VALIDATION_FAILED");
        assert.equal(response.body.error.message, "请求参数不合法");
        assert.equal(response.body.error.details[0].field, "keyword");
        assert.equal(response.body.requestId, response.headers["x-request-id"]);
      });

      await t.test("overlong keyword", async () => {
        const tooLongKeyword = encodeURIComponent("课".repeat(81));
        const response = await request
          .get(`/api/courses?keyword=${tooLongKeyword}`)
          .expect(400);

        assert.equal(response.body.error.code, "VALIDATION_FAILED");
        assert.equal(response.body.error.details[0].reason, "maxLength");
        assert.equal(response.body.requestId, response.headers["x-request-id"]);
      });
    });
  });

  test("AC-07/08: GET /api/courses returns safe 500 errors with a stable request id", async () => {
    await withApi(async (request) => {
      const mockGroup = "course-list-internal-error";
      mockClassProperty(
        CourseService,
        "list",
        () => {
          throw new Error("SELECT * FROM courses at /private/demo.sqlite");
        },
        mockGroup,
      );

      try {
        const response = await request
          .get("/api/courses")
          .set("X-Request-Id", "req-search-500")
          .expect(500);

        assert.equal(response.headers["x-request-id"], "req-search-500");
        assert.equal(response.body.error.code, "INTERNAL_ERROR");
        assert.equal(response.body.requestId, "req-search-500");
        assert.equal(
          JSON.stringify(response.body).includes("demo.sqlite"),
          false,
        );
        assert.equal(
          JSON.stringify(response.body).includes("SELECT * FROM courses"),
          false,
        );
      } finally {
        restoreMocks(mockGroup);
      }
    });
  });

  test("AC-07: GET /api/courses logs the same requestId as the error response", async () => {
    await withTemporaryDatabase(async (databasePath) => {
      const mockGroup = "course-list-error-log";

      mockClassProperty(
        CourseService,
        "list",
        () => {
          throw new Error("database exploded");
        },
        mockGroup,
      );

      const application = await openApplication(databasePath);

      try {
        const response = await createHttpRequest(application)
          .get("/api/courses")
          .set("X-Request-Id", "req-log-500")
          .expect(500);
        const logContent = await readCourseLogFiles();

        assert.equal(response.body.requestId, "req-log-500");
        assert.equal(logContent.includes("course_list_request"), true);
        assert.equal(logContent.includes("req-log-500"), true);
        assert.equal(logContent.includes("INTERNAL_ERROR"), true);
      } finally {
        await close(application, { cleanLogsDir: true });
        restoreMocks(mockGroup);
      }
    });
  });

  test("AC-03: initialization seeds exactly three courses and is restart-safe", async () => {
    await withTemporaryDatabase(async (databasePath) => {
      let application: TestApplication | undefined;

      const stopApplication = async () => {
        const currentApplication = application;
        application = undefined;
        if (currentApplication) {
          await close(currentApplication, { cleanLogsDir: true });
        }
      };

      try {
        application = await openApplication(databasePath);
        const firstResponse = await createHttpRequest(application)
          .get("/api/courses")
          .expect(200);

        assert.deepEqual(
          firstResponse.body.data.map((course: SeedCourse) => course.title),
          ["HTML 与 CSS", "React 与 Next.js", "API 与数据持久化"],
        );
        assert.equal(firstResponse.body.data.length, 3);

        await stopApplication();

        application = await openApplication(databasePath);
        const secondResponse = await createHttpRequest(application)
          .get("/api/courses")
          .expect(200);

        assert.equal(secondResponse.body.data.length, 3);
        assert.deepEqual(secondResponse.body.data, firstResponse.body.data);
      } finally {
        await stopApplication();
      }
    });
  });

  test("OpenAPI createCourse: POST accepts the documented length boundaries", async () => {
    await withApi(async (request) => {
      const minimumResponse = await request
        .post("/api/courses")
        .send({ title: "TS", description: "入门" })
        .expect(200);

      assertNonEmptyRequestId(minimumResponse.headers["x-request-id"]);
      assert.equal(minimumResponse.body.data.title, "TS");
      assert.equal(minimumResponse.body.data.description, "入门");
      assertIsoTimestamp(minimumResponse.body.data.createdAt);

      const maximumResponse = await request
        .post("/api/courses")
        .send({ title: "T".repeat(80), description: "D".repeat(500) })
        .expect(200);

      assertNonEmptyRequestId(maximumResponse.headers["x-request-id"]);
      assert.equal(maximumResponse.body.data.title.length, 80);
      assert.equal(maximumResponse.body.data.description.length, 500);
      assertIsoTimestamp(maximumResponse.body.data.createdAt);

      const listResponse = await request.get("/api/courses").expect(200);
      const ids = listResponse.body.data.map((course: SeedCourse) => course.id);
      assert.deepEqual(
        ids,
        [...ids].sort((left, right) => left - right),
      );
      assert.equal(
        ids.at(-1),
        maximumResponse.body.data.id,
        "the boundary course remains persisted and listable",
      );
    });
  });

  test("OpenAPI createCourse: POST maps invalid input to 400", async (t) => {
    await withApi(async (request) => {
      const invalidInputs = [
        {
          name: "non-object body",
          body: [],
          message: "请求体必须是 JSON 对象",
        },
        {
          name: "title below minimum",
          body: { title: "T", description: "有效简介" },
          message: "title 长度必须在 2 到 80 个字符之间",
        },
        {
          name: "title above maximum",
          body: { title: "T".repeat(81), description: "有效简介" },
          message: "title 长度必须在 2 到 80 个字符之间",
        },
        {
          name: "description below minimum",
          body: { title: "有效标题", description: "D" },
          message: "description 长度必须在 2 到 500 个字符之间",
        },
        {
          name: "description above maximum",
          body: { title: "有效标题", description: "D".repeat(501) },
          message: "description 长度必须在 2 到 500 个字符之间",
        },
      ];

      for (const [index, invalidInput] of invalidInputs.entries()) {
        await t.test(invalidInput.name, async () => {
          const requestId = `client-create-${index}`;
          const response = await request
            .post("/api/courses")
            .set("Accept", "application/json")
            .set("X-Request-Id", requestId)
            .send(invalidInput.body)
            .expect(400);

          assert.equal(response.headers["x-request-id"], requestId);
          assert.equal(response.body.error.code, "VALIDATION_FAILED");
          assert.equal(response.body.error.message, invalidInput.message);
          assert.equal(response.body.requestId, requestId);
        });
      }

      const listResponse = await request.get("/api/courses").expect(200);
      assert.equal(
        listResponse.body.data.length,
        3,
        "invalid requests must not create courses",
      );
    });
  });

  test("OpenAPI createCourse: POST maps unexpected failures to 500 with a safe error body", async () => {
    await withApi(async (request) => {
      const mockGroup = "create-course-internal-error";
      mockClassProperty(
        CourseService,
        "create",
        () => {
          throw new Error("INSERT INTO courses failed at /private/demo.sqlite");
        },
        mockGroup,
      );

      try {
        const response = await request
          .post("/api/courses")
          .set("X-Request-Id", "req-create-500")
          .send({ title: "有效标题", description: "有效简介" })
          .expect(500);

        assert.equal(response.headers["x-request-id"], "req-create-500");
        assert.equal(response.body.error.code, "INTERNAL_ERROR");
        assert.equal(response.body.requestId, "req-create-500");
        assert.equal(
          JSON.stringify(response.body).includes("demo.sqlite"),
          false,
        );
        assert.equal(
          JSON.stringify(response.body).includes("INSERT INTO courses"),
          false,
        );
      } finally {
        restoreMocks(mockGroup);
      }
    });
  });
});

async function withApi(
  run: (
    request: ReturnType<typeof createHttpRequest>,
    databasePath: string,
  ) => Promise<void>,
  prepare?: (databasePath: string) => void,
) {
  await withTemporaryDatabase(async (databasePath) => {
    prepare?.(databasePath);
    const application = await openApplication(databasePath);

    try {
      await run(createHttpRequest(application), databasePath);
    } finally {
      await close(application, { cleanLogsDir: true });
    }
  });
}

async function withTemporaryDatabase(
  run: (databasePath: string) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "course-demo-backend-test-"));

  try {
    await run(join(directory, "courses.sqlite"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function openApplication(databasePath: string) {
  return createApp(backendDirectory, {
    baseDir: compiledSourceDirectory,
    globalConfig: {
      courseDatabase: { path: databasePath },
      koa: { port: null },
    },
  });
}

function seedDatabase(databasePath: string, courses: SeedCourse[]) {
  const database = new DatabaseSync(databasePath);

  try {
    database.exec(`
      CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const insert = database.prepare(`
      INSERT INTO courses (id, title, description, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const course of courses) {
      insert.run(course.id, course.title, course.description, course.createdAt);
    }
  } finally {
    database.close();
  }
}

function assertIsoTimestamp(value: unknown) {
  assert.equal(typeof value, "string");
  if (typeof value !== "string") {
    return;
  }
  const parsedTimestamp = new Date(value);
  assert.equal(Number.isNaN(parsedTimestamp.getTime()), false);
  assert.equal(parsedTimestamp.toISOString(), value);
}

function assertNonEmptyRequestId(value: unknown) {
  assert.equal(typeof value, "string");
  if (typeof value !== "string") {
    return;
  }
  assert.equal(value.length > 0, true);
}

async function readCourseLogFiles() {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const logDirectory = resolve(backendDirectory, "logs/backend");
  const logFiles = [
    join(logDirectory, `common-error.log.${dateStamp}`),
    join(logDirectory, `midway-app.log.${dateStamp}`),
    join(logDirectory, `midway-core.log.${dateStamp}`),
  ];
  const contents = await Promise.all(
    logFiles.map(async (filePath) => {
      try {
        return await readFile(filePath, "utf8");
      } catch {
        return "";
      }
    }),
  );

  return contents.join("\n");
}
