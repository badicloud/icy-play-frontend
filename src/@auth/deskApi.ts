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
