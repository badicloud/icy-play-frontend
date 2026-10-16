import { apiClient, API_ENDPOINTS } from "@/services/api";

export type CheckInPlayer = {
  /** The registration, or a free player's own id when isFree. Check-in by hand takes either. */
  registrationId: string;
  /** For the desk's own screen. */
  fullName: string;
  /** "Juan C.": for the wide screen anybody walking past can read. */
  displayName: string;
  checkedInAt: string | null;
  /** Put in for free by the venue, not registered and paid. */
  isFree: boolean;
  /** A free player's mobile, for the desk. Never a registered player's. */
  mobile: string | null;
  /** Where they are in the matches; null until they have checked in. */
  lineup: CheckInLineup | null;
};

/** A checked-in player's place in the session's matches, as the matches page has it. */
export type CheckInLineup = {
  /** On court, in a match still to come, waiting, or done for the day. */
  state: "Playing" | "InMatch" | "Waiting" | "Done";
  /** The match they are in, when playing or in one to come. */
  matchNumber: number | null;
  /** Finished matches they were on court in. */
  played: number;
  /** On court in a match that started: they stay on record, so cannot be removed. */
  hasPlayed: boolean;
};

export type CheckInRoster = {
  openPlayId: string;
  title: string;
  facilityName: string;
  courtName: string;
  unitLabel: string;
  date: string;
  startsAt: string;
  endsAt: string;
  /** Venue wall clock. */
  checkInOpensAt: string;
  isOpen: boolean;
  maxPlayers: number;
  registered: number;
  checkedIn: number;
  players: CheckInPlayer[];
  /** How many the desk may put in for free, and how many it has. */
  freeSpots: number;
  freePlayers: number;
  /** Whether one more can go in for free right now: the server's answer. */
  canAddFreePlayer: boolean;
};

export type CheckInOutcome =
  | "CheckedIn"
  | "AlreadyCheckedIn"
  | "NotRegistered"
  | "WrongSession"
  | "UnknownPass"
  | "NotAPass"
  | "WindowClosed";

export type CheckInScanResult = {
  outcome: CheckInOutcome;
  message: string;
  player: CheckInPlayer | null;
  roster: CheckInRoster;
};

export function getCheckInRoster(openPlayId: string, date: string) {
  return apiClient.get<CheckInRoster>(API_ENDPOINTS.DESK.CHECK_IN(openPlayId, date));
}

/** What the camera read. The server answers with an outcome to read out, never a bare refusal. */
export function scanForCheckIn(openPlayId: string, date: string, scanned: string) {
  return apiClient.post<CheckInScanResult, { scanned: string }>(
    API_ENDPOINTS.DESK.CHECK_IN_SCAN(openPlayId, date),
    { scanned },
  );
}

/** By hand, without the player's QR: needs the venue's six-digit check-in code. */
export function checkInByHand(registrationId: string, code: string) {
  return apiClient.post<CheckInRoster, { code: string }>(API_ENDPOINTS.DESK.CHECK_IN_PLAYER(registrationId), { code });
}

/** Takes a check-in back, which makes the player's QR good again: needs the code too. */
export function undoCheckIn(registrationId: string, code: string) {
  return apiClient.post<CheckInRoster, { code: string }>(API_ENDPOINTS.DESK.CHECK_IN_UNDO(registrationId), { code });
}

/**
 * Puts a player into the session for free, to make up a game. Checked in at
 * once when the door is open: the desk is adding somebody standing at it.
 */
export function addFreePlayer(openPlayId: string, date: string, fullName: string, mobile: string) {
  return apiClient.post<CheckInRoster, { fullName: string; mobile: string | null }>(
    API_ENDPOINTS.DESK.FREE_PLAYERS(openPlayId, date),
    { fullName, mobile: mobile.trim() === "" ? null : mobile },
  );
}

/** Takes a free player back out. Their spot opens again. */
export function removeFreePlayer(freePlayerId: string) {
  return apiClient.delete<CheckInRoster>(API_ENDPOINTS.DESK.FREE_PLAYER(freePlayerId));
}

/** The desk's check-in page for one session, and its wide screen. */
export const checkInHref = (openPlayId: string, date: string) =>
  `/desk/open-play/check-in?openPlay=${openPlayId}&date=${date}`;

export const checkInScreenHref = (openPlayId: string, date: string) =>
  `/desk/open-play/check-in/screen?openPlay=${openPlayId}&date=${date}`;
