import { apiClient, API_ENDPOINTS } from "@/services/api";

export type ActiveSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  signedInAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isPersistent: boolean;
  isCurrent: boolean;
};

export type RevokeOtherSessionsResponse = {
  revokedSessions: number;
};

export function getActiveSessions() {
  return apiClient.get<ActiveSession[]>(API_ENDPOINTS.AUTH.SESSIONS);
}

export function revokeSession(sessionId: string) {
  return apiClient.delete<void>(API_ENDPOINTS.AUTH.SESSION(sessionId));
}

export function revokeOtherSessions() {
  return apiClient.post<RevokeOtherSessionsResponse>(
    API_ENDPOINTS.AUTH.REVOKE_OTHER_SESSIONS,
  );
}

/** Ends every session, this device included. */
export function revokeAllSessions() {
  return apiClient.post<RevokeOtherSessionsResponse>(
    API_ENDPOINTS.AUTH.REVOKE_ALL_SESSIONS,
  );
}
