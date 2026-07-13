import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import type { Course, CreateCourseInput } from "../src/interface.ts";

const require = createRequire(import.meta.url);
const { CourseService } = require("../dist/service/course.service.js") as {
  CourseService: new () => {
    courseRepository: {
      listAll(): Course[];
      searchByKeyword(keyword: string): Course[];
      create(input: CreateCourseInput): Course;
    };
    list(keyword?: string): Course[];
    create(input: CreateCourseInput): Course;
  };
};

type ServiceInstance = InstanceType<typeof CourseService>;
type RepositoryDependency = ServiceInstance["courseRepository"];

test("CourseService.list returns all courses when keyword is omitted", () => {
  const expectedCourses = [buildCourse(1), buildCourse(2)];
  const calls: Array<{ method: string; value?: string }> = [];
  const service = new CourseService();

  service.courseRepository = {
    listAll() {
      calls.push({ method: "listAll" });
      return expectedCourses;
    },
    searchByKeyword(keyword: string) {
      calls.push({ method: "searchByKeyword", value: keyword });
      return [];
    },
    create(input: CreateCourseInput) {
      calls.push({ method: "create", value: input.title });
      return buildCourse(99);
    },
  } as RepositoryDependency;

  assert.deepEqual(service.list(), expectedCourses);
  assert.deepEqual(calls, [{ method: "listAll" }]);
});

test("CourseService.list searches through repository when keyword is present", () => {
  const expectedCourses = [buildCourse(5)];
  const calls: Array<{ method: string; value?: string }> = [];
  const service = new CourseService();

  service.courseRepository = {
    listAll() {
      calls.push({ method: "listAll" });
      return [];
    },
    searchByKeyword(keyword: string) {
      calls.push({ method: "searchByKeyword", value: keyword });
      return expectedCourses;
    },
    create(input: CreateCourseInput) {
      calls.push({ method: "create", value: input.title });
      return buildCourse(99);
    },
  } as RepositoryDependency;

  assert.deepEqual(service.list("web"), expectedCourses);
  assert.deepEqual(calls, [{ method: "searchByKeyword", value: "web" }]);
});

test("CourseService.create delegates persistence to the repository", () => {
  const createdCourse = buildCourse(8);
  const service = new CourseService();
  const input = {
    title: "React",
    description: "组件基础",
  } satisfies CreateCourseInput;
  let receivedInput: CreateCourseInput | undefined;

  service.courseRepository = {
    listAll() {
      return [];
    },
    searchByKeyword() {
      return [];
    },
    create(value: CreateCourseInput) {
      receivedInput = value;
      return createdCourse;
    },
  } as RepositoryDependency;

  assert.deepEqual(service.create(input), createdCourse);
  assert.deepEqual(receivedInput, input);
});

function buildCourse(id: number): Course {
  return {
    id,
    title: `课程 ${id}`,
    description: `描述 ${id}`,
    createdAt: "2026-07-12T00:00:00.000Z",
  };
}
