"use client";

import type {
  CourtChangesReport,
  CourtMixReport,
  DeclinesReport,
  HoursGrain,
  MissedReport,
  MovesReport,
  TakingsReport,
} from "@auth/deskApi";
import {
  useCourtChanges,
  useCourtMix,
  useCourtUtilization,
  useDeclinesReport,
  useHoursOverTime,
  useMissedReport,
  useMovesReport,
  useTakingsReport,
} from "@auth/hooks/useDesk";
import {
  usePlatformHoursOverTime,
  usePlatformReport,
  usePlatformUtilization,
} from "@auth/hooks/usePlatformReports";
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

/** Which owner and venue the admin asked for; nothing at the desk. */
function useAdminScope() {
  const scope = useReportScope();

  return scope.kind === "admin"
    ? {
        admin: true,
        facilityOwnerId: scope.ownerId || undefined,
        facilityId: scope.facilityId || undefined,
      }
    : { admin: false, facilityOwnerId: undefined, facilityId: undefined };
}

type Periods = Range & { grain: HoursGrain };

export function useMovesData(query: Periods, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useMovesReport({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<MovesReport>("moves", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}

export function useDeclinesData(query: Periods, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useDeclinesReport({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<DeclinesReport>("declines", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}

export function useTakingsData(query: Periods, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useTakingsReport({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<TakingsReport>("takings", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}

export function useMissedData(query: Periods, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useMissedReport({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<MissedReport>("missed", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}

export function useCourtChangesData(query: Range & { courtId?: string }, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useCourtChanges({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<CourtChangesReport>("court-changes", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}

export function useCourtMixData(query: Range & { includeRetired: boolean }, deskFacilityId: string) {
  const { admin, ...scope } = useAdminScope();
  const desk = useCourtMix({ ...query, facilityId: deskFacilityId || undefined }, !admin);
  const platform = usePlatformReport<CourtMixReport>("court-mix", { ...query, ...scope }, admin);
  return admin ? platform : desk;
}
