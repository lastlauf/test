/** Shapes returned by the JSON API, shared by server pages and client polling. */
import type { Hole, MatchState, ScoreRow, Side } from "./scoring";
import type {
  CourseRow,
  LeaderboardEntry,
  MatchView,
  RoundRow,
  TeamStanding,
  TeeRow,
  TournamentBoardRow,
  TournamentRow,
} from "./tsi";
import type { Ledger, WagerDef } from "./wagers";

export interface BoardPayload {
  tournament: TournamentRow;
  rounds: {
    round: RoundRow;
    matches: {
      id: string;
      name: string;
      status: string;
      decided: boolean;
      thru: number;
      sides: Side[];
      winner: string | "halved" | null;
    }[];
  }[];
  teams: TeamStanding[];
  leaderboard: TournamentBoardRow[];
  fetchedAt: string;
}

export interface RoundPayload {
  round: RoundRow;
  course: CourseRow | null;
  tee: TeeRow | null;
  holes: Hole[];
  matches: MatchView[];
  leaderboard: LeaderboardEntry[];
  fetchedAt: string;
}

export interface MatchPayload {
  match: MatchView;
  round: RoundRow;
  holes: Hole[];
  fetchedAt: string;
}

export interface LedgerPayload {
  ledger: Ledger & { players: Record<string, string> };
  fetchedAt: string;
}

export type { Hole, MatchState, ScoreRow, Side, WagerDef, MatchView, LeaderboardEntry };
