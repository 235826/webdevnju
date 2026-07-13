import { Body, Controller, Get, Inject, Post } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { CourseService } from "../service/course.service";
import { parseCourseInput } from "../utils/course-input";
import { normalizeCourseKeyword } from "../utils/course-keyword";
import { ValidationError } from "../utils/http-errors";

@Controller("/api")
export class ApiController {
  @Inject()
  courseService: CourseService;

  @Inject()
  ctx: Context;

  @Get("/health")
  async health() {
    return {
      status: "ok" as const,
      service: "course-demo-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("/courses")
  async listCourses() {
    const keywordValues = new URLSearchParams(this.ctx.querystring).getAll(
      "keyword",
    );
    const keyword = normalizeCourseKeyword(
      this.ctx.query.keyword,
      keywordValues.length > 0 ? keywordValues : undefined,
    );

    return { data: this.courseService.list(keyword) };
  }

  @Post("/courses")
  async createCourse(@Body() body: unknown) {
    try {
      const input = parseCourseInput(body);
      return { data: this.courseService.create(input) };
    } catch (reason) {
      if (reason instanceof TypeError) {
        throw new ValidationError(reason.message);
      }

      throw reason;
    }
  }
}
