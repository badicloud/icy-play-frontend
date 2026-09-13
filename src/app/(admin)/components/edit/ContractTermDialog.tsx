"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { format, parseISO } from "date-fns";
import type { ContractDetail } from "@auth/adminApi";
import { useUpdateContractTerm } from "@auth/hooks/useFacilityOwnerEdits";
import { TextAreaField, TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

type ContractTermDialogProps = {
  facilityOwnerId: string;
  contract: ContractDetail;
  open: boolean;
  onClose: () => void;
};

/**
 * The dates of a term. A start date typed wrong leaves an owner invisible to
 * customers until it comes round — which looks like a broken listing rather
 * than a mistyped date, so the dates have to be visible and correctable.
 */
function ContractTermDialog({
  facilityOwnerId,
  contract,
  open,
  onClose,
}: ContractTermDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateContractTerm(facilityOwnerId);

  const [startDate, setStartDate] = useState(contract.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(contract.endDate.slice(0, 10));
  const [notes, setNotes] = useState(contract.notes ?? "");
  const [reason, setReason] = useState("");

  const dateError =
    startDate === "" || endDate === ""
      ? "Both dates are needed."
      : endDate < startDate
        ? "A term cannot end before it starts."
        : undefined;

  const now = today();
  const coversToday = !dateError && startDate <= now && now <= endDate;

  async function handleSave() {
    try {
      await update.mutateAsync({
        contractId: contract.id,
        startDate,
        endDate,
        notes: notes.trim() === "" ? null : notes.trim(),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The term is saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Contract term"
      description="When this term runs. It is what decides whether customers can see this owner."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!dateError}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="term-start"
          label="Starts"
          type="date"
          required
          value={startDate}
          onChange={setStartDate}
          error={dateError && startDate === "" ? dateError : undefined}
        />
        <TextField
          id="term-end"
          label="Ends"
          type="date"
          required
          value={endDate}
          onChange={setEndDate}
          error={dateError && startDate !== "" ? dateError : undefined}
        />
      </div>

      {/* The one thing the reader came to find out. */}
      <p
        className={`mt-4 rounded-2xl p-4 text-sm ${
          coversToday ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
        }`}
      >
        {coversToday ? (
          <>
            This term covers today, so the owner is live and their courts show to
            customers.
          </>
        ) : dateError ? (
          <>Fix the dates to see whether this term covers today.</>
        ) : startDate > now ? (
          <>
            This term does not start until{" "}
            <strong>{format(parseISO(startDate), "d MMMM yyyy")}</strong>. Until then the
            owner stays Pending and their courts are invisible to customers.
          </>
        ) : (
          <>
            This term ended on <strong>{format(parseISO(endDate), "d MMMM yyyy")}</strong>,
            so the owner is not live and their courts are invisible to customers.
          </>
        )}
      </p>

      <div className="mt-5">
        <TextAreaField
          id="term-notes"
          label="Notes"
          rows={3}
          value={notes}
          onChange={setNotes}
        />
      </div>
    </EditDialog>
  );
}

export default ContractTermDialog;
