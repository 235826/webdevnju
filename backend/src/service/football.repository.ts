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
    const rows = this.db
      .prepare("SELECT * FROM matches ORDER BY starts_at ASC, id ASC")
      .all()
      .map((row) => toStoredMatch(row as MatchRow));

    return rows
      .map((match) => this.toMatch(match))
      .filter((match) => {
        return (
          (filters.competitionId === undefined ||
            match.competition.id === filters.competitionId) &&
          (filters.stageId === undefined ||
            match.stage.id === filters.stageId) &&
          (filters.status === undefined || match.status === filters.status)
        );
      });
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
