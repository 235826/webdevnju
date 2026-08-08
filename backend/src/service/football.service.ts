import { Inject, Provide } from "@midwayjs/core";
import {
  CompetitionListResponse,
  CompetitionResponse,
  BracketResponse,
  Match,
  MatchListQuery,
  MatchListResponse,
  MatchResponse,
  MatchStatus,
  StageResponse,
  StandingRow,
  StandingsResponse,
  TeamListResponse,
  TeamResponse,
} from "../types/football";
import {
  NotFoundError,
  UnsupportedStageTypeError,
  ValidationError,
} from "../utils/http-errors";
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

  getStageStandings(stageId: unknown): StandingsResponse {
    const id = parsePositiveInteger(stageId, "stageId");
    const stage = this.footballRepository.findStage(id);

    if (!stage) {
      throw new NotFoundError("阶段不存在");
    }

    if (stage.type === "KNOCKOUT") {
      throw new UnsupportedStageTypeError("淘汰赛阶段不支持积分榜");
    }

    const matches = this.footballRepository.listMatches({ stageId: id });
    const groupRows = new Map<string, Map<number, StandingRow>>();

    for (const match of matches) {
      const groupName =
        stage.type === "LEAGUE" ? null : (match.groupName ?? stage.groupName);
      const groupKey = groupName ?? "";
      const rows = getOrCreateGroupRows(groupRows, groupKey);

      ensureStandingRow(rows, match.homeTeam);
      ensureStandingRow(rows, match.awayTeam);

      if (!match.result) {
        continue;
      }

      recordMatchResult(rows, match, match.result);
    }

    return {
      stageId: stage.id,
      stageType: stage.type,
      groups: [...groupRows.entries()].map(([groupKey, rows]) => ({
        groupName: groupKey === "" ? null : groupKey,
        rows: rankStandingRows([...rows.values()]),
      })),
    };
  }

  getStageBracket(stageId: unknown): BracketResponse {
    const id = parsePositiveInteger(stageId, "stageId");
    const stage = this.footballRepository.findStage(id);

    if (!stage) {
      throw new NotFoundError("阶段不存在");
    }

    if (stage.type !== "KNOCKOUT") {
      throw new UnsupportedStageTypeError("非淘汰赛阶段不支持淘汰赛图");
    }

    const matches = this.footballRepository
      .listMatches({ stageId: id })
      .sort(compareBracketMatches);
    const rounds = new Map<string, Match[]>();

    for (const match of matches) {
      const round = match.knockoutRound ?? "未分轮次";
      rounds.set(round, [...(rounds.get(round) ?? []), match]);
    }

    return {
      stageId: stage.id,
      rounds: [...rounds.entries()].map(([round, roundMatches]) => ({
        round,
        matches: roundMatches,
      })),
    };
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

function getOrCreateGroupRows(
  groups: Map<string, Map<number, StandingRow>>,
  groupKey: string,
): Map<number, StandingRow> {
  const existing = groups.get(groupKey);

  if (existing) {
    return existing;
  }

  const rows = new Map<number, StandingRow>();
  groups.set(groupKey, rows);
  return rows;
}

function ensureStandingRow(
  rows: Map<number, StandingRow>,
  team: StandingRow["team"],
): StandingRow {
  const existing = rows.get(team.id);

  if (existing) {
    return existing;
  }

  const row: StandingRow = {
    rank: 0,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
  rows.set(team.id, row);
  return row;
}

function recordMatchResult(
  rows: Map<number, StandingRow>,
  match: Match,
  result: NonNullable<Match["result"]>,
): void {
  const home = ensureStandingRow(rows, match.homeTeam);
  const away = ensureStandingRow(rows, match.awayTeam);

  home.played += 1;
  away.played += 1;
  home.goalsFor += result.homeScore;
  home.goalsAgainst += result.awayScore;
  away.goalsFor += result.awayScore;
  away.goalsAgainst += result.homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (result.homeScore > result.awayScore) {
    home.won += 1;
    home.points += 3;
    away.lost += 1;
  } else if (result.homeScore < result.awayScore) {
    away.won += 1;
    away.points += 3;
    home.lost += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }
}

function rankStandingRows(rows: StandingRow[]): StandingRow[] {
  return rows
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        left.team.id - right.team.id,
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function compareBracketMatches(left: Match, right: Match): number {
  const leftPosition = left.bracketPosition ?? Number.MAX_SAFE_INTEGER;
  const rightPosition = right.bracketPosition ?? Number.MAX_SAFE_INTEGER;

  return leftPosition - rightPosition || left.id - right.id;
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
