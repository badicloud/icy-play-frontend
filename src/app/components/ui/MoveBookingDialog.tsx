"use client";

import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import {
  clock,
  getDayOutlook,
  getMoveOptions,
  getMoveWindow,
  moveBooking,
  peso,
  type BookingDetail,
  type MoveOption,
  type MoveReasonAnswer,
  type MoveSlot,
} from "@auth/bookingApi";
import MoveReasonPicker, { answerOf, NO_REASON, type MoveReasonDraft } from "./MoveReasonPicker";

/**
 * Moving a booking onto another court, and onto other hours.
 *
 * The question is asked in the order a customer can actually answer it: when,
 * then which court. It used to run the other way — pick a court, then see that
 * court's diary — which meant choosing between courts before knowing which of
 * them could take you, and reading "that hour has gone" one court at a time.
 * Now the date and the hours come first and the courts that can take them are
 * what comes back. A court that is shut, closed for work, or already spoken
 * for never appears at all, because a card that cannot be clicked is a
 * question the reader has to answer twice.
 *
 * What gets asked depends on the booking, and the server decides which:
 *
 *  - Hourly, not yet begun: a date, then hours from the building's own opening
 *    times, then the courts free for them.
 *  - Hourly, under way: no date and no hours. The whole hours still ahead of
 *    it travel at the times they already have, and the courts free for THOSE
 *    are what is offered. The hour being played stays where it is.
 *  - A whole day, not yet begun: a date, and no hours. A day’s hours are
 *    whatever each court is open for, so they cannot be named until a court
 *    is — the server works them out per court.
 *  - A run of days, not yet begun: as many dates as the run has, each picked
 *    and unpicked on its own. Once they are all chosen the rest of the strip
 *    goes quiet. They need not run back to back: the number of days is what
 *    cannot change, and a move buys nothing that was not already paid for.
 *
 *    Both start on nothing chosen, and both refuse the dates the booking
 *    already has. A booking sold by the day moves by changing its date, so
 *    the date it is on is the one answer that is not an answer. An hourly
 *    booking is the opposite and keeps its own day as the starting point.
 *  - A whole day or a run of days, under way: nothing. That booking does not
 *    move, and the button that opens this dialog is not shown for it.
 *
 * The browser is never asked what day it is. Its clock is not the venue's, and
 * a customer abroad would be told a different truth.
 */
function MoveBookingDialog({
  booking,
  onClose,
}: {
  booking: BookingDetail | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // The dates chosen, in the order the picker keeps them: sorted, so a run
  // reads as a run however it was clicked together.
  //
  // A list rather than one date because a booking sold by the day may be more
  // than one of them, and each is chosen and unchosen on its own. An hourly
  // booking uses the first and only entry, which is the day its hours are
  // being picked on.
  const [days, setDays] = useState<string[]>([]);
  const [hours, setHours] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [wideOpen, setWideOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [why, setWhy] = useState<MoveReasonDraft>(NO_REASON);

  // Where the court list lands, so finishing the hours carries the reader to
  // the thing those hours just unlocked.
  const courtsRef = useRef<HTMLDivElement | null>(null);

  const hourly = booking?.kind === "Hourly";

  // Sold by the day: a whole day, or a run of them. Neither picks hours.
  const byTheDay = booking !== null && !hourly;

  // Under way on the venue's clock, as the booking itself reports it. A
  // booking sold by the day cannot move once its day has begun — the server
  // refuses it and the button is not offered — so this dialog only ever sees
  // that case if something has gone stale underneath it.
  const underWay = booking?.isInPlay ?? false;

  // A booking under way is not choosing anything: its hours travel with it.
  const picksDate = booking !== null && !underWay;
  const picksHours = hourly && !underWay;

  // The dates the booking has now.
  //
  // On a booking sold by the day these are what it is moving OFF, and they
  // are refused in the strip below: a move is a change of date, and offering
  // back the date somebody is already on is offering them a move that is not
  // one. On an hourly booking they are where the picker starts instead —
  // "same day, other hours" and "same day, other court" are both real moves
  // and both the commonest thing this dialog is opened for.
  //
  // Joined into a string so the effect below can depend on it without
  // re-running on every render, which a fresh array would.
  const ownDays = (booking?.slots ?? [])
    .map((slot) => slot.date)
    .filter((date, at, all) => all.indexOf(date) === at)
    .sort()
    .join(",");

  const ownDates = ownDays === "" ? [] : ownDays.split(",");

  // How many dates have to be picked.
  //
  // A booking sold by the day lands on as many days as it has now: a run of
  // three days is three days wherever it goes, however long each of them
  // turns out to be. An hourly booking picks one day and then its hours on
  // it, so one is the whole of its answer.
  const datesNeeded = byTheDay ? ownDates.length : 1;

  // Nothing picked against one booking may follow the dialog to the next.
  useEffect(() => {
    // A booking sold by the day opens on nothing chosen. Its own dates are
    // the ones it is leaving and cannot be picked, so filling them in would
    // open the dialog on an answer the screen goes on to refuse.
    setDays(byTheDay || ownDays === "" ? [] : [ownDays.split(",")[0]]);
    setHours([]);
    setChosen(null);
    setProblem(null);
    setWhy(NO_REASON);
  }, [booking?.id, ownDays, byTheDay]);

  // A different date is a different set of hours, and a different set of
  // hours is a different set of courts. Both start again.
  useEffect(() => {
    setHours([]);
    setChosen(null);
  }, [days]);

  useEffect(() => {
    setChosen(null);
  }, [hours]);

  // The dates on offer.
  //
  // Read against the booking's own court, which is not where it is going — it
  // is asked only for the window: which dates the venue is taking bookings
  // for, counted from the venue's today rather than the browser's. What it
  // says about those dates is that ONE court's business and is deliberately
  // not used to grey anything out: a day full on the court you are on may be
  // wide open on the one next to it, and a strip that greys it would hide the
  // move the customer came here for.
  const outlook = useQuery({
    queryKey: ["day-outlook", booking?.bookableCourtId],
    queryFn: () => getDayOutlook(booking!.bookableCourtId),
    enabled: booking !== null && picksDate,
    staleTime: 60 * 1000,
  });

  // The hours the building is open for on the chosen day. No court is named:
  // none has been chosen, and which of them is free is the next question.
  const openHours = useQuery({
    queryKey: ["move-window", booking?.id, days[0]],
    queryFn: () => getMoveWindow(booking!.id, days[0]),
    enabled: booking !== null && picksHours && days.length === 1,
    retry: false,
  });

  // How many hours have to be placed. From the server, because on a booking
  // under way it is fewer than the booking has and only the venue's clock
  // knows how many.
  const needed = openHours.data?.slotsNeeded ?? booking?.slots.length ?? 0;

  // The hours being asked about, sent only once the set is complete. Half a
  // set is a question the server is right to refuse, and the refusal would
  // land on somebody still choosing.
  const wanted: MoveSlot[] | null = useMemo(
    () =>
      picksHours && days.length === 1 && hours.length === needed && needed > 0
        ? hours.map((startsAt) => ({ date: days[0], startsAt }))
        : null,
    [picksHours, days, hours, needed],
  );

  // Ready to ask for courts: an hourly booking once its hours are complete, a
  // day booking once a date is picked, a booking under way straight away.
  //
  // Never for a day booking already under way. That one has nothing to ask
  // about — the server refuses it — and asking anyway spends a round trip to
  // be told what this screen already says in plain words above.
  const searchable =
    booking !== null
    && !(byTheDay && underWay)
    && (underWay
      ? true
      : byTheDay
        ? days.length === datesNeeded && datesNeeded > 0
        : wanted !== null);

  const options = useQuery({
    queryKey: ["move-options", booking?.id, byTheDay ? days : null, wanted],
    queryFn: () =>
      getMoveOptions(booking!.id, byTheDay ? days : null, underWay ? null : wanted),
    enabled: searchable,
    retry: false,
  });

  // Picking the last hour carries the reader to the courts it just opened.
  useEffect(() => {
    if (!searchable || options.data === undefined) {
      return;
    }

    courtsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchable, options.data]);

  const answer = answerOf(why);

  const move = useMutation({
    mutationFn: ({ court, because }: { court: MoveOption; because: MoveReasonAnswer }) =>
      moveBooking(
        booking!.id,
        court.bookableCourtId,
        // A booking under way sends none: it is not changing its hours, and
        // the server keeps the ones it has. Everything else sends the hours
        // the card was priced for, which for a day booking are that court's
        // own and could not have been worked out here.
        underWay ? null : court.slots.map((slot) => ({ date: slot.date, startsAt: slot.startsAt })),
        because,
      ),
    onSuccess: (updated) => {
      client.setQueryData(["booking", updated.id], updated);
      void client.invalidateQueries({ queryKey: ["my-bookings"] });
      // Asked, not done — said so, because the card behind this dialog still
      // shows the old court and somebody who thought it had moved would read
      // that as a failure.
      enqueueSnackbar(
        "Sent to the venue. Your booking stays where it is until they approve the move — we will email you their answer.",
        { variant: "success" },
      );
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

  const refused = options.isError ? (options.error as ApiError)?.message : null;
  const courts = options.data?.courts ?? [];
  const picked = courts.find((court) => court.bookableCourtId === chosen) ?? null;

  const calendar = outlook.data ?? [];
  // Today is not offered to a booking sold by the day.
  //
  // One sold open to close cannot start on a day that has already begun:
  // the morning has gone, and what is left is most of a day rather than
  // one. The server refuses it, so leaving it on the strip would mean
  // waiting for a court list that comes back empty.
  //
  // Dropped rather than greyed out. A greyed date says "not this one, for
  // some reason" and invites the reader to work out which; today is never
  // an option for these bookings, so the strip simply starts tomorrow.
  //
  // It is the first row because the outlook is built from the venue’s
  // today — which is the only clock that counts here. A customer abroad
  // reading their own would drop the wrong day.
  const offered = byTheDay ? calendar.slice(1) : calendar;
  const shown = wideOpen ? offered : offered.slice(0, 14);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="shrink-0 px-6 pt-6">
          <h2 className="text-xl font-extrabold text-[#071955]">Move your booking</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {booking.courtName} at {booking.facilityName}.{" "}
            {underWay
              ? "Your booking has started, so the time stays as it is — choose the court to move to."
              : byTheDay
                ? datesNeeded === 1
                  ? "Choose a date, then the court to move to."
                  : `Choose the ${datesNeeded} dates to move to, then the court.`
                : "Choose a date, then your hours, then the court that can take them."}
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
                <dd className="text-right font-bold text-[#071955]">{time(booking)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Paid</dt>
                <dd className="font-bold text-[#071955]">{peso(booking.total)}</dd>
              </div>
            </dl>
          </div>

          <MovesLeft
            left={booking.movesLeft}
            limit={booking.moveLimit}
            noticeDays={booking.moveNoticeDays}
          />

          {/* A booking sold by the day, once that day has started, does not
              move — and the button that opens this dialog is not shown for it.
              Said here as well because the button is drawn from a list that
              may have been loaded before the day began, and a dialog that
              opens on a stale answer should explain itself rather than offer a
              date that will be refused. */}
          {byTheDay && underWay ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">This booking has already started</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                It runs for the whole day, so there is no part of it left to carry somewhere
                else — half of it on one court and half on another is not what you booked. It
                stays on {booking.courtName}.
              </p>
            </div>
          ) : (
            <>
              {/* ------------------------------------------------ the date */}
              {picksDate && (
                <>
                  <p className="mt-5 text-sm font-bold text-[#071955]">
                    {datesNeeded > 1 ? `Choose ${datesNeeded} dates` : "Choose a date"}
                  </p>

                  {byTheDay && datesNeeded > 1 && (
                    <p className="mt-1 text-[12.5px] leading-6 font-medium text-slate-600">
                      {days.length === datesNeeded
                        ? "That is all of them. Tap one again to take it off."
                        : `Your booking is ${datesNeeded} days. You have picked ${days.length}.`}
                    </p>
                  )}

                  {/* Said once, under the heading, rather than left to whoever
                      hovers a greyed-out date. A strip that opens with some
                      of it already dead and no reason given reads as a bug. */}
                  {byTheDay && (
                    <p className="mt-1 text-[12.5px] leading-6 font-medium text-slate-600">
                      {datesNeeded > 1
                        ? "The dates you are on now are greyed out — moving means moving to others."
                        : "The date you are on now is greyed out — moving means moving to another."}
                    </p>
                  )}

                  {outlook.isPending ? (
                    <p className="mt-2 text-sm text-slate-500">Loading dates…</p>
                  ) : (
                    <>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {shown.map((option) => {
                          const here = days.includes(option.date);

                          // The date this booking is already on, which a
                          // booking sold by the day cannot be moved to.
                          // Moving a Saturday to Saturday is not a move, and
                          // the server says so — better to refuse it on the
                          // strip than to let somebody pick it, wait for the
                          // courts, and be told no at the end.
                          //
                          // Not on an hourly booking. There the day staying
                          // the same is the ordinary case: the hours change,
                          // or the court does, or both.
                          const own = byTheDay && ownDates.includes(option.date);

                          // As many as the booking has, and no more. Once they
                          // are all picked the rest go quiet rather than
                          // disappearing, so the strip keeps its shape and the
                          // reader can see what they turned down.
                          //
                          // Only on a booking of more than one day. Where one
                          // date is the whole answer, greying out every other
                          // date the moment one is picked would mean unpicking
                          // before repicking, and the point of the strip is to
                          // be able to try dates.
                          const full = datesNeeded > 1 && days.length >= datesNeeded && !here;

                          const shut = own || full;

                          return (
                            <li key={option.date}>
                              <button
                                type="button"
                                disabled={shut}
                                onClick={() => {
                                  setProblem(null);
                                  setDays((already) =>
                                    already.includes(option.date)
                                      ? already.filter((date) => date !== option.date)
                                      : datesNeeded === 1
                                        ? [option.date]
                                        : [...already, option.date].sort(),
                                  );
                                }}
                                title={
                                  own
                                    ? "Your booking is on this date now"
                                    : shortDate(option.date)
                                }
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

                      {offered.length > 14 && (
                        <button
                          type="button"
                          onClick={() => setWideOpen((open) => !open)}
                          className="mt-2 text-[12.5px] font-bold text-[#2563EB] underline underline-offset-2"
                        >
                          {wideOpen ? "Show 14 days" : `Show all ${offered.length} days`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ----------------------------------------------- the hours */}
              {picksHours && days.length === 1 && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <p className="text-sm font-bold text-[#071955]">Choose your hours</p>

                  <p className="mt-1 text-[12.5px] leading-6 font-medium text-slate-600">
                    {hours.length === 0
                      ? `Pick ${needed === 1 ? "one hour" : `${needed} hours`}.`
                      : hours.length === needed
                        ? "That is all of them."
                        : `Pick ${needed}. You have picked ${hours.length}.`}
                  </p>

                  {openHours.isPending ? (
                    <p className="mt-2 text-sm text-slate-500">Loading hours…</p>
                  ) : openHours.data?.isClosed ? (
                    <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      The venue is closed that day. Pick another date.
                    </p>
                  ) : (
                    <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {(openHours.data?.slots ?? []).map((slot) => {
                        const here = hours.includes(slot.startsAt);
                        const full = hours.length >= needed && !here;

                        return (
                          <li key={slot.startsAt}>
                            <button
                              type="button"
                              disabled={slot.hasPassed || full}
                              onClick={() =>
                                setHours((already) =>
                                  already.includes(slot.startsAt)
                                    ? already.filter((hour) => hour !== slot.startsAt)
                                    : [...already, slot.startsAt].sort(),
                                )
                              }
                              className={`w-full rounded-xl border px-2 py-2 text-xs font-bold transition ${
                                here
                                  ? "border-[#2563EB] bg-blue-50 text-[#071955]"
                                  : slot.hasPassed || full
                                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {clock(slot.startsAt)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Said once rather than on every greyed-out hour. A grid
                      that starts at two o'clock otherwise reads as a venue
                      that opens at two. */}
                  {(openHours.data?.slots ?? []).some((slot) => slot.hasPassed) && (
                    <p className="mt-2 text-[12.5px] leading-6 font-medium text-slate-600">
                      The hours already greyed out have started, so they cannot be booked.
                    </p>
                  )}
                </div>
              )}

              {/* ---------------------------------------------- the courts */}
              {underWay && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-bold text-[#071955]">
                    This booking is being played now
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {options.data === undefined
                      ? "Working out what is left of it…"
                      : options.data.hoursMoving === 0
                        ? "There are no whole hours left to move."
                        : `Your remaining ${
                            options.data.hoursMoving === 1
                              ? "hour"
                              : `${options.data.hoursMoving} hours`
                          } — ${options.data.movingSlots
                            .map((slot) => `${clock(slot.startsAt)}–${clock(slot.endsAt)}`)
                            .join(", ")} — move with you at the same times. The hour you are
                            playing stays on ${booking.courtName}, and it is not re-charged.`}
                  </p>
                </div>
              )}

              {searchable && (
                <div ref={courtsRef} className="mt-6 border-t border-slate-200 pt-5">
                  <p className="text-sm font-bold text-[#071955]">Choose a court</p>

                  {options.isPending ? (
                    <p className="mt-2 text-sm text-slate-500">Looking for free courts…</p>
                  ) : refused ? (
                    <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                      {refused}
                    </p>
                  ) : courts.length === 0 ? (
                    /* Empty is an answer, and a true one: every court of this
                       sport here is shut, closed for work, or already taken
                       for what was asked. Naming the reason is the next
                       screen's job — this one says what to do about it. */
                    <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                      No {booking.sportName.toLowerCase()} court here is free for that
                      {picksHours ? " time" : " date"}.
                      {picksDate && " Try another date."}
                    </p>
                  ) : (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {courts.map((court) => {
                        const here = chosen === court.bookableCourtId;

                        return (
                          <li key={court.bookableCourtId}>
                            <button
                              type="button"
                              title={court.courtName}
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
                              {/* One line, and it stays one line. The cards sit
                                  in a grid, so a row is as tall as its tallest
                                  card: let a badge wrap under the name and the
                                  one card carrying it drags every card beside
                                  it down. The name gives way instead — it is
                                  truncated, with the full one on the tooltip. */}
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-bold text-[#071955]">
                                  {court.courtName}
                                </span>

                                {/* Said on the card rather than left to be
                                    worked out. Without it the list reads as
                                    though one court has been listed twice. */}
                                {court.isCurrentCourt && (
                                  <span className="shrink-0 rounded-full bg-[#071955] px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-white uppercase">
                                    You are here
                                  </span>
                                )}
                              </span>

                              {/* The money, on the card. Somebody choosing
                                  between four courts is choosing on price as
                                  much as on name, and making them tap each one
                                  to find out is four questions where there
                                  should be none. */}
                              <span
                                className={`mt-0.5 block truncate text-xs font-bold ${
                                  court.isUpgrade ? "text-amber-700" : "text-green-700"
                                }`}
                              >
                                {court.isUpgrade
                                  ? `${peso(court.balanceDue)} more to pay`
                                  : "Free move"}
                              </span>

                              <span className="block truncate text-xs font-semibold text-slate-500">
                                {court.standardHourlyRate !== null
                                  ? `${peso(court.standardHourlyRate)}/hr`
                                  : court.sportName}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* -------------------------------------------- what it comes to */}
              {picked !== null && <Settlement booking={booking} court={picked} />}

              {/* Asked here only for a free move, which goes to the venue the
                  moment the button is pressed. An upgrade is asked on the
                  checkout, before it is sent — the note is the customer's own
                  words and does not belong in the address the button below
                  carries. */}
              {picked !== null && !picked.isUpgrade && (
                <MoveReasonPicker value={why} onChange={setWhy} disabled={move.isPending} />
              )}
            </>
          )}

          {problem && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {problem}
            </p>
          )}

          <p className="mt-4 text-[12.5px] leading-6 font-medium text-slate-600">
            Every move is approved by the venue first. Until they do, your booking stays where it
            is and the hours you asked for are held for you; a move they decline is not counted.
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

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={move.isPending}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Keep it where it is
          </button>

          {/* A court that costs more cannot simply be asked for — nothing
              collects money on the way — so it goes to the checkout instead,
              and the button says which of the two is about to happen. The
              choice travels in the address so a refresh on the next page does
              not lose it. Either way the venue approves before anything moves. */}
          {picked !== null && picked.isUpgrade ? (
            <Link
              href={upgradeHref(booking.id, picked, underWay)}
              className="inline-flex items-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700"
            >
              Pay {peso(picked.balanceDue)} and move
            </Link>
          ) : (
            <button
              type="button"
              disabled={picked === null || answer === null || move.isPending}
              onClick={() =>
                picked !== null && answer !== null && move.mutate({ court: picked, because: answer })
              }
              className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                picked !== null && answer !== null && !move.isPending
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {move.isPending ? "Sending…" : "Send to the venue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Where the upgrade checkout is, for the court that was picked.
 *
 * A booking under way sends no hours: it is not changing them, and the server
 * keeps the ones it has. Everything else sends the hours the card was priced
 * for — which on a day booking are that court's own, and were never the
 * browser's to work out.
 */
function upgradeHref(bookingId: string, court: MoveOption, underWay: boolean) {
  const base = `/bookings/${bookingId}/upgrade?court=${court.bookableCourtId}`;

  if (underWay) {
    return base;
  }

  const hours = court.slots.map((slot) => `${slot.date}T${slot.startsAt}`).join(",");

  return `${base}&hours=${encodeURIComponent(hours)}`;
}

/**
 * What the chosen court comes to, hour by hour, and whether anything is owed.
 *
 * The breakdown rather than a total, because the hours of a day do not cost
 * the same: a peak hour and a standard one on the same court are different
 * money, and a single figure invites the question this answers.
 */
function Settlement({ booking, court }: { booking: BookingDetail; court: MoveOption }) {
  // A run of days is too many rows to read and the wrong question anyway — on
  // those the day is the unit, not the hour.
  const detailed = booking.kind === "Hourly";

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <p className="text-sm font-bold text-[#071955]">
        {detailed ? "Your new hours" : "What you would be moving to"}
      </p>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <dl className="space-y-1 text-sm">
          {detailed ? (
            court.slots.map((slot) => (
              <div key={`${slot.date}-${slot.startsAt}`} className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  {clock(slot.startsAt)}–{clock(slot.endsAt)}
                  {slot.rateKind !== "Standard" && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      {slot.rateKind}
                    </span>
                  )}
                </dt>
                <dd className="font-semibold text-[#071955]">{peso(slot.amount)}</dd>
              </div>
            ))
          ) : (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {court.courtName} · {court.slots.length}{" "}
                {court.slots.length === 1 ? "hour" : "hours"}
              </dt>
              <dd className="font-semibold text-[#071955]">{peso(court.movingRentalNew)}</dd>
            </div>
          )}

          <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
            <dt className="font-bold text-[#071955]">Court rental</dt>
            <dd className="font-extrabold text-[#071955]">{peso(court.movingRentalNew)}</dd>
          </div>
        </dl>
      </div>

      {/* The one thing the customer wants to know here: is there anything to
          settle. Court rental on both sides — the platform fee is charged per
          hour booked and a move buys no hours, so counting it would make an
          identical move look like it cost something. */}
      {court.isUpgrade ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">{peso(court.balanceDue)} more to pay</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            {court.courtName} comes to {peso(court.movingRentalNew)}, against{" "}
            {peso(court.movingRentalNow)} where you are now — so there is{" "}
            {peso(court.balanceDue)} to settle. The venue is asked to accept it, and your booking
            moves once the payment clears.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-bold text-green-900">Nothing more to pay</p>
          <p className="mt-1 text-sm leading-6 text-green-800">
            {court.movingRentalNew < court.movingRentalNow
              ? `That comes to ${peso(court.movingRentalNew)} instead of ${peso(
                  court.movingRentalNow,
                )}. The difference is not refunded, so your bill stays the same.`
              : `${court.courtName} charges the same, so the move is free.`}{" "}
            The venue is asked to approve it, and your booking moves once they do.
          </p>
        </div>
      )}
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
function MovesLeft({
  left,
  limit,
  noticeDays,
}: {
  left: number;
  limit: number | undefined;
  noticeDays: number | undefined;
}) {
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
            {known &&
              `This venue allows ${limit} ${limit === 1 ? "move" : "moves"} per booking${
                used ? `, and you have used ${used}` : ""
              }. `}
            Only moves the venue approves are counted, and once they run out the booking stays
            where it is.
            {Number.isFinite(noticeDays) &&
              (noticeDays as number) > 0 &&
              ` Moves close ${noticeDays === 1 ? "a day" : `${noticeDays} days`} before the booking starts.`}
          </>
        )}
      </div>
    </div>
  );
}

/** The day, or the run of them, as the booking list says it. */
function when(booking: BookingDetail) {
  const from = longDate(booking.startDate);

  return booking.startDate === booking.endDate ? from : `${from} – ${longDate(booking.endDate)}`;
}

/**
 * The hours, as a person would say them.
 *
 * A whole day is not read back hour by hour: sixteen rows to say "all of it"
 * is a wall of text where one line will do, and a run of days is that wall
 * again for every day of it.
 */
function time(booking: BookingDetail) {
  if (booking.kind === "Hourly") {
    return booking.slots.map((slot) => `${clock(slot.startsAt)}–${clock(slot.endsAt)}`).join(", ");
  }

  const first = booking.slots.at(0);
  const last = booking.slots.at(-1);

  return first === undefined || last === undefined
    ? "—"
    : `${clock(first.startsAt)}–${clock(last.endsAt)}, all day`;
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

export default MoveBookingDialog;
