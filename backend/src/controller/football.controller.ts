import { Controller, Get, Inject, Param, Query } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { FootballService } from "../service/football.service";
import { TeamExternalProfileService } from "../service/team-external-profile.service";
import { MatchListQuery } from "../types/football";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

@Controller("/api")
export class FootballController {
  @Inject()
  ctx?: Context;

  @Inject()
  footballService: FootballService = new FootballService();

  @Inject()
  teamExternalProfileService: TeamExternalProfileService =
    new TeamExternalProfileService();

  @Get("/competitions")
  async listCompetitions() {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.listCompetitions();
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/competitions/:competitionId")
  async getCompetition(@Param("competitionId") competitionId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getCompetition(competitionId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/stages/:stageId")
  async getStage(@Param("stageId") stageId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getStage(stageId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/stages")
  async listStages(@Query() query: { competitionId?: unknown }) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.listStages(query);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/stages/:stageId/standings")
  async getStageStandings(@Param("stageId") stageId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getStageStandings(stageId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/stages/:stageId/bracket")
  async getStageBracket(@Param("stageId") stageId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getStageBracket(stageId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/teams")
  async listTeams() {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.listTeams();
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/teams/:teamId/external-profile")
  async getTeamExternalProfile(@Param("teamId") teamId: string) {
    const requestId = this.prepareRequest();

    try {
      return await this.teamExternalProfileService.getTeamExternalProfile(
        teamId,
      );
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/teams/:teamId")
  async getTeam(@Param("teamId") teamId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getTeam(teamId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/matches")
  async listMatches(@Query() query: MatchListQuery) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.listMatches(query);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/matches/:matchId")
  async getMatch(@Param("matchId") matchId: string) {
    const requestId = this.prepareRequest();

    try {
      return this.footballService.getMatch(matchId);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  private prepareRequest(): string {
    const requestId = normalizeRequestId(this.ctx?.get("X-Request-Id"));
    this.ctx?.set("X-Request-Id", requestId);
    return requestId;
  }

  private handleError(error: unknown, requestId: string) {
    const response = buildApiErrorResponse(error, requestId);

    if (this.ctx) {
      this.ctx.status = response.status;
    }

    return response.body;
  }
}
