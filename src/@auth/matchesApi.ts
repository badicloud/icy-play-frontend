import { apiClient, API_ENDPOINTS } from "@/services/api";
import { uploadToCloudinary, type UploadedAsset, type UploadSignature } from "./cloudinaryUpload";

/** One player on the matches board. */
export type MatchBoardPlayer = {
  /** Their place in the session's line: what Done and Back in take. */
  participantId: string;
  fullName: string;
  /** "Juan D.": for the wide screen anybody walking past can read. */
  displayName: string;
  /** Put in for free by the venue. */
  isFree: boolean;
  /** Finished matches they were on court in this session, even for part of one. */
  played: number;
};

export type MatchStatus = "Forming" | "Ready" | "Playing" | "Finished";

/** How a match ended: Team A won, Team B won, or level. */
export type MatchResult = "A" | "B" | "Draw";

/** Who won and, if the desk has one, the score: both teams or neither. */
export type MatchResultInput = {
  result: MatchResult;
  scoreA: number | null;
  scoreB: number | null;
};

/** One match, seat by seat. A null seat is open, waiting for the next check-in. */
export type MatchBoardMatch = {
  matchId: string;
  number: number;
  status: MatchStatus;
  startedAt: string | null;
  finishedAt: string | null;
  teamA: (MatchBoardPlayer | null)[];
  teamB: (MatchBoardPlayer | null)[];
  /** Null before it finishes, or for a match finished before results were kept. */
  result: MatchResult | null;
  scoreA: number | null;
  scoreB: number | null;
};

/** One player's record in the session. */
export type MatchStanding = {
  player: MatchBoardPlayer;
  /** By wins alone: the same wins, the same place. */
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  /** Level on the most wins: one of the session's best players. */
  isBest: boolean;
};

/** One session's matches, as the desk runs them. */
export type MatchBoard = {
  openPlayId: string;
  title: string;
  facilityName: string;
  courtName: string;
  unitLabel: string;
  /** yyyy-MM-dd, the venue's calendar. */
  date: string;
  startsAt: string;
  endsAt: string;
  sportKey: string;
  sportName: string;
  playersPerTeam: number;
  /** The session has finished on the venue's clock. */
  isOver: boolean;
  backgroundPhotoUrl: string | null;
  matches: MatchBoardMatch[];
  /** Checked in and not on a team yet. Usually nobody. */
  waiting: MatchBoardPlayer[];
  done: MatchBoardPlayer[];
  /** Most wins first. Only matches with a result count. */
  standings: MatchStanding[];
  /** When the desk ended the session; null while it runs. */
  endedAt: string | null;
  /** Ended by the desk before its time was up: it can be opened again until then. */
  canReopen: boolean;
  /** The winners of the last match won; null until somebody has won one. */
  winningTeam: MatchWinningTeam | null;
  /** Everybody who checked in, for the group photo. */
  group: MatchBoardPlayer[];
  /** The photos taken of the results, one of each kind at most. */
  photos: MatchResultPhoto[];
};

/** What a result photo is of. The teams change every game, so the group is the other choice to the winners. */
export type ResultPhotoKind = "BestPlayers" | "WinningTeam" | "Group";

/** A photo of a session's results, kept two days. */
export type MatchResultPhoto = {
  kind: ResultPhotoKind;
  url: string;
  takenAt: string;
  /** When it is deleted: two days after it was taken. */
  expiresAt: string;
};

/** Puts a photo straight into Cloudinary, in the results folder the API signs for. */
export async function uploadResultPhoto(file: File): Promise<UploadedAsset> {
  return uploadToCloudinary(file, await apiClient.post<UploadSignature>(API_ENDPOINTS.DESK.RESULT_PHOTO_SIGNATURE));
}

/** Saves an uploaded photo as the session's photo of that kind, in place of any before. */
export function saveResultPhoto(openPlayId: string, date: string, kind: ResultPhotoKind, photo: UploadedAsset) {
  return apiClient.put<MatchResultPhoto[], { publicId: string; secureUrl: string }>(
    API_ENDPOINTS.DESK.RESULT_PHOTO(openPlayId, date, kind),
    { publicId: photo.publicId, secureUrl: photo.secureUrl },
  );
}

export function removeResultPhoto(openPlayId: string, date: string, kind: ResultPhotoKind) {
  return apiClient.delete<MatchResultPhoto[]>(API_ENDPOINTS.DESK.RESULT_PHOTO(openPlayId, date, kind));
}

/** The session's winning team: the winners of the last match won. */
export type MatchWinningTeam = {
  matchNumber: number;
  team: "A" | "B";
  players: MatchBoardPlayer[];
};

/** Ends the session: no more games, and the results stand. Not while a match is on court. */
export function endSession(openPlayId: string, date: string) {
  return apiClient.post<MatchBoard>(API_ENDPOINTS.DESK.SESSION_END(openPlayId, date));
}

/** Opens an ended session again, while its time is not up. */
export function reopenSession(openPlayId: string, date: string) {
  return apiClient.post<MatchBoard>(API_ENDPOINTS.DESK.SESSION_REOPEN(openPlayId, date));
}

/** One registered player over every session of the open play. */
export type SeriesStanding = {
  fullName: string;
  displayName: string;
  rank: number;
  /** Sessions they played a match with a result in. */
  sessions: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
};

/** The open play's leaderboard over all its sessions. Free players are left out. */
export type SeriesLeaderboard = {
  openPlayId: string;
  title: string;
  sportName: string;
  sessions: number;
  standings: SeriesStanding[];
};

/**
 * Whether a result and its score hold together, as the server checks it: a
 * score for both teams or neither, 0 to 999, saying the same as who won.
 */
export function resultHolds({ result, scoreA, scoreB }: MatchResultInput) {
  if (scoreA === null && scoreB === null) return true;
  if (scoreA === null || scoreB === null) return false;
  if ([scoreA, scoreB].some((score) => !Number.isInteger(score) || score < 0 || score > 999)) return false;
  return result === "A" ? scoreA > scoreB : result === "B" ? scoreB > scoreA : scoreA === scoreB;
}

export function getMatchBoard(openPlayId: string, date: string) {
  return apiClient.get<MatchBoard>(API_ENDPOINTS.DESK.MATCHES(openPlayId, date));
}

/** Starts the next match. Short of players, only when the desk said to start anyway. */
export function startMatch(matchId: string, evenIfShort: boolean) {
  return apiClient.post<MatchBoard, { evenIfShort: boolean }>(API_ENDPOINTS.DESK.MATCH_START(matchId), { evenIfShort });
}

/** Ends the match on court with who won. Its players go to the end of the line. */
export function finishMatch(matchId: string, result: MatchResultInput) {
  return apiClient.post<MatchBoard, MatchResultInput>(API_ENDPOINTS.DESK.MATCH_FINISH(matchId), result);
}

/** Puts a finished match's result right. The line stays as it is. */
export function correctMatchResult(matchId: string, result: MatchResultInput) {
  return apiClient.put<MatchBoard, MatchResultInput>(API_ENDPOINTS.DESK.MATCH_RESULT(matchId), result);
}

/** The open play's leaderboard over all its sessions so far. */
export function getSeriesLeaderboard(openPlayId: string) {
  return apiClient.get<SeriesLeaderboard>(API_ENDPOINTS.DESK.OPEN_PLAY_LEADERBOARD(openPlayId));
}

/** Done for the day: tired, hurt or leaving. The line adjusts around them. */
export function markPlayerDone(participantId: string) {
  return apiClient.post<MatchBoard>(API_ENDPOINTS.DESK.PARTICIPANT_DONE(participantId));
}

/**
 * "Play next match": a player in the next match goes to the end of the line,
 * and the player picked from a later match takes their seat.
 */
export function playNextMatch(participantId: string, replacementParticipantId: string) {
  return apiClient.post<MatchBoard, { replacementParticipantId: string }>(
    API_ENDPOINTS.DESK.PARTICIPANT_PLAY_NEXT_MATCH(participantId),
    { replacementParticipantId },
  );
}

/**
 * Moves a player in the next match to the other team, to even the sides out.
 * Nobody comes back the other way: move somebody across too to even it.
 */
export function moveToTeam(participantId: string, team: "A" | "B") {
  return apiClient.post<MatchBoard, { team: "A" | "B" }>(API_ENDPOINTS.DESK.PARTICIPANT_MOVE_TO_TEAM(participantId), {
    team,
  });
}

/** Back in after being done, at the end of the line. */
export function putPlayerBackIn(participantId: string) {
  return apiClient.post<MatchBoard>(API_ENDPOINTS.DESK.PARTICIPANT_BACK_IN(participantId));
}

/** The desk's matches page for one session. */
export const matchesHref = (openPlayId: string, date: string) =>
  `/desk/open-play/matches?openPlay=${openPlayId}&date=${date}`;
