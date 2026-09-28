"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { bookingRuleLimits, type FacilityOwnerDetail } from "@auth/adminApi";
import { useUpdateBookingRules } from "@auth/hooks/useFacilityOwnerEdits";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

type BookingRulesDialogProps = {
  owner: FacilityOwnerDetail;
  open: boolean;
  onClose: () => void;
};

/** A whole number inside a range, or what is wrong with it. */
function problemWith(value: string, smallest: number, largest: number, noun: string) {
  const number = Number(value.trim() === "" ? Number.NaN : value);

  if (Number.isNaN(number)) {
    return `Enter a number of ${noun}.`;
  }

  if (!Number.isInteger(number)) {
    return `Whole ${noun} only.`;
  }

  return number < smallest || number > largest
    ? `Between ${smallest} and ${largest} ${noun}.`
    : undefined;
}

/**
 * How a venue's courts are booked and moved, set by the platform on its behalf.
 *
 * The same dials the venue has on its own desk. Here for the venue that rings
 * up and asks, and every change lands in the venue's own settings history
 * marked as the platform's.
 */
function BookingRulesDialog({ owner, open, onClose }: BookingRulesDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateBookingRules(owner.id);

  const [windowDays, setWindowDays] = useState(String(owner.bookingWindowDays));
  const [limit, setLimit] = useState(String(owner.moveLimit));
  const [notice, setNotice] = useState(String(owner.moveNoticeDays));
  const [reason, setReason] = useState("");

  const windowError = problemWith(
    windowDays,
    bookingRuleLimits.smallestWindowDays,
    bookingRuleLimits.largestWindowDays,
    "days",
  );
  const limitError = problemWith(
    limit,
    bookingRuleLimits.smallestLimit,
    bookingRuleLimits.largestLimit,
    "moves",
  );
  const noticeError = problemWith(
    notice,
    bookingRuleLimits.smallestNoticeDays,
    bookingRuleLimits.largestNoticeDays,
    "days",
  );

  async function handleSave() {
    try {
      await update.mutateAsync({
        bookingWindowDays: Number(windowDays),
        moveLimit: Number(limit),
        moveNoticeDays: Number(notice),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The booking rules are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Booking rules"
      description="How far ahead customers can book, how often a booking may be moved, and how close to its start moves stop. Every move still needs the venue's approval."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!windowError && !limitError && !noticeError}
    >
      <TextField
        id="booking-window"
        label="Customers can book up to (days ahead)"
        required
        value={windowDays}
        onChange={setWindowDays}
        error={windowError}
        hint={`Today included, from 7 (a week) to 30 (a month). At 30 the booking page shows two weeks and a button for the rest. Standard is ${bookingRuleLimits.defaultWindowDays}.`}
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <TextField
          id="move-limit"
          label="Moves per booking"
          required
          value={limit}
          onChange={setLimit}
          error={limitError}
          hint={`Only moves the venue approves are counted. Standard is ${bookingRuleLimits.defaultLimit}.`}
        />
        <TextField
          id="move-notice"
          label="Moves close (days before it starts)"
          required
          value={notice}
          onChange={setNotice}
          error={noticeError}
          hint={
            noticeError
              ? `From 1 day (24 hours) to 7 (a week). Standard is ${bookingRuleLimits.defaultNoticeDays}.`
              : `That is ${Number(notice) * 24} hours before the booking starts. From 1 day to 7; standard is ${bookingRuleLimits.defaultNoticeDays}.`
          }
        />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Once a booking has started the notice no longer applies — what is left of it can still
        change court, and only court, with the venue&apos;s approval.
      </p>
    </EditDialog>
  );
}

export default BookingRulesDialog;
