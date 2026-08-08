import { Controller, Del, Get, Inject, Param, Post } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { FavoriteService } from "../service/favorite.service";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api")
export class FavoriteController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Inject()
  favoriteService: FavoriteService = new FavoriteService();

  @Post("/matches/:matchId/favorite")
  async favoriteMatch(@Param("matchId") matchId: string) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.favoriteService.favoriteMatch(user, matchId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/matches/:matchId/favorite")
  async unfavoriteMatch(@Param("matchId") matchId: string) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      this.favoriteService.unfavoriteMatch(user, matchId);
      this.setStatus(204);
      return undefined;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/users/me/favorites")
  async listMyFavorites() {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.favoriteService.listMyFavorites(user);
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

  private setStatus(status: number): void {
    if (this.ctx) {
      this.ctx.status = status;
    }
  }

  private handleError(error: unknown, requestId: string) {
    const response = buildApiErrorResponse(error, requestId);
    this.setStatus(response.status);
    return response.body;
  }
}
