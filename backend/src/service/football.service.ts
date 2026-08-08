import { Inject, Provide } from "@midwayjs/core";
import {
  CompetitionListResponse,
  CompetitionResponse,
  MatchListQuery,
  MatchListResponse,
  MatchResponse,
  MatchStatus,
  StageResponse,
  TeamListResponse,
  TeamResponse,
} from "../types/football";
import { NotFoundError, ValidationError } from "../utils/http-errors";
import { FootballRepository } from "./football.repository";

const MATCH_STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED"];

@Provide()
export class FootballService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  listCompetitions(): CompetitionListResponse {
    return {
      data: this.footballRepository.listCompetitions(),
    };
  }

  getCompetition(competitionId: unknown): CompetitionResponse {
    const id = parsePositiveInteger(competitionId, "competitionId");
    const competition = this.footballRepository.findCompetition(id);

    if (!competition) {
      throw new NotFoundError("赛事不存在");
    }

    return { data: competition };
  }

  getStage(stageId: unknown): StageResponse {
    const id = parsePositiveInteger(stageId, "stageId");
    const stage = this.footballRepository.findStage(id);

    if (!stage) {
      throw new NotFoundError("阶段不存在");
    }

    return { data: stage };
  }

  listTeams(): TeamListResponse {
    return {
      data: this.footballRepository.listTeams(),
    };
  }

  getTeam(teamId: unknown): TeamResponse {
    const id = parsePositiveInteger(teamId, "teamId");
    const team = this.footballRepository.findTeam(id);

    if (!team) {
      throw new NotFoundError("球队不存在");
    }

    return { data: team };
  }

  listMatches(query: MatchListQuery): MatchListResponse {
    assertKnownFields(query, ["competitionId", "stageId", "status"]);

    const competitionId =
      query.competitionId === undefined
        ? undefined
        : parsePositiveInteger(query.competitionId, "competitionId");
    const stageId =
      query.stageId === undefined
        ? undefined
        : parsePositiveInteger(query.stageId, "stageId");
    const status =
      query.status === undefined
        ? undefined
        : parseMatchStatus(query.status, "status");

    return {
      data: this.footballRepository.listMatches({
        competitionId,
        stageId,
        status,
      }),
    };
  }

  getMatch(matchId: unknown): MatchResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    const match = this.footballRepository.findMatch(id);

    if (!match) {
      throw new NotFoundError("比赛不存在");
    }

    return { data: match };
  }
}

function parsePositiveInteger(value: unknown, field: string): number {
  const normalized = typeof value === "string" ? value.trim() : value;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "positiveInteger" },
    ]);
  }

  return parsed;
}

function parseMatchStatus(value: unknown, field: string): MatchStatus {
  if (
    typeof value !== "string" ||
    !MATCH_STATUSES.includes(value as MatchStatus)
  ) {
    throw new ValidationError("请求参数不合法", [{ field, reason: "enum" }]);
  }

  return value as MatchStatus;
}

function assertKnownFields(
  query: Record<string, unknown>,
  knownFields: string[],
): void {
  const unknownField = Object.keys(query).find(
    (field) => !knownFields.includes(field),
  );

  if (unknownField) {
    throw new ValidationError("请求参数不合法", [
      { field: unknownField, reason: "unknown" },
    ]);
  }
}
