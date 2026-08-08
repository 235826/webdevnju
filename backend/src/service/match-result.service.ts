import { Inject, Provide } from "@midwayjs/core";
import { MatchResponse, MatchResultRequest } from "../types/football";
import { NotFoundError, ValidationError } from "../utils/http-errors";
import { FootballRepository } from "./football.repository";

@Provide()
export class MatchResultService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  updateMatchResult(
    matchId: unknown,
    request: MatchResultRequest,
  ): MatchResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    const scoreLine = parseScoreLine(request);
    const match = this.footballRepository.updateMatchResult(id, scoreLine);

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

function parseScoreLine(request: MatchResultRequest): {
  homeScore: number;
  awayScore: number;
} {
  assertKnownFields(request, ["homeScore", "awayScore"]);

  return {
    homeScore: parseScore(request.homeScore, "homeScore"),
    awayScore: parseScore(request.awayScore, "awayScore"),
  };
}

function parseScore(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "nonNegativeInteger" },
    ]);
  }

  return Number(value);
}

function assertKnownFields(
  request: unknown,
  knownFields: string[],
): asserts request is Record<string, unknown> {
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
