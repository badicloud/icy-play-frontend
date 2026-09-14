import { apiClient, API_ENDPOINTS } from "@/services/api";

/**
 * One bookable hour. It carries its own price because the hours of a day do not
 * cost the same: peak, weekend and holiday rates all land here, already worked
 * out by the server so the page and the bill cannot disagree.
 */
export type AvailabilitySlot = {
  /** "07:00:00" — a wall-clock time within the date. */
  startsAt: string;
  endsAt: string;
  /** False when somebody already holds this hour, or the court is shut. */
  isOpen: boolean;
  /** True once the hour has begun on the venue's clock. Nobody booked it; it went. */
  hasPassed: boolean;
  /** "Standard" | "Peak" | "Weekend" | "Holiday" — why it costs what it costs. */
  rateKind: string;
  /** Null when the venue has not priced this sport, which makes the hour unsellable. */
  rate: number | null;
  platformFee: number;
};

export type AvailabilityDay = {
  bookableCourtId: string;
  courtName: string;
  facilityName: string;
  sportName: string;
  /** "2026-09-19". */
  date: string;
  /** True when the venue is shut that day. No slots follow. */
  isClosed: boolean;
  isHoliday: boolean;
  isUnderMaintenance: boolean;
  slotLengthMinutes: number;
  minimumDurationMinutes: number;
  platformHourlyRate: number;
  /**
   * The court's whole rate card, not only the rates that apply on this date.
   * Null on a special rate means "same as standard".
   */
  standardHourlyRate: number | null;
  peakHourlyRate: number | null;
  weekendRate: number | null;
  holidayRate: number | null;
  /** When peak runs. Null until a peak rate is set. */
  peakStartsAt: string | null;
  peakEndsAt: string | null;
  peakOnWeekdays: boolean;
  peakOnWeekends: boolean;
  slots: AvailabilitySlot[];
};

/** Which days the peak window covers, said the way a customer would say it. */
export function peakDays(day: AvailabilityDay) {
  if (day.peakOnWeekdays && day.peakOnWeekends) {
    return "every day";
  }

  if (day.peakOnWeekdays) {
    return "weekdays";
  }

  return day.peakOnWeekends ? "weekends" : "";
}

/** Hours picked one at a time, a whole day, or a run of whole days. */
export type BookingKind = "Hourly" | "WholeDay" | "MultiDay";

export type BookingSlotInput = { date: string; startsAt: string };

export type CreateBookingPayload = {
  bookableCourtId: string;
  kind: BookingKind;
  slots: BookingSlotInput[];
};

export type BookedSlot = {
  date: string;
  startsAt: string;
  endsAt: string;
  rateKind: string;
  amount: number;
  platformFee: number;
};

/**
 * The choice, carried in the address bar.
 *
 * In the URL rather than in memory so a refresh, a back button, a shared link
 * or a trip through the sign-in page all arrive with the same hours intact —
 * and so a customer looking at the bar can see what they are about to buy.
 *
 * Whole days need only their dates: the hours are every hour the court is open,
 * which the checkout reads back from availability rather than trusting a list
 * the browser assembled.
 */
export function checkoutHref(
  bookableCourtId: string,
  kind: BookingKind,
  dates: string[],
  hours: string[],
) {
  return `/book/${bookableCourtId}/checkout?${choiceQuery(kind, dates, hours)}`;
}

/** The same choice, back on the grid it was made on. */
export function bookingHref(
  bookableCourtId: string,
  kind: BookingKind,
  dates: string[],
  hours: string[],
) {
  return `/book/${bookableCourtId}?${choiceQuery(kind, dates, hours)}`;
}

/** The choice as a query string. One writer, so every reader sees one spelling. */
export function choiceQuery(kind: BookingKind, dates: string[], hours: string[]) {
  const query = new URLSearchParams({ kind });

  if (kind === "MultiDay") {
    query.set("from", dates[0]);
    query.set("to", dates[dates.length - 1]);
  } else {
    query.set("date", dates[0]);
  }

  if (kind === "Hourly") {
    // "07:00:00" is three times longer than it needs to be in an address bar.
    query.set(
      "hours",
      [...hours].sort().map((start) => start.slice(0, 5)).join(","),
    );
  }

  return query.toString();
}

/** Reads back what checkoutHref wrote. */
export function readCheckout(params: URLSearchParams) {
  const kind = params.get("kind");

  if (kind !== "Hourly" && kind !== "WholeDay" && kind !== "MultiDay") {
    return null;
  }

  const from = kind === "MultiDay" ? params.get("from") : params.get("date");
  const to = kind === "MultiDay" ? params.get("to") : params.get("date");

  if (from === null || to === null || from > to) {
    return null;
  }

  const hours = (params.get("hours") ?? "")
    .split(",")
    .filter((value) => value !== "")
    .map((value) => `${value}:00`);

  if (kind === "Hourly" && hours.length === 0) {
    return null;
  }

  return { kind: kind as BookingKind, from, to, hours };
}

/** Every date from one to the other, inclusive. */
export function datesBetween(from: string, to: string) {
  const out: string[] = [];

  for (let day = fromIsoDate(from); isoDate(day) <= to; day.setDate(day.getDate() + 1)) {
    out.push(isoDate(day));
  }

  return out;
}

export type BookingStatus =
  | "PendingPayment"
  | "PendingVerification"
  | "Confirmed"
  | "Rejected"
  | "Cancelled"
  | "Expired";

export type BookingDetail = {
  id: string;
  bookableCourtId: string;
  status: BookingStatus;
  kind: BookingKind;
  courtName: string;
  facilityName: string;
  sportName: string;
  /** The sport's stable key, for artwork. */
  sportKey: string;
  /** First and last date booked. Same value when it is one day. */
  startDate: string;
  endDate: string;
  bookedHours: number;
  rentalTotal: number;
  platformFeeTotal: number;
  total: number;
  /** When an unpaid hold lets go of the court. */
  holdsUntil: string;
  /** True once the hold ran out with no receipt sent. */
  hasLapsed: boolean;
  receiptUrl: string | null;
  /** How to pay the venue. Null on both when it has set neither up. */
  gcashNumber: string | null;
  gcashAccountName: string | null;
  gcashQrCodeUrl: string | null;
  slots: BookedSlot[];
  createdAt: string;
};

/**
 * Which step of the checkout a booking is at.
 *
 * Read from the booking rather than held in the URL, so a refresh, a new tab or
 * a customer coming back tomorrow all land where they actually are.
 */
export function checkoutStep(booking: BookingDetail): 2 | 3 | 4 {
  if (booking.status !== "PendingPayment") {
    return 4;
  }

  return booking.receiptUrl === null ? 2 : 3;
}

export function getMyBookings() {
  return apiClient.get<BookingDetail[]>(API_ENDPOINTS.BOOKINGS.ROOT);
}

/**
 * What a booking is, in one phrase and one colour.
 *
 * Here rather than in a page, because the list and the checkout both describe
 * the same booking and two descriptions of one thing is how a customer comes to
 * think they have two.
 *
 * `needsYou` is the part the list sorts on: a booking waiting on the customer is
 * the only kind they can do anything about, and it belongs at the top.
 */
export function bookingState(booking: BookingDetail) {
  if (booking.status === "PendingPayment") {
    if (booking.hasLapsed) {
      // Red, not grey. An expiry is something that went wrong for the customer
      // -- they chose hours and lost them -- where a cancellation is something
      // they decided. Colouring the two the same buries the one worth noticing.
      return { label: "Expired", tone: "bad" as const, needsYou: false };
    }

    return booking.receiptUrl === null
      ? { label: "Pay now", tone: "warn" as const, needsYou: true }
      : { label: "Send your receipt", tone: "warn" as const, needsYou: true };
  }

  switch (booking.status) {
    case "PendingVerification":
      return {
        label: "Pending booking confirmation",
        tone: "warn" as const,
        needsYou: false,
      };
    case "Confirmed":
      return { label: "Confirmed", tone: "good" as const, needsYou: false };
    case "Rejected":
      return { label: "Not accepted", tone: "bad" as const, needsYou: false };
    case "Expired":
      return { label: "Expired", tone: "bad" as const, needsYou: false };
    default:
      return { label: booking.status, tone: "quiet" as const, needsYou: false };
  }
}

export function attachReceipt(bookingId: string, receiptUrl: string) {
  return apiClient.post<BookingDetail, { receiptUrl: string }>(
    API_ENDPOINTS.BOOKINGS.RECEIPT(bookingId),
    { receiptUrl },
  );
}

export function submitPayment(bookingId: string) {
  return apiClient.post<BookingDetail>(API_ENDPOINTS.BOOKINGS.SUBMIT_PAYMENT(bookingId));
}

export function createReceiptUploadSignature() {
  return apiClient.post<
    {
      cloudName: string;
      apiKey: string;
      folder: string;
      timestamp: number;
      signature: string;
    },
    { purpose: string }
  >(API_ENDPOINTS.CUSTOMER_UPLOAD_SIGNATURE, { purpose: "booking-receipt" });
}

export function getAvailability(bookableCourtId: string, date: string) {
  return apiClient.get<AvailabilityDay>(
    `${API_ENDPOINTS.CATALOG.AVAILABILITY(bookableCourtId)}?date=${date}`,
  );
}

export function createBooking(payload: CreateBookingPayload) {
  return apiClient.post<BookingDetail>(API_ENDPOINTS.BOOKINGS.ROOT, payload);
}

export function getBooking(bookingId: string) {
  return apiClient.get<BookingDetail>(API_ENDPOINTS.BOOKINGS.ONE(bookingId));
}

/** "2026-09-19", which is what the API wants and what a date input gives back. */
export function isoDate(value: Date) {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${value.getFullYear()}-${month}-${day}`;
}

/** Parsed as a local date. `new Date("2026-09-19")` is midnight UTC, which is the day before in Manila. */
export function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/** "7:00 AM" from "07:00:00". */
export function clock(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;

  return minute === 0
    ? `${twelve}:00 ${suffix}`
    : `${twelve}:${`${minute}`.padStart(2, "0")} ${suffix}`;
}

export function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** The next `count` days from today, which is as far ahead as the strip shows. */
export function upcomingDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(today);
    day.setDate(today.getDate() + offset);

    return day;
  });
}
