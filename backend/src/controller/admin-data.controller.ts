import {
  Body,
  Controller,
  Del,
  Inject,
  Param,
  Post,
  Put,
} from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AdminDataService } from "../service/admin-data.service";
import { AuthService } from "../service/auth.service";
import {
  CompetitionWriteRequest,
  MatchWriteRequest,
  StageWriteRequest,
  TeamWriteRequest,
} from "../types/football";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api/admin")
export class AdminDataController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Inject()
  adminDataService: AdminDataService = new AdminDataService();

  @Post("/competitions")
  async createCompetition(@Body() body: CompetitionWriteRequest) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      const response = this.adminDataService.createCompetition(body);
      this.created(`/api/competitions/${response.data.id}`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/competitions/:competitionId")
  async updateCompetition(
    @Param("competitionId") competitionId: string,
    @Body() body: CompetitionWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      return this.adminDataService.updateCompetition(competitionId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/competitions/:competitionId")
  async deleteCompetition(@Param("competitionId") competitionId: string) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      this.adminDataService.deleteCompetition(competitionId);
      this.noContent();
      return undefined;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/stages")
  async createStage(@Body() body: StageWriteRequest) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      const response = this.adminDataService.createStage(body);
      this.created(`/api/stages/${response.data.id}`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/stages/:stageId")
  async updateStage(
    @Param("stageId") stageId: string,
    @Body() body: StageWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      return this.adminDataService.updateStage(stageId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/stages/:stageId")
  async deleteStage(@Param("stageId") stageId: string) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      this.adminDataService.deleteStage(stageId);
      this.noContent();
      return undefined;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/teams")
  async createTeam(@Body() body: TeamWriteRequest) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      const response = this.adminDataService.createTeam(body);
      this.created(`/api/teams/${response.data.id}`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/teams/:teamId")
  async updateTeam(
    @Param("teamId") teamId: string,
    @Body() body: TeamWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      return this.adminDataService.updateTeam(teamId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/teams/:teamId")
  async deleteTeam(@Param("teamId") teamId: string) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      this.adminDataService.deleteTeam(teamId);
      this.noContent();
      return undefined;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/matches")
  async createMatch(@Body() body: MatchWriteRequest) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      const response = this.adminDataService.createMatch(body);
      this.created(`/api/matches/${response.data.id}`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/matches/:matchId")
  async updateMatch(
    @Param("matchId") matchId: string,
    @Body() body: MatchWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      return this.adminDataService.updateMatch(matchId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/matches/:matchId")
  async deleteMatch(@Param("matchId") matchId: string) {
    const requestId = this.prepareRequest();

    try {
      this.authService.requireAdmin(this.getSessionId());
      this.adminDataService.deleteMatch(matchId);
      this.noContent();
      return undefined;
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

  private created(location: string): void {
    if (this.ctx) {
      this.ctx.status = 201;
      this.ctx.set("Location", location);
    }
  }

  private noContent(): void {
    if (this.ctx) {
      this.ctx.status = 204;
    }
  }

  private handleError(error: unknown, requestId: string) {
    const response = buildApiErrorResponse(error, requestId);

    if (this.ctx) {
      this.ctx.status = response.status;
    }

    return response.body;
  }
}
