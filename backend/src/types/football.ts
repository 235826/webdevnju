import type { PublicUser } from "./auth";

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

export type StageListResponse = {
  data: Stage[];
};

export type MatchListResponse = {
  data: Match[];
};

export type MatchResponse = {
  data: Match;
};

export type TeamListResponse = {
  data: Team[];
};

export type TeamResponse = {
  data: Team;
};

export type ExternalProfileStatus = "AVAILABLE" | "UNAVAILABLE" | "NO_MATCH";

export type ExternalTeamProfile = {
  provider: "OpenLigaDB";
  providerTeamId: number;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
};

export type ExternalTeamProfileResponse = {
  status: ExternalProfileStatus;
  data: ExternalTeamProfile | null;
  message: string | null;
};

export type StandingRow = {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type StandingGroup = {
  groupName: string | null;
  rows: StandingRow[];
};

export type StandingsResponse = {
  stageId: number;
  stageType: StageType;
  groups: StandingGroup[];
};

export type BracketRound = {
  round: string;
  matches: Match[];
};

export type BracketResponse = {
  stageId: number;
  rounds: BracketRound[];
};

export type MatchListQuery = {
  competitionId?: unknown;
  stageId?: unknown;
  status?: unknown;
};

export type Prediction = {
  id: number;
  matchId: number;
  userId: number;
  homeScore: number;
  awayScore: number;
  isActive: boolean;
  createdAt: string;
  supersededAt: string | null;
};

export type ScoreLineRequest = {
  homeScore?: unknown;
  awayScore?: unknown;
};

export type MatchResultRequest = ScoreLineRequest;

export type CompetitionWriteRequest = {
  name?: unknown;
  description?: unknown;
};

export type StageWriteRequest = {
  competitionId?: unknown;
  name?: unknown;
  type?: unknown;
  groupName?: unknown;
  sortOrder?: unknown;
};

export type TeamWriteRequest = {
  name?: unknown;
  shortName?: unknown;
  logoUrl?: unknown;
  openLigaDbTeamId?: unknown;
};

export type MatchWriteRequest = {
  stageId?: unknown;
  homeTeamId?: unknown;
  awayTeamId?: unknown;
  startsAt?: unknown;
  status?: unknown;
  groupName?: unknown;
  knockoutRound?: unknown;
  bracketPosition?: unknown;
};

export type PredictionResponse = {
  data: Prediction;
};

export type NullablePredictionResponse = {
  data: Prediction | null;
};

export type PredictionListResponse = {
  data: Prediction[];
};

export type Favorite = {
  id: number;
  match: Match;
  createdAt: string;
};

export type FavoriteResponse = {
  data: Favorite;
};

export type FavoriteListResponse = {
  data: Favorite[];
};

export type CommentModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Comment = {
  id: number;
  matchId: number;
  author: PublicUser;
  content: string;
  moderationStatus: CommentModerationStatus;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommentWriteRequest = {
  content?: unknown;
};

export type ModerateCommentRequest = {
  moderationStatus?: unknown;
};

export type CommentResponse = {
  data: Comment;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type CommentPageResponse = {
  data: Comment[];
  pagination: Pagination;
};

export type CommentListQuery = {
  page?: unknown;
  pageSize?: unknown;
};
