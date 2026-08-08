import { Inject, Provide } from "@midwayjs/core";
import {
  NullablePredictionResponse,
  Prediction,
  PredictionListResponse,
  PredictionResponse,
  ScoreLineRequest,
} from "../types/football";
import { PublicUser } from "../types/auth";
import {
  NotFoundError,
  PredictionLockedError,
  ValidationError,
} from "../utils/http-errors";
import { FootballRepository } from "./football.repository";

const predictions: Prediction[] = [];
let nextPredictionId = 1;

@Provide()
export class PredictionService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  getMyPrediction(
    user: PublicUser,
    matchId: unknown,
  ): NullablePredictionResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    this.requireMatch(id);

    return {
      data: this.findActivePrediction(user.id, id) ?? null,
    };
  }

  createMyPrediction(
    user: PublicUser,
    matchId: unknown,
    request: ScoreLineRequest,
  ): PredictionResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    const match = this.requireMatch(id);
    assertMatchPredictable(match.startsAt);
    const scoreLine = parseScoreLine(request);

    return {
      data: this.createActivePrediction(user.id, id, scoreLine),
    };
  }

  updateMyPrediction(
    user: PublicUser,
    matchId: unknown,
    request: ScoreLineRequest,
  ): PredictionResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    const match = this.requireMatch(id);
    assertMatchPredictable(match.startsAt);
    const scoreLine = parseScoreLine(request);

    return {
      data: this.createActivePrediction(user.id, id, scoreLine),
    };
  }

  listMyPredictions(user: PublicUser): PredictionListResponse {
    return {
      data: predictions
        .filter(
          (prediction) => prediction.userId === user.id && prediction.isActive,
        )
        .sort(
          (left, right) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
            right.id - left.id,
        ),
    };
  }

  countActivePredictions(userId: number, matchId: number): number {
    return predictions.filter(
      (prediction) =>
        prediction.userId === userId &&
        prediction.matchId === matchId &&
        prediction.isActive,
    ).length;
  }

  private createActivePrediction(
    userId: number,
    matchId: number,
    scoreLine: { homeScore: number; awayScore: number },
  ): Prediction {
    const now = new Date().toISOString();

    for (const prediction of predictions) {
      if (
        prediction.userId === userId &&
        prediction.matchId === matchId &&
        prediction.isActive
      ) {
        prediction.isActive = false;
        prediction.supersededAt = now;
      }
    }

    const prediction: Prediction = {
      id: nextPredictionId,
      matchId,
      userId,
      homeScore: scoreLine.homeScore,
      awayScore: scoreLine.awayScore,
      isActive: true,
      createdAt: now,
      supersededAt: null,
    };

    nextPredictionId += 1;
    predictions.push(prediction);

    return prediction;
  }

  private findActivePrediction(
    userId: number,
    matchId: number,
  ): Prediction | undefined {
    return predictions.find(
      (prediction) =>
        prediction.userId === userId &&
        prediction.matchId === matchId &&
        prediction.isActive,
    );
  }

  private requireMatch(matchId: number) {
    const match = this.footballRepository.findMatch(matchId);

    if (!match) {
      throw new NotFoundError("比赛不存在");
    }

    return match;
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

function parseScoreLine(request: ScoreLineRequest): {
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

function assertMatchPredictable(startsAt: string): void {
  if (Date.parse(startsAt) <= Date.now()) {
    throw new PredictionLockedError();
  }
}
