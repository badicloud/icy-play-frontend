const API_V1 = "/api/v1";
const AUTH_BASE = `${API_V1}/auth`;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${AUTH_BASE}/login`,
    LOGOUT: `${AUTH_BASE}/logout`,
    ME: `${AUTH_BASE}/me`,
    REFRESH: `${AUTH_BASE}/refresh`,
    REGISTER_CUSTOMER: `${AUTH_BASE}/register/customer`,
    RESEND_VERIFICATION_EMAIL: `${AUTH_BASE}/resend-verification`,
    VERIFY_EMAIL: `${AUTH_BASE}/verify-email`,
    FORGOT_PASSWORD: `${AUTH_BASE}/forgot-password`,
    RESET_PASSWORD: `${AUTH_BASE}/reset-password`,
    CHECK_RESET_TOKEN: `${AUTH_BASE}/reset-password/check`,
    CHECK_INVITATION: `${AUTH_BASE}/invitation/check`,
    ACCEPT_INVITATION: `${AUTH_BASE}/invitation/accept`,
    SESSIONS: `${AUTH_BASE}/sessions`,
    SESSION: (sessionId: string) => `${AUTH_BASE}/sessions/${sessionId}`,
    REVOKE_OTHER_SESSIONS: `${AUTH_BASE}/sessions/revoke-others`,
    REVOKE_ALL_SESSIONS: `${AUTH_BASE}/sessions/revoke-all`,
  },
  ADMIN: {
    USERS: `${API_V1}/admin/users`,
    FACILITY_OWNERS: `${API_V1}/admin/facility-owners`,
    FACILITY_OWNER: (id: string) => `${API_V1}/admin/facility-owners/${id}`,
    RESEND_INVITATION: (id: string) =>
      `${API_V1}/admin/facility-owners/${id}/resend-invitation`,
    AMENITIES: `${API_V1}/admin/amenities`,
    UPLOAD_SIGNATURE: `${API_V1}/admin/assets/upload-signature`,
  },
} as const;
