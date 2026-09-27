"use client";

import type { HoursGrain } from "@auth/deskApi";
import { useCourtUtilization, useHoursOverTime } from "@auth/hooks/useDesk";
import { usePlatformHoursOverTime, usePlatformUtilization } from "@auth/hooks/usePlatformReports";
import { useReportScope } from "./reportScope";

/*
 * The data behind the reports, from whichever console is reading them.
 *
 * Each asks both the desk's and the admin's query and switches one off, so a
 * report page says what it needs once and never which console it is in. At
 * the desk the venue comes from the page's own picker; in the admin console
 * it comes from the owner and venue in the address.
 */

type Range = { from: string; to: string };

/** Court utilisation: the desk's own, or the platform's for the admin. */
export function useUtilizationReport(range: Range, deskFacilityId: string) {
  const scope = useReportScope();
  const admin = scope.kind === "admin";

  const desk = useCourtUtilization({ ...range, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformUtilization(
    {
      ...range,
      facilityOwnerId: admin ? scope.ownerId || undefined : undefined,
      facilityId: admin ? scope.facilityId || undefined : undefined,
    },
    admin,
  );

  return admin ? platform : desk;
}

/** The utilisation figures cut by date, court by court. */
export function useHoursReport(range: Range, grain: HoursGrain, deskFacilityId: string) {
  const scope = useReportScope();
  const admin = scope.kind === "admin";

  const desk = useHoursOverTime({ ...range, grain, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformHoursOverTime(
    {
      ...range,
      grain,
      facilityOwnerId: admin ? scope.ownerId || undefined : undefined,
      facilityId: admin ? scope.facilityId || undefined : undefined,
    },
    admin,
  );

  return admin ? platform : desk;
}
