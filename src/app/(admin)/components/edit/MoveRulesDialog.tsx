"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { moveRuleLimits, type FacilityOwnerDetail } from "@auth/adminApi";
import { useUpdateMoveRules } from "@auth/hooks/useFacilityOwnerEdits";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

type MoveRulesDialogProps = {
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
 * How much moving a venue puts up with, set by the platform on its behalf.
 *
 * The same two dials the venue has on its own desk. Here for the venue that
 * rings up and asks, and every change lands in the venue's own settings
 * history marked as the platform's.
 */
function MoveRulesDialog({ owner, open, onClose }: MoveRulesDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateMoveRules(owner.id);

  const [limit, setLimit] = useState(String(owner.moveLimit));
  const [notice, setNotice] = useState(String(owner.moveNoticeDays));
  const [reason, setReason] = useState("");

  const limitError = problemWith(
    limit,
    moveRuleLimits.smallestLimit,
    moveRuleLimits.largestLimit,
    "moves",
  );
  const noticeError = problemWith(
    notice,
    moveRuleLimits.smallestNoticeDays,
    moveRuleLimits.largestNoticeDays,
    "days",
  );

  async function handleSave() {
    try {
      await update.mutateAsync({
        moveLimit: Number(limit),
        moveNoticeDays: Number(notice),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The move rules are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Booking moves"
      description="How often a customer may move a booking, and how close to its start moves stop. Every move still needs the venue's approval."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!limitError && !noticeError}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="move-limit"
          label="Moves per booking"
          required
          value={limit}
          onChange={setLimit}
          error={limitError}
          hint={`Only moves the venue approves are counted. Standard is ${moveRuleLimits.defaultLimit}.`}
        />
        <TextField
          id="move-notice"
          label="Moves close (days before it starts)"
          required
          value={notice}
          onChange={setNotice}
          error={noticeError}
          hint={`From 1 day (24 hours) to 7 (a week). Standard is ${moveRuleLimits.defaultNoticeDays}.`}
        />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Once a booking has started the notice no longer applies — what is left of it can still
        change court, and only court, with the venue&apos;s approval.
      </p>
    </EditDialog>
  );
}

export default MoveRulesDialog;
