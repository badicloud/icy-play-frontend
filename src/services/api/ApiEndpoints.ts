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
    FACILITY_OWNER_BUSINESS: (id: string) =>
      `${API_V1}/admin/facility-owners/${id}/business`,
    FACILITY_OWNER_FACILITY: (id: string, facilityId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}`,
    FACILITY_OWNER_FACILITY_HOURS: (id: string, facilityId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}/hours`,
    FACILITY_OWNER_CONTRACTS: (id: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts`,
    CONTRACT_DOCUMENT: (id: string, contractId: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts/${contractId}/document`,
    CANCEL_CONTRACT: (id: string, contractId: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts/${contractId}/cancel`,
    SPORTS: `${API_V1}/admin/sports`,
    SPORT: (id: string) => `${API_V1}/admin/sports/${id}`,
    SPORT_RETIRE: (id: string) => `${API_V1}/admin/sports/${id}/retire`,
    SPORT_REINSTATE: (id: string) => `${API_V1}/admin/sports/${id}/reinstate`,
    FACILITIES: `${API_V1}/admin/facilities`,
    COURTS: `${API_V1}/admin/courts`,
    FACILITY_COURTS: (facilityId: string) =>
      `${API_V1}/admin/facilities/${facilityId}/courts`,
    FACILITY_MAINTENANCE: (facilityId: string) =>
      `${API_V1}/admin/facilities/${facilityId}/maintenance`,
    COURT_MAINTENANCE: (courtId: string) =>
      `${API_V1}/admin/courts/${courtId}/maintenance`,
    LIFT_MAINTENANCE: (periodId: string) =>
      `${API_V1}/admin/maintenance/${periodId}/lift`,
    FACILITY_OWNER_ACTIVITY: (id: string) =>
      `${API_V1}/admin/facility-owners/${id}/activity`,
    AMENITIES: `${API_V1}/admin/amenities`,
    UPLOAD_SIGNATURE: `${API_V1}/admin/assets/upload-signature`,
  },
} as const;
