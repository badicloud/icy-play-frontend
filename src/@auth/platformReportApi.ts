import { API_ENDPOINTS, apiClient } from "@/services/api";
import type { DeskVenue, VenueSnapshot } from "./deskApi";

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
