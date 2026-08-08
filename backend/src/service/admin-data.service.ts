import { Inject, Provide } from "@midwayjs/core";
import {
  CompetitionResponse,
  CompetitionWriteRequest,
  MatchResponse,
  MatchStatus,
  MatchWriteRequest,
  StageResponse,
  StageType,
  StageWriteRequest,
  TeamResponse,
  TeamWriteRequest,
} from "../types/football";
import { NotFoundError, ValidationError } from "../utils/http-errors";
import { CommentService } from "./comment.service";
import { FavoriteService } from "./favorite.service";
import { FootballRepository } from "./football.repository";
import { PredictionService } from "./prediction.service";

const STAGE_TYPES: StageType[] = ["GROUP", "LEAGUE", "KNOCKOUT"];
const MATCH_STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED"];

@Provide()
export class AdminDataService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  @Inject()
  favoriteService: FavoriteService = new FavoriteService();

  @Inject()
  predictionService: PredictionService = new PredictionService();

  @Inject()
  commentService: CommentService = new CommentService();

  createCompetition(request: CompetitionWriteRequest): CompetitionResponse {
    return {
      data: this.footballRepository.createCompetition(
        parseCompetitionWriteRequest(request),
      ),
    };
  }

  updateCompetition(
    competitionId: unknown,
    request: CompetitionWriteRequest,
  ): CompetitionResponse {
    const id = parsePositiveInteger(competitionId, "competitionId");
    const competition = this.footballRepository.updateCompetition(
      id,
      parseCompetitionWriteRequest(request),
    );

    if (!competition) {
      throw new NotFoundError("赛事不存在");
    }

    return { data: competition };
  }

  deleteCompetition(competitionId: unknown): void {
    const id = parsePositiveInteger(competitionId, "competitionId");
    const matchIds = this.footballRepository
      .listMatches({ competitionId: id })
      .map((match) => match.id);

    if (!this.footballRepository.deleteCompetition(id)) {
      throw new NotFoundError("赛事不存在");
    }

    this.deleteMatchRelations(matchIds);
  }

  createStage(request: StageWriteRequest): StageResponse {
    const input = this.parseStageWriteRequest(request);

    return { data: this.footballRepository.createStage(input) };
  }

  updateStage(stageId: unknown, request: StageWriteRequest): StageResponse {
    const id = parsePositiveInteger(stageId, "stageId");
    const input = this.parseStageWriteRequest(request);
    const stage = this.footballRepository.updateStage(id, input);

    if (!stage) {
      throw new NotFoundError("阶段不存在");
    }

    return { data: stage };
  }

  deleteStage(stageId: unknown): void {
    const id = parsePositiveInteger(stageId, "stageId");
    const matchIds = this.footballRepository
      .listMatches({ stageId: id })
      .map((match) => match.id);

    if (!this.footballRepository.deleteStage(id)) {
      throw new NotFoundError("阶段不存在");
    }

    this.deleteMatchRelations(matchIds);
  }

  createTeam(request: TeamWriteRequest): TeamResponse {
    return {
      data: this.footballRepository.createTeam(parseTeamWriteRequest(request)),
    };
  }

  updateTeam(teamId: unknown, request: TeamWriteRequest): TeamResponse {
    const id = parsePositiveInteger(teamId, "teamId");
    const team = this.footballRepository.updateTeam(
      id,
      parseTeamWriteRequest(request),
    );

    if (!team) {
      throw new NotFoundError("球队不存在");
    }

    return { data: team };
  }

  deleteTeam(teamId: unknown): void {
    const id = parsePositiveInteger(teamId, "teamId");
    const matchIds = this.footballRepository
      .listMatches({})
      .filter((match) => match.homeTeam.id === id || match.awayTeam.id === id)
      .map((match) => match.id);

    if (!this.footballRepository.deleteTeam(id)) {
      throw new NotFoundError("球队不存在");
    }

    this.deleteMatchRelations(matchIds);
  }

  createMatch(request: MatchWriteRequest): MatchResponse {
    const input = this.parseMatchWriteRequest(request);

    return { data: this.footballRepository.createMatch(input) };
  }

  updateMatch(matchId: unknown, request: MatchWriteRequest): MatchResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    const input = this.parseMatchWriteRequest(request);
    const match = this.footballRepository.updateMatch(id, input);

    if (!match) {
      throw new NotFoundError("比赛不存在");
    }

    return { data: match };
  }

  deleteMatch(matchId: unknown): void {
    const id = parsePositiveInteger(matchId, "matchId");

    if (!this.footballRepository.deleteMatch(id)) {
      throw new NotFoundError("比赛不存在");
    }

    this.deleteMatchRelations([id]);
  }

  private parseStageWriteRequest(request: StageWriteRequest) {
    assertKnownFields(request, [
      "competitionId",
      "name",
      "type",
      "groupName",
      "sortOrder",
    ]);

    const competitionId = parsePositiveInteger(
      request.competitionId,
      "competitionId",
    );

    if (!this.footballRepository.findCompetition(competitionId)) {
      throw new NotFoundError("赛事不存在");
    }

    return {
      competitionId,
      name: parseString(request.name, "name", 2, 80),
      type: parseStageType(request.type),
      groupName: parseNullableString(request.groupName, "groupName", 1, 40),
      sortOrder: parseNonNegativeInteger(request.sortOrder, "sortOrder"),
    };
  }

  private parseMatchWriteRequest(request: MatchWriteRequest) {
    assertKnownFields(request, [
      "stageId",
      "homeTeamId",
      "awayTeamId",
      "startsAt",
      "status",
      "groupName",
      "knockoutRound",
      "bracketPosition",
    ]);

    const stageId = parsePositiveInteger(request.stageId, "stageId");
    const homeTeamId = parsePositiveInteger(request.homeTeamId, "homeTeamId");
    const awayTeamId = parsePositiveInteger(request.awayTeamId, "awayTeamId");

    if (!this.footballRepository.findStage(stageId)) {
      throw new NotFoundError("阶段不存在");
    }

    if (!this.footballRepository.findTeam(homeTeamId)) {
      throw new NotFoundError("主队不存在");
    }

    if (!this.footballRepository.findTeam(awayTeamId)) {
      throw new NotFoundError("客队不存在");
    }

    if (homeTeamId === awayTeamId) {
      throw new ValidationError("主队和客队不能相同", [
        { field: "awayTeamId", reason: "different_team_required" },
      ]);
    }

    return {
      stageId,
      homeTeamId,
      awayTeamId,
      startsAt: parseDateTime(request.startsAt, "startsAt"),
      status: parseMatchStatus(request.status),
      groupName: parseNullableString(request.groupName, "groupName", 1, 40),
      knockoutRound: parseNullableString(
        request.knockoutRound,
        "knockoutRound",
        1,
        40,
      ),
      bracketPosition: parseNullablePositiveInteger(
        request.bracketPosition,
        "bracketPosition",
      ),
    };
  }

  private deleteMatchRelations(matchIds: number[]): void {
    this.favoriteService.deleteByMatchIds(matchIds);
    this.predictionService.deleteByMatchIds(matchIds);
    this.commentService.deleteByMatchIds(matchIds);
  }
}

function parseCompetitionWriteRequest(request: CompetitionWriteRequest) {
  assertKnownFields(request, ["name", "description"]);

  return {
    name: parseString(request.name, "name", 2, 80),
    description: parseString(request.description, "description", 0, 500),
  };
}

function parseTeamWriteRequest(request: TeamWriteRequest) {
  assertKnownFields(request, [
    "name",
    "shortName",
    "logoUrl",
    "openLigaDbTeamId",
  ]);

  const logoUrl = parseNullableString(request.logoUrl, "logoUrl", 1, 500);

  if (logoUrl !== null) {
    try {
      new URL(logoUrl);
    } catch {
      throw new ValidationError("Logo URL 不合法", [
        { field: "logoUrl", reason: "uri" },
      ]);
    }
  }

  return {
    name: parseString(request.name, "name", 2, 80),
    shortName: parseNullableString(request.shortName, "shortName", 1, 30),
    logoUrl,
    openLigaDbTeamId: parseNullablePositiveInteger(
      request.openLigaDbTeamId,
      "openLigaDbTeamId",
    ),
  };
}

function assertKnownFields(request: unknown, knownFields: string[]): void {
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new ValidationError("请求参数不合法", [
      { field: "body", reason: "object" },
    ]);
  }

  const unknownField = Object.keys(request).find(
    (field) => !knownFields.includes(field),
  );

  if (unknownField) {
    throw new ValidationError("请求参数不合法", [
      { field: unknownField, reason: "unknown" },
    ]);
  }
}

function parseString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "required" },
    ]);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new ValidationError("请求参数不合法", [{ field, reason: "length" }]);
  }

  return trimmed;
}

function parseNullableString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string | null {
  if (value === null) {
    return null;
  }

  return parseString(value, field, minLength, maxLength);
}

function parsePositiveInteger(value: unknown, field: string): number {
  const numberValue =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new ValidationError("请求参数不合法", [{ field, reason: "integer" }]);
  }

  return numberValue;
}

function parseNonNegativeInteger(value: unknown, field: string): number {
  const numberValue = typeof value === "number" ? value : Number.NaN;

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new ValidationError("请求参数不合法", [{ field, reason: "integer" }]);
  }

  return numberValue;
}

function parseNullablePositiveInteger(
  value: unknown,
  field: string,
): number | null {
  if (value === null) {
    return null;
  }

  return parsePositiveInteger(value, field);
}

function parseStageType(value: unknown): StageType {
  if (typeof value !== "string" || !STAGE_TYPES.includes(value as StageType)) {
    throw new ValidationError("阶段类型不合法", [
      { field: "type", reason: "enum" },
    ]);
  }

  return value as StageType;
}

function parseMatchStatus(value: unknown): MatchStatus {
  if (
    typeof value !== "string" ||
    !MATCH_STATUSES.includes(value as MatchStatus)
  ) {
    throw new ValidationError("比赛状态不合法", [
      { field: "status", reason: "enum" },
    ]);
  }

  return value as MatchStatus;
}

function parseDateTime(value: unknown, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ValidationError("时间不合法", [{ field, reason: "date-time" }]);
  }

  return new Date(value).toISOString();
}
