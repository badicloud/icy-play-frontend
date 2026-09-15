import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { Pagination } from "./adminApi";
import type { BookedSlot } from "./bookingApi";

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

export function getCourtSchedule(courtId: string, from: string, to: string) {
  return apiClient.get<ScheduleEntry[]>(API_ENDPOINTS.DESK.COURT_SCHEDULE(courtId), {
    query: { from, to },
  });
}

export function getCourtBookings(query: CourtBookingQuery) {
  return apiClient.get<DeskBookingListResponse>(
    API_ENDPOINTS.DESK.COURT_BOOKINGS(query.courtId),
    {
      query: {
        from: query.from,
        to: query.to,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      },
      unwrapData: false,
    },
  );
}

export function getDeskBooking(bookingId: string) {
  return apiClient.get<DeskBooking>(API_ENDPOINTS.DESK.BOOKING(bookingId));
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
