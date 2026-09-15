"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { moveBooking, sameKindOfDay, type BookingDetail } from "@auth/bookingApi";

/** As far ahead as a court takes bookings, so the picker cannot offer further. */
const DaysAhead = 90;

function iso(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return shifted.toISOString().slice(0, 10);
}

function longDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Moving a booking to another date.
 *
 * Only the date is asked for. The hours, the court and the number of days stay
 * as they were — that is what keeps the total identical, which is what lets a
 * move happen at all when the money is already with the venue.
 */
function MoveBookingDialog({
  booking,
  onClose,
}: {
  booking: BookingDetail | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [date, setDate] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // A date typed against one booking must not follow the dialog to the next.
  useEffect(() => {
    setDate("");
    setProblem(null);
  }, [booking?.id]);

  const move = useMutation({
    mutationFn: (startDate: string) => moveBooking(booking!.id, startDate),
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

  // Tomorrow at the earliest: the rule is more than a day's notice, and a
  // picker that offers today would be offering a refusal.
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 1);

  const latest = new Date();
  latest.setDate(latest.getDate() + DaysAhead);

  const days = booking.endDate === booking.startDate
    ? 1
    : (Date.parse(booking.endDate) - Date.parse(booking.startDate)) / 86400000 + 1;

  const wrongKind = date !== "" && !sameKindOfDay(booking.startDate, date);
  const ready = date !== "" && !wrongKind && !move.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-[#071955]">Move this booking</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {booking.courtName} at {booking.facilityName}. The hours stay as they are — only the date
          changes.
        </p>

        <dl className="mt-4 space-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Currently</dt>
            <dd className="font-bold text-[#071955]">{longDate(booking.startDate)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Moves left</dt>
            <dd className="font-bold text-[#071955]">
              {booking.movesLeft} of 3
            </dd>
          </div>
        </dl>

        <label htmlFor="move-date" className="mt-5 block text-sm font-bold text-[#071955]">
          Move it to
        </label>
        <input
          id="move-date"
          type="date"
          value={date}
          min={iso(earliest)}
          max={iso(latest)}
          onChange={(event) => {
            setDate(event.target.value);
            setProblem(null);
          }}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#071955] outline-none focus:border-[#2563EB]"
        />

        {days > 1 && (
          <p className="mt-2 text-xs font-medium text-slate-500">
            This is a {days}-day booking. Pick the first day; the rest follow.
          </p>
        )}

        {wrongKind && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            A weekday booking moves to a weekday and a weekend one to a weekend. Those days are
            priced differently, and a move cannot change what you have paid.
          </p>
        )}

        {problem && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {problem}
          </p>
        )}

        <p className="mt-4 text-xs leading-5 font-medium text-slate-500">
          The hours you leave go back on sale straight away. Nothing further is charged and nothing
          is returned — see the{" "}
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

        <div className="mt-6 flex flex-wrap justify-end gap-3">
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
            onClick={() => move.mutate(date)}
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

export default MoveBookingDialog;
