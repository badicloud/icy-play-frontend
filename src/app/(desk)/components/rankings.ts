import { differenceInCalendarDays, parseISO } from "date-fns";
import type { HoursOverTime, UtilizationReport } from "@auth/deskApi";

/*
 * The two ends of one list: the courts that sold, and the ones that did not.
 *
 * Both read the utilization report and nothing else. The split is a filter, not
 * a second count — a court is on exactly one of the two, so a venue reading
 * both never finds a court on neither or on both.
 */

export type RankLevel = "court" | "part";

/** One court, or one part of one, as either ranking lists it. */
export type Ranked = {
  key: string;
  name: string;
  /** The court a part is on, or the venue a court is in when there are several. */
  where: string | null;
  /**
   * Hours sold. For a court, the hours the floor had a booking — the same
   * figure the utilisation report calls used. For a part, that part's own.
   */
  soldMinutes: number;
  openMinutes: number | null;
  openDays: number | null;
  maintenanceMinutes: number | null;
  awaitingMinutes: number | null;
  rental: number | null;
  lastSoldOn: string | null;
  isRetired: boolean;
};

export function courtsOf(report: UtilizationReport): Ranked[] {
  const venues = new Set(report.courts.map((court) => court.facilityId));

  return report.courts.map((court) => ({
    key: court.courtId,
    name: court.name,
    where: venues.size > 1 ? court.facilityName : null,
    soldMinutes: court.inUseMinutes,
    openMinutes: court.openMinutes,
    openDays: court.openDays,
    maintenanceMinutes: court.maintenanceMinutes,
    awaitingMinutes: court.awaitingMinutes,
    rental: court.rental,
    lastSoldOn: court.lastSoldOn,
    isRetired: false,
  }));
}

export function partsOf(report: UtilizationReport): Ranked[] {
  const venues = new Set(report.courts.map((court) => court.facilityId));

  return report.courts.flatMap((court) =>
    court.units.map((unit) => ({
      key: unit.bookableCourtId,
      name: unit.label,
      where: venues.size > 1 ? `${court.facilityName} · ${court.name}` : court.name,
      soldMinutes: unit.soldMinutes,
      openMinutes: null,
      openDays: null,
      maintenanceMinutes: null,
      awaitingMinutes: null,
      rental: unit.rental,
      lastSoldOn: unit.lastSoldOn,
      isRetired: unit.isRetired,
    })),
  );
}

/** Busiest first; a tie goes to the name, so the order does not shuffle between loads. */
export function sold(rows: Ranked[]) {
  return rows
    .filter((row) => row.soldMinutes > 0)
    .sort((one, other) => other.soldMinutes - one.soldMinutes || one.name.localeCompare(other.name));
}

/**
 * The ones that sold nothing, longest-neglected first: never sold at all, then
 * the oldest last sale. The one to look at first is the one at the top.
 */
export function unsold(rows: Ranked[]) {
  return rows
    .filter((row) => row.soldMinutes === 0)
    .sort((one, other) => {
      if (one.lastSoldOn === other.lastSoldOn) return one.name.localeCompare(other.name);
      if (one.lastSoldOn === null) return -1;
      if (other.lastSoldOn === null) return 1;
      return one.lastSoldOn.localeCompare(other.lastSoldOn);
    });
}

/** Days from a court's last sale to the end of the range. Null when it never sold. */
export function daysSince(lastSoldOn: string | null, to: string) {
  return lastSoldOn === null ? null : differenceInCalendarDays(parseISO(to), parseISO(lastSoldOn));
}

/**
 * Each court's sold hours per period, with null where it could not have traded.
 *
 * From the hours-over-time read rather than worked out here, so the little line
 * beside a court is the same line that report draws for it.
 */
export function trends(data: HoursOverTime) {
  const byCourt = new Map<string, Map<string, number>>();

  data.rows.forEach((row) => {
    const mine = byCourt.get(row.courtId) ?? new Map<string, number>();
    mine.set(row.starts, row.soldMinutes / 60);
    byCourt.set(row.courtId, mine);
  });

  return new Map(
    [...byCourt.entries()].map(([courtId, mine]) => [
      courtId,
      data.periods.map((period) => mine.get(period.starts) ?? null),
    ]),
  );
}
