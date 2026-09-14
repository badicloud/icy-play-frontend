"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueries } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import {
  bookingHref,
  clock,
  createBooking,
  datesBetween,
  getAvailability,
  peso,
  readCheckout,
  type AvailabilityDay,
  type AvailabilitySlot,
} from "@auth/bookingApi";
import CheckoutSteps from "./CheckoutSteps";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/**
 * Step one: what you picked, what it costs, and one button that turns it into a
 * held court.
 *
 * Nothing is created until that button. A customer who arrives here and changes
 * their mind has cost the venue nothing — which is the whole reason this step
 * exists rather than booking straight from the grid.
 *
 * The hours are re-read from availability rather than taken from the address
 * bar: the URL says WHICH hours, the server says whether they are still free and
 * what they cost. Between choosing and arriving here, somebody else may have
 * taken one.
 */
function CheckoutReview({ bookableCourtId }: { bookableCourtId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [problem, setProblem] = useState<string | null>(null);

  const choice = readCheckout(new URLSearchParams(search.toString()));
  const dates = choice === null ? [] : datesBetween(choice.from, choice.to);

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["availability", bookableCourtId, date],
      queryFn: () => getAvailability(bookableCourtId, date),
      staleTime: 15 * 1000,
    })),
  });

  const booking = useMutation({
    mutationFn: createBooking,
    onSuccess: (created) => router.replace(`/bookings/${created.id}`),
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
      ),
  });

  if (choice === null) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-[#071955]">We lost track of your choice</h1>
        <p className="mt-2 text-slate-500">Pick your hours again and we will carry on from there.</p>
        <Back bookableCourtId={bookableCourtId} />
      </Shell>
    );
  }

  if (results.some((result) => result.isPending)) {
    return (
      <Shell>
        <p className="text-slate-500">Checking those hours are still free…</p>
      </Shell>
    );
  }

  const days = results
    .map((result) => result.data)
    .filter((day): day is AvailabilityDay => day !== undefined);

  if (days.length !== dates.length) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-[#071955]">This court is not taking bookings</h1>
        <Back bookableCourtId={bookableCourtId} />
      </Shell>
    );
  }

  // What the URL asked for, as the server sees it now.
  const wanted: { date: string; slot: AvailabilitySlot }[] =
    choice.kind === "Hourly"
      ? days[0].slots
          .filter((slot) => choice.hours.includes(slot.startsAt))
          .map((slot) => ({ date: days[0].date, slot }))
      : days.flatMap((day) => day.slots.map((slot) => ({ date: day.date, slot })));

  const gone = wanted.filter((entry) => !entry.slot.isOpen);
  const open = wanted.filter((entry) => entry.slot.isOpen);
  const rental = open.reduce((sum, entry) => sum + (entry.slot.rate ?? 0), 0);
  const fee = open.reduce((sum, entry) => sum + entry.slot.platformFee, 0);

  const venue = days[0];
  const shut = days.some((day) => day.isUnderMaintenance || day.isClosed);
  const blocked = shut || gone.length > 0 || open.length === 0;

  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <CheckoutSteps current={1} />

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#071955]">
          Check your booking
        </h1>
        <p className="mt-1 text-slate-500">
          {venue.courtName} · {venue.facilityName}
        </p>

        {gone.length > 0 && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {gone.length === 1
              ? "One of those hours has been taken since you picked it."
              : `${gone.length} of those hours have been taken since you picked them.`}{" "}
            Go back and choose again.
          </p>
        )}

        {shut && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This court is closed on one of those days.
          </p>
        )}

        <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {open.length} {open.length === 1 ? "hour" : "hours"}
              {choice.kind !== "Hourly" && ` · ${dates.length > 1 ? `${dates.length} days` : "whole day"}`}
            </h2>
          </div>

          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {open.map((entry) => (
              <li
                key={`${entry.date}-${entry.slot.startsAt}`}
                className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-3"
              >
                <span className="font-semibold text-[#071955]">
                  {longDate(entry.date)} · {clock(entry.slot.startsAt)} –{" "}
                  {clock(entry.slot.endsAt)}
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {entry.slot.rateKind}
                  </span>
                  <span className="font-bold text-[#071955]">{peso(entry.slot.rate ?? 0)}</span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-2 border-t border-slate-100 px-6 py-5">
            <Line label="Court rental" value={peso(rental)} />
            <Line label="Platform fee" value={peso(fee)} />
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
              <dt className="font-extrabold text-[#071955]">Total</dt>
              <dd className="text-2xl font-extrabold tracking-tight text-[#071955]">
                {peso(rental + fee)}
              </dd>
            </div>
          </dl>
        </section>

        {problem && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {problem}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={bookingHref(bookableCourtId, choice.kind, dates, choice.hours)}
            className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
          >
            ← Change my hours
          </Link>

          <button
            type="button"
            disabled={blocked || booking.isPending}
            onClick={() => {
              setProblem(null);
              booking.mutate({
                bookableCourtId,
                kind: choice.kind,
                slots: open.map((entry) => ({
                  date: entry.date,
                  startsAt: entry.slot.startsAt,
                })),
              });
            }}
            className={`rounded-full px-8 py-3.5 text-sm font-bold transition ${
              blocked || booking.isPending
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-[#2563EB] text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
            }`}
          >
            {booking.isPending ? "Holding the court…" : "Hold this court"}
          </button>
        </div>

        <p className="mt-3 text-right text-sm text-slate-400">
          We will hold it while you pay. Nothing is charged here.
        </p>
      </div>

      <PublicFooter />
    </main>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="font-bold text-[#071955]">{value}</dd>
    </div>
  );
}

function Back({ bookableCourtId }: { bookableCourtId: string }) {
  return (
    <Link
      href={`/book/${bookableCourtId}`}
      className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
    >
      Back to the court
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">{children}</div>
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

export default CheckoutReview;
