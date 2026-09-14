"use client";

import { useEffect, useState } from "react";
import type { DeskBooking } from "@auth/deskApi";

type RejectBookingDialogProps = {
  /** Null when nothing is being turned down. */
  booking: DeskBooking | null;
  isSaving: boolean;
  onClose: () => void;
  onReject: (reason: string | null) => void;
};

/**
 * Turning a payment down.
 *
 * Asks for a reason before it will do it. A rejection with nothing written
 * against it leaves the next person at the desk — and the customer who rings
 * up about it — with no idea what was wrong.
 */
function RejectBookingDialog({
  booking,
  isSaving,
  onClose,
  onReject,
}: RejectBookingDialogProps) {
  const [reason, setReason] = useState("");

  // A reason typed against one booking must not follow the dialog onto the
  // next one.
  useEffect(() => {
    setReason("");
  }, [booking?.id]);

  if (booking === null) {
    return null;
  }

  const tooShort = reason.trim().length < 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-[#071955]">Turn this booking down</h2>
        <p className="mt-1 text-sm text-slate-500">
          {booking.customerName}&apos;s {booking.courtName} booking. The hours go straight back on
          sale, so somebody else can take them.
        </p>

        <label
          htmlFor="reject-reason"
          className="mt-5 block text-sm font-bold text-[#071955]"
        >
          What was wrong with it?
        </label>
        <textarea
          id="reject-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="The amount sent does not match the total"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#2563EB]"
        />
        <p className="mt-1 text-xs text-slate-400">
          Recorded against the booking. The customer is not emailed this yet.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || tooShort}
            onClick={() => onReject(reason.trim())}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Turning it down…" : "Turn it down"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectBookingDialog;
