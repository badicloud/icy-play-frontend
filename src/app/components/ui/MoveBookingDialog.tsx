"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { getCatalogCourts } from "@auth/catalogApi";
import {
  clock,
  getAvailability,
  getDayOutlook,
  moveBooking,
  peso,
  quoteMove,
  type BookingDetail,
  type MoveQuote,
  type MoveSlot,
} from "@auth/bookingApi";

/**
 * Moving a booking onto another court, and onto other hours.
 *
 * The court comes first because it is the thing a customer came here to change.
 * What they may change after that depends on when the booking is, and the
 * server decides that: a booking on the venue's today can change its hours but
 * not its day, because a day that has begun cannot be swapped for one that has
 * not. The browser is never asked what day it is — its clock is not the
 * venue's, and a customer abroad would be told a different truth.
 *
 * Only hourly bookings are offered a schedule. A whole day and a run of days
 * have rules of their own, and half of a rule is worse than none.
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
  const [day, setDay] = useState<string | null>(null);
  const [hours, setHours] = useState<string[]>([]);
  const [wideOpen, setWideOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [startsToday, setStartsToday] = useState<boolean | null>(null);

  // Nothing picked against one booking may follow the dialog to the next.
  useEffect(() => {
    setChosen(null);
    setDay(null);
    setHours([]);
    setProblem(null);
  }, [booking?.id]);

  // A court's hours are its own, so changing court starts the schedule again.
  useEffect(() => {
    setDay(null);
    setHours([]);
    setStartsToday(null);
  }, [chosen]);

  const courts = useQuery({
    queryKey: ["catalog", "courts", "*"],
    queryFn: () => getCatalogCourts(),
    staleTime: 5 * 60 * 1000,
    enabled: booking !== null,
  });

  // The other courts for the same sport in the same building. The server
  // refuses anything else; this is so the list does not offer what it would.
  const elsewhere = (courts.data ?? []).filter(
    (court) =>
      court.facilityId === booking?.facilityId &&
      court.sportKey === booking.sportKey &&
      court.bookableCourtId !== booking.bookableCourtId,
  );

  const hourly = booking?.kind === "Hourly";

  // Everything about the proposed move, asked as one question.
  //
  // With no hours picked it is still a real quote — the court changes and the
  // hours stay, which is the move somebody reaches for when a floodlight
  // fails. It also carries whether the booking is on the venue's today, which
  // is what decides whether days may be offered at all.
  //
  // It reads `wanted`, which is worked out below it. That is not a mistake and
  // cannot be tidied away: the day on offer depends on the answer to this
  // query, and the hours depend on the day. The loop is real, and the closure
  // is what lets it settle — by the time the query runs, the hours are known.
  const quote = useQuery({
    queryKey: ["move-quote", booking?.id, chosen, hours, day],
    queryFn: () => quoteMove(booking!.id, chosen!, wanted),
    enabled: booking !== null && chosen !== null,
    retry: false,
  });

  // Kept once it is known. The answer belongs to the booking and the court,
  // not to whichever hours are half-picked at the time.
  useEffect(() => {
    if (quote.data !== undefined) {
      setStartsToday(quote.data.startsToday);
    }
  }, [quote.data]);

  // The day the hours are being picked on. Today's booking cannot leave its
  // day, so there is nothing to choose and the booking's own date stands.
  const pickingDay = hourly && startsToday === false;
  const onDay = pickingDay ? day : (booking?.startDate ?? null);

  const outlook = useQuery({
    queryKey: ["day-outlook", chosen],
    queryFn: () => getDayOutlook(chosen!),
    enabled: chosen !== null && pickingDay,
    staleTime: 60 * 1000,
  });

  const grid = useQuery({
    queryKey: ["availability", chosen, onDay],
    queryFn: () => getAvailability(chosen!, onDay!),
    enabled: chosen !== null && onDay !== null && hourly,
    retry: false,
  });

  // How many hours the booking has to place. A move changes when and where a
  // booking is, never how much of it there is.
  const needed = booking?.slots.length ?? 0;

  // Sent only once the set is complete. Asking about half of it is asking a
  // question the server is right to refuse, and the refusal would land on a
  // customer who is still choosing.
  const wanted: MoveSlot[] | null =
    hourly && onDay !== null && hours.length === needed && needed > 0
      ? hours.map((startsAt) => ({ date: onDay, startsAt }))
      : null;

  const move = useMutation({
    mutationFn: () => moveBooking(booking!.id, chosen!, wanted),
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

  const settled = quote.data ?? null;
  const refused = quote.isError ? (quote.error as ApiError)?.message : null;

  // The hours this booking already holds on the day being looked at. Moving
  // onto an hour it is already on is not a move, and offering it invites a
  // customer to ask for the thing they have.
  const mine = new Set(
    booking.slots.filter((slot) => slot.date === onDay).map((slot) => slot.startsAt),
  );

  // Either leave the hours alone, or replace all of them. Half a schedule is
  // not one, and the last tap should not be where that is explained.
  const scheduled = !hourly || hours.length === 0 || hours.length === needed;

  // Priced only once hours are chosen. Until then nothing about money is on
  // screen, and a button disabled over a figure nobody has been shown is a
  // dead end — so the attempt is allowed and the server answers it.
  const affordable = wanted === null || settled?.balanceDue === 0;
  const ready = chosen !== null && scheduled && affordable && !move.isPending;

  // Court rental alone. The platform fee is charged per hour booked and a move
  // buys no hours, so it is not part of what changes.
  const picked = (grid.data?.slots ?? []).filter((slot) => hours.includes(slot.startsAt));
  const rented = picked.reduce((running, slot) => running + (slot.rate ?? 0), 0);

  const days = outlook.data ?? [];
  const shown = wideOpen ? days : days.slice(0, 14);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="shrink-0 px-6 pt-6">
          <h2 className="text-xl font-extrabold text-[#071955]">Move your booking</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {booking.courtName} at {booking.facilityName}.
            {hourly
              ? " Choose a new court, then a new time."
              : " You can change the court. The time stays the same."}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-bold text-[#071955]">What you have booked now</p>

            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Date</dt>
                <dd className="text-right font-bold text-[#071955]">{when(booking)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Time</dt>
                <dd className="text-right font-bold text-[#071955]">
                  {booking.slots
                    .map((slot) => `${clock(slot.startsAt)}–${clock(slot.endsAt)}`)
                    .join(", ")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Paid</dt>
                <dd className="font-bold text-[#071955]">{peso(booking.total)}</dd>
              </div>
            </dl>
          </div>

          <MovesLeft left={booking.movesLeft} limit={booking.moveLimit} />

          <p className="mt-5 text-sm font-bold text-[#071955]">Choose a new court</p>

          {courts.isPending ? (
            <p className="mt-2 text-sm text-slate-500">Loading courts…</p>
          ) : elsewhere.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              There is no other {booking.sportName.toLowerCase()} court here to move to.
            </p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
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

          {/* The schedule sits under the court because it belongs to it: the
              hours on offer are that court's, and picking a different one asks
              the question again. */}
          {chosen !== null && hourly && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              {startsToday === null && quote.isPending ? (
                <p className="text-sm text-slate-500">Checking that court…</p>
              ) : startsToday === null ? null : (
                <>
                  <p className="text-sm font-bold text-[#071955]">
                    {pickingDay ? "Choose a day" : "Choose your hours"}
                  </p>

                  {!pickingDay && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      This booking is for today, so you can change the time but not the day.
                    </p>
                  )}

                  {pickingDay && (
                    <>
                      {outlook.isPending ? (
                        <p className="mt-2 text-sm text-slate-500">Loading days…</p>
                      ) : (
                        <>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {shown.map((option) => {
                              const here = day === option.date;
                              const shut =
                                option.isClosed ||
                                option.isUnderMaintenance ||
                                option.openHours === 0;

                              return (
                                <li key={option.date}>
                                  <button
                                    type="button"
                                    disabled={shut}
                                    onClick={() => {
                                      setDay(option.date);
                                      setHours([]);
                                    }}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                      here
                                        ? "border-[#2563EB] bg-blue-50 text-[#071955]"
                                        : shut
                                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                    }`}
                                  >
                                    {shortDate(option.date)}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>

                          {days.length > 14 && (
                            <button
                              type="button"
                              onClick={() => setWideOpen((open) => !open)}
                              className="mt-2 text-xs font-bold text-[#2563EB] underline underline-offset-2"
                            >
                              {wideOpen ? "Show 14 days" : `Show all ${days.length} days`}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {onDay !== null && (
                    <div className="mt-4">
                      {pickingDay && (
                        <p className="text-sm font-bold text-[#071955]">Choose your hours</p>
                      )}

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {hours.length === 0
                          ? `Keep your current time, or pick ${
                              needed === 1 ? "a new hour" : `${needed} new hours`
                            }.`
                          : `Pick ${needed}. You have picked ${hours.length}.`}
                      </p>

                      {grid.isPending ? (
                        <p className="mt-2 text-sm text-slate-500">Loading hours…</p>
                      ) : grid.data?.isClosed ? (
                        <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          The venue is closed that day.
                        </p>
                      ) : (
                        <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {(grid.data?.slots ?? []).map((slot) => {
                            const here = hours.includes(slot.startsAt);
                            const ours = mine.has(slot.startsAt);
                            const shut = !slot.isOpen || slot.hasPassed;
                            const full = hours.length >= needed && !here;

                            return (
                              <li key={slot.startsAt}>
                                <button
                                  type="button"
                                  disabled={ours || shut || full}
                                  onClick={() =>
                                    setHours((picked) =>
                                      picked.includes(slot.startsAt)
                                        ? picked.filter((hour) => hour !== slot.startsAt)
                                        : [...picked, slot.startsAt].sort(),
                                    )
                                  }
                                  className={`w-full rounded-xl border px-2 py-2 text-xs font-bold transition ${
                                    ours
                                      ? "cursor-default border-green-200 bg-green-50 text-green-800"
                                      : here
                                        ? "border-[#2563EB] bg-blue-50 text-[#071955]"
                                        : shut || full
                                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  {clock(slot.startsAt)}
                                  {ours && (
                                    <span className="mt-0.5 block text-[10px] font-bold">
                                      Yours now
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Said only once there is something to say. Until the schedule is
              complete the price is not settled, and a figure that moves as you
              tap reads as a fault. */}
          {wanted !== null && quote.isPending && (
            <p className="mt-3 text-sm text-slate-500">Working out what that comes to…</p>
          )}

          {refused && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {refused}
            </p>
          )}

          {/* What those hours come to, hour by hour. A single total invites the
              question the breakdown answers: a peak hour and a standard one on
              the same court are not the same money, and the reader can see
              which is which. */}
          {hours.length > 0 && picked.length === hours.length && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-[#071955]">
                {hours.length === needed ? "Your new hours" : `${hours.length} of ${needed} picked`}
              </p>

              <dl className="mt-2 space-y-1 text-sm">
                {picked.map((slot) => (
                  <div key={slot.startsAt} className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      {clock(slot.startsAt)}–{clock(slot.endsAt)}
                      {slot.rateKind !== "Standard" && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          {slot.rateKind}
                        </span>
                      )}
                    </dt>
                    <dd className="font-semibold text-[#071955]">
                      {slot.rate === null ? "—" : peso(slot.rate)}
                    </dd>
                  </div>
                ))}

                <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                  <dt className="font-bold text-[#071955]">Court rental</dt>
                  <dd className="font-extrabold text-[#071955]">{peso(rented)}</dd>
                </div>
              </dl>

              {hours.length < needed && (
                <p className="mt-2 text-xs text-slate-500">
                  Pick {needed - hours.length} more {needed - hours.length === 1 ? "hour" : "hours"}
                  .
                </p>
              )}
            </div>
          )}

          {/* The one thing the customer wants to know at this point: is there
              anything to settle. Against the court rental on both sides, so a
              move between two courts at the same rate reads as free, which is
              what it is. */}
          {wanted !== null && settled && settled.balanceDue > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {peso(settled.balanceDue)} more to pay
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Your new hours cost {peso(settled.rentalNew)}. You are paying{" "}
                  {peso(settled.rentalNow)} now, so there is {peso(settled.balanceDue)} to settle.
                </p>
              </div>

              {/* The choice travels in the address, so a refresh on the next
                  page does not lose what was picked here. */}
              <Link
                href={`/bookings/${booking.id}/upgrade?court=${chosen}&hours=${encodeURIComponent(
                  wanted.map((slot) => `${slot.date}T${slot.startsAt}`).join(","),
                )}`}
                className="inline-flex shrink-0 items-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700"
              >
                Pay and upgrade
              </Link>
            </div>
          )}

          {wanted !== null && settled && settled.balanceDue === 0 && (
            <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-900">Nothing more to pay</p>
              <p className="mt-1 text-sm leading-6 text-green-800">
                {settled.rentalNew < settled.rentalNow
                  ? `Your new hours cost ${peso(settled.rentalNew)} instead of ${peso(
                      settled.rentalNow,
                    )}. The difference is not refunded, so your bill stays the same.`
                  : "Your new hours cost the same as the ones you have now."}
              </p>
            </div>
          )}

          {problem && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {problem}
            </p>
          )}

          <p className="mt-4 text-xs leading-5 font-medium text-slate-500">
            Once your booking moves, the hours you leave go back on sale. If the new court costs
            less, the difference is not refunded — see the{" "}
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
            onClick={() => move.mutate()}
            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
              ready
                ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {move.isPending ? "Moving…" : "Move it"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * How many moves are left, and what happens when there are none.
 *
 * A count on its own is a number nobody reads: "2 of 3" does not say that the
 * third one is the last chance to change anything. The venue sets the limit
 * from its own desk, so the figure comes from the booking rather than being
 * written in here — a venue that allows one move would otherwise be told
 * three.
 *
 * The limit is read defensively. It is newer than the rest of this contract,
 * and an older API that does not send it must not turn the panel into "NaN of
 * undefined" — better to say only what is actually known.
 */
function MovesLeft({ left, limit }: { left: number; limit: number | undefined }) {
  const known = Number.isFinite(limit) && (limit as number) > 0;
  const used = known ? (limit as number) - left : null;

  return (
    <div
      className={`mt-3 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
        left === 0 ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
          left === 0 ? "bg-amber-500" : "bg-[#2563EB]"
        }`}
      >
        i
      </span>

      <div className={`text-sm leading-6 ${left === 0 ? "text-amber-900" : "text-[#164eaa]"}`}>
        {left === 0 ? (
          <>
            <span className="font-bold">You have no moves left.</span> This booking stays where it
            is.
          </>
        ) : (
          <>
            <span className="font-bold">
              You can move this booking {left} more {left === 1 ? "time" : "times"}.
            </span>{" "}
            {known && `This venue allows ${limit} ${limit === 1 ? "move" : "moves"} per booking${
              used ? `, and you have used ${used}` : ""
            }. `}
            Once they run out, the booking stays where it is.
          </>
        )}
      </div>
    </div>
  );
}

/** The day, or the run of them, as the booking list says it. */
function when(booking: BookingDetail) {
  const from = longDate(booking.startDate);

  return booking.startDate === booking.endDate
    ? from
    : `${from} – ${longDate(booking.endDate)}`;
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "Fri 19 Sep", short enough for a strip of thirty. */
function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type { MoveQuote };
export default MoveBookingDialog;
