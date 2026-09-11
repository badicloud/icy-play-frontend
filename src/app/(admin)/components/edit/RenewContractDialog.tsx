"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import type { UploadedFile } from "@auth/adminApi";
import { useRenewContract } from "@auth/hooks/useFacilityOwnerEdits";
import AgreementUploader from "../onboarding/AgreementUploader";
import { TextAreaField, TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFrom(startDate: string) {
  const date = new Date(startDate);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

type RenewContractDialogProps = {
  facilityOwnerId: string;
  /** The day after the last live term ends, when there is one. */
  suggestedStart: string | null;
  open: boolean;
  onClose: () => void;
};

function RenewContractDialog({
  facilityOwnerId,
  suggestedStart,
  open,
  onClose,
}: RenewContractDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const renew = useRenewContract(facilityOwnerId);

  const [startDate, setStartDate] = useState(suggestedStart ?? today());
  const [endDate, setEndDate] = useState(oneYearFrom(suggestedStart ?? today()));
  const [notes, setNotes] = useState("");
  const [document, setDocument] = useState<UploadedFile | null>(null);
  const [reason, setReason] = useState("");

  const datesMakeSense = startDate !== "" && endDate !== "" && endDate >= startDate;
  // A term without the signed agreement is a claim, not a record.
  const canSave = datesMakeSense && document !== null;
  const startsInFuture = startDate > today();

  async function handleSave() {
    try {
      await renew.mutateAsync({
        startDate,
        endDate,
        notes: notes.trim() === "" ? null : notes.trim(),
        document: document!,
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The new term is recorded.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Commence a new term"
      description="A renewal adds a term beside the old one rather than rewriting it."
      open={open}
      isSaving={renew.isPending}
      error={renew.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="renew-start"
          label="Start date"
          type="date"
          required
          value={startDate}
          onChange={setStartDate}
        />
        <TextField
          id="renew-end"
          label="End date"
          type="date"
          required
          value={endDate}
          onChange={setEndDate}
          error={
            startDate !== "" && endDate !== "" && endDate < startDate
              ? "A contract cannot end before it starts."
              : undefined
          }
        />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-bold text-[#071955]">
            Signed agreement
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </p>
          <AgreementUploader id="renew-agreement" value={document} onChange={setDocument} />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            id="renew-notes"
            label="Notes"
            rows={2}
            value={notes}
            onChange={setNotes}
            placeholder="Agreement reference, or anything the next admin should know."
          />
        </div>
      </div>

      <p
        className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
          startsInFuture ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
        }`}
      >
        {startsInFuture
          ? "This term starts later, so the owner stays as they are until it begins."
          : "This term covers today, so the owner is live as soon as it is saved."}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        A term that overlaps a contract still running is refused. Two live terms covering one day
        cannot both be the one platform fees are calculated against.
      </p>
    </EditDialog>
  );
}

export default RenewContractDialog;
