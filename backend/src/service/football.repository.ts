import { Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import {
  Competition,
  Match,
  MatchResult,
  MatchStatus,
  Stage,
  StageType,
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

type CompetitionRow = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};
type StageRow = {
  id: number;
  competition_id: number;
  name: string;
  type: string;
  group_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type TeamRow = {
  id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  open_liga_db_team_id: number | null;
  created_at: string;
  updated_at: string;
};
type MatchRow = {
  id: number;
  stage_id: number;
  home_team_id: number;
  away_team_id: number;
  starts_at: string;
  status: string;
  group_name: string | null;
  knockout_round: string | null;
  bracket_position: number | null;
  result_home_score: number | null;
  result_away_score: number | null;
  result_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

const SEED_TIME = "2026-08-08T00:00:00.000Z";
const DEFAULT_DATABASE_PATH = join(
  process.cwd(),
  "backend",
  "data",
  "football-platform.sqlite",
);
const connections = new Map<string, DatabaseSync>();

const seedCompetitions: Competition[] = [
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
  {
    id: 3,
    name: "近期足球比赛精选 2026-08",
    description: "用于课堂演示的近期已结束、进行中和即将开始足球比赛数据。",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const seedStages: Stage[] = [
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
  {
    id: 4,
    competitionId: 3,
    name: "8月综合赛程",
    type: "LEAGUE",
    groupName: null,
    sortOrder: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const seedTeams: Team[] = [
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
  {
    id: 9,
    name: "Sunderland",
    shortName: "Sunderland",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 10,
    name: "Wrexham",
    shortName: "Wrexham",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 11,
    name: "Atlas",
    shortName: "Atlas",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 12,
    name: "Columbus Crew",
    shortName: "Columbus Crew",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 13,
    name: "Pumas UNAM",
    shortName: "Pumas UNAM",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 14,
    name: "Charlotte FC",
    shortName: "Charlotte FC",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 15,
    name: "Club America",
    shortName: "Club America",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 16,
    name: "San Diego FC",
    shortName: "San Diego FC",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 17,
    name: "Guadalajara",
    shortName: "Guadalajara",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 18,
    name: "Los Angeles FC",
    shortName: "Los Angeles FC",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 19,
    name: "Chelsea",
    shortName: "Chelsea",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 20,
    name: "AC Milan",
    shortName: "AC Milan",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 21,
    name: "Tottenham Hotspur",
    shortName: "Tottenham Hotspur",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 22,
    name: "Getafe",
    shortName: "Getafe",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 23,
    name: "Juventus",
    shortName: "Juventus",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 24,
    name: "Inter Milan",
    shortName: "Inter Milan",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 25,
    name: "Manchester United",
    shortName: "Manchester United",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 26,
    name: "Paris Saint-Germain",
    shortName: "Paris Saint-Germain",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 27,
    name: "Cambridge United",
    shortName: "Cambridge United",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 28,
    name: "Barnet",
    shortName: "Barnet",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 29,
    name: "Queens Park Rangers",
    shortName: "Queens Park Rangers",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 30,
    name: "Millwall",
    shortName: "Millwall",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 31,
    name: "PSV Eindhoven",
    shortName: "PSV Eindhoven",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 32,
    name: "Fortuna Sittard",
    shortName: "Fortuna Sittard",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 33,
    name: "NE Revolution",
    shortName: "NE Revolution",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 34,
    name: "Houston Dynamo",
    shortName: "Houston Dynamo",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 35,
    name: "Udinese",
    shortName: "Udinese",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 36,
    name: "Nottingham Forest",
    shortName: "Nottingham Forest",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 37,
    name: "Barcelona",
    shortName: "Barcelona",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 38,
    name: "AFC Wimbledon",
    shortName: "AFC Wimbledon",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 39,
    name: "Newport County",
    shortName: "Newport County",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 40,
    name: "Barnsley",
    shortName: "Barnsley",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 41,
    name: "Wigan Athletic",
    shortName: "Wigan Athletic",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 42,
    name: "Bristol Rovers",
    shortName: "Bristol Rovers",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 43,
    name: "Peterborough United",
    shortName: "Peterborough United",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 44,
    name: "Bromley",
    shortName: "Bromley",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 45,
    name: "Reading",
    shortName: "Reading",
    logoUrl: null,
    openLigaDbTeamId: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
];

const seedMatches: StoredMatch[] = [
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
  {
    id: 5,
    stageId: 4,
    homeTeamId: 9,
    awayTeamId: 10,
    startsAt: "2026-08-02T17:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 2,
      awayScore: 1,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 6,
    stageId: 4,
    homeTeamId: 11,
    awayTeamId: 12,
    startsAt: "2026-08-04T23:30:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 1,
      awayScore: 1,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 7,
    stageId: 4,
    homeTeamId: 13,
    awayTeamId: 14,
    startsAt: "2026-08-05T01:30:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 3,
      awayScore: 2,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 8,
    stageId: 4,
    homeTeamId: 15,
    awayTeamId: 16,
    startsAt: "2026-08-06T02:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 2,
      awayScore: 0,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 9,
    stageId: 4,
    homeTeamId: 17,
    awayTeamId: 18,
    startsAt: "2026-08-07T02:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 1,
      awayScore: 2,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 10,
    stageId: 4,
    homeTeamId: 19,
    awayTeamId: 20,
    startsAt: "2026-08-08T12:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 2,
      awayScore: 2,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 11,
    stageId: 4,
    homeTeamId: 21,
    awayTeamId: 22,
    startsAt: "2026-08-08T14:00:00.000Z",
    status: "FINISHED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: {
      homeScore: 1,
      awayScore: 0,
      updatedAt: SEED_TIME,
    },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 12,
    stageId: 4,
    homeTeamId: 23,
    awayTeamId: 24,
    startsAt: "2026-08-08T11:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 13,
    stageId: 4,
    homeTeamId: 25,
    awayTeamId: 26,
    startsAt: "2026-08-08T15:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 14,
    stageId: 4,
    homeTeamId: 27,
    awayTeamId: 28,
    startsAt: "2026-08-08T12:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 15,
    stageId: 4,
    homeTeamId: 29,
    awayTeamId: 30,
    startsAt: "2026-08-08T13:00:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 16,
    stageId: 4,
    homeTeamId: 31,
    awayTeamId: 32,
    startsAt: "2026-08-08T12:30:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 17,
    stageId: 4,
    homeTeamId: 33,
    awayTeamId: 34,
    startsAt: "2026-08-08T20:30:00.000Z",
    status: "LIVE",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 18,
    stageId: 4,
    homeTeamId: 35,
    awayTeamId: 36,
    startsAt: "2026-08-08T18:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 19,
    stageId: 4,
    homeTeamId: 37,
    awayTeamId: 36,
    startsAt: "2026-08-08T19:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 20,
    stageId: 4,
    homeTeamId: 37,
    awayTeamId: 35,
    startsAt: "2026-08-08T20:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 21,
    stageId: 4,
    homeTeamId: 38,
    awayTeamId: 39,
    startsAt: "2026-08-08T14:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 22,
    stageId: 4,
    homeTeamId: 40,
    awayTeamId: 41,
    startsAt: "2026-08-08T14:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 23,
    stageId: 4,
    homeTeamId: 42,
    awayTeamId: 43,
    startsAt: "2026-08-08T14:00:00.000Z",
    status: "SCHEDULED",
    groupName: null,
    knockoutRound: null,
    bracketPosition: null,
    result: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  },
  {
    id: 24,
    stageId: 4,
    homeTeamId: 44,
    awayTeamId: 45,
    startsAt: "2026-08-08T14:00:00.000Z",
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
  private readonly db: DatabaseSync;

  static closeConnection(databasePath: string): void {
    const connection = connections.get(databasePath);

    if (connection) {
      connection.close();
      connections.delete(databasePath);
    }
  }

  constructor(databasePath = resolveDatabasePath()) {
    this.db = getConnection(databasePath);
    initializeSchema(this.db);
    seedIfEmpty(this.db);
  }

  listCompetitions(): Competition[] {
    return this.db
      .prepare("SELECT * FROM competitions ORDER BY id ASC")
      .all()
      .map((row) => toCompetition(row as CompetitionRow));
  }

  findCompetition(id: number): Competition | undefined {
    const row = this.db
      .prepare("SELECT * FROM competitions WHERE id = ?")
      .get(id) as CompetitionRow | undefined;

    return row ? toCompetition(row) : undefined;
  }

  findStage(id: number): Stage | undefined {
    const row = this.db.prepare("SELECT * FROM stages WHERE id = ?").get(id) as
      StageRow | undefined;

    return row ? toStage(row) : undefined;
  }

  listStages(filters: { competitionId?: number } = {}): Stage[] {
    const rows =
      filters.competitionId === undefined
        ? this.db
            .prepare(
              "SELECT * FROM stages ORDER BY competition_id ASC, sort_order ASC, id ASC",
            )
            .all()
        : this.db
            .prepare(
              "SELECT * FROM stages WHERE competition_id = ? ORDER BY competition_id ASC, sort_order ASC, id ASC",
            )
            .all(filters.competitionId);

    return rows.map((row) => toStage(row as StageRow));
  }

  listStagesByCompetition(competitionId: number): Stage[] {
    return this.listStages({ competitionId });
  }

  listMatches(filters: {
    competitionId?: number;
    stageId?: number;
    status?: MatchStatus;
  }): Match[] {
    const conditions: string[] = [];
    const parameters: (number | MatchStatus)[] = [];

    if (filters.competitionId !== undefined) {
      conditions.push(
        "stage_id IN (SELECT id FROM stages WHERE competition_id = ?)",
      );
      parameters.push(filters.competitionId);
    }

    if (filters.stageId !== undefined) {
      conditions.push("stage_id = ?");
      parameters.push(filters.stageId);
    }

    if (filters.status !== undefined) {
      conditions.push("status = ?");
      parameters.push(filters.status);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `SELECT * FROM matches${whereClause} ORDER BY starts_at ASC, id ASC`,
      )
      .all(...parameters);

    return rows.map((row) => this.toMatch(toStoredMatch(row as MatchRow)));
  }

  listTeams(): Team[] {
    return this.db
      .prepare("SELECT * FROM teams")
      .all()
      .map((row) => toTeam(row as TeamRow))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name, "zh-CN") || left.id - right.id,
      );
  }

  findTeam(id: number): Team | undefined {
    const row = this.db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as
      TeamRow | undefined;

    return row ? toTeam(row) : undefined;
  }

  findMatch(id: number): Match | undefined {
    const row = this.db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .get(id) as MatchRow | undefined;

    return row ? this.toMatch(toStoredMatch(row)) : undefined;
  }

  updateMatchResult(
    id: number,
    result: { homeScore: number; awayScore: number },
  ): Match | undefined {
    const now = new Date().toISOString();
    const update = this.db
      .prepare(
        `
          UPDATE matches
          SET status = 'FINISHED',
              result_home_score = ?,
              result_away_score = ?,
              result_updated_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .run(result.homeScore, result.awayScore, now, now, id);

    if (update.changes === 0) {
      return undefined;
    }

    return this.findMatch(id);
  }

  createCompetition(input: CompetitionWrite): Competition {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        "INSERT INTO competitions (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run(input.name, input.description, now, now);

    return this.requireCompetition(Number(result.lastInsertRowid));
  }

  updateCompetition(
    id: number,
    input: CompetitionWrite,
  ): Competition | undefined {
    const update = this.db
      .prepare(
        "UPDATE competitions SET name = ?, description = ?, updated_at = ? WHERE id = ?",
      )
      .run(input.name, input.description, new Date().toISOString(), id);

    return update.changes === 0 ? undefined : this.findCompetition(id);
  }

  deleteCompetition(id: number): boolean {
    return (
      this.db.prepare("DELETE FROM competitions WHERE id = ?").run(id).changes >
      0
    );
  }

  createStage(input: StageWrite): Stage {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `
          INSERT INTO stages (competition_id, name, type, group_name, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.competitionId,
        input.name,
        input.type,
        input.groupName,
        input.sortOrder,
        now,
        now,
      );

    return this.requireStage(Number(result.lastInsertRowid));
  }

  updateStage(id: number, input: StageWrite): Stage | undefined {
    const update = this.db
      .prepare(
        `
          UPDATE stages
          SET competition_id = ?, name = ?, type = ?, group_name = ?, sort_order = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        input.competitionId,
        input.name,
        input.type,
        input.groupName,
        input.sortOrder,
        new Date().toISOString(),
        id,
      );

    return update.changes === 0 ? undefined : this.findStage(id);
  }

  deleteStage(id: number): boolean {
    return (
      this.db.prepare("DELETE FROM stages WHERE id = ?").run(id).changes > 0
    );
  }

  createTeam(input: TeamWrite): Team {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `
          INSERT INTO teams (name, short_name, logo_url, open_liga_db_team_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.name,
        input.shortName,
        input.logoUrl,
        input.openLigaDbTeamId,
        now,
        now,
      );

    return this.requireTeam(Number(result.lastInsertRowid));
  }

  updateTeam(id: number, input: TeamWrite): Team | undefined {
    const update = this.db
      .prepare(
        `
          UPDATE teams
          SET name = ?, short_name = ?, logo_url = ?, open_liga_db_team_id = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        input.name,
        input.shortName,
        input.logoUrl,
        input.openLigaDbTeamId,
        new Date().toISOString(),
        id,
      );

    return update.changes === 0 ? undefined : this.findTeam(id);
  }

  deleteTeam(id: number): boolean {
    return (
      this.db.prepare("DELETE FROM teams WHERE id = ?").run(id).changes > 0
    );
  }

  createMatch(input: MatchWrite): Match {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `
          INSERT INTO matches (
            stage_id, home_team_id, away_team_id, starts_at, status, group_name,
            knockout_round, bracket_position, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.stageId,
        input.homeTeamId,
        input.awayTeamId,
        input.startsAt,
        input.status,
        input.groupName,
        input.knockoutRound,
        input.bracketPosition,
        now,
        now,
      );

    return this.requireMatch(Number(result.lastInsertRowid));
  }

  updateMatch(id: number, input: MatchWrite): Match | undefined {
    const now = new Date().toISOString();
    const update = this.db
      .prepare(
        `
          UPDATE matches
          SET stage_id = ?,
              home_team_id = ?,
              away_team_id = ?,
              starts_at = ?,
              status = ?,
              group_name = ?,
              knockout_round = ?,
              bracket_position = ?,
              result_home_score = CASE WHEN ? = 'FINISHED' THEN result_home_score ELSE NULL END,
              result_away_score = CASE WHEN ? = 'FINISHED' THEN result_away_score ELSE NULL END,
              result_updated_at = CASE WHEN ? = 'FINISHED' THEN result_updated_at ELSE NULL END,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        input.stageId,
        input.homeTeamId,
        input.awayTeamId,
        input.startsAt,
        input.status,
        input.groupName,
        input.knockoutRound,
        input.bracketPosition,
        input.status,
        input.status,
        input.status,
        now,
        id,
      );

    return update.changes === 0 ? undefined : this.findMatch(id);
  }

  deleteMatch(id: number): boolean {
    return (
      this.db.prepare("DELETE FROM matches WHERE id = ?").run(id).changes > 0
    );
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

  private requireMatch(id: number): Match {
    const match = this.findMatch(id);

    if (!match) {
      throw new Error(`Seed match ${id} is missing`);
    }

    return match;
  }
}

function resolveDatabasePath(): string {
  if (process.env.NODE_ENV === "unittest") {
    return ":memory:";
  }

  return (
    process.env.FOOTBALL_DATABASE_PATH ??
    process.env.DATABASE_PATH ??
    DEFAULT_DATABASE_PATH
  );
}

function getConnection(databasePath: string): DatabaseSync {
  const existing = connections.get(databasePath);

  if (existing) {
    return existing;
  }

  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON");
  connections.set(databasePath, db);
  return db;
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('GROUP', 'LEAGUE', 'KNOCKOUT')),
      group_name TEXT,
      sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      logo_url TEXT,
      open_liga_db_team_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
      home_team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      away_team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'LIVE', 'FINISHED')),
      group_name TEXT,
      knockout_round TEXT,
      bracket_position INTEGER,
      result_home_score INTEGER,
      result_away_score INTEGER,
      result_updated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stages_competition_id ON stages(competition_id);
    CREATE INDEX IF NOT EXISTS idx_matches_stage_id ON matches(stage_id);
    CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches(home_team_id);
    CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches(away_team_id);
    CREATE INDEX IF NOT EXISTS idx_matches_status_starts_at_id ON matches(status, starts_at, id);
    CREATE INDEX IF NOT EXISTS idx_matches_stage_starts_at_id ON matches(stage_id, starts_at, id);
  `);
}

function seedIfEmpty(db: DatabaseSync): void {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM competitions")
    .get() as { count: number };

  if (row.count > 0) {
    return;
  }

  db.exec("BEGIN");
  try {
    for (const competition of seedCompetitions) {
      db.prepare(
        "INSERT INTO competitions (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        competition.id,
        competition.name,
        competition.description,
        competition.createdAt,
        competition.updatedAt,
      );
    }

    for (const stage of seedStages) {
      db.prepare(
        `
          INSERT INTO stages (id, competition_id, name, type, group_name, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        stage.id,
        stage.competitionId,
        stage.name,
        stage.type,
        stage.groupName,
        stage.sortOrder,
        stage.createdAt,
        stage.updatedAt,
      );
    }

    for (const team of seedTeams) {
      db.prepare(
        `
          INSERT INTO teams (id, name, short_name, logo_url, open_liga_db_team_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        team.id,
        team.name,
        team.shortName,
        team.logoUrl,
        team.openLigaDbTeamId,
        team.createdAt,
        team.updatedAt,
      );
    }

    for (const match of seedMatches) {
      db.prepare(
        `
          INSERT INTO matches (
            id, stage_id, home_team_id, away_team_id, starts_at, status, group_name,
            knockout_round, bracket_position, result_home_score, result_away_score,
            result_updated_at, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        match.id,
        match.stageId,
        match.homeTeamId,
        match.awayTeamId,
        match.startsAt,
        match.status,
        match.groupName,
        match.knockoutRound,
        match.bracketPosition,
        match.result?.homeScore ?? null,
        match.result?.awayScore ?? null,
        match.result?.updatedAt ?? null,
        match.createdAt,
        match.updatedAt,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function toCompetition(row: CompetitionRow): Competition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStage(row: StageRow): Stage {
  return {
    id: row.id,
    competitionId: row.competition_id,
    name: row.name,
    type: row.type as StageType,
    groupName: row.group_name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    logoUrl: row.logo_url,
    openLigaDbTeamId: row.open_liga_db_team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStoredMatch(row: MatchRow): StoredMatch {
  return {
    id: row.id,
    stageId: row.stage_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    startsAt: row.starts_at,
    status: row.status as MatchStatus,
    groupName: row.group_name,
    knockoutRound: row.knockout_round,
    bracketPosition: row.bracket_position,
    result:
      row.result_home_score === null ||
      row.result_away_score === null ||
      row.result_updated_at === null
        ? null
        : {
            homeScore: row.result_home_score,
            awayScore: row.result_away_score,
            updatedAt: row.result_updated_at,
          },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
