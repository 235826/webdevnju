import { Body, Controller, Inject, Param, Put } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { MatchResultService } from "../service/match-result.service";
import { MatchResultRequest } from "../types/football";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api/admin/matches")
export class AdminMatchController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Inject()
  matchResultService: MatchResultService = new MatchResultService();

  @Put("/:matchId/result")
  async updateMatchResult(
    @Param("matchId") matchId: string,
    @Body() body: MatchResultRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      return this.matchResultService.updateMatchResult(matchId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  private prepareRequest(): string {
    const requestId = normalizeRequestId(this.ctx?.get("X-Request-Id"));
    this.ctx?.set("X-Request-Id", requestId);
    return requestId;
  }

  private getSessionId(): string | undefined {
    return this.ctx?.cookies.get(SESSION_COOKIE);
  }

  private handleError(error: unknown, requestId: string) {
    const response = buildApiErrorResponse(error, requestId);

    if (this.ctx) {
      this.ctx.status = response.status;
    }

    return response.body;
  }
}
