import { Controller, Get, Inject } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { normalizeRequestId } from "../utils/request-id";

@Controller("/api")
export class ApiController {
  @Inject()
  ctx?: Context;

  @Get("/health")
  async health() {
    this.prepareRequest();

    return {
      status: "ok" as const,
      service: "football-platform-api",
      timestamp: new Date().toISOString(),
    };
  }

  private prepareRequest(): string {
    const requestId = normalizeRequestId(this.ctx?.get("X-Request-Id"));
    this.ctx?.set("X-Request-Id", requestId);
    return requestId;
  }
}
