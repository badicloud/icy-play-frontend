import { apiClient, API_ENDPOINTS } from "@/services/api";

export type ClaimStubStatus = "Available" | "Given" | "Claimed" | "Expired";

/** One prize an open play gives its best players, as a claim stub. */
export type ClaimStub = {
  claimStubId: string;
  openPlayId: string;
  openPlayTitle: string;
  /** "7KQ2-M9XA": what the player shows. */
  code: string;
  prize: string;
  /** Not given yet, given and waiting, claimed, or given and not claimed in time. */
  status: ClaimStubStatus;
  playerName: string | null;
  /** yyyy-MM-dd: the session it was won in. */
  sessionDate: string | null;
  givenAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  claimedByName: string | null;
};

export function getClaimStubs(openPlayId: string) {
  return apiClient.get<ClaimStub[]>(API_ENDPOINTS.DESK.CLAIM_STUBS(openPlayId));
}

/** Marks the stub with this code claimed: the player has shown it and had their prize. */
export function claimStub(code: string) {
  return apiClient.post<ClaimStub, { code: string }>(API_ENDPOINTS.DESK.CLAIM_STUB_CLAIM, { code });
}

/** The desk's claim stubs page for one open play. */
export const claimStubsHref = (openPlayId: string) => `/desk/open-play/claim-stubs?openPlay=${openPlayId}`;
