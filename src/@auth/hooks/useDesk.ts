import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmDeskBooking,
  getDeskBookings,
  getDeskVenues,
  rejectDeskBooking,
  type DeskQuery,
} from "@auth/deskApi";

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
 * Both answers a desk can give.
 *
 * One hook for the pair because they end the same way: the booking leaves the
 * waiting queue, so every page of both tabs is stale.
 */
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
