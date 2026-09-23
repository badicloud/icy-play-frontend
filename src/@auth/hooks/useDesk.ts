import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveDeskUpgrade,
  confirmDeskBooking,
  declineDeskUpgrade,
  getAdminBooking,
  getAdminBookingHistory,
  getAdminCourtBookings,
  getAdminCourtSchedule,
  getCourtBookings,
  getCourtSchedule,
  getDeskBooking,
  getDeskBookingHistory,
  getDeskBookings,
  getCourtUtilization,
  getVenueSnapshot,
  getDeskCourts,
  getDeskUpgrades,
  getDeskVenues,
  rejectDeskBooking,
  type CourtBookingQuery,
  type DeskQuery,
  type DeskUpgradeQuery,
  type UtilizationQuery,
} from "@auth/deskApi";
import type { BookingSource } from "@/app/(desk)/components/BookingSource";

const deskKey = ["desk"] as const;

export function deskBookingsQueryKey(query: DeskQuery) {
  return [...deskKey, "bookings", query] as const;
}

export function useDeskVenues() {
  return useQuery({
    queryKey: [...deskKey, "venues"],
    queryFn: getDeskVenues,
    // A venue list changes when somebody is put on a desk, which is rare and
    // never while they are standing at it.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * What is waiting, or what has been done.
 *
 * Short-lived on purpose: two people can be standing at one desk, and a queue
 * that still shows what a colleague confirmed a minute ago gets pressed twice.
 */
export function useDeskBookings(query: DeskQuery) {
  return useQuery({
    queryKey: deskBookingsQueryKey(query),
    queryFn: () => getDeskBookings(query),
    staleTime: 30 * 1000,
  });
}

/**
 * The courts these venues have registered.
 *
 * Long-lived: a venue marks a floor out once and books on it for months.
 */
export function useDeskCourts() {
  return useQuery({
    queryKey: [...deskKey, "courts"],
    queryFn: getDeskCourts,
    staleTime: 5 * 60 * 1000,
  });
}

/** Every booked hour on one court between two dates. */
export function useCourtSchedule(courtId: string, from: string, to: string) {
  return useQuery({
    queryKey: [...deskKey, "schedule", courtId, from, to],
    queryFn: () => getCourtSchedule(courtId, from, to),
    // The calendar says what stretch it is about to draw; until it has,
    // there is nothing to ask for.
    enabled: courtId !== "" && from !== "" && to !== "",
    staleTime: 30 * 1000,
  });
}

/** One court's bookings as a list, a page at a time. */
export function useCourtBookings(query: CourtBookingQuery) {
  return useQuery({
    queryKey: [...deskKey, "court-bookings", query],
    queryFn: () => getCourtBookings(query),
    enabled: query.courtId !== "",
    staleTime: 30 * 1000,
  });
}

/*
 * The same four, read as the platform rather than as the venue.
 *
 * Their own cache keys, under "admin" rather than "desk". The answers are the
 * same shape but they are not the same answers: an admin's are for courts they
 * do not work, and letting the two share a key would have somebody signing out
 * of the desk and finding the other's data still warm underneath.
 *
 * Each pair below is one hook that takes the source, rather than two the caller
 * picks between. The components that use them — a calendar, a list, a history
 * expander — are the same components on both pages, and a component choosing
 * its own hook by an `if` is a component with two code paths to keep working.
 */
const adminCourtKey = ["admin", "court"] as const;

function keyFor(source: BookingSource) {
  return source === "admin" ? adminCourtKey : deskKey;
}

/** Every booked hour on one court between two dates. */
export function useCourtScheduleFor(
  source: BookingSource,
  courtId: string,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: [...keyFor(source), "schedule", courtId, from, to],
    queryFn: () =>
      source === "admin"
        ? getAdminCourtSchedule(courtId, from, to)
        : getCourtSchedule(courtId, from, to),
    enabled: courtId !== "" && from !== "" && to !== "",
    staleTime: 30 * 1000,
  });
}

/** One court's bookings as a list, a page at a time. */
export function useCourtBookingsFor(source: BookingSource, query: CourtBookingQuery) {
  return useQuery({
    queryKey: [...keyFor(source), "court-bookings", query],
    queryFn: () => (source === "admin" ? getAdminCourtBookings(query) : getCourtBookings(query)),
    enabled: query.courtId !== "",
    staleTime: 30 * 1000,
  });
}

/** One booking in full, for an hour somebody has clicked. */
export function useBookingFor(source: BookingSource, bookingId: string | null) {
  return useQuery({
    queryKey: [...keyFor(source), "booking", bookingId],
    queryFn: () => (source === "admin" ? getAdminBooking(bookingId!) : getDeskBooking(bookingId!)),
    enabled: bookingId !== null,
    staleTime: 60 * 1000,
  });
}

/** What has happened to one booking, fetched only once somebody opens it. */
export function useBookingHistoryFor(
  source: BookingSource,
  bookingId: string | null,
  open: boolean,
) {
  return useQuery({
    queryKey: [...keyFor(source), "booking-history", bookingId],
    queryFn: () =>
      source === "admin" ? getAdminBookingHistory(bookingId!) : getDeskBookingHistory(bookingId!),
    enabled: open && bookingId !== null,
    staleTime: 60 * 1000,
  });
}

/**
 * One booking in full, for an hour somebody has clicked.
 *
 * Kept a while: a reader clicking along a row of hours comes back to the same
 * booking often, and it has not changed in the seconds between.
 */
export function useDeskBooking(bookingId: string | null) {
  return useQuery({
    queryKey: [...deskKey, "booking", bookingId],
    queryFn: () => getDeskBooking(bookingId!),
    enabled: bookingId !== null,
    staleTime: 60 * 1000,
  });
}

/**
 * What has happened to one booking, for the desk.
 *
 * Only asked for once somebody opens the panel. A queue of twenty bookings
 * would otherwise make twenty requests for a trail nobody has looked at.
 */
export function useDeskBookingHistory(bookingId: string | null, open: boolean) {
  return useQuery({
    queryKey: [...deskKey, "booking-history", bookingId],
    queryFn: () => getDeskBookingHistory(bookingId!),
    enabled: open && bookingId !== null,
    staleTime: 60 * 1000,
  });
}

/**
 * Both answers a desk can give.
 *
 * One hook for the pair because they end the same way: the booking leaves the
 * waiting queue, so every page of both tabs is stale.
 */
/**
 * Upgrades waiting to be checked, or the ones already settled.
 *
 * Short-lived for the same reason the booking queue is: two people can be
 * standing at one desk, and a queue that still shows what a colleague decided
 * a minute ago gets pressed twice.
 */
export function useDeskUpgrades(query: DeskUpgradeQuery) {
  return useQuery({
    queryKey: [...deskKey, "upgrades", query],
    queryFn: () => getDeskUpgrades(query),
    staleTime: 30 * 1000,
  });
}

/**
 * Both answers a desk can give an upgrade.
 *
 * Everything under the desk key is thrown away afterwards rather than the
 * upgrade queue alone: approving moves a booking onto another court, so the
 * diary, the court lists and the booking queue are all out of date too.
 */
export function useDeskUpgradeDecision() {
  const client = useQueryClient();
  const settle = () => client.invalidateQueries({ queryKey: deskKey });

  const approve = useMutation({
    mutationFn: (upgradeId: string) => approveDeskUpgrade(upgradeId),
    onSuccess: () => void settle(),
  });

  const decline = useMutation({
    mutationFn: ({ upgradeId, reason }: { upgradeId: string; reason: string | null }) =>
      declineDeskUpgrade(upgradeId, reason),
    onSuccess: () => void settle(),
  });

  return { approve, decline, isDeciding: approve.isPending || decline.isPending };
}

export function useDeskDecision() {
  const client = useQueryClient();
  const settle = () => client.invalidateQueries({ queryKey: deskKey });

  const confirm = useMutation({
    mutationFn: (bookingId: string) => confirmDeskBooking(bookingId),
    onSuccess: () => void settle(),
  });

  const reject = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string | null }) =>
      rejectDeskBooking(bookingId, reason),
    onSuccess: () => void settle(),
  });

  return { confirm, reject, isDeciding: confirm.isPending || reject.isPending };
}

/**
 * How much of what the venue had open actually got used.
 *
 * Long-lived compared with the queues: a report is a period that has mostly
 * already happened, and re-fetching it while somebody reads down the courts
 * would move the numbers under them.
 */
export function useCourtUtilization(query: UtilizationQuery) {
  return useQuery({
    queryKey: [...deskKey, "utilization", query],
    queryFn: () => getCourtUtilization(query),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The venue as it stands this minute.
 *
 * Short-lived, unlike the reports: this is the one thing on the page that
 * changes while somebody is looking at it, and a stale count is a desk telling
 * a customer a court is free when somebody has just taken it.
 */
export function useVenueSnapshot(facilityId?: string) {
  return useQuery({
    queryKey: [...deskKey, "snapshot", facilityId ?? null],
    queryFn: () => getVenueSnapshot(facilityId),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
