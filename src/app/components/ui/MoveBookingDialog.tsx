"use client";

import { useEffect, useRef, useState } from "react";
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
  const [inPlay, setInPlay] = useState<boolean | null>(null);

  // Where the schedule lands, so picking a court can carry the reader to it.
  const scheduleRef = useRef<HTMLDivElement | null>(null);

  // The day the booking is already on, which is where the picker starts.
  //
  // Most moves change the court and keep the day — the whole reason the dialog
  // exists is a court that will not do. Starting on no day at all makes every
  // one of those a choice somebody has to make before they can see any hours.
  const ownDay = booking?.startDate ?? null;

  // Nothing picked against one booking may follow the dialog to the next.
  useEffect(() => {
    setChosen(null);
    setDay(ownDay);
    setHours([]);
    setProblem(null);
  }, [booking?.id, ownDay]);

  // A court's hours are its own, so changing court starts the schedule again.
  useEffect(() => {
    setDay(ownDay);
    setHours([]);
    setInPlay(null);
  }, [chosen, ownDay]);

  const courts = useQuery({
    queryKey: ["catalog", "courts", "*"],
    queryFn: () => getCatalogCourts(),
    staleTime: 5 * 60 * 1000,
    enabled: booking !== null,
  });

  // Every court for the same sport in the same building, the booking's own
  // included. The server refuses anything else; this is so the list does not
  // offer what it would.
  //
  // Its own court is in the list because "keep the court, change the time" is
  // a real move and there was no way to ask for it: choosing hours needs a
  // court chosen first, and the only courts on offer were other people's
  // floors. It also puts the booking's current hours back within reach of an
  // honest "Yours now" — on its own court, an hour it already holds really is
  // its own.
  const elsewhere = (courts.data ?? []).filter(
    (court) =>
      court.facilityId === booking?.facilityId && court.sportKey === booking.sportKey,
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
      // Missing rather than false means an API older than this field, and the
      // honest default is the permissive one: offer the dates and let the
      // server refuse a move it does not like. Defaulting the other way turns
      // a version mismatch into a screen that quietly says a booking cannot
      // change its day, which is indistinguishable from the rule working.
      setInPlay(quote.data.isInPlay ?? false);
    }
  }, [quote.data]);

  // Picking a court carries the reader to the schedule it just opened.
  //
  // Waits for inPlay, because until the quote answers, the block is one
  // line saying it is checking — scrolling to that and then having it grow
  // underneath is worse than arriving once, at something worth reading. A
  // booking with no hours to pick has no block and no ref, so nothing moves.
  useEffect(() => {
    if (chosen === null || inPlay === null) {
      return;
    }

    scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chosen, inPlay]);

  // The day the hours are being picked on. Today's booking cannot leave its
  // day, so there is nothing to choose and the booking's own date stands.
  // A booking that has not begun can be carried to another day. One under
  // way can change court but not when it is.
  const pickingDay = hourly && inPlay === false;
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
    // Not asked for a booking under way. Its hours are not in question — they
    // travel with it — so a grid of them is a question with no answer to give,
    // and one that invites the reader to try.
    enabled: chosen !== null && onDay !== null && hourly && inPlay === false,
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

  // The hours this booking already holds — on its own court, on this day.
  //
  // Both halves matter. It used to test the day alone, which put "Yours now"
  // over free hours on other people's floors and disabled them, blocking the
  // commonest move there is. An hour is only yours where you hold it.
  //
  // On your own court it is a refusal rather than a hint: moving onto an hour
  // you already have is not a move, and the server now says so too.
  const onOwnCourt = chosen === booking.bookableCourtId;

  const mine = new Set(
    onOwnCourt
      ? booking.slots.filter((slot) => slot.date === onDay).map((slot) => slot.startsAt)
      : [],
  );

  // Either leave the hours alone, or replace all of them. Half a schedule is
  // not one, and the last tap should not be where that is explained.
  const scheduled = !hourly || hours.length === 0 || hours.length === needed;

  // A booking under way has no hours to pick — the court changes and the clock
  // does not — so `wanted` is null for the whole of its move, and every rule
  // written as "once hours are chosen" would never fire on one. Its price is
  // settled the moment a court is: the hours are already known.
  //
  // Split rather than folded together, because the two are genuinely different
  // screens and the one that works has to go on working.
  // Whether the booking is under way, answerable before a court is picked.
  //
  // `inPlay` comes off the quote, and the quote needs a court — so until one is
  // chosen it is null, which is no use to the court list itself. The booking
  // carries the same answer and carries it from the start; the quote refines it
  // afterwards, because it turns over while the dialog is open.
  const underWay = inPlay ?? booking.isInPlay;

  // Courts this booking could actually go to. Its own is in the list and is a
  // real choice — until the booking is under way, when it is the one court
  // that cannot take it. Counted rather than assumed, because a venue with a
  // single court of this sport then has nowhere to offer at all, and a grid of
  // one greyed-out card is not how to say so.
  const movable = elsewhere.filter(
    (court) => !(underWay && court.bookableCourtId === booking.bookableCourtId),
  );

  const priceable = inPlay === true ? chosen !== null : wanted !== null;

  // How many hours are actually going, as the server counted them. On a
  // booking under way that is fewer than the booking has: the hour in progress
  // is being played on the court they are standing on and stays there.
  const hoursMoved = settled?.hoursMoving ?? needed;

  // Priced only once there is a price. On a booking not yet started, that is
  // once hours are chosen: until then nothing about money is on screen, and a
  // button disabled over a figure nobody has been shown is a dead end — so the
  // attempt is allowed and the server answers it.
  //
  // On one under way there is no such gap. The figure IS on screen, so letting
  // the button through would send somebody to a refusal they had just been
  // shown the reason for.
  const affordable = priceable ? settled?.balanceDue === 0 : true;
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
            {/* A booking under way is told the same thing as one sold by the
                day, because the same thing is true of it: the court is what
                can change. Offering it "then a new time" was the line that put
                a reader in front of an hour grid they could not use. */}
            {hourly && !underWay
              ? " Choose a court, then a new time. Keeping the court and changing only the hours counts too."
              : " Choose the court to move to. The time stays the same."}
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

          {/* Not "a NEW court" any more: the booking's own is in the list,
              because keeping the court and changing the time is a move too —
              until it is under way, when the time is the one thing that cannot
              change and its own court has nothing left to offer. */}
          <p className="mt-5 text-sm font-bold text-[#071955]">
            {underWay ? "Choose another court" : "Choose a court"}
          </p>

          {courts.isPending ? (
            <p className="mt-2 text-sm text-slate-500">Loading courts…</p>
          ) : movable.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              There is no other {booking.sportName.toLowerCase()} court here to move to
              {underWay ? ", and a booking already being played cannot change its hours." : "."}
            </p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {elsewhere.map((court) => {
                const here = chosen === court.bookableCourtId;
                const own = court.bookableCourtId === booking.bookableCourtId;

                // The court they are standing on, while they are standing on
                // it. Somebody who opened this dialog is asking to be moved
                // somewhere else; their own court is the one place that cannot
                // answer, because the hours are what would have had to change
                // and a booking under way cannot change them.
                //
                // Only while it is under way. Before it starts, its own court
                // is a perfectly good choice — keeping the court and changing
                // the hours is a move, and that screen has to go on working.
                const stuck = own && underWay;

                return (
                  <li key={court.bookableCourtId}>
                    <button
                      type="button"
                      disabled={stuck}
                      title={
                        stuck
                          ? `${court.name} — you are playing here now`
                          : court.name
                      }
                      onClick={() => {
                        setChosen(court.bookableCourtId);
                        setProblem(null);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        stuck
                          ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50"
                          : here
                            ? "border-[#2563EB] bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {/* One line, and it stays one line. The cards sit in a
                          grid, so a row is as tall as its tallest card: let
                          the badge wrap under the name and the one card
                          carrying it drags every card beside it down with it.
                          The name gives way instead — it is truncated, with
                          the full one on the button's tooltip — and the badge
                          never shrinks, so each card is the same two lines
                          whether it has a badge or not. */}
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`truncate text-sm font-bold ${
                            stuck ? "text-slate-400" : "text-[#071955]"
                          }`}
                        >
                          {court.name}
                        </span>
                        {/* Said on the card rather than left to be worked out.
                            Without it the list reads as though one court has
                            been listed twice.

                            Solid navy, not the grey it was: in slate-100 it
                            sat at the weight of the sport-and-rate line under
                            it and read as more of the card's small print,
                            which is exactly what the badge exists not to be.

                            Navy rather than the brand blue because the blue is
                            already spoken for on this card — it is what a
                            picked court is drawn in. A badge in the same blue
                            would say "chosen" on a card nobody had chosen. */}
                        {own && (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                              stuck ? "bg-slate-300 text-slate-600" : "bg-[#071955] text-white"
                            }`}
                          >
                            You are here
                          </span>
                        )}
                      </span>
                      {/* The reason, in the place the rate would be. A card
                          greyed out with its price still on it reads as a
                          court that has gone, rather than the one the customer
                          is standing on — and "you are here" alone does not
                          say why that is now a refusal. */}
                      <span
                        className={`block truncate text-xs font-semibold ${
                          stuck ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {stuck
                          ? "Playing here now — pick another court"
                          : `${court.sportName}${
                              court.standardHourlyRate !== null
                                ? ` · ${peso(court.standardHourlyRate)}/hr`
                                : ""
                            }`}
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
            <div ref={scheduleRef} className="mt-6 border-t border-slate-200 pt-5">
              {inPlay === null && quote.isPending ? (
                <p className="text-sm text-slate-500">Checking that court…</p>
              ) : inPlay === null ? null : inPlay ? (
                /* A booking being played has nothing to choose here. Its hours
                   are not moving in time, only in place, so there is no day
                   and no grid — and offering either would be offering a change
                   that cannot be made.

                   What replaces them is the one thing the reader does need to
                   know before they pick a court: that the hour they are on
                   stays where they are standing, and only the whole hours
                   ahead of it come with them. Somebody who booked three hours
                   and is told the price of one should be able to see why. */
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-bold text-[#071955]">
                    This booking is being played now
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {hoursMoved === 0
                      ? "There are no whole hours left to move."
                      : `Choose the court to move to and your ${
                          hoursMoved === 1 ? "remaining hour" : `remaining ${hoursMoved} hours`
                        } move with you, at the same times. The hour you are playing stays on ${
                          booking.courtName
                        } — you are on that court now, and it is not re-charged.`}
                  </p>
                </div>
              ) : (
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
          {priceable && quote.isPending && (
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
          {priceable && settled && settled.balanceDue > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {peso(settled.balanceDue)} more to pay
                </p>
                {/* Against the hours that are moving, not the whole booking. On
                    a session under way most of the booking is behind the
                    customer and not in question, and naming its total asks them
                    to work out which part of it still is. */}
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {hoursMoved} {hoursMoved === 1 ? "hour" : "hours"} on{" "}
                  {settled.toCourtName} {hoursMoved === 1 ? "costs" : "cost"}{" "}
                  {peso(settled.movingRentalNew)}, against {peso(settled.movingRentalNow)} where{" "}
                  {hoursMoved === 1 ? "it is" : "they are"} now — so there is{" "}
                  {peso(settled.balanceDue)} to settle.
                </p>
              </div>

              {/* The choice travels in the address, so a refresh on the next
                  page does not lose what was picked here. A booking under way
                  sends no hours: it is not changing them, and the server keeps
                  the ones it has. */}
              <Link
                href={
                  wanted === null
                    ? `/bookings/${booking.id}/upgrade?court=${chosen}`
                    : `/bookings/${booking.id}/upgrade?court=${chosen}&hours=${encodeURIComponent(
                        wanted.map((slot) => `${slot.date}T${slot.startsAt}`).join(","),
                      )}`
                }
                className="inline-flex shrink-0 items-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700"
              >
                Pay and upgrade
              </Link>
            </div>
          )}

          {priceable && settled && settled.balanceDue === 0 && (
            <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-900">Nothing more to pay</p>
              <p className="mt-1 text-sm leading-6 text-green-800">
                {settled.movingRentalNew < settled.movingRentalNow
                  ? `Those ${hoursMoved === 1 ? "hour costs" : "hours cost"} ${peso(
                      settled.movingRentalNew,
                    )} on ${settled.toCourtName} instead of ${peso(
                      settled.movingRentalNow,
                    )}. The difference is not refunded, so your bill stays the same.`
                  : `${settled.toCourtName} charges the same for ${
                      hoursMoved === 1 ? "that hour" : "those hours"
                    }, so the move is free.`}
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
