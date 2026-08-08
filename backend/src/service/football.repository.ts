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

type CompetitionWrite = Pick<Competition, "name" | "description">;
type StageWrite = Pick<
  Stage,
  "competitionId" | "name" | "type" | "groupName" | "sortOrder"
>;
type TeamWrite = Pick<
  Team,
  "name" | "shortName" | "logoUrl" | "openLigaDbTeamId"
>;
type MatchWrite = Omit<
  StoredMatch,
  "id" | "result" | "createdAt" | "updatedAt"
>;

const SEED_TIME = "2026-08-08T00:00:00.000Z";

const competitions: Competition[] = [
  {
    id: 1,
    name: "1. Fußball-Bundesliga 2024/2025",
    description: "德国足球甲级联赛 2024/2025 赛季。",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    name: "DFB-Pokal 2024/25",
    description: "德国足协杯 2024/25 赛季淘汰赛。",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const stages: Stage[] = [
  {
    id: 1,
    competitionId: 1,
    name: "1. Spieltag",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    competitionId: 2,
    name: "Endspiel",
    type: "KNOCKOUT",
    groupName: null,
    sortOrder: 2,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    competitionId: 1,
    name: "34. Spieltag",
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
    name: "FC Bayern München",
    shortName: "Bayern",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1f/Logo_FC_Bayern_M%C3%BCnchen_%282002%E2%80%932017%29.svg",
    openLigaDbTeamId: 40,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    name: "Borussia Dortmund",
    shortName: "Dortmund",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/960px-Borussia_Dortmund_logo.svg.png",
    openLigaDbTeamId: 7,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    name: "RB Leipzig",
    shortName: "Leipzig",
    logoUrl: "https://i.imgur.com/Rpwsjz1.png",
    openLigaDbTeamId: 1635,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 4,
    name: "Eintracht Frankfurt",
    shortName: "Frankfurt",
    logoUrl: "https://i.imgur.com/X8NFkOb.png",
    openLigaDbTeamId: 91,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 5,
    name: "VfB Stuttgart",
    shortName: "Stuttgart",
    logoUrl: "https://i.imgur.com/v0tkpNx.png",
    openLigaDbTeamId: 16,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 6,
    name: "Bayer 04 Leverkusen",
    shortName: "Leverkusen",
    logoUrl:
      "https://www.bundesliga-reisefuehrer.de/sites/default/files/B04_Standard_Logo_RGB.png",
    openLigaDbTeamId: 6,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 7,
    name: "TSG Hoffenheim",
    shortName: "Hoffenheim",
    logoUrl: "https://i.imgur.com/gF0PfEl.png",
    openLigaDbTeamId: 175,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 8,
    name: "DSC Arminia Bielefeld",
    shortName: "Bielefeld",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Arminia_Bielefeld_Logo_2021%E2%80%93.svg",
    openLigaDbTeamId: 83,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const matches: StoredMatch[] = [
  {
    id: 1,
    stageId: 1,
    homeTeamId: 2,
    awayTeamId: 4,
    startsAt: "2026-09-01T10:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 2,
    stageId: 3,
    homeTeamId: 3,
    awayTeamId: 5,
    startsAt: "2026-08-08T02:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 3,
    stageId: 2,
    homeTeamId: 8,
    awayTeamId: 5,
    startsAt: "2025-05-24T18:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: "Endspiel",
    bracketPosition: 1,
    result: {
      homeScore: 2,
      awayScore: 4,
      updatedAt: "2025-05-28T13:34:17.623Z",
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 4,
    stageId: 3,
    homeTeamId: 7,
    awayTeamId: 1,
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

  listTeams(): Team[] {
    return [...teams].sort(
      (left, right) =>
        left.name.localeCompare(right.name, "zh-CN") || left.id - right.id,
    );
  }

  findTeam(id: number): Team | undefined {
    return teams.find((team) => team.id === id);
  }

  findMatch(id: number): Match | undefined {
    const match = matches.find((candidate) => candidate.id === id);

    if (!match) {
      return undefined;
    }

    return this.toMatch(match);
  }

  updateMatchResult(
    id: number,
    result: { homeScore: number; awayScore: number },
  ): Match | undefined {
    const match = matches.find((candidate) => candidate.id === id);

    if (!match) {
      return undefined;
    }

    const now = new Date().toISOString();
    match.result = {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      updatedAt: now,
    };
    match.status = "FINISHED";
    match.updatedAt = now;

    return this.toMatch(match);
  }

  createCompetition(input: CompetitionWrite): Competition {
    const now = new Date().toISOString();
    const competition: Competition = {
      id: nextId(competitions),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    competitions.push(competition);
    return competition;
  }

  updateCompetition(
    id: number,
    input: CompetitionWrite,
  ): Competition | undefined {
    const competition = this.findCompetition(id);

    if (!competition) {
      return undefined;
    }

    competition.name = input.name;
    competition.description = input.description;
    competition.updatedAt = new Date().toISOString();

    return competition;
  }

  deleteCompetition(id: number): boolean {
    const index = competitions.findIndex(
      (competition) => competition.id === id,
    );

    if (index === -1) {
      return false;
    }

    const stageIds = stages
      .filter((stage) => stage.competitionId === id)
      .map((stage) => stage.id);
    deleteWhere(matches, (match) => stageIds.includes(match.stageId));
    deleteWhere(stages, (stage) => stage.competitionId === id);
    competitions.splice(index, 1);
    return true;
  }

  createStage(input: StageWrite): Stage {
    const now = new Date().toISOString();
    const stage: Stage = {
      id: nextId(stages),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    stages.push(stage);
    return stage;
  }

  updateStage(id: number, input: StageWrite): Stage | undefined {
    const stage = this.findStage(id);

    if (!stage) {
      return undefined;
    }

    stage.competitionId = input.competitionId;
    stage.name = input.name;
    stage.type = input.type;
    stage.groupName = input.groupName;
    stage.sortOrder = input.sortOrder;
    stage.updatedAt = new Date().toISOString();

    return stage;
  }

  deleteStage(id: number): boolean {
    const index = stages.findIndex((stage) => stage.id === id);

    if (index === -1) {
      return false;
    }

    deleteWhere(matches, (match) => match.stageId === id);
    stages.splice(index, 1);
    return true;
  }

  createTeam(input: TeamWrite): Team {
    const now = new Date().toISOString();
    const team: Team = {
      id: nextId(teams),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    teams.push(team);
    return team;
  }

  updateTeam(id: number, input: TeamWrite): Team | undefined {
    const team = this.findTeam(id);

    if (!team) {
      return undefined;
    }

    team.name = input.name;
    team.shortName = input.shortName;
    team.logoUrl = input.logoUrl;
    team.openLigaDbTeamId = input.openLigaDbTeamId;
    team.updatedAt = new Date().toISOString();

    return team;
  }

  deleteTeam(id: number): boolean {
    const index = teams.findIndex((team) => team.id === id);

    if (index === -1) {
      return false;
    }

    deleteWhere(
      matches,
      (match) => match.homeTeamId === id || match.awayTeamId === id,
    );
    teams.splice(index, 1);
    return true;
  }

  createMatch(input: MatchWrite): Match {
    const now = new Date().toISOString();
    const match: StoredMatch = {
      id: nextId(matches),
      ...input,
      result: null,
      createdAt: now,
      updatedAt: now,
    };

    matches.push(match);
    return this.toMatch(match);
  }

  updateMatch(id: number, input: MatchWrite): Match | undefined {
    const match = matches.find((candidate) => candidate.id === id);

    if (!match) {
      return undefined;
    }

    match.stageId = input.stageId;
    match.homeTeamId = input.homeTeamId;
    match.awayTeamId = input.awayTeamId;
    match.startsAt = input.startsAt;
    match.status = input.status;
    match.groupName = input.groupName;
    match.knockoutRound = input.knockoutRound;
    match.bracketPosition = input.bracketPosition;
    match.result = input.status === "FINISHED" ? match.result : null;
    match.updatedAt = new Date().toISOString();

    return this.toMatch(match);
  }

  deleteMatch(id: number): boolean {
    const index = matches.findIndex((match) => match.id === id);

    if (index === -1) {
      return false;
    }

    matches.splice(index, 1);
    return true;
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
    const team = this.findTeam(id);

    if (!team) {
      throw new Error(`Seed team ${id} is missing`);
    }

    return team;
  }
}

function nextId(records: Array<{ id: number }>): number {
  return Math.max(0, ...records.map((record) => record.id)) + 1;
}

function deleteWhere<T>(records: T[], predicate: (record: T) => boolean): void {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (predicate(records[index])) {
      records.splice(index, 1);
    }
  }
}
