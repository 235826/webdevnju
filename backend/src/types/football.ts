export type StageType = "GROUP" | "LEAGUE" | "KNOCKOUT";
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export type Competition = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Stage = {
  id: number;
  competitionId: number;
  name: string;
  type: StageType;
  groupName: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Team = {
  id: number;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  openLigaDbTeamId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  updatedAt: string;
};

export type Match = {
  id: number;
  competition: Competition;
  stage: Stage;
  homeTeam: Team;
  awayTeam: Team;
  startsAt: string;
  status: MatchStatus;
  groupName: string | null;
  knockoutRound: string | null;
  bracketPosition: number | null;
  result: MatchResult | null;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionListResponse = {
  data: Competition[];
};

export type CompetitionResponse = {
  data: Competition;
};

export type StageResponse = {
  data: Stage;
};

export type MatchListResponse = {
  data: Match[];
};

export type MatchResponse = {
  data: Match;
};

export type MatchListQuery = {
  competitionId?: unknown;
  stageId?: unknown;
  status?: unknown;
};
