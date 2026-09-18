"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { getCatalogCourts } from "@auth/catalogApi";
import {
  moveBooking,
  peso,
  quoteMove,
  type BookingDetail,
  type MoveQuote,
} from "@auth/bookingApi";

/**
 * Moving a booking onto another court.
 *
 * Only the court is asked for. The hours stay as they are — a booking from 11am
 * to 4pm moves to 11am to 4pm somewhere else — because a customer moving off a
 * court that has a problem wants the same slot, not a rescheduling.
 *
 * The price is answered before anything is committed to. "Move this booking"
 * and "move it and pay another twelve hundred pesos" are different questions,
 * and only one of them can be answered with a tap.
 */
function MoveBookingDialog({
  booking,
  onClose,
}: {
  booking: BookingDetail | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [chosen, setChosen] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // A court picked against one booking must not follow the dialog to the next.
  useEffect(() => {
    setChosen(null);
    setProblem(null);
  }, [booking?.id]);

  // The same listing a customer browses, narrowed to this venue. A move offers
  // the other courts in the building, and the court it is already on is not one
  // of them.
  const courts = useQuery({
    queryKey: ["catalog", "courts", "*"],
    queryFn: () => getCatalogCourts(),
    staleTime: 5 * 60 * 1000,
    enabled: booking !== null,
  });

  // The other courts for the same sport in the same building.
  //
  // A move changes which floor the hours are on, not what was bought — so a
  // pickleball booking is offered pickleball courts. The server refuses
  // anything else; this is so the list does not offer what it would refuse.
  const elsewhere = (courts.data ?? []).filter(
    (court) =>
      court.facilityId === booking?.facilityId &&
      court.sportKey === booking.sportKey &&
      court.bookableCourtId !== booking.bookableCourtId,
  );

  const quote = useQuery({
    queryKey: ["move-quote", booking?.id, chosen],
    queryFn: () => quoteMove(booking!.id, chosen!),
    enabled: booking !== null && chosen !== null,
    retry: false,
  });

  const move = useMutation({
    mutationFn: (toBookableCourtId: string) => moveBooking(booking!.id, toBookableCourtId),
    onSuccess: (updated) => {
      client.setQueryData(["booking", updated.id], updated);
      void client.invalidateQueries({ queryKey: ["my-bookings"] });
      onClose();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
      ),
  });

  if (booking === null) {
    return null;
  }

  const priced = quote.data ?? null;
  const refused = quote.isError ? (quote.error as ApiError)?.message : null;
  const ready = chosen !== null && priced !== null && !move.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="shrink-0 px-6 pt-6">
          <h2 className="text-xl font-extrabold text-[#071955]">Move this booking</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {booking.courtName} at {booking.facilityName}. The hours stay as they are — only the
            court changes.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          <dl className="mt-4 space-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Paid so far</dt>
              <dd className="font-bold text-[#071955]">{peso(booking.total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Moves left</dt>
              <dd className="font-bold text-[#071955]">{booking.movesLeft}</dd>
            </div>
          </dl>

          <p className="mt-5 text-sm font-bold text-[#071955]">Move it to</p>

          {courts.isPending ? (
            <p className="mt-2 text-sm text-slate-500">Looking at what else is here…</p>
          ) : elsewhere.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              This venue has no other {booking.sportName.toLowerCase()} court to move onto.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {elsewhere.map((court) => {
                const here = chosen === court.bookableCourtId;

                return (
                  <li key={court.bookableCourtId}>
                    <button
                      type="button"
                      onClick={() => {
                        setChosen(court.bookableCourtId);
                        setProblem(null);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        here
                          ? "border-[#2563EB] bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-sm font-bold text-[#071955]">{court.name}</span>
                      <span className="block text-xs font-semibold text-slate-500">
                        {court.sportName}
                        {court.standardHourlyRate !== null &&
                          ` · ${peso(court.standardHourlyRate)}/hr`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Said before anything is committed to, because a move that wants
              paying for is a different proposition from one that does not. */}
          {chosen !== null && quote.isPending && (
            <p className="mt-3 text-sm text-slate-500">Working out what that comes to…</p>
          )}

          {refused && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {refused}
            </p>
          )}

          {priced && priced.balanceDue > 0 && (
            <div className="mt-3 rounded-2xl border border-[#2563EB] bg-blue-50 px-4 py-3">
              <p className="text-sm font-bold text-[#071955]">
                That court costs {peso(priced.balanceDue)} more.
              </p>
              <p className="mt-1 text-xs leading-5 font-medium text-[#164eaa]">
                You pay the difference and nothing else — the hours have not changed, so the platform
                fee does not either. The court is held for {priced.holdMinutes} minutes while you pay,
                and the booking moves once the venue has seen the payment.
              </p>
            </div>
          )}

          {priced && priced.balanceDue === 0 && (
            <p className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
              Nothing more to pay.
              {priced.newTotal < priced.paidAlready &&
                " That court costs less, and there are no refunds — you keep the booking and pay no more."}
            </p>
          )}

          {problem && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {problem}
            </p>
          )}

          <p className="mt-4 text-xs leading-5 font-medium text-slate-500">
            The hours you leave go back on sale once the move is confirmed. Nothing is returned if the
            new court costs less — see the{" "}
            <Link
              href="/booking-policy"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#164eaa] underline underline-offset-2"
            >
              booking policy
            </Link>
            .
          </p>
        </div>

        <div className="shrink-0 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={move.isPending}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Keep it where it is
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => move.mutate(chosen!)}
            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
              ready
                ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {move.isPending
              ? "Asking…"
              : priced && priced.balanceDue > 0
                ? `Upgrade for ${peso(priced.balanceDue)}`
                : "Move it"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { MoveQuote };
export default MoveBookingDialog;
