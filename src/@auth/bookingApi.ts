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
 * Whether a day can be sold open to close.
 *
 * The one definition on this side, matching AvailabilityDay.CanBeHiredWhole on
 * the server. A day sold by the day is every hour of it: one hour gone and
 * there is no whole day left, however many are still free.
 *
 * A run of days uses this twice over — to decide which days it can take, and to
 * decide which it must pass over — so the two can never drift apart.
 */
export function canBeHiredWhole(day: AvailabilityDay) {
  return (
    !day.isClosed &&
    !day.isUnderMaintenance &&
    day.slots.length > 0 &&
    day.slots.every((slot) => slot.isOpen)
  );
}

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
  /** Which venue, so a move can offer the other courts in the same building. */
  facilityId: string;
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
  /**
   * How to reach the venue, when reaching them is the only way forward.
   *
   * A venue that has set up no way of being paid cannot take a receipt, and
   * telling somebody to get in touch without saying how leaves them to go and
   * find the venue themselves.
   */
  contactPhone: string | null;
  contactEmail: string | null;
  /**
   * Why it ended, when it did: the venue's words on a refusal, or the
   * customer's own on a cancellation.
   *
   * "Not accepted" on its own tells somebody their money is coming back and
   * not why, which is the one question they will ring up to ask.
   */
  cancellationReason: string | null;
  /**
   * The upgrade still open on this booking, and the court it is asking for.
   *
   * A booking can be settled and about to change at the same time, and the
   * status alone cannot say both: "Confirmed" is true and hides the fact that
   * a move is waiting. Null when nothing is open.
   */
  upgradeStatus:
    | "AwaitingPayment"
    | "AwaitingApproval"
    | "Approved"
    | "Declined"
    | "Withdrawn"
    | "Expired"
    | null;
  upgradeToCourtName: string | null;
  slots: BookedSlot[];
  /** How many moves this booking has left. Zero and it stays where it is. */
  movesLeft: number;
  /** How many it was allowed in all — the venue's own dial. */
  moveLimit: number;
  /** Whether it can be moved right now: moves left, and an hour still to play. */
  canBeMoved: boolean;
  /**
   * Whether the booking has started, on the venue's clock.
   *
   * A booking in play can still change court — a floodlight fails and the game
   * carries on next door — but it cannot change when it is. Answered by the
   * server rather than worked out here, because the reader's clock is not the
   * venue's and this decides what the move screen is allowed to offer.
   */
  isInPlay: boolean;
  /**
   * Whether one of the booked hours is running right now, on the venue's clock.
   *
   * Not `isInPlay`, which only asks whether the first hour has begun and stays
   * true for ever after — a booking played last March is still "in play" by
   * that reading. This one ends when the hours do.
   *
   * Answered by the server, and deliberately not worked out here from
   * `slots` and `Date.now()`: the reader's clock is not the venue's, and a
   * laptop an hour fast would tell somebody their court is theirs when it is
   * somebody else's. A page that wants this fresher asks again.
   */
  isInProgress: boolean;
  createdAt: string;
};

/**
 * Which step of the checkout a booking is at.
 *
 * Read from the booking rather than held in the URL, so a refresh, a new tab or
 * a customer coming back tomorrow all land where they actually are.
 */
export function checkoutStep(booking: BookingDetail): 2 | 4 {
  // Two steps left, not three. Sending the receipt IS the submission — they
  // were separate, and the gap between them was a page telling somebody the
  // venue was checking their payment while asking them to send it.
  return booking.status === "PendingPayment" && booking.receiptUrl === null ? 2 : 4;
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
/**
 * What is happening to this booking on top of its own status.
 *
 * Kept apart from bookingState because they are two different sentences. A
 * booking can be confirmed AND have a move waiting on the venue, and a single
 * badge that has to pick one of those will always be hiding the other.
 */
export function upgradeState(booking: BookingDetail) {
  switch (booking.upgradeStatus) {
    case "AwaitingPayment":
      return {
        label: movingCourt(booking)
          ? `Finish your move to ${booking.upgradeToCourtName}`
          : "Finish your change of hours",
        // The one that is the customer's to act on, so it is counted in the
        // "waiting on you" tally at the top of the page.
        needsYou: true,
      };
    case "AwaitingApproval":
      return {
        label: movingCourt(booking)
          ? `Move to ${booking.upgradeToCourtName} waiting for the venue`
          : "New hours waiting for the venue",
        needsYou: false,
      };
    default:
      return null;
  }
}

/**
 * Whether the upgrade changes which court, or only when.
 *
 * Both are moves and both cost the difference, but they do not read the same:
 * "Move to Court 1" said to somebody already on Court 1 looks like a bug, and
 * the thing that is actually changing — the hours — goes unmentioned.
 */
function movingCourt(booking: BookingDetail) {
  return (
    booking.upgradeToCourtName !== null && booking.upgradeToCourtName !== booking.courtName
  );
}

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

/**
 * Carries a booking to another date.
 *
 * One date, because nothing else may change: the hours, the court and the
 * number of days stay as they were, which is what keeps the price identical.
 */
/**
 * What moving onto that court would cost. Asked before anybody commits, because
 * a move that wants paying for is a different proposition from one that does
 * not.
 */
export type MoveQuote = {
  toBookableCourtId: string;
  toCourtName: string;
  /** Hours already played. They stay where they were, at what they cost. */
  hoursStaying: number;
  hoursMoving: number;
  /**
   * What this booking's hours come to now, in court rental alone.
   *
   * The platform fee is left out of both sides. It is charged per hour booked
   * and a move buys no hours — the same number of them end up somewhere else —
   * so counting it would make an identical move look like it cost something.
   */
  rentalNow: number;
  /** What they would come to on the new court, at the new hours. */
  rentalNew: number;
  /**
   * The same comparison, narrowed to the `hoursMoving` hours actually going
   * somewhere.
   *
   * The pair above covers the whole booking, hours already played included.
   * Those sit on both sides and cancel, so `balanceDue` is the same figure
   * either way — but they cannot be shown to anybody. Telling a customer
   * moving their last hour that they are "paying ₱1,000 now" names a session
   * mostly behind them. These name only the part still in question, and are
   * what the move screen puts on the page.
   */
  movingRentalNow: number;
  movingRentalNew: number;
  /**
   * Those same hours, named, on the court they would move to.
   *
   * Sent because the checkout has to show what is being paid for, and on a
   * booking under way it cannot work that out here: which hours are still to
   * play is a question about the venue's clock, and asking the browser's would
   * list an hour the customer is standing through.
   */
  movingSlots: BookedSlot[];
  /** Never less than nothing: cheaper is not a refund. */
  balanceDue: number;
  /** Minutes the new court is held while the difference is paid. */
  holdMinutes: number;
  isUpgrade: boolean;
  /**
   * Whether the booking has begun, on the venue's clock.
   *
   * What the move screen reads to decide whether to offer dates: a booking
   * under way can change court but not when it is, and one that has not
   * started can change both. Answered on every quote rather than once with
   * the booking, because it turns over while the screen is open.
   */
  isInPlay: boolean;
};

/**
 * One thing that happened to a booking.
 *
 * Read from the platform's own trail, which the venue's desk writes to as
 * well, so one booking has one account of itself. Who did it and from where
 * stays on the server: that is for answering questions with, not for the
 * person whose booking it is.
 */
export type BookingHistoryEntry = {
  /** The stable name of what happened, for picking wording and artwork. */
  action: string;
  /** Said plainly, because this is read by the person it happened to. */
  description: string;
  /** Why, when whoever did it gave a reason. */
  reason: string | null;
  at: string;
};

export function getBookingHistory(bookingId: string) {
  return apiClient.get<BookingHistoryEntry[]>(API_ENDPOINTS.BOOKINGS.HISTORY(bookingId));
}

/** An hour to move onto: the date it falls on and when it begins. */
export type MoveSlot = {
  /** "2026-09-19". */
  date: string;
  /** "07:00:00". */
  startsAt: string;
};

type MoveBody = {
  toBookableCourtId: string;
  slots: MoveSlot[] | null;
  reason?: string;
  reasonNote?: string | null;
};

/**
 * Why a customer is moving, from the same short list the server keeps.
 *
 * A list rather than a box, because the venue's report counts the answers.
 * Other asks for a few words, so it is not a way of saying nothing.
 */
export const MOVE_REASONS = [
  { value: "ScheduleChanged", label: "Schedule changed" },
  { value: "Weather", label: "Weather" },
  { value: "CourtProblem", label: "Problem with the court" },
  { value: "DifferentCourt", label: "Wanted a different court" },
  { value: "Other", label: "Other" },
] as const;

export type MoveReasonValue = (typeof MOVE_REASONS)[number]["value"];

/** Long enough to say what other was; the server refuses more. */
export const MOVE_REASON_NOTE_LIMIT = 200;

export type MoveReasonAnswer = { reason: MoveReasonValue; note: string };

export function moveReasonLabel(reason: string | null) {
  return reason === null
    ? "Not asked"
    : (MOVE_REASONS.find((option) => option.value === reason)?.label ?? reason);
}

/**
 * What moving onto that court, at those hours, would come to.
 *
 * A POST for something that changes nothing: the hours being asked about are a
 * list, and a quote for a whole proposed booking belongs in a body rather than
 * strung through a query.
 *
 * @param slots Null keeps the hours the booking already has.
 */
export function quoteMove(
  bookingId: string,
  toBookableCourtId: string,
  slots: MoveSlot[] | null = null,
) {
  return apiClient.post<MoveQuote, MoveBody>(API_ENDPOINTS.BOOKINGS.MOVE_QUOTE(bookingId), {
    toBookableCourtId,
    slots,
  });
}

/** @param slots Null keeps the hours the booking already has. */
export function moveBooking(
  bookingId: string,
  toBookableCourtId: string,
  slots: MoveSlot[] | null,
  why: MoveReasonAnswer,
) {
  return apiClient.post<BookingDetail, MoveBody>(API_ENDPOINTS.BOOKINGS.MOVE(bookingId), {
    toBookableCourtId,
    slots,
    reason: why.reason,
    reasonNote: why.note.trim() || null,
  });
}

/** One hour an upgrade is asking for, at the price it was quoted. */

/**
 * One hour the venue is open for, said without reference to any court.
 *
 * The move screen asks for a date, then hours, then the courts that can take
 * them — so there is a step where hours have to be offered and no court has
 * been chosen. These come from the building rather than from any floor in it,
 * and they carry no price: what an hour costs depends on the court, and that
 * arrives with the courts.
 */
export type MoveWindowSlot = {
  /** "07:00:00". */
  startsAt: string;
  endsAt: string;
  /** The hour has begun on the venue's clock, so it cannot be moved onto. */
  hasPassed: boolean;
};

export type MoveWindow = {
  date: string;
  /** The venue is shut that day. No slots follow. */
  isClosed: boolean;
  isHoliday: boolean;
  slotLengthMinutes: number;
  /**
   * How many hours have to be picked: the ones still ahead of the booking, not
   * the ones it has. An hour that has begun is being played on the court it
   * was sold on and does not travel.
   */
  slotsNeeded: number;
  slots: MoveWindowSlot[];
};

/** The hours the venue is open for on that date, before any court is chosen. */
export function getMoveWindow(bookingId: string, date: string) {
  return apiClient.get<MoveWindow>(
    `${API_ENDPOINTS.BOOKINGS.MOVE_WINDOW(bookingId)}?date=${date}`,
  );
}

/**
 * One court the booking could move to, priced for the hours asked about.
 *
 * The price rides on the card rather than being fetched when a card is tapped.
 * Somebody choosing between four courts is choosing on price as much as on
 * name, and four round trips to find that out is four chances to be shown a
 * figure that has since moved.
 */
export type MoveOption = {
  bookableCourtId: string;
  courtName: string;
  sportName: string;
  standardHourlyRate: number | null;
  /**
   * The court the booking is on now. It is in the list when the hours or the
   * date would change — keeping the court and changing the time is a move —
   * and left out when nothing would change at all.
   */
  isCurrentCourt: boolean;
  /** What the hours being moved come to now, in court rental alone. */
  movingRentalNow: number;
  /** And what they would come to here. */
  movingRentalNew: number;
  /** Never less than nothing: cheaper is not a refund. */
  balanceDue: number;
  /**
   * The hours this booking would land on here, priced on this court.
   *
   * Carried per court because on a booking sold by the day the browser
   * cannot work them out: a day is whatever THIS court is open for, and two
   * courts in one building need not keep the same hours. These are what the
   * move or the upgrade is then asked for, so what was priced on the card is
   * what gets sent.
   */
  slots: BookedSlot[];
  /** Dearer than what was paid, so it goes through the upgrade rather than the move. */
  isUpgrade: boolean;
  holdMinutes: number;
};

/**
 * Every court this booking could actually be moved onto, and what each costs.
 *
 * Only the ones it could. A court shut that day, one closed for work, one
 * whose hours are already spoken for and one the venue has never priced are
 * left out rather than listed and refused — a card that cannot be clicked is a
 * question the reader has to answer twice. A dearer court stays in: that one
 * is an upgrade rather than a refusal.
 */
export type MoveOptions = {
  /** The booking has begun, so its hours travel with it and cannot be changed. */
  isInPlay: boolean;
  /** Hours already played. They stay where they were, at what they cost. */
  hoursStaying: number;
  hoursMoving: number;
  /**
   * The booking's hours that are on the move, as the server counted them.
   *
   * Sent because the browser cannot work them out on a booking under way:
   * which hours are still to play is a question about the venue's clock, and
   * the browser asking its own would name an hour the customer is standing
   * through.
   */
  movingSlots: BookedSlot[];
  courts: MoveOption[];
};

/**
 * @param dates The dates a booking sold by the day would move onto: one for a
 *   whole day, as many as it has now for a run of them. Day bookings only —
 *   their hours are whatever each court is open for, so the dates are all
 *   there is to ask with. They need not run back to back: the picker names
 *   each on its own and lets it be unchosen again.
 * @param slots The hours wanted, which carry their own date. Null keeps the
 *   ones the booking already has, which is what a booking under way needs.
 */
export function getMoveOptions(
  bookingId: string,
  dates: string[] | null = null,
  slots: MoveSlot[] | null = null,
) {
  return apiClient.post<MoveOptions, { dates: string[] | null; slots: MoveSlot[] | null }>(
    API_ENDPOINTS.BOOKINGS.MOVE_OPTIONS(bookingId),
    { dates, slots },
  );
}

export type UpgradeSlot = {
  /** "2026-09-22". */
  date: string;
  /** "07:00:00". */
  startsAt: string;
  endsAt: string;
  /** The court rental for this hour. The platform fee is not charged again. */
  amount: number;
};

/**
 * An upgrade the customer has asked for, and how far it has got.
 *
 * Read back from the server on every visit rather than kept on the screen that
 * created it, so a refresh, a second tab, or somebody coming back after paying
 * all land on the step they are actually at.
 */
export type UpgradeRequest = {
  id: string;
  bookingId: string;
  toBookableCourtId: string;
  toCourtName: string;
  rentalNow: number;
  rentalNew: number;
  /** Fixed when the upgrade was asked for, not worked out again at payment. */
  balanceDue: number;
  status:
    | "AwaitingPayment"
    | "AwaitingApproval"
    | "Approved"
    | "Declined"
    | "Withdrawn"
    | "Expired";
  /** When the hours being asked for go back on sale. */
  holdsUntil: string;
  /**
   * Whether that clock has run out with nothing paid.
   *
   * Answered by the server, because the browser's clock is not the one the
   * hold was timed against.
   */
  hasLapsed: boolean;
  receiptUrl: string | null;
  /** Why the venue said no, when it did. */
  declineReason: string | null;
  slots: UpgradeSlot[];
};

/**
 * Asks to move onto hours that cost more, and offers to pay the difference.
 *
 * The booking does not move. This writes the request down, holds the hours on
 * a clock, and hands back what there is to pay.
 */
/** @param slots Null keeps the hours the booking already has, as a move does. */
export function requestUpgrade(
  bookingId: string,
  toBookableCourtId: string,
  slots: MoveSlot[] | null,
  why: MoveReasonAnswer,
) {
  return apiClient.post<UpgradeRequest, MoveBody>(API_ENDPOINTS.BOOKINGS.UPGRADE(bookingId), {
    toBookableCourtId,
    slots,
    reason: why.reason,
    reasonNote: why.note.trim() || null,
  });
}

/** The upgrade still open on this booking, or null when there is none. */
export function getOpenUpgrade(bookingId: string) {
  return apiClient.get<UpgradeRequest | null>(API_ENDPOINTS.BOOKINGS.UPGRADE(bookingId));
}

/**
 * Which step of the upgrade checkout this is.
 *
 * Read from the request rather than held in the URL, for the same reason the
 * booking checkout does it: a refresh, a second tab or somebody coming back
 * after paying all land where they actually are.
 */
export function upgradeStep(upgrade: UpgradeRequest): 2 | 4 {
  // Two steps left, not three, the same as the booking checkout. Sending the
  // receipt IS the submission, and the step between them contradicted the
  // message above it: the page already said the venue was checking.
  return upgrade.status === "AwaitingPayment" && upgrade.receiptUrl === null ? 2 : 4;
}

/**
 * Sends the receipt for an upgrade to the venue.
 *
 * One action rather than two: this records the picture AND hands it over, and
 * stops the clock. Also takes a replacement while the venue is still looking.
 */
export function attachUpgradeReceipt(bookingId: string, receiptUrl: string) {
  return apiClient.post<UpgradeRequest, { receiptUrl: string }>(
    API_ENDPOINTS.BOOKINGS.UPGRADE_RECEIPT(bookingId),
    { receiptUrl },
  );
}

/**
 * Sends the receipt to the venue.
 *
 * One action rather than two: this records the picture AND hands the booking
 * over. Also takes a replacement while the venue is still looking, so a wrong
 * picture can be corrected without ringing anybody.
 */
export function attachReceipt(bookingId: string, receiptUrl: string) {
  return apiClient.post<BookingDetail, { receiptUrl: string }>(
    API_ENDPOINTS.BOOKINGS.RECEIPT(bookingId),
    { receiptUrl },
  );
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

/**
 * One line per date in the booking window: enough to grey out the days that
 * cannot be taken whole, without pricing thirty grids to find out.
 */
export type DayOutlook = {
  date: string;
  isClosed: boolean;
  isHoliday: boolean;
  isUnderMaintenance: boolean;
  openHours: number;
  totalHours: number;
  /** Every hour of the day free. What a day sold open to close needs. */
  canBeHiredWhole: boolean;
};

export function getDayOutlook(bookableCourtId: string) {
  return apiClient.get<DayOutlook[]>(API_ENDPOINTS.CATALOG.DAY_OUTLOOK(bookableCourtId));
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
