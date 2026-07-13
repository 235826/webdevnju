import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { CourseRepository } =
  require("../dist/repository/course.repository.js") as {
    CourseRepository: new () => {
      databasePath: string;
      initialize(): Promise<void>;
      listAll(): Array<{ id: number }>;
      searchByKeyword(keyword: string): Array<{ id: number }>;
      close(): Promise<void>;
    };
  };

type RepositoryInstance = InstanceType<typeof CourseRepository>;
type RepositoryCourse = ReturnType<
  RepositoryInstance["searchByKeyword"]
>[number];

test("CourseRepository.searchByKeyword matches title and description in id order", async () => {
  await withRepository(
    [
      {
        id: 7,
        title: "React 深入",
        description: "组件状态与路由",
        createdAt: "2026-07-12 07:00:00",
      },
      {
        id: 2,
        title: "接口契约",
        description: "通过 react 风格示例解释响应结构",
        createdAt: "2026-07-12 02:00:00",
      },
      {
        id: 10,
        title: "数据库基础",
        description: "不匹配关键词",
        createdAt: "2026-07-12 10:00:00",
      },
    ],
    async (repository) => {
      assert.deepEqual(
        repository
          .searchByKeyword("react")
          .map((course: RepositoryCourse) => course.id),
        [2, 7],
      );
    },
  );
});

test("CourseRepository.searchByKeyword treats %, _, and \\ literally", async () => {
  await withRepository(
    [
      {
        id: 3,
        title: "100% API",
        description: "包含百分号",
        createdAt: "2026-07-12 03:00:00",
      },
      {
        id: 4,
        title: "name_value",
        description: "包含下划线",
        createdAt: "2026-07-12 04:00:00",
      },
      {
        id: 5,
        title: "C:\\Courses",
        description: "包含反斜杠",
        createdAt: "2026-07-12 05:00:00",
      },
    ],
    async (repository) => {
      assert.deepEqual(
        repository
          .searchByKeyword("%")
          .map((course: RepositoryCourse) => course.id),
        [3],
      );
      assert.deepEqual(
        repository
          .searchByKeyword("_")
          .map((course: RepositoryCourse) => course.id),
        [4],
      );
      assert.deepEqual(
        repository
          .searchByKeyword("\\")
          .map((course: RepositoryCourse) => course.id),
        [5],
      );
    },
  );
});

test("CourseRepository.searchByKeyword does not turn input into SQL structure", async () => {
  await withRepository(
    [
      {
        id: 1,
        title: "安全编码",
        description: "参数绑定示例",
        createdAt: "2026-07-12 01:00:00",
      },
      {
        id: 2,
        title: "另一门课程",
        description: "不会被注入命中",
        createdAt: "2026-07-12 02:00:00",
      },
    ],
    async (repository) => {
      assert.deepEqual(
        repository
          .searchByKeyword(`%' OR 1=1 --`)
          .map((course: RepositoryCourse) => course.id),
        [],
      );
      assert.equal(repository.listAll().length, 2);
    },
  );
});

type SeedCourse = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
};

async function withRepository(
  courses: SeedCourse[],
  run: (repository: RepositoryInstance) => Promise<void>,
) {
  const directory = await mkdtemp(
    join(tmpdir(), "course-demo-repository-test-"),
  );
  const databasePath = join(directory, "courses.sqlite");
  seedDatabase(databasePath, courses);

  const repository = new CourseRepository();
  repository.databasePath = databasePath;

  try {
    await repository.initialize();
    await run(repository);
  } finally {
    await repository.close();
    await rm(directory, { recursive: true, force: true });
  }
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
