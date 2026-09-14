"use client";

import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import {
  useAttendantEmailCheck,
  useInviteAttendant,
} from "@auth/hooks/useFacilityOwnerEdits";
import type { AttendantEmailCheck } from "@auth/adminApi";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

type InviteAttendantDialogProps = {
  facilityOwnerId: string;
  facilityId: string;
  facilityName: string;
  open: boolean;
  onClose: () => void;
};

/** Long enough that a typist is not asking the server on every keystroke. */
const TypingPause = 400;

/**
 * The address as it stood once the admin stopped typing.
 *
 * Asking on every keystroke would put a question to the server for every
 * half-written address on the way to the real one, and answer the wrong ones
 * loudest.
 */
function useSettledValue<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

/**
 * What the console says about an address it has just looked up.
 *
 * Each one names the address itself. An admin who has mistyped a colleague's
 * address is reading to find out which one they got wrong, and a message that
 * only says "that address" hands them nothing to check it against.
 */
function verdict(check: AttendantEmailCheck) {
  switch (check.status) {
    case "AlreadyAttending":
      return `${check.email} already works this venue.`;
    case "IsTheOwner":
      return `${check.email} is the owner's own address. They attend this venue already.`;
    case "AlreadyRegistered":
      // Said plainly, because the admin's next move is to go and ask their
      // colleague which address they actually use.
      return `${check.email} already has an IcyPlay account, so it cannot be used. Try one nobody has signed up with.`;
    default:
      return undefined;
  }
}

/**
 * Puts somebody on a venue's desk.
 *
 * They are invited rather than created outright: nobody here ever knows their
 * password, and the emailed link is what turns the account into theirs — the
 * same way a facility owner is onboarded.
 */
function InviteAttendantDialog({
  facilityOwnerId,
  facilityId,
  facilityName,
  open,
  onClose,
}: InviteAttendantDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const invite = useInviteAttendant(facilityOwnerId, facilityId);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  // Addresses are held in lower case, and somebody typing a colleague's email
  // from memory will capitalise it differently every time.
  const typed = email.trim().toLowerCase();
  const settled = useSettledValue(typed, TypingPause);
  const check = useAttendantEmailCheck(facilityOwnerId, facilityId, settled);

  // Only ever the answer to what is in the box now. A verdict left over from
  // the address before it would refuse a perfectly good one.
  const answer = check.data?.email === typed ? check.data : undefined;
  const taken = answer ? verdict(answer) : undefined;

  const nameError = fullName.trim() === "" ? "Enter their name." : undefined;
  const emailError =
    email.trim() === ""
      ? "Enter their email address."
      : !email.includes("@")
        ? "That does not look like an email address."
        : taken;

  // An answer still on its way is not an answer. Saving through it would ask
  // the server the same question and get the same refusal, one round trip
  // later and with the dialog already closed.
  const waiting = typed.includes("@") && !answer && !check.isError;

  async function handleSave() {
    try {
      await invite.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phone.trim() === "" ? null : phone.trim(),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar(`${fullName.trim()} has been invited.`, { variant: "success" });
      setFullName("");
      setEmail("");
      setPhone("");
      setReason("");
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Add a court attendant"
      description={`Somebody who confirms payments for ${facilityName}.`}
      open={open}
      isSaving={invite.isPending}
      error={invite.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!nameError && !emailError && !waiting}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="attendant-name"
          label="Full name"
          required
          value={fullName}
          onChange={setFullName}
          error={nameError}
        />
        <TextField
          id="attendant-email"
          label="Email"
          required
          value={email}
          onChange={setEmail}
          error={emailError}
          hint={
            waiting
              ? "Checking this address…"
              : "Where the invitation goes. They set their own password from it."
          }
        />
      </div>

      <div className="mt-5">
        <TextField
          id="attendant-phone"
          label="Mobile"
          value={phone}
          onChange={setPhone}
          hint="Optional."
        />
      </div>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        The address has to be one nobody has signed up with — one address, one IcyPlay account.
        That includes somebody who was taken off this venue before.
      </p>
    </EditDialog>
  );
}

export default InviteAttendantDialog;
