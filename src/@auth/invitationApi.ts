import { apiClient, API_ENDPOINTS } from "@/services/api";

export type InvitationDetails = {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  businessName: string | null;
  expiresAt: string;
};

/**
 * What the activation page prefills. The token is the credential here: the
 * invited owner has no password yet, so there is nothing else to authenticate
 * them with, and the token only ever existed in their inbox.
 */
export async function checkInvitation(token: string) {
  return apiClient.post<InvitationDetails, { token: string }>(
    API_ENDPOINTS.AUTH.CHECK_INVITATION,
    { token },
    { authenticated: false },
  );
}

export async function acceptInvitation(token: string, password: string) {
  return apiClient.post<void, { token: string; password: string }>(
    API_ENDPOINTS.AUTH.ACCEPT_INVITATION,
    { token, password },
    { authenticated: false },
  );
}
