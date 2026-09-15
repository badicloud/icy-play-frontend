"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  bookingState,
  clock,
  getMyBookings,
  peso,
  type BookingDetail,
} from "@auth/bookingApi";
import { activityIcon } from "@auth/catalogApi";
import HoldCountdown from "./HoldCountdown";
import Pager, { perPageOptions } from "./Pager";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/**
 * Amber is anything not settled, green is settled, red is refused, grey is over.
 * Four, because a fifth shade only makes a reader work out what it means.
 */
const tones = {
  warn: "bg-amber-100 text-amber-900",
  good: "bg-green-100 text-green-800",
  bad: "bg-red-100 text-red-800",
  quiet: "bg-slate-100 text-slate-500",
} as const;

/**
 * Everything this customer has booked.
 *
 * Reads the list, guards the route, and hands the rendering to List. Split that
 * way because the paging state belongs to a component that already has the
 * bookings — starting a page counter before they load means resetting it after.
 */
function MyBookings() {
  const bookings = useQuery({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
    // Short, because a hold runs down while the page is open.
    staleTime: 30 * 1000,
  });

  if (bookings.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading your bookings…</p>
      </Shell>
    );
  }

  if (bookings.isError) {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-[#071955]">We could not load your bookings</h1>
        <p className="mt-2 text-slate-500">
          Something went wrong at our end. Please try again in a moment.
        </p>
      </Shell>
    );
  }

  return <List bookings={bookings.data} />;
}

function List({ bookings }: { bookings: BookingDetail[] }) {
  const [perPage, setPerPage] = useState<number>(perPageOptions[0]);
  // One-based, the way the pager counts and the way it reads on screen.
  const [page, setPage] = useState(1);

  // Anything waiting on the customer floats to the front: it is the only kind
  // they can act on, and a hold that runs out puts the hours back on sale.
  const ordered = useMemo(
    () =>
      [...bookings].sort((a, b) =>
        Number(bookingState(b).needsYou) - Number(bookingState(a).needsYou),
      ),
    [bookings],
  );

  const waiting = ordered.filter((booking) => bookingState(booking).needsYou).length;
  const pages = Math.max(1, Math.ceil(ordered.length / perPage));
  // Clamped rather than reset: shrinking the page size while sitting on the
  // last page must not throw the reader back to the first.
  const current = Math.min(page, pages);
  const shown = ordered.slice((current - 1) * perPage, current * perPage);

  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#071955]">My bookings</h1>
        <p className="mt-1 text-slate-500">
          {ordered.length === 0
            ? "We could not find any bookings on your account yet."
            : `${ordered.length} ${ordered.length === 1 ? "booking" : "bookings"}, newest first.`}
        </p>

        {ordered.length === 0 && (
          <Link
            href="/#courts"
            className="mt-6 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Find a court
          </Link>
        )}

        {waiting > 0 && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {waiting === 1
              ? "One booking is waiting on you — it is held but not paid for."
              : `${waiting} bookings are waiting on you — held but not paid for.`}{" "}
            A hold that runs out puts the hours back on sale. They are listed first.
          </p>
        )}

        {ordered.length > 0 && (
          <>
            <div className="mt-4 flex flex-col gap-3">
              {shown.map((booking) => (
                <Card key={booking.id} booking={booking} />
              ))}
            </div>

            <Pager
              page={current}
              pageSize={perPage}
              totalItems={ordered.length}
              totalPages={pages}
              noun={{ one: "booking", many: "bookings" }}
              label="Bookings pages"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPerPage(size);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      <PublicFooter />
    </main>
  );
}

function Card({ booking }: { booking: BookingDetail }) {
  const [open, setOpen] = useState(false);
  const state = bookingState(booking);
  const icon = activityIcon(booking.sportKey);
  const first = booking.slots[0];
  const last = booking.slots[booking.slots.length - 1];

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white transition hover:border-slate-300">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full cursor-pointer p-5 text-left"
      >
        <span className="flex flex-wrap items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tracking-tight text-[#071955]">
              {booking.courtName}
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
              {booking.facilityName}
              {icon ? (
                <img
                  src={icon}
                  alt={booking.sportName}
                  title={booking.sportName}
                  className="h-5 w-5 shrink-0 object-contain"
                />
              ) : (
                <span className="font-medium text-slate-500">· {booking.sportName}</span>
              )}
            </span>
          </span>

          <span className="flex items-center gap-2.5">
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tones[state.tone]}`}>
              {state.label}
            </span>
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </span>

        {/*
            A hold running down is the one thing on this card that changes while
            somebody reads it, and the only one they can still do something
            about. On the shut card, so it is seen without opening anything.
         */}
        {booking.status === "PendingPayment" && !booking.hasLapsed && (
          <span className="mt-3 block">
            <HoldCountdown holdsUntil={booking.holdsUntil} compact />
          </span>
        )}

        <span className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-slate-100 pt-3.5">
          <span className="text-sm font-semibold text-slate-600">
            {when(booking)}
            {first && (
              <span className="font-medium text-slate-500">
                {" · "}
                {clock(first.startsAt)} – {clock(last.endsAt)}
              </span>
            )}
          </span>

          <span className="text-sm font-semibold text-slate-600">
            {booking.bookedHours} {booking.bookedHours === 1 ? "hour" : "hours"}
            <span className="ml-3 text-base font-extrabold text-[#071955]">
              {peso(booking.total)}
            </span>
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            The hours
          </h3>
          <ul className="mt-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {booking.slots.map((slot) => (
              <li
                key={`${slot.date}-${slot.startsAt}`}
                className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm font-semibold text-[#071955]">
                  {longDate(slot.date)} · {clock(slot.startsAt)} – {clock(slot.endsAt)}
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {slot.rateKind}
                  </span>
                  <span className="text-sm font-bold text-[#071955]">{peso(slot.amount)}</span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-1.5">
            <Line label="Court rental" value={peso(booking.rentalTotal)} />
            <Line label="Platform fee" value={peso(booking.platformFeeTotal)} />
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2">
              <dt className="text-sm font-extrabold text-[#071955]">Total</dt>
              <dd className="text-lg font-extrabold tracking-tight text-[#071955]">
                {peso(booking.total)}
              </dd>
            </div>
          </dl>

          <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Payment receipt
          </h3>
          {booking.receiptUrl === null ? (
            <p className="mt-2 text-sm text-slate-400">Nothing sent yet.</p>
          ) : (
            <div className="mt-2">
              <a
                href={booking.receiptUrl}
                target="_blank"
                rel="noreferrer"
                title="Open full size"
                className="inline-block rounded-2xl border border-slate-200 bg-white p-2 transition hover:border-slate-300"
              >
                <Image
                  src={booking.receiptUrl}
                  alt="The GCash receipt you sent"
                  width={140}
                  height={190}
                  unoptimized
                  className="max-h-48 w-auto rounded-xl object-contain"
                />
              </a>
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <Link
              href={`/bookings/${booking.id}`}
              className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
            >
              Open this booking &rarr;
            </Link>
          </div>
        </div>
      )}
    </article>
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

/** One day, or a range, said the way a person would say it. */
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

export default MyBookings;
