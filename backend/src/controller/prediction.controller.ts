import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
} from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { PredictionService } from "../service/prediction.service";
import { ScoreLineRequest } from "../types/football";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api")
export class PredictionController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Inject()
  predictionService: PredictionService = new PredictionService();

  @Get("/matches/:matchId/prediction")
  async getMyMatchPrediction(@Param("matchId") matchId: string) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.predictionService.getMyPrediction(user, matchId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/matches/:matchId/predictions")
  async createMyMatchPrediction(
    @Param("matchId") matchId: string,
    @Body() body: ScoreLineRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      const response = this.predictionService.createMyPrediction(
        user,
        matchId,
        body,
      );

      this.setStatus(201);
      this.ctx?.set("Location", `/api/matches/${matchId}/prediction`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/matches/:matchId/prediction")
  async updateMyMatchPrediction(
    @Param("matchId") matchId: string,
    @Body() body: ScoreLineRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.predictionService.updateMyPrediction(user, matchId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/users/me/predictions")
  async listMyPredictions() {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.predictionService.listMyPredictions(user);
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
