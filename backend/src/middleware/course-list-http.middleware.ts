import { Logger, Middleware } from "@midwayjs/core";
import type { Context, NextFunction } from "@midwayjs/koa";
import type { ILogger, IMiddleware } from "@midwayjs/core";
import { randomUUID } from "node:crypto";
import { normalizeCourseKeyword } from "../utils/course-keyword";
import { buildApiErrorResponse } from "../utils/http-errors";

@Middleware()
export class CourseListHttpMiddleware implements IMiddleware<
  Context,
  NextFunction
> {
  @Logger("coreLogger")
  logger: ILogger;

  match(ctx: Context): boolean {
    return (
      (ctx.method === "GET" || ctx.method === "POST") &&
      ctx.path === "/api/courses"
    );
  }

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const startedAt = Date.now();
      const requestId = resolveRequestId(ctx.get("x-request-id"));
      ctx.set("X-Request-Id", requestId);

      const keywordValues = new URLSearchParams(ctx.querystring).getAll(
        "keyword",
      );
      const rawKeyword = ctx.query.keyword;
      const hasKeyword = keywordValues.length > 0 || rawKeyword !== undefined;
      const normalizedKeywordLength = getNormalizedKeywordLength(
        rawKeyword,
        keywordValues.length > 0 ? keywordValues : undefined,
      );
      let errorCode: "VALIDATION_FAILED" | "INTERNAL_ERROR" | undefined;

      try {
        await next();
      } catch (error) {
        const response = buildApiErrorResponse(error, requestId);
        errorCode = response.errorCode;
        ctx.status = response.status;
        ctx.body = response.body;
      } finally {
        const durationMs = Date.now() - startedAt;
        const hitCount = getHitCount(ctx.body);
        const eventName =
          ctx.method === "POST"
            ? "course_create_request"
            : "course_list_request";
        const logContext = {
          requestId,
          hasKeyword: ctx.method === "GET" ? hasKeyword : undefined,
          normalizedKeywordLength:
            ctx.method === "GET" ? normalizedKeywordLength : undefined,
          hitCount,
          durationMs,
          status: ctx.status,
          errorCode,
        };

        if (errorCode) {
          this.logger.error(eventName, logContext);
        } else {
          this.logger.info(eventName, logContext);
        }
      }
    };
  }
}

function resolveRequestId(headerValue: string): string {
  const normalizedValue = headerValue.trim();

  if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  return randomUUID();
}

function getNormalizedKeywordLength(
  keyword: unknown,
  keywordValues: unknown,
): number | undefined {
  try {
    const normalizedKeyword = normalizeCourseKeyword(keyword, keywordValues);
    return normalizedKeyword === undefined
      ? undefined
      : Array.from(normalizedKeyword).length;
  } catch {
    return undefined;
  }
}

function getHitCount(body: unknown): number | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    Array.isArray(body.data)
  ) {
    return body.data.length;
  }

  return undefined;
}
