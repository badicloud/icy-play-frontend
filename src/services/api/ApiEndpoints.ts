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
  CATALOG: {
    ACTIVITIES: `${API_V1}/catalog/activities`,
    FACILITIES: `${API_V1}/catalog/facilities`,
    COURTS: `${API_V1}/catalog/courts`,
    COURT: (courtId: string) => `${API_V1}/catalog/courts/${courtId}`,
    AVAILABILITY: (bookableCourtId: string) =>
      `${API_V1}/catalog/bookable-courts/${bookableCourtId}/availability`,
    DAY_OUTLOOK: (bookableCourtId: string) =>
      `${API_V1}/catalog/bookable-courts/${bookableCourtId}/day-outlook`,
  },
  BOOKINGS: {
    ROOT: `${API_V1}/bookings`,
    ONE: (bookingId: string) => `${API_V1}/bookings/${bookingId}`,
    CANCEL: (bookingId: string) => `${API_V1}/bookings/${bookingId}/cancel`,
    MOVE: (bookingId: string) => `${API_V1}/bookings/${bookingId}/move`,
    MOVE_QUOTE: (bookingId: string) => `${API_V1}/bookings/${bookingId}/move-quote`,
    MOVE_WINDOW: (bookingId: string) => `${API_V1}/bookings/${bookingId}/move-window`,
    MOVE_OPTIONS: (bookingId: string) => `${API_V1}/bookings/${bookingId}/move-options`,
    HISTORY: (bookingId: string) => `${API_V1}/bookings/${bookingId}/history`,
    UPGRADE: (bookingId: string) => `${API_V1}/bookings/${bookingId}/upgrade`,
    UPGRADE_RECEIPT: (bookingId: string) => `${API_V1}/bookings/${bookingId}/upgrade/receipt`,
    RECEIPT: (bookingId: string) => `${API_V1}/bookings/${bookingId}/receipt`,
  },
  CUSTOMER_UPLOAD_SIGNATURE: `${API_V1}/assets/upload-signature`,
  ADMIN: {
    USERS: `${API_V1}/admin/users`,
    FACILITY_OWNERS: `${API_V1}/admin/facility-owners`,
    FACILITY_OWNER: (id: string) => `${API_V1}/admin/facility-owners/${id}`,
    REPORT_OWNERS: `${API_V1}/admin/reports/owners`,
    REPORT_SNAPSHOT: `${API_V1}/admin/reports/snapshot`,
    REPORT_UTILIZATION: `${API_V1}/admin/reports/court-utilization`,
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
    CONTRACT_TERM: (id: string, contractId: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts/${contractId}`,
    FACILITY_ATTENDANTS: (id: string, facilityId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}/attendants`,
    FACILITY_ATTENDANT: (id: string, facilityId: string, attendantId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}/attendants/${attendantId}`,
    FACILITY_ATTENDANT_RESEND: (id: string, facilityId: string, attendantId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}/attendants/${attendantId}/resend-invitation`,
    FACILITY_ATTENDANT_EMAIL_CHECK: (id: string, facilityId: string) =>
      `${API_V1}/admin/facility-owners/${id}/facilities/${facilityId}/attendants/check`,
    FACILITY_OWNER_PAYMENT_DETAILS: (id: string) =>
      `${API_V1}/admin/facility-owners/${id}/payment-details`,
    CONTRACT_RATES: (id: string, contractId: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts/${contractId}/rates`,
    CANCEL_CONTRACT: (id: string, contractId: string) =>
      `${API_V1}/admin/facility-owners/${id}/contracts/${contractId}/cancel`,
    SEED_VENUE: `${API_V1}/admin/seed/venue`,
    SEED_VENUES: `${API_V1}/admin/seed/venues`,
    SEED_ALLOWED: `${API_V1}/admin/seed/allowed`,
    SPORTS: `${API_V1}/admin/sports`,
    SPORT: (id: string) => `${API_V1}/admin/sports/${id}`,
    SPORT_RETIRE: (id: string) => `${API_V1}/admin/sports/${id}/retire`,
    SPORT_REINSTATE: (id: string) => `${API_V1}/admin/sports/${id}/reinstate`,
    HOLIDAYS: `${API_V1}/admin/holidays`,
    HOLIDAY: (id: string) => `${API_V1}/admin/holidays/${id}`,
    HOLIDAY_RETIRE: (id: string) => `${API_V1}/admin/holidays/${id}/retire`,
    HOLIDAY_REINSTATE: (id: string) => `${API_V1}/admin/holidays/${id}/reinstate`,
    HOLIDAY_TEMPLATE: `${API_V1}/admin/holidays/template`,
    HOLIDAY_IMPORT: `${API_V1}/admin/holidays/import`,
    FACILITIES: `${API_V1}/admin/facilities`,
    COURTS: `${API_V1}/admin/courts`,
    COURT: (courtId: string) => `${API_V1}/admin/courts/${courtId}`,
    // The desk answers these two at its own address, for the venue that works
    // the court. These are the platform's door onto the same answers: an admin
    // attends no venue, so the desk's gate turns them away from every court.
    // Read only — confirming payments and approving upgrades stay the venue's.
    COURT_SCHEDULE: (courtId: string) => `${API_V1}/admin/courts/${courtId}/schedule`,
    COURT_BOOKINGS: (courtId: string) => `${API_V1}/admin/courts/${courtId}/bookings`,
    // Both pages above lead here: an hour on the diary is clicked to see whose
    // it is, and a row in the list opens its own history.
    BOOKING: (bookingId: string) => `${API_V1}/admin/bookings/${bookingId}`,
    BOOKING_HISTORY: (bookingId: string) => `${API_V1}/admin/bookings/${bookingId}/history`,
    COURT_PRICING: (courtId: string) => `${API_V1}/admin/courts/${courtId}/pricing`,
    COURT_DIVISIONS: (courtId: string) => `${API_V1}/admin/courts/${courtId}/divisions`,
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
  /** The venue's desk: what an owner or attendant confirms. */
  DESK: {
    SETTINGS: `${API_V1}/desk/settings`,
    VENUES: `${API_V1}/desk/venues`,
    BOOKINGS: `${API_V1}/desk/bookings`,
    COURTS: `${API_V1}/desk/courts`,
    COURT_SCHEDULE: (courtId: string) => `${API_V1}/desk/courts/${courtId}/schedule`,
    COURT_BOOKINGS: (courtId: string) => `${API_V1}/desk/courts/${courtId}/bookings`,
    BOOKING: (bookingId: string) => `${API_V1}/desk/bookings/${bookingId}`,
    BOOKING_HISTORY: (bookingId: string) =>
      `${API_V1}/desk/bookings/${bookingId}/history`,
    CONFIRM_BOOKING: (bookingId: string) =>
      `${API_V1}/desk/bookings/${bookingId}/confirm`,
    REJECT_BOOKING: (bookingId: string) =>
      `${API_V1}/desk/bookings/${bookingId}/reject`,
    UPGRADES: `${API_V1}/desk/upgrades`,
    APPROVE_UPGRADE: (upgradeId: string) =>
      `${API_V1}/desk/upgrades/${upgradeId}/approve`,
    DECLINE_UPGRADE: (upgradeId: string) =>
      `${API_V1}/desk/upgrades/${upgradeId}/decline`,
    COURT_UTILIZATION: `${API_V1}/desk/reports/court-utilization`,
    SNAPSHOT: `${API_V1}/desk/reports/snapshot`,
    HOURS_OVER_TIME: `${API_V1}/desk/reports/hours-over-time`,
    MOVES: `${API_V1}/desk/reports/moves`,
    DECLINES: `${API_V1}/desk/reports/declines`,
    TAKINGS: `${API_V1}/desk/reports/takings`,
    MISSED: `${API_V1}/desk/reports/missed`,
    COURT_CHANGES: `${API_V1}/desk/reports/court-changes`,
    COURT_MIX: `${API_V1}/desk/reports/court-mix`,
  },
} as const;
