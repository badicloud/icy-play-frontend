import { apiClient, API_ENDPOINTS } from "@/services/api";

export type CheckInPlayer = {
  registrationId: string;
  /** For the desk's own screen. */
  fullName: string;
  /** "Juan C.": for the wide screen anybody walking past can read. */
  displayName: string;
  checkedInAt: string | null;
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

/** The desk's check-in page for one session, and its wide screen. */
export const checkInHref = (openPlayId: string, date: string) =>
  `/desk/open-play/check-in?openPlay=${openPlayId}&date=${date}`;

export const checkInScreenHref = (openPlayId: string, date: string) =>
  `/desk/open-play/check-in/screen?openPlay=${openPlayId}&date=${date}`;
