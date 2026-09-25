"use client";

import { useEffect, useState } from "react";
import ReasonPicker, {
  emptyReason,
  reasonAnswerOf,
  type ReasonDraft,
} from "@/app/components/ui/ReasonPicker";
import {
  REJECT_NOTE_LIMIT,
  REJECT_REASONS,
  type DeskBooking,
  type RejectAnswer,
  type RejectReasonValue,
} from "@auth/deskApi";

type RejectBookingDialogProps = {
  /** Null when nothing is being turned down. */
  booking: DeskBooking | null;
  isSaving: boolean;
  onClose: () => void;
  onReject: (why: RejectAnswer) => void;
};

/**
 * Turning a payment down.
 *
 * Asks for a reason from a short list before it will do it. A rejection with
 * nothing against it leaves the next person at the desk — and the customer who
 * rings up about it — with no idea what was wrong; and a reason typed freely
 * cannot be counted, which is what the declined-bookings report does.
 */
function RejectBookingDialog({
  booking,
  isSaving,
  onClose,
  onReject,
}: RejectBookingDialogProps) {
  const [why, setWhy] = useState<ReasonDraft<RejectReasonValue>>(emptyReason);

  // A reason picked against one booking must not follow the dialog onto the
  // next one.
  useEffect(() => {
    setWhy(emptyReason());
  }, [booking?.id]);

  if (booking === null) {
    return null;
  }

  const answer = reasonAnswerOf(why, REJECT_NOTE_LIMIT);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-[#071955]">Turn this booking down</h2>
        <p className="mt-1 text-sm text-slate-500">
          {booking.customerName}&apos;s {booking.courtName} booking. The hours go straight back on
          sale, so somebody else can take them.
        </p>

        <ReasonPicker
          name="reject-reason"
          question="What was wrong with it?"
          hint="The customer is emailed this and sees it on their booking. It is counted in Declined Bookings."
          options={REJECT_REASONS}
          noteLimit={REJECT_NOTE_LIMIT}
          notePlaceholder="The receipt is for a different booking"
          value={why}
          onChange={setWhy}
          disabled={isSaving}
        />

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
            disabled={isSaving || answer === null}
            onClick={() => answer !== null && onReject(answer)}
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
