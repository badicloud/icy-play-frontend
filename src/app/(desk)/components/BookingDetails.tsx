"use client";

import { format } from "date-fns";
import { useState } from "react";
import { useDeskBookingHistory } from "@auth/hooks/useDesk";
import type { DeskBooking } from "@auth/deskApi";

export function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function day(value: string) {
  return format(new Date(value), "d MMM yyyy");
}

/** "6 Sep" or "6–8 Sep", because a run of days is one thing, not three. */
export function dates(booking: DeskBooking) {
  return booking.startDate === booking.endDate
    ? day(booking.startDate)
    : `${day(booking.startDate)} – ${day(booking.endDate)}`;
}

export function hour(value: string) {
  return value.slice(0, 5);
}

/** A time as the desk would read it aloud: the day, then the clock. */
function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * What has happened to this booking, newest first.
 *
 * The same trail the customer reads on their own card, because it is the same
 * booking. Shut by default and fetched on opening: a desk works down a queue,
 * and most of the bookings in it are confirmed without anybody needing to ask
 * what came before.
 */
function BookingTrail({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const history = useDeskBookingHistory(bookingId, open);
  const entries = history.data ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-[#071955]">Booking history</span>
        <span className="text-xs font-bold text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          {history.isPending ? (
            <p className="text-sm text-slate-500">Loading history…</p>
          ) : history.isError ? (
            <p className="text-sm text-slate-500">The history could not be loaded.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing has happened to this booking yet.</p>
          ) : (
            <ol className="space-y-3">
              {entries.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex gap-3">
                  {/* A line down the side, so a run of entries reads as one
                      story rather than as separate notices. */}
                  <span className="relative flex w-3 shrink-0 justify-center" aria-hidden>
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2563EB]" />
                    {index < entries.length - 1 && (
                      <span className="absolute top-4 bottom-[-0.75rem] w-px bg-slate-200" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#071955]">
                      {entry.description}
                    </span>
                    {entry.reason && (
                      <span className="mt-0.5 block text-sm text-slate-600">
                        Reason: {entry.reason}
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs font-medium text-slate-400">
                      {stamp(entry.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Everything the desk needs about one booking: who took it, which hours, what
 * it came to, and the receipt they sent.
 *
 * One component for three places — the confirmations queue, the court diary's
 * list, and the panel beside the calendar. They are all the same question, and
 * three answers to it would drift.
 *
 * `stacked` is for the narrow column beside a calendar, where the two columns
 * this normally uses would each be too thin to read.
 */
function BookingDetails({
  booking,
  stacked = false,
}: {
  booking: DeskBooking;
  stacked?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className={stacked ? "space-y-5" : "grid gap-6 lg:grid-cols-2"}>
        <div>
          <h4 className="text-xs font-bold tracking-wide text-slate-400 uppercase">Who booked it</h4>
          <p className="mt-2 font-semibold text-[#071955]">{booking.customerName}</p>
          <p className="text-sm break-all text-slate-500">{booking.customerEmail}</p>
          {booking.customerPhone && (
            <p className="text-sm text-slate-500">{booking.customerPhone}</p>
          )}

          <h4 className="mt-5 text-xs font-bold tracking-wide text-slate-400 uppercase">
            The hours
          </h4>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {booking.slots.map((slot) => (
              <li
                key={`${slot.date}-${slot.startsAt}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="text-slate-600">
                  {day(slot.date)} · {hour(slot.startsAt)}–{hour(slot.endsAt)}
                </span>
                <span className="font-semibold text-[#071955]">{peso(slot.amount)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Court</dt>
              <dd className="font-semibold text-[#071955]">{peso(booking.rentalTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Platform fee</dt>
              <dd className="font-semibold text-[#071955]">{peso(booking.platformFeeTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <dt className="font-bold text-[#071955]">
                {booking.status === "Confirmed" ? "Paid" : "Total"}
              </dt>
              <dd className="font-bold text-[#071955]">{peso(booking.total)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-xs font-bold tracking-wide text-slate-400 uppercase">
            What they sent
          </h4>

          {booking.receiptUrl ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={booking.receiptUrl}
                alt={`GCash receipt from ${booking.customerName}`}
                className="w-full max-w-sm rounded-xl border border-slate-200"
              />
              <a
                href={booking.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#164eaa] underline-offset-2 hover:underline"
              >
                Open it full size
              </a>
              {booking.receiptUploadedAt && (
                <p className="mt-1 text-xs text-slate-400">
                  Sent {day(booking.receiptUploadedAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {booking.status === "PendingPayment"
                ? "They are still paying. Nothing has been sent yet."
                : "No receipt on this booking."}
            </p>
          )}

          {booking.decisionReason && (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {booking.decisionReason}
            </p>
          )}
        </div>
      </div>

      <BookingTrail bookingId={booking.id} />
    </div>
  );
}

export default BookingDetails;
