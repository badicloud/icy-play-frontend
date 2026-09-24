import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { Pagination } from "./adminApi";
import type { BookedSlot, BookingHistoryEntry } from "./bookingApi";

/**
 * The venue's side of a booking.
 *
 * Not the customer's view of their own: this carries who booked it, because
 * checking a GCash receipt means checking the name on it against the person
 * who sent it.
 */
export type DeskBooking = {
  id: string;
  facilityId: string;
  facilityName: string;
  /** The floor it was sold on, for grouping a venue's own diary. */
  courtId: string;
  /** The part of that floor. What a second booking at the same hour is not. */
  bookableCourtId: string;
  divisionNumber: number;
  courtName: string;
  sportName: string;
  sportKey: string;
  kind: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startDate: string;
  endDate: string;
  bookedHours: number;
  rentalTotal: number;
  platformFeeTotal: number;
  total: number;
  /** The receipt the customer sent. The whole point of the page. */
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  submittedForVerificationAt: string | null;
  confirmedAt: string | null;
  /** Why it was turned down, when it was. */
  decisionReason: string | null;
  slots: BookedSlot[];
  createdAt: string;
};

export type DeskVenue = {
  id: string;
  name: string;
};

/** A court as the venue registered it, with the parts it is sold in. */
export type DeskCourt = {
  id: string;
  facilityId: string;
  facilityName: string;
  name: string;
  units: DeskCourtUnit[];
};

export type DeskCourtUnit = {
  bookableCourtId: string;
  sportName: string;
  sportKey: string;
  divisionNumber: number;
  /** "Basketball" for a whole floor, "Pickleball 2" for one of three. */
  label: string;
};

/** One booked hour, thin enough to draw a month of. */
export type ScheduleEntry = {
  bookingId: string;
  courtId: string;
  bookableCourtId: string;
  unitLabel: string;
  sportKey: string;
  status: string;
  customerName: string;
  date: string;
  startsAt: string;
  endsAt: string;
};

/**
 * What a booking's status is called on screen, and how it is coloured.
 *
 * The stored names say what the system did; these say what a person at the desk
 * would say about it. "PendingVerification" is nobody's sentence.
 */
export const bookingStates: Record<string, { label: string; tone: string }> = {
  PendingPayment: { label: "Held, unpaid", tone: "bg-slate-100 text-slate-600" },
  PendingVerification: { label: "Waiting on you", tone: "bg-amber-50 text-amber-700" },
  Confirmed: { label: "Confirmed", tone: "bg-green-50 text-green-700" },
  Rejected: { label: "Turned down", tone: "bg-red-50 text-red-700" },
  Cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
  Expired: { label: "Expired", tone: "bg-red-50 text-red-700" },
};

export function bookingState(status: string) {
  return bookingStates[status] ?? { label: status, tone: "bg-slate-100 text-slate-600" };
}

/** The statuses a list may be narrowed to, in the order a desk thinks of them. */
export const filterableStatuses = [
  "PendingVerification",
  "Confirmed",
  "PendingPayment",
  "Rejected",
  "Cancelled",
  "Expired",
] as const;

export type CourtBookingQuery = {
  courtId: string;
  from?: string;
  to?: string;
  status?: string;
  page: number;
  pageSize: number;
};

/**
 * Two piles, kept apart. What is waiting is work; what is confirmed is a
 * record. Mixing them buries the three that need doing under the fifty that
 * are done.
 */
export type DeskTab = "Waiting" | "Confirmed";

export type DeskQuery = {
  tab: DeskTab;
  facilityId?: string;
  page: number;
  pageSize: number;
};

type DeskBookingListResponse = {
  data: DeskBooking[];
  pagination: Pagination;
};

export function getDeskVenues() {
  return apiClient.get<DeskVenue[]>(API_ENDPOINTS.DESK.VENUES);
}

export function getDeskCourts() {
  return apiClient.get<DeskCourt[]>(API_ENDPOINTS.DESK.COURTS);
}

/*
 * A court's diary and a court's list, from either of the two doors onto them.
 *
 * The venue desk reads them for the courts it works; the platform admin reads
 * the same two for any court, because the inventory is theirs to police and
 * "who is on this court" is the question behind closing one for maintenance.
 *
 * One reader, two addresses. The shapes are identical because the server
 * answers both from the same query — only the gate differs — and a second copy
 * of these types in an admin module would be a second answer waiting to
 * disagree with this one.
 */
function scheduleFrom(url: string, from: string, to: string) {
  return apiClient.get<ScheduleEntry[]>(url, { query: { from, to } });
}

function bookingsFrom(url: string, query: CourtBookingQuery) {
  return apiClient.get<DeskBookingListResponse>(url, {
    query: {
      from: query.from,
      to: query.to,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

export function getCourtSchedule(courtId: string, from: string, to: string) {
  return scheduleFrom(API_ENDPOINTS.DESK.COURT_SCHEDULE(courtId), from, to);
}

export function getCourtBookings(query: CourtBookingQuery) {
  return bookingsFrom(API_ENDPOINTS.DESK.COURT_BOOKINGS(query.courtId), query);
}

/** The same diary, read as the platform rather than as the venue. */
export function getAdminCourtSchedule(courtId: string, from: string, to: string) {
  return scheduleFrom(API_ENDPOINTS.ADMIN.COURT_SCHEDULE(courtId), from, to);
}

/** The same list, read as the platform rather than as the venue. */
export function getAdminCourtBookings(query: CourtBookingQuery) {
  return bookingsFrom(API_ENDPOINTS.ADMIN.COURT_BOOKINGS(query.courtId), query);
}

/** One booking in full, read as the platform. */
export function getAdminBooking(bookingId: string) {
  return apiClient.get<DeskBooking>(API_ENDPOINTS.ADMIN.BOOKING(bookingId));
}

/** Its account of itself, read as the platform. */
export function getAdminBookingHistory(bookingId: string) {
  return apiClient.get<BookingHistoryEntry[]>(API_ENDPOINTS.ADMIN.BOOKING_HISTORY(bookingId));
}

export function getDeskBooking(bookingId: string) {
  return apiClient.get<DeskBooking>(API_ENDPOINTS.DESK.BOOKING(bookingId));
}

/**
 * Everything that has happened to one booking, newest first.
 *
 * The same account the customer reads, from the same endpoint's worth of
 * trail, because it is the same booking. A desk looking at a confirmation it
 * is about to make needs to know the hours were moved this morning.
 */
export function getDeskBookingHistory(bookingId: string) {
  return apiClient.get<BookingHistoryEntry[]>(
    API_ENDPOINTS.DESK.BOOKING_HISTORY(bookingId),
  );
}

export function getDeskBookings(query: DeskQuery) {
  return apiClient.get<DeskBookingListResponse>(API_ENDPOINTS.DESK.BOOKINGS, {
    query: {
      tab: query.tab,
      facilityId: query.facilityId,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

export function confirmDeskBooking(bookingId: string) {
  return apiClient.post<DeskBooking>(API_ENDPOINTS.DESK.CONFIRM_BOOKING(bookingId));
}

export function rejectDeskBooking(bookingId: string, reason: string | null) {
  return apiClient.post<DeskBooking, { reason: string | null }>(
    API_ENDPOINTS.DESK.REJECT_BOOKING(bookingId),
    { reason },
  );
}

/**
 * One upgrade as the venue's desk sees it.
 *
 * Both sides of the swap are carried — the hours the booking holds now and the
 * hours it is asking for — because the question here is not "is this receipt
 * real" alone. It is that, and whether the court being asked for is free.
 */
export type DeskUpgrade = {
  id: string;
  bookingId: string;
  facilityId: string;
  facilityName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  sportName: string;
  /** The sport's stable key, for artwork. */
  sportKey: string;
  /** The court the booking is on now. */
  fromCourtName: string;
  toBookableCourtId: string;
  /** The court asked for, named as it was when the upgrade was asked for. */
  toCourtName: string;
  rentalNow: number;
  rentalNew: number;
  /** The difference, fixed when the upgrade was asked for. */
  balanceDue: number;
  status:
    | "AwaitingPayment"
    | "AwaitingApproval"
    | "Approved"
    | "Declined"
    | "Withdrawn"
    | "Expired";
  /** The receipt the customer sent. The whole point of the page. */
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  requestedAt: string;
  settledAt: string | null;
  /** Why the desk said no, when it did. */
  declineReason: string | null;
  /** The hours the booking holds today. */
  hoursNow: BookedSlot[];
  /** The hours it is asking for. */
  hoursWanted: BookedSlot[];
};

export type DeskUpgradeTab = "Waiting" | "Settled";

export type DeskUpgradeQuery = {
  tab: DeskUpgradeTab;
  facilityId?: string;
  page: number;
  pageSize: number;
};

type DeskUpgradeListResponse = {
  data: DeskUpgrade[];
  pagination: Pagination;
};

export function getDeskUpgrades(query: DeskUpgradeQuery) {
  return apiClient.get<DeskUpgradeListResponse>(API_ENDPOINTS.DESK.UPGRADES, {
    query: {
      tab: query.tab,
      facilityId: query.facilityId,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

export function approveDeskUpgrade(upgradeId: string) {
  return apiClient.post<DeskUpgrade>(API_ENDPOINTS.DESK.APPROVE_UPGRADE(upgradeId));
}

export function declineDeskUpgrade(upgradeId: string, reason: string | null) {
  return apiClient.post<DeskUpgrade, { reason: string | null }>(
    API_ENDPOINTS.DESK.DECLINE_UPGRADE(upgradeId),
    { reason },
  );
}

/** How long a booking has been sitting there, said the way a person would. */
export function waitingFor(submittedAt: string | null, now: Date) {
  if (submittedAt === null) {
    return null;
  }

  const minutes = Math.floor((now.getTime() - new Date(submittedAt).getTime()) / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * The two dials a venue sets for itself, both about how long it is prepared to
 * hold a court for somebody who has not paid yet.
 *
 * The range travels with the values so the panel can say what is possible
 * rather than refusing after the fact.
 */
export type DeskSettings = {
  partialBookingExpiryMinutes: number;
  moveLimit: number;
  smallestExpiry: number;
  largestExpiry: number;
  smallestMoveLimit: number;
  largestMoveLimit: number;
};

export function getDeskSettings() {
  return apiClient.get<DeskSettings>(API_ENDPOINTS.DESK.SETTINGS);
}

export function updateDeskSettings(payload: {
  partialBookingExpiryMinutes: number;
  moveLimit: number;
}) {
  return apiClient.put<DeskSettings, typeof payload>(API_ENDPOINTS.DESK.SETTINGS, payload);
}

/*
 * How much of what the venue had open actually got used.
 *
 * Two numbers per court on purpose. `inUseMinutes` counts an hour ONCE however
 * many parts of the floor were sold for it, which is the utilization figure;
 * `soldMinutes` adds the parts up, which is what the rows inside the court
 * break down. On a floor marked out three ways the second is the larger, and
 * the page has to say so or it reads as a bug.
 *
 * `rental` is null for an attendant. Left out of the response rather than
 * hidden by the page — a figure the screen does not draw is still a figure in
 * the payload.
 */
export type UnitUtilization = {
  bookableCourtId: string;
  label: string;
  sportName: string;
  sportKey: string;
  soldMinutes: number;
  peakMinutes: number;
  /** The venue has stopped marking the floor out this way. Listed because it sold hours. */
  isRetired: boolean;
  /** The last date this part was sold, up to the end of the range. Null when never. */
  lastSoldOn: string | null;
  rental: number | null;
};

export type CourtUtilization = {
  courtId: string;
  facilityId: string;
  facilityName: string;
  name: string;
  openMinutes: number;
  inUseMinutes: number;
  soldMinutes: number;
  /** What the timetable said, on the days the court was under maintenance. */
  maintenanceMinutes: number;
  awaitingMinutes: number;
  openDays: number;
  maintenanceDays: number;
  /**
   * The last date anything on this court was sold, reaching back before the
   * range if it has to. Null when nothing ever has.
   */
  lastSoldOn: string | null;
  rental: number | null;
  units: UnitUtilization[];
};

export type UtilizationReport = {
  from: string;
  to: string;
  openMinutes: number;
  inUseMinutes: number;
  maintenanceMinutes: number;
  awaitingMinutes: number;
  /** Court-days: one court open on one date is one. */
  openDays: number;
  rental: number | null;
  courts: CourtUtilization[];
};

export type UtilizationQuery = {
  from: string;
  to: string;
  facilityId?: string;
};

export function getCourtUtilization(query: UtilizationQuery) {
  return apiClient.get<UtilizationReport>(API_ENDPOINTS.DESK.COURT_UTILIZATION, {
    query: {
      from: query.from,
      to: query.to,
      facilityId: query.facilityId,
    },
  });
}

/** Minutes as a venue says them: "6h", "6h 30m", "45m". */
export function duration(minutes: number) {
  if (minutes <= 0) {
    return "0h";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * The share of what was open, to a whole number.
 *
 * Zero open hours is not zero per cent — it is a question with no answer, and
 * a court shut all month should say so rather than read as the worst on the
 * list.
 */
export function utilization(inUseMinutes: number, openMinutes: number) {
  return openMinutes <= 0 ? null : Math.round((inUseMinutes / openMinutes) * 100);
}

/**
 * Whole-number percentages that add up to a hundred.
 *
 * Rounding each share on its own does not: five, two and sixteen hours of a
 * twenty-three hour floor round to 22, 9 and 70, and a reader who adds the
 * column up gets 101 and starts wondering what is wrong with the report.
 *
 * The largest-remainder method instead — floor everything, then hand the
 * leftover points to whichever shares were cut by most. The result still reads
 * as each row's share, and the column totals what it says it totals.
 */
export function shares(parts: number[]) {
  const total = parts.reduce((sum, part) => sum + part, 0);

  if (total <= 0) {
    return parts.map(() => 0);
  }

  const exact = parts.map((part) => (part / total) * 100);
  const given = exact.map(Math.floor);
  let left = 100 - given.reduce((sum, share) => sum + share, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((one, other) => other.remainder - one.remainder);

  for (const { index } of byRemainder) {
    if (left <= 0) {
      break;
    }

    given[index] += 1;
    left -= 1;
  }

  return given;
}

/**
 * What the venue looks like at this moment.
 *
 * The three states add up to `bookableCourts`, and they are sorted in one order
 * so that they can: under maintenance first, then booked, then whatever is
 * left is free.
 *
 * **Free is not the same as sellable.** A part with no booking of its own can
 * still be unsellable, because a clashing game has the floor — basketball
 * across the whole hall takes all three pickleball courts with it.
 */
export type VenueSnapshot = {
  courts: number;
  bookableCourts: number;
  availableNow: number;
  bookedNow: number;
  underMaintenanceNow: number;
};

export function getVenueSnapshot(facilityId?: string) {
  return apiClient.get<VenueSnapshot>(API_ENDPOINTS.DESK.SNAPSHOT, {
    query: { facilityId },
  });
}

/*
 * The utilization figures cut by date rather than totalled per court.
 *
 * One row per court per period — which is enough for all three ways the page
 * shows it: summed per period it is the venue's line, grouped by court it is a
 * line each, and printed as it stands it is the table.
 *
 * `periods` is every bucket in the range, traded in or not. The rows leave out a
 * period nobody could have traded in, so only `periods` can say it was there —
 * and that is where a chart draws its gap.
 */
export type HoursGrain = "Day" | "Week" | "Month";

export type ReportPeriod = { starts: string; ends: string };

export type CourtPeriod = {
  starts: string;
  ends: string;
  courtId: string;
  facilityId: string;
  facilityName: string;
  courtName: string;
  openMinutes: number;
  soldMinutes: number;
  maintenanceMinutes: number;
  /** The parts this court is sold in, plus any retired one that still sold. */
  parts: number;
  /** Of those, how many had a booking at some point in the period. */
  partsSold: number;
};

export type HoursOverTime = {
  from: string;
  to: string;
  grain: HoursGrain;
  periods: ReportPeriod[];
  rows: CourtPeriod[];
};

export type HoursQuery = {
  from: string;
  to: string;
  grain: HoursGrain;
  facilityId?: string;
};

export function getHoursOverTime(query: HoursQuery) {
  return apiClient.get<HoursOverTime>(API_ENDPOINTS.DESK.HOURS_OVER_TIME, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityId: query.facilityId,
    },
  });
}
