export type Role = "USER" | "ADMIN";

export type User = {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
};

export type AuthResponse = {
  data: User;
};

export type ErrorResponse = {
  error: {
    code:
      | "VALIDATION_FAILED"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "PREDICTION_LOCKED"
      | "UNSUPPORTED_STAGE_TYPE"
      | "INTERNAL_ERROR";
    message: string;
    details?: Array<{
      field: string;
      reason: string;
    }>;
  };
  requestId: string;
};

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

export type CompetitionWriteRequest = {
  name: string;
  description: string;
};

export type StageListResponse = {
  data: Stage[];
};

export type StageResponse = {
  data: Stage;
};

export type StageWriteRequest = {
  competitionId: number;
  name: string;
  type: StageType;
  groupName: string | null;
  sortOrder: number;
};

export type MatchListResponse = {
  data: Match[];
};

export type MatchResponse = {
  data: Match;
};

export type MatchWriteRequest = {
  stageId: number;
  homeTeamId: number;
  awayTeamId: number;
  startsAt: string;
  status: MatchStatus;
  groupName: string | null;
  knockoutRound: string | null;
  bracketPosition: number | null;
};

export type TeamListResponse = {
  data: Team[];
};

export type TeamResponse = {
  data: Team;
};

export type TeamWriteRequest = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  openLigaDbTeamId: number | null;
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
  author: User;
  content: string;
  moderationStatus: CommentModerationStatus;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommentResponse = {
  data: Comment;
};

export type CommentPageResponse = {
  data: Comment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};
