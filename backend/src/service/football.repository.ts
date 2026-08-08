import { Provide } from "@midwayjs/core";
import {
  Competition,
  Match,
  MatchResult,
  MatchStatus,
  Stage,
  Team,
} from "../types/football";

type StoredMatch = {
  id: number;
  stageId: number;
  homeTeamId: number;
  awayTeamId: number;
  startsAt: string;
  status: MatchStatus;
  groupName: string | null;
  knockoutRound: string | null;
  bracketPosition: number | null;
  result: MatchResult | null;
  createdAt: string;
  updatedAt: string;
};

const SEED_TIME = "2026-08-08T00:00:00.000Z";

const competitions: Competition[] = [
  {
    id: 1,
    name: "校园冠军杯",
    description: "面向校内球队的年度足球赛事。",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    name: "城市邀请赛",
    description: "跨校友谊赛与淘汰赛混合赛程。",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const stages: Stage[] = [
  {
    id: 1,
    competitionId: 1,
    name: "A 组",
    type: "GROUP",
    groupName: "A",
    sortOrder: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    competitionId: 1,
    name: "淘汰赛",
    type: "KNOCKOUT",
    groupName: null,
    sortOrder: 2,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    competitionId: 2,
    name: "联赛轮次",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const teams: Team[] = [
  {
    id: 1,
    name: "软件学院",
    shortName: "软件",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    name: "人工智能学院",
    shortName: "AI",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    name: "电子工程学院",
    shortName: "电子",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 4,
    name: "城市校友队",
    shortName: "校友",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const matches: StoredMatch[] = [
  {
    id: 1,
    stageId: 1,
    homeTeamId: 1,
    awayTeamId: 2,
    startsAt: "2026-09-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: "A",
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    stageId: 1,
    homeTeamId: 3,
    awayTeamId: 1,
    startsAt: "2026-09-03T12:00:00.000Z",
    status: "LIVE",
    groupName: "A",
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    stageId: 2,
    homeTeamId: 1,
    awayTeamId: 3,
    startsAt: "2026-09-10T14:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: "半决赛",
    bracketPosition: 1,
    result: {
      homeScore: 2,
      awayScore: 1,
      updatedAt: "2026-09-10T16:00:00.000Z",
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 4,
    stageId: 3,
    homeTeamId: 4,
    awayTeamId: 2,
    startsAt: "2026-10-01T09:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

@Provide()
export class FootballRepository {
  listCompetitions(): Competition[] {
    return [...competitions].sort((left, right) => left.id - right.id);
  }

  findCompetition(id: number): Competition | undefined {
    return competitions.find((competition) => competition.id === id);
  }

  findStage(id: number): Stage | undefined {
    return stages.find((stage) => stage.id === id);
  }

  listStagesByCompetition(competitionId: number): Stage[] {
    return stages
      .filter((stage) => stage.competitionId === competitionId)
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      );
  }

  listMatches(filters: {
    competitionId?: number;
    stageId?: number;
    status?: MatchStatus;
  }): Match[] {
    return matches
      .map((match) => this.toMatch(match))
      .filter((match) => {
        return (
          (filters.competitionId === undefined ||
            match.competition.id === filters.competitionId) &&
          (filters.stageId === undefined ||
            match.stage.id === filters.stageId) &&
          (filters.status === undefined || match.status === filters.status)
        );
      })
      .sort(
        (left, right) =>
          Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
          left.id - right.id,
      );
  }

  findMatch(id: number): Match | undefined {
    const match = matches.find((candidate) => candidate.id === id);

    if (!match) {
      return undefined;
    }

    return this.toMatch(match);
  }

  private toMatch(match: StoredMatch): Match {
    const stage = this.requireStage(match.stageId);
    const competition = this.requireCompetition(stage.competitionId);

    return {
      id: match.id,
      competition,
      stage,
      homeTeam: this.requireTeam(match.homeTeamId),
      awayTeam: this.requireTeam(match.awayTeamId),
      startsAt: match.startsAt,
      status: match.status,
      groupName: match.groupName,
      knockoutRound: match.knockoutRound,
      bracketPosition: match.bracketPosition,
      result: match.result,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }

  private requireCompetition(id: number): Competition {
    const competition = this.findCompetition(id);

    if (!competition) {
      throw new Error(`Seed competition ${id} is missing`);
    }

    return competition;
  }

  private requireStage(id: number): Stage {
    const stage = this.findStage(id);

    if (!stage) {
      throw new Error(`Seed stage ${id} is missing`);
    }

    return stage;
  }

  private requireTeam(id: number): Team {
    const team = teams.find((candidate) => candidate.id === id);

    if (!team) {
      throw new Error(`Seed team ${id} is missing`);
    }

    return team;
  }
}
