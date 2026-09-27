import { API_ENDPOINTS, apiClient } from "@/services/api";
import type { DeskVenue, HoursGrain, HoursOverTime, UtilizationReport, VenueSnapshot } from "./deskApi";

/*
 * The venue desk's reports, for the platform admin: every venue on the
 * platform, one facility owner's, or one venue. The same figures the desk
 * shows, worked out by the same code over a different list of venues.
 */

/** A facility owner and their venues, for the report filters. */
export type ReportOwner = {
  id: string;
  businessName: string;
  venues: DeskVenue[];
};

export type OwnerSnapshot = {
  facilityOwnerId: string;
  businessName: string;
  venues: number;
  snapshot: VenueSnapshot;
};

/** The platform this minute: the desk's five numbers, in total and owner by owner. */
export type PlatformSnapshot = {
  owners: number;
  venues: number;
  total: VenueSnapshot;
  perOwner: OwnerSnapshot[];
};

/** Which owner and venue a report is narrowed to. Absent means all of them. */
export type PlatformScope = {
  facilityOwnerId?: string;
  facilityId?: string;
};

/** A date range, as every over-time report takes one. */
export type PlatformRange = PlatformScope & { from: string; to: string };

/** Court utilisation across the scope — the desk's report, with the rental in it. */
export function getPlatformUtilization(query: PlatformRange) {
  return apiClient.get<UtilizationReport>(API_ENDPOINTS.ADMIN.REPORT_UTILIZATION, {
    query: {
      from: query.from,
      to: query.to,
      facilityOwnerId: query.facilityOwnerId,
      facilityId: query.facilityId,
    },
  });
}

/** The utilisation figures cut by date, court by court, across the scope. */
export function getPlatformHoursOverTime(query: PlatformRange & { grain: HoursGrain }) {
  return apiClient.get<HoursOverTime>(API_ENDPOINTS.ADMIN.REPORT_HOURS_OVER_TIME, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityOwnerId: query.facilityOwnerId,
      facilityId: query.facilityId,
    },
  });
}

/**
 * Any other desk report across the scope, by the path both consoles share:
 * "moves", "declines", "takings", "missed", "court-changes", "court-mix".
 */
export function getPlatformReport<T>(path: string, query: Record<string, string | boolean | undefined>) {
  return apiClient.get<T>(API_ENDPOINTS.ADMIN.REPORT(path), { query });
}

export function getReportOwners() {
  return apiClient.get<ReportOwner[]>(API_ENDPOINTS.ADMIN.REPORT_OWNERS);
}

export function getPlatformSnapshot(scope: PlatformScope) {
  return apiClient.get<PlatformSnapshot>(API_ENDPOINTS.ADMIN.REPORT_SNAPSHOT, {
    query: {
      facilityOwnerId: scope.facilityOwnerId,
      facilityId: scope.facilityId,
    },
  });
}
