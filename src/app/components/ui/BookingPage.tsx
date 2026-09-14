"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";
import {
  checkoutHref,
  choiceQuery,
  clock,
  getAvailability,
  isoDate,
  peakDays,
  peso,
  readCheckout,
  upcomingDays,
  type AvailabilityDay,
  type AvailabilitySlot,
  type BookingKind,
} from "@auth/bookingApi";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/** What the strip shows without being asked. A fortnight covers most plans. */
const ShortView = 14;

/**
 * The furthest ahead anyone can book, and the whole strip when it is opened up.
 * The server refuses a date past this too — a ceiling only the browser keeps is
 * not a ceiling.
 */
const DaysAhead = 30;

/** Enough for a tournament week, and short enough that the price stays readable. */
const LongestRun = 7;

const modes: { id: BookingKind; label: string; hint: string }[] = [
  { id: "Hourly", label: "Hourly Booking", hint: "Pick the hours you want" },
  { id: "WholeDay", label: "Single Day", hint: "Open to close" },
  { id: "MultiDay", label: "Multiple Days", hint: "A run of whole days" },
];

function BookingPage({ bookableCourtId }: { bookableCourtId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { isAuthenticated } = useIcyPlayAuth();

  const allDays = useMemo(() => upcomingDays(DaysAhead), []);

  // What the address bar says, read once. From then on the state leads and the
  // URL follows it — a refresh, a shared link, or coming back from the checkout
  // all land on the hours the reader actually chose.
  const [restored] = useState(() => {
    const choice = readCheckout(new URLSearchParams(search.toString()));

    if (choice === null) {
      return null;
    }

    const first = allDays.findIndex((day) => isoDate(day) === choice.from);
    const last = allDays.findIndex((day) => isoDate(day) === choice.to);

    return first < 0 || last < 0
      ? null
      : { kind: choice.kind, first, last, hours: choice.hours };
  });

  const [wideOpen, setWideOpen] = useState((restored?.last ?? 0) >= ShortView);
  const [mode, setMode] = useState<BookingKind>(restored?.kind ?? "Hourly");
  const [firstDay, setFirstDay] = useState(restored?.first ?? 0);
  const [lastDay, setLastDay] = useState(restored?.last ?? 0);
  const [picked, setPicked] = useState<string[]>(restored?.hours ?? []);
  const [problem, setProblem] = useState<string | null>(null);

  const days = useMemo(
    () => allDays.slice(0, wideOpen ? DaysAhead : ShortView),
    [allDays, wideOpen],
  );

  // A run of whole days needs every day in it priced, so each is its own query.
  // They cache separately, which is what makes moving the end of the range feel
  // instant rather than refetching the whole week.
  const span = mode === "MultiDay" ? Math.max(0, lastDay - firstDay) + 1 : 1;
  const dates = days.slice(firstDay, firstDay + span).map(isoDate);

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["availability", bookableCourtId, date],
      queryFn: () => getAvailability(bookableCourtId, date),
      // Deliberately short. A grid a minute stale is a customer picking an hour
      // that has just gone.
      staleTime: 15 * 1000,
      enabled: bookableCourtId !== "",
    })),
  });

  const loading = results.some((result) => result.isPending);
  const failed = results.some((result) => result.isError);
  const availability = results
    .map((result) => result.data)
    .filter((day): day is AvailabilityDay => day !== undefined);

  const today = availability[0];
  const hourly = mode === "Hourly";

  // A day sold open to close has to still have its opening in it. By the time
  // anyone is looking, part of today has gone, so today is an hourly booking or
  // it is nothing.
  const firstSellable = hourly ? 0 : 1;

  // What is actually being bought, in one place: hourly is what the customer
  // ticked, whole days are every open hour of every day in the range.
  const chosen = hourly
    ? (today?.slots ?? [])
        .filter((slot) => picked.includes(slot.startsAt) && slot.isOpen)
        .map((slot) => ({ date: today!.date, slot }))
    : availability.flatMap((day) =>
        day.slots.filter((slot) => slot.isOpen).map((slot) => ({ date: day.date, slot })),
      );

  const rental = chosen.reduce((sum, entry) => sum + (entry.slot.rate ?? 0), 0);
  const fee = chosen.reduce((sum, entry) => sum + entry.slot.platformFee, 0);

  // A day with an hour gone cannot be sold whole, which the server also refuses.
  // Saying so here means the customer is not told after they commit.
  const holed = !hourly
    ? availability.filter((day) => !day.isClosed && day.slots.some((slot) => !slot.isOpen))
    : [];

  // Which of the court's rates the chosen day actually uses, so the card can
  // mark them without hiding the rest.
  const applying = new Set((today?.slots ?? []).map((slot) => slot.rateKind));

  const closed = availability.filter((day) => day.isClosed);
  const shut = availability.some((day) => day.isUnderMaintenance);
  const blocked = shut || holed.length > 0 || closed.length > 0;

  const query = choiceQuery(mode, dates, picked);

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  }, [query]);

  function toggle(slot: AvailabilitySlot) {
    setProblem(null);
    setPicked((current) =>
      current.includes(slot.startsAt)
        ? current.filter((start) => start !== slot.startsAt)
        : [...current, slot.startsAt],
    );
  }

  function pickDay(index: number) {
    if (index < firstSellable) {
      return;
    }

    setProblem(null);
    setPicked([]);

    if (mode !== "MultiDay") {
      setFirstDay(index);
      setLastDay(index);

      return;
    }

    // Tapping past the end extends the run; tapping inside it pulls the end
    // back; tapping the first day again collapses to that one day, which is how
    // a run started somewhere else gets going.
    //
    // Anything before the start, or further out than a run may reach, begins a
    // new run there.
    if (index < firstDay || index > firstDay + LongestRun - 1) {
      setFirstDay(index);
      setLastDay(index);

      return;
    }

    setLastDay(index);
  }

  function confirm() {
    const href = checkoutHref(bookableCourtId, mode, dates, picked);

    // Signing in is the price of holding an hour, not of choosing one — so the
    // choice travels through the redirect and comes back intact.
    router.push(
      isAuthenticated ? href : `/sign-in?redirectUrl=${encodeURIComponent(href)}`,
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-slate-500">Loading what is free…</p>
      </Shell>
    );
  }

  if (failed || !today) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-[#071955]">This court is not taking bookings</h1>
        <p className="mt-2 text-slate-500">
          It may have been taken off the platform, or the link may be wrong.
        </p>
        <Link
          href="/#courts"
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
        >
          See what else is available
        </Link>
      </Shell>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-52">
      <PublicHeader />

      <div className="mx-auto max-w-6xl px-6 pt-7 lg:px-8">
        <Link
          href="/#courts"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#071955]"
        >
          <span aria-hidden>&larr;</span> Back to courts
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#071955]">
          {today.courtName}
        </h1>
        <p className="mt-1 text-slate-500">
          {today.facilityName} · {today.sportName}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="flex flex-col gap-5">
            <Panel title="How are you booking?">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {modes.map((option) => {
                  const on = option.id === mode;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setMode(option.id);
                        setPicked([]);
                        setProblem(null);

                        // Today cannot be sold whole, so a switch made while it
                        // is chosen lands on tomorrow rather than on a day the
                        // grid will not let them keep.
                        const landing = option.id === "Hourly" ? firstDay : Math.max(firstDay, 1);
                        setFirstDay(landing);
                        setLastDay(landing);
                      }}
                      className={`flex flex-col items-start gap-0.5 rounded-2xl border-2 px-4 py-3 text-left transition ${
                        on
                          ? "border-[#2563EB] bg-blue-50 text-[#071955]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-sm font-bold">{option.label}</span>
                      <span className="text-xs font-medium opacity-75">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title={mode === "MultiDay" ? "Which days?" : "Which day?"}>
              {mode === "MultiDay" && (
                <p className="mb-3 text-sm text-slate-500">
                  Tap the first day, then the last — tap further along to add more days, up to{" "}
                  {LongestRun}. Tapping the first day again starts a new run.
                </p>
              )}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const inRange = index >= firstDay && index < firstDay + span;
                  const barred = index < firstSellable;

                  return (
                    <button
                      key={day.toDateString()}
                      type="button"
                      disabled={barred}
                      title={barred ? "Today can only be booked by the hour" : undefined}
                      onClick={() => pickDay(index)}
                      className={`flex min-h-[62px] flex-col items-center justify-center gap-0.5 rounded-2xl border transition ${
                        barred
                          ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300"
                          : inRange
                            ? "border-[#2563EB] bg-[#2563EB] text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase opacity-80">
                        {day.toLocaleDateString("en-PH", { weekday: "short" })}
                      </span>
                      <span className="text-lg font-extrabold leading-none">{day.getDate()}</span>
                      <span className="text-[10px] font-semibold opacity-75">
                        {barred ? "Hourly" : day.toLocaleDateString("en-PH", { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!hourly && (
                <p className="mt-3 text-sm text-slate-500">
                  Today is greyed out: part of it has already gone, so it can only be booked by
                  the hour.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("Hourly");
                      setPicked([]);
                      setProblem(null);
                      setFirstDay(0);
                      setLastDay(0);
                    }}
                    className="font-bold text-[#2563EB] underline-offset-4 hover:underline"
                  >
                    Book today by the hour
                  </button>
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                <p className="text-sm text-slate-400">
                  You can book up to {DaysAhead} days ahead.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Collapsing the strip can strand a day that no longer
                    // exists on it, so a choice outside the short view goes back
                    // to the first day rather than silently becoming another.
                    if (wideOpen && firstDay >= ShortView) {
                      setFirstDay(firstSellable);
                      setLastDay(firstSellable);
                      setPicked([]);
                    }

                    setProblem(null);
                    setWideOpen(!wideOpen);
                  }}
                  className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
                >
                  {wideOpen ? `Show ${ShortView} days` : `Show all ${DaysAhead} days`}
                </button>
              </div>
            </Panel>

            <Panel
              title="Pick your hours"
              aside={`${today.slots.filter((slot) => slot.isOpen).length} of ${
                today.slots.length
              } hours open`}
            >
              <p className="mb-4 text-sm text-slate-500">
                {hourly
                  ? "Tap an hour to add it, tap again to take it off. They do not have to run back to back."
                  : "A whole day is every hour the court is open. The grid is showing what that covers."}
              </p>

              {shut && (
                <Notice>
                  This court is closed for maintenance on {longDate(today.date)}. Pick another day.
                </Notice>
              )}

              {closed.length > 0 && (
                <Notice>
                  {closed.length === 1
                    ? `${today.facilityName} is shut on ${longDate(closed[0].date)}.`
                    : `${today.facilityName} is shut on ${closed.length} of the days you picked.`}
                </Notice>
              )}

              {holed.length > 0 && (
                <Notice>
                  {holed.length === 1
                    ? `Part of ${longDate(holed[0].date)} is already booked, so it cannot be hired whole.`
                    : `${holed.length} of those days are partly booked, so they cannot be hired whole.`}{" "}
                  Book by the hour instead.
                </Notice>
              )}

              {today.isHoliday && (
                <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
                  This is a holiday, so the venue&apos;s holiday rate applies.
                </p>
              )}

              {today.slots.length === 0 ? (
                <p className="text-slate-500">The venue is closed on this day.</p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {today.slots.map((slot) => (
                    <Hour
                      key={slot.startsAt}
                      slot={slot}
                      selected={hourly ? picked.includes(slot.startsAt) : slot.isOpen}
                      selectable={hourly && slot.isOpen}
                      onToggle={() => toggle(slot)}
                    />
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
                <Key className="border-slate-200 bg-white">Standard</Key>
                <Key className="border-amber-300 bg-amber-50">Peak</Key>
                <Key className="border-[#2563EB] bg-[#2563EB]">Selected</Key>
                <Key className="border-slate-200 bg-slate-200">Booked or gone</Key>
              </div>
            </Panel>
          </div>

          <aside className="flex flex-col gap-5">
            <Panel title="What it costs">
              <dl className="flex flex-col gap-2.5">
                {today.standardHourlyRate === null ? (
                  <p className="text-sm text-slate-500">
                    This venue has not set a price for {today.sportName.toLowerCase()} yet.
                  </p>
                ) : (
                  <>
                    <Rate
                      label="Standard"
                      amount={today.standardHourlyRate}
                      applies={applying.has("Standard")}
                    />
                    {today.peakHourlyRate !== null &&
                      today.peakHourlyRate !== today.standardHourlyRate && (
                        <Rate
                          label="Peak"
                          amount={today.peakHourlyRate}
                          applies={applying.has("Peak")}
                          note={
                            today.peakStartsAt && today.peakEndsAt
                              ? `${clock(today.peakStartsAt)} – ${clock(today.peakEndsAt)}, ${peakDays(
                                  today,
                                )}`
                              : undefined
                          }
                        />
                      )}
                    {today.weekendRate !== null &&
                      today.weekendRate !== today.standardHourlyRate && (
                        <Rate
                          label="Weekend"
                          amount={today.weekendRate}
                          applies={applying.has("Weekend")}
                        />
                      )}
                    {today.holidayRate !== null &&
                      today.holidayRate !== today.standardHourlyRate && (
                        <Rate
                          label="Holiday"
                          amount={today.holidayRate}
                          applies={applying.has("Holiday")}
                        />
                      )}
                  </>
                )}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="text-sm font-semibold text-slate-600">Platform fee</dt>
                  <dd className="font-extrabold text-[#071955]">
                    {peso(today.platformHourlyRate)}
                    <span className="text-xs font-semibold text-slate-400">/hr</span>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Slots are {today.slotLengthMinutes} minutes. Minimum booking{" "}
                {today.minimumDurationMinutes} minutes.
              </p>
            </Panel>
          </aside>
        </div>
      </div>

      <Summary
        chosen={chosen}
        rental={rental}
        fee={fee}
        mode={mode}
        dates={dates}
        blocked={blocked}
        problem={problem}
        signedIn={isAuthenticated}
        onRemove={(startsAt) => setPicked((current) => current.filter((s) => s !== startsAt))}
        onConfirm={confirm}
      />

      <PublicFooter />
    </main>
  );
}

/** The floating panel. Everything the customer is about to agree to, in one place. */
function Summary({
  chosen,
  rental,
  fee,
  mode,
  dates,
  blocked,
  problem,
  signedIn,
  onRemove,
  onConfirm,
}: {
  chosen: { date: string; slot: AvailabilitySlot }[];
  rental: number;
  fee: number;
  mode: BookingKind;
  dates: string[];
  blocked: boolean;
  problem: string | null;
  signedIn: boolean;
  onRemove: (startsAt: string) => void;
  onConfirm: () => void;
}) {
  const hours = chosen.length;
  const empty = hours === 0;
  const hourly = mode === "Hourly";

  const when =
    dates.length === 1
      ? longDate(dates[0])
      : `${longDate(dates[0])} – ${longDate(dates[dates.length - 1])}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-6xl rounded-[24px] border border-[#dbe5f5] bg-white p-5 shadow-[0_18px_44px_rgba(7,25,85,0.18)]">
        {problem && (
          <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">
            {problem}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-extrabold text-[#071955]">
                {empty
                  ? "Nothing picked yet"
                  : `${hours} ${hours === 1 ? "hour" : "hours"}${
                      hourly ? "" : dates.length > 1 ? ` · ${dates.length} days` : " · whole day"
                    }`}
              </span>
              <span className="text-xs font-semibold text-slate-400">{when}</span>
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {hourly ? (
                chosen.map((entry) => (
                  <span
                    key={entry.slot.startsAt}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
                  >
                    {clock(entry.slot.startsAt)} – {clock(entry.slot.endsAt)}
                    <button
                      type="button"
                      aria-label={`Remove ${clock(entry.slot.startsAt)}`}
                      onClick={() => onRemove(entry.slot.startsAt)}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </span>
                ))
              ) : (
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  Open to close, every day picked
                </span>
              )}
            </div>
          </div>

          <dl className="flex min-w-[232px] flex-col gap-1.5 lg:border-l lg:border-slate-100 lg:pl-6">
            <Line label="Court rental" value={peso(rental)} />
            <Line
              label="Platform fee"
              note={hours > 0 ? `(${hours} × ${peso(fee / hours)})` : undefined}
              value={peso(fee)}
            />
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2">
              <dt className="text-sm font-extrabold text-[#071955]">Total</dt>
              <dd className="text-xl font-extrabold tracking-tight text-[#071955]">
                {peso(rental + fee)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col items-stretch gap-1.5">
            <button
              type="button"
              disabled={empty || blocked}
              onClick={onConfirm}
              className={`rounded-full px-8 py-3.5 text-sm font-bold transition ${
                empty || blocked
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-[#2563EB] text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              }`}
            >
              {signedIn ? "Continue" : "Sign in to book"}
            </button>
            <span className="text-center text-[11px] font-semibold text-slate-400">
              You pay the venue directly
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One hour. The tick is the whole interaction, so it is a 30px target with a
 * heavy stroke — readable at arm's length, and obvious whether it is on.
 */
function Hour({
  slot,
  selected,
  selectable,
  onToggle,
}: {
  slot: AvailabilitySlot;
  selected: boolean;
  selectable: boolean;
  onToggle: () => void;
}) {
  const peak = slot.rateKind === "Peak";

  const tile = !slot.isOpen
    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
    : selected
      ? "border-[#2563EB] bg-blue-50 text-[#071955] shadow-md shadow-blue-600/15"
      : peak
        ? "border-amber-300 bg-amber-50 text-[#071955]"
        : "border-slate-200 bg-white text-[#071955]";

  return (
    <button
      type="button"
      disabled={!selectable}
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex min-h-[88px] flex-col justify-between gap-2 rounded-2xl border-2 p-3.5 text-left transition ${tile} ${
        selectable ? "cursor-pointer" : ""
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold tracking-tight">
            {clock(slot.startsAt)} – {clock(slot.endsAt)}
          </span>
          <span
            className={`text-xs font-bold ${
              !slot.isOpen ? "text-slate-400" : peak ? "text-amber-700" : "text-slate-500"
            }`}
          >
            {slot.hasPassed
              ? "Gone"
              : !slot.isOpen
                ? "Booked"
                : slot.rate === null
                  ? "No price set"
                  : `${peso(slot.rate)}/hr`}
          </span>
        </span>

        <span
          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 ${
            !slot.isOpen
              ? "border-dashed border-slate-300"
              : selected
                ? "border-[#2563EB] bg-[#2563EB]"
                : "border-slate-300 bg-white"
          }`}
        >
          {selected && slot.isOpen && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4.5 12.5l5 5 10-11"
                stroke="#ffffff"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </span>

      {peak && slot.isOpen && (
        <span className="self-start rounded-md bg-amber-200 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-amber-900">
          PEAK
        </span>
      )}
    </button>
  );
}

/**
 * One line of the court's rate card. Every configured rate is listed whichever
 * day is open, and the one in force today is marked — a customer picking
 * between a Tuesday and a Saturday needs to see both numbers to choose.
 */
function Rate({
  label,
  amount,
  note,
  applies,
}: {
  label: string;
  amount: number;
  note?: string;
  applies: boolean;
}) {
  return (
    <div
      className={`-mx-2.5 flex flex-col gap-0.5 rounded-xl px-2.5 py-1.5 ${
        applies ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <dt className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          {label}
          {applies && (
            <span className="rounded bg-[#2563EB] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-white">
              TODAY
            </span>
          )}
        </dt>
        <dd className="font-extrabold text-[#071955]">
          {peso(amount)}
          <span className="text-xs font-semibold text-slate-400">/hr</span>
        </dd>
      </div>
      {note && <p className="text-[11px] font-semibold text-slate-400">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
        {aside && <span className="text-xs font-semibold text-slate-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      {children}
    </p>
  );
}

function Key({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
      <span className={`h-3.5 w-3.5 rounded border-2 ${className}`} />
      {children}
    </span>
  );
}

function Line({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="font-semibold text-slate-600">
        {label}
        {note && <span className="ml-1 font-medium text-slate-400">{note}</span>}
      </dt>
      <dd className="font-bold text-[#071955]">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default BookingPage;
