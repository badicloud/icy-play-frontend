"use client";

import { format } from "date-fns";
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
  );
}

export default BookingDetails;
