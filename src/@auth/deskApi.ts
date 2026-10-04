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
  /** Whether its money reports are this person's to read: always the owner's; an attendant's once the owner shares them. */
  canSeeMoney: boolean;
  /** yyyy-MM-dd at the venue, from the server's clock. What a date picker starts from. */
  today?: string | null;
};

/** One attendant as their owner sees them on the desk. */
export type DeskAttendant = {
  id: string;
  facilityId: string;
  facilityName: string;
  fullName: string;
  email: string;
  /** Whether they have set a password and taken the account over. */
  hasAccepted: boolean;
  /** Whether they may read the venue's money reports. */
  canSeeMoney: boolean;
};

/** Lets one attendant read the venue's money, or stops them. Owners only. */
export function setAttendantMoney(attendantId: string, canSeeMoney: boolean) {
  return apiClient.put<DeskAttendant, { canSeeMoney: boolean }>(
    API_ENDPOINTS.DESK.ATTENDANT_MONEY(attendantId),
    { canSeeMoney },
  );
}

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

/**
 * Why the desk turned a payment down, from the same short list the server
 * keeps. A list so the declined-bookings report can count the answers; Other
 * asks for a few words.
 */
export const REJECT_REASONS = [
  { value: "PaymentNotReceived", label: "Payment not received" },
  { value: "WrongAmount", label: "Wrong amount" },
  { value: "ReceiptUnclear", label: "Receipt unclear" },
  { value: "CourtNotAvailable", label: "Court not available" },
  { value: "Other", label: "Other" },
] as const;

export type RejectReasonValue = (typeof REJECT_REASONS)[number]["value"];

/** The server refuses a longer note. */
export const REJECT_NOTE_LIMIT = 200;

export type RejectAnswer = { reason: RejectReasonValue; note: string };

/** Null is a refusal from before the desk picked from a list. */
export function rejectReasonLabel(reason: string | null) {
  return reason === null
    ? "Not categorised"
    : (REJECT_REASONS.find((option) => option.value === reason)?.label ?? reason);
}

export function rejectDeskBooking(bookingId: string, why: RejectAnswer) {
  return apiClient.post<DeskBooking, { reason: string; note: string | null }>(
    API_ENDPOINTS.DESK.REJECT_BOOKING(bookingId),
    { reason: why.reason, note: why.note.trim() || null },
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
/**
 * Whether a move request is an upgrade: the customer has paid the difference
 * for dearer hours. Everything else is a plain move with nothing to pay, and is
 * never called an upgrade — there is no payment to check.
 */
export function isUpgrade(request: Pick<DeskUpgrade, "balanceDue">) {
  return request.balanceDue > 0;
}

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
 * The dials a venue sets for itself: how long it holds a court for somebody who
 * has not paid yet, and how much moving it puts up with.
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
  /** How many days before a booking starts moves close. */
  moveNoticeDays: number;
  smallestMoveNoticeDays: number;
  largestMoveNoticeDays: number;
  /** How many days ahead customers can book, today included. */
  bookingWindowDays: number;
  smallestBookingWindowDays: number;
  largestBookingWindowDays: number;
  /** Whether the venue has set its code for checking open play players in by hand. */
  hasOpenPlayCheckInCode: boolean;
  /** Only the owner generates it; an attendant is told it. */
  canSetOpenPlayCheckInCode: boolean;
};

/** A freshly generated code: the only time it is ever sent, since only its hash is kept. */
export type GeneratedCheckInCode = {
  code: string;
  settings: DeskSettings;
};

/** A new six-digit code for checking open play players in by hand, replacing any old one. The owner only. */
export function generateOpenPlayCheckInCode() {
  return apiClient.post<GeneratedCheckInCode>(API_ENDPOINTS.DESK.OPEN_PLAY_CHECK_IN_CODE);
}

export function getDeskSettings() {
  return apiClient.get<DeskSettings>(API_ENDPOINTS.DESK.SETTINGS);
}

export function updateDeskSettings(payload: {
  partialBookingExpiryMinutes: number;
  moveLimit: number;
  moveNoticeDays: number;
  bookingWindowDays: number;
}) {
  return apiClient.put<DeskSettings, typeof payload>(API_ENDPOINTS.DESK.SETTINGS, payload);
}

/** One dial, before and after, by the name the server stores it under. */
export type DeskSettingChange = {
  setting:
    | "bookingWindowDays"
    | "partialBookingExpiryMinutes"
    | "moveLimit"
    | "moveNoticeDays"
    | string;
  from: string | null;
  to: string | null;
};

/**
 * One time the dials were changed: who, when, and what each went from and to.
 * A change the platform made for the venue is marked, so nobody at the desk
 * wonders which of them did it.
 */
export type DeskSettingsChange = {
  id: string;
  changedAt: string;
  changedBy: string | null;
  byPlatform: boolean;
  changes: DeskSettingChange[];
  reason: string | null;
};

export function getDeskSettingsHistory() {
  return apiClient.get<DeskSettingsChange[]>(API_ENDPOINTS.DESK.SETTINGS_HISTORY);
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
export type HoursGrain = "Day" | "Week" | "Month" | "Quarter" | "Half" | "Year";

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

/**
 * One reason and how often it was given. Null is the moves made before
 * customers were asked, which the report shows as not asked.
 */
export type ReasonCount = { reason: string | null; count: number };

export type MovesPeriod = ReportPeriod & {
  /** The same price or cheaper, done the moment it was asked. */
  free: number;
  /** Paid for and approved at the desk. */
  upgrade: number;
  /** Every reason on the list, zero included, in the list's own order; then the unasked. */
  reasons: ReasonCount[];
};

export type MovedBooking = {
  bookingId: string;
  movedAt: string;
  /** The day it moved on the venue's clock — the day it is counted in. */
  movedOn: string;
  customerName: string;
  facilityName: string;
  fromCourtName: string | null;
  toCourtName: string | null;
  kind: "Free" | "Upgrade";
  reason: string | null;
  reasonNote: string | null;
};

/**
 * How many bookings customers moved and why. A move counts on the day it went
 * through: a free one when it was asked for, an upgrade when it was approved.
 */
export type MovesReport = {
  from: string;
  to: string;
  grain: HoursGrain;
  periods: MovesPeriod[];
  /** The range's reasons, most given first; a reason nobody gave is left out. */
  reasons: ReasonCount[];
  /** Every move in the range — the list below may stop short of it. */
  total: number;
  /** Newest first, up to 200. */
  moves: MovedBooking[];
};

/** A court's venue type, as the court was registered. */
export type VenueType = "Indoor" | "Covered" | "Outdoor";

export type CourtActivity = { name: string; kind: "Sport" | "Event"; isMain: boolean; divisions: number };

export type CourtMixRow = {
  courtId: string;
  facilityId: string;
  facilityName: string;
  name: string;
  venueType: VenueType;
  surface: string | null;
  hasLighting: boolean;
  isRetired: boolean;
  bookableCourts: number;
  activities: CourtActivity[];
  /** The utilization figures for this court in the range. Zero for a retired court. */
  openMinutes: number;
  inUseMinutes: number;
};

/**
 * What the venue has right now, by venue type and by what each court is set
 * up for, with each venue type's share of its open hours sold in the range.
 * Retired courts are never counted, and listed only when asked for.
 */
export type CourtMixReport = {
  from: string;
  to: string;
  summary: {
    courts: number;
    bookableCourts: number;
    underRoof: number;
    withLighting: number;
    takeEvents: number;
    eventKinds: number;
    retired: number;
  };
  venueTypes: {
    venueType: VenueType;
    courts: number;
    courtNames: string[];
    openMinutes: number;
    inUseMinutes: number;
  }[];
  activities: {
    sportId: string;
    name: string;
    kind: "Sport" | "Event";
    courts: number;
    bookableCourts: number;
    mainOn: number;
  }[];
  courts: CourtMixRow[];
};

export type CourtMixQuery = {
  from: string;
  to: string;
  facilityId?: string;
  includeRetired: boolean;
};

export function getCourtMix(query: CourtMixQuery) {
  return apiClient.get<CourtMixReport>(API_ENDPOINTS.DESK.COURT_MIX, {
    query: {
      from: query.from,
      to: query.to,
      facilityId: query.facilityId,
      includeRetired: query.includeRetired,
    },
  });
}

export type CourtChangeKind =
  | "Added"
  | "SportsAndDivisions"
  | "Prices"
  | "Hours"
  | "Maintenance"
  | "RenamedOrRetired"
  | "Photos"
  | "Details";

/** One line of a change. `before` is null for something added, `after` for something removed. */
export type ChangeDetail = { label: string; before: string | null; after: string | null };

/** One change to a court, worded by the server from the audit trail. */
export type CourtChange = {
  id: string;
  at: string;
  /** The day and time on the venue's clock. */
  on: string;
  time: string;
  kind: CourtChangeKind;
  /** Null when the change was to the whole venue. */
  courtId: string | null;
  title: string;
  details: ChangeDetail[];
  reason: string | null;
  actorName: string | null;
  /** "Owner", "Attendant" or "Platform admin". */
  actorRole: string;
};

export type CourtChangesReport = {
  from: string;
  to: string;
  summary: {
    courts: number;
    courtsAdded: number;
    courtsRetired: number;
    bookableCourts: number;
    bookableCourtsAdded: number;
    bookableCourtsRetired: number;
    priceChanges: number;
    courtsRepriced: number;
    closures: number;
    closedNow: number;
  };
  /** How many of each kind, for the chips. */
  kinds: { kind: CourtChangeKind; count: number }[];
  /** Newest first, up to 500. */
  changes: CourtChange[];
  total: number;
  /** Every court at the venues in scope, retired ones too, for the court picker. */
  courts: { id: string; facilityId: string; facilityName: string; name: string; isActive: boolean }[];
};

export type CourtChangesQuery = {
  from: string;
  to: string;
  facilityId?: string;
  courtId?: string;
};

export function getCourtChanges(query: CourtChangesQuery) {
  return apiClient.get<CourtChangesReport>(API_ENDPOINTS.DESK.COURT_CHANGES, {
    query: {
      from: query.from,
      to: query.to,
      facilityId: query.facilityId,
      courtId: query.courtId,
    },
  });
}

export type MissedPeriod = ReportPeriod & {
  /** Minutes the courts were open, up to now. */
  openMinutes: number;
  /** Of those, the minutes a court had no booking at all. */
  notSoldMinutes: number;
  peakNotSoldMinutes: number;
  missed: number;
  peakMissed: number;
};

export type CourtMissedPeriod = ReportPeriod & {
  courtId: string;
  facilityId: string;
  facilityName: string;
  courtName: string;
  openMinutes: number;
  notSoldMinutes: number;
  missed: number;
};

/** One sport court on its own. The parts share one floor, so they do not add up to the court. */
export type UnitMissed = {
  bookableCourtId: string;
  label: string;
  sportName: string;
  isMainSport: boolean;
  notSoldMinutes: number;
  peakNotSoldMinutes: number;
  missed: number;
};

/** One court: minutes the whole floor had no booking, priced at its main sport. */
export type CourtMissed = {
  courtId: string;
  facilityId: string;
  facilityName: string;
  name: string;
  mainSportName: string;
  openMinutes: number;
  notSoldMinutes: number;
  peakNotSoldMinutes: number;
  missed: number;
  peakMissed: number;
  units: UnitMissed[];
};

/**
 * What the venue's open, unsold hours would have earned at its own rates.
 * Only hours that have begun; maintenance and closed days are not counted.
 */
export type MissedReport = {
  from: string;
  to: string;
  grain: HoursGrain;
  periods: MissedPeriod[];
  rows: CourtMissedPeriod[];
  courts: CourtMissed[];
};

export function getMissedReport(query: HoursQuery) {
  return apiClient.get<MissedReport>(API_ENDPOINTS.DESK.MISSED, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityId: query.facilityId,
    },
  });
}

/** The money that came in over one period, for the whole venue or one court. */
export type TakingsFigures = {
  /** Bookings whose payment was confirmed in the period. */
  bookings: number;
  hours: number;
  /** Court rental confirmed: what was paid, less the platform fee. */
  rental: number;
  /** Upgrade balances approved in the period. */
  upgrades: number;
  upgradeCount: number;
  /** The platform's share of what was confirmed, billed to the venue later. */
  platformFee: number;
};

export type TakingsPeriod = ReportPeriod & TakingsFigures;

export type CourtTakings = ReportPeriod &
  TakingsFigures & {
    courtId: string;
    facilityId: string;
    facilityName: string;
    courtName: string;
  };

/**
 * What customers paid the venue: a booking's payment on the day the desk
 * confirmed it, an upgrade's balance on the day it was approved. Every period
 * is in `periods`; `rows` has a court only where money came in.
 */
export type TakingsReport = {
  from: string;
  to: string;
  grain: HoursGrain;
  periods: TakingsPeriod[];
  rows: CourtTakings[];
};

export function getTakingsReport(query: HoursQuery) {
  return apiClient.get<TakingsReport>(API_ENDPOINTS.DESK.TAKINGS, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityId: query.facilityId,
    },
  });
}

/** One refusal, as the declined-bookings report lists it. */
export type DeclinedBooking = {
  bookingId: string;
  declinedAt: string;
  /** The day it was refused on the venue's clock — the day it is counted in. */
  declinedOn: string;
  customerName: string;
  facilityName: string;
  courtName: string;
  kind: "Hourly" | "WholeDay" | "MultiDay";
  startDate: string;
  endDate: string;
  startsAt: string | null;
  endsAt: string | null;
  hours: number;
  /** Court rental and the platform's fee: what the customer sent. Null when the money is not this person's to see. */
  amount: number | null;
  /** A reject reason, or null on a refusal from before the list. */
  reason: string | null;
  /** The desk's note, or on an old refusal, everything it wrote. */
  note: string | null;
  declinedByName: string | null;
  declinedByOwner: boolean;
};

export type DeclinesPeriod = ReportPeriod & {
  declined: number;
  /** Refused plus confirmed in the period. */
  checked: number;
  reasons: ReasonCount[];
};

/**
 * How many payments the desk turned down, against how many it checked, and
 * why. Each counts on the day it was answered, on the venue's clock.
 */
export type DeclinesReport = {
  from: string;
  to: string;
  grain: HoursGrain;
  periods: DeclinesPeriod[];
  /** The range's reasons, most given first; a reason nobody gave is left out. */
  reasons: ReasonCount[];
  total: number;
  checked: number;
  /** Newest first, up to 200. */
  declines: DeclinedBooking[];
};

export function getDeclinesReport(query: HoursQuery) {
  return apiClient.get<DeclinesReport>(API_ENDPOINTS.DESK.DECLINES, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityId: query.facilityId,
    },
  });
}

export function getMovesReport(query: HoursQuery) {
  return apiClient.get<MovesReport>(API_ENDPOINTS.DESK.MOVES, {
    query: {
      from: query.from,
      to: query.to,
      grain: query.grain,
      facilityId: query.facilityId,
    },
  });
}

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
