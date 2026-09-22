"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import type { ContractDetail, UploadedFile } from "@auth/adminApi";
import { useReplaceAgreement } from "@auth/hooks/useFacilityOwnerEdits";
import AgreementUploader from "../onboarding/AgreementUploader";
import EditDialog from "./EditDialog";

type ReplaceAgreementDialogProps = {
  facilityOwnerId: string;
  contract: ContractDetail | null;
  onClose: () => void;
};

/**
 * The paperwork on a term that already exists: attaching it when the scan
 * arrives late, or swapping it when the one on file is unreadable or wrong.
 * Both are real mistakes to recover from, and either way the change is
 * recorded with the file names on both sides so it can be followed afterwards.
 * The wording follows which of the two is happening — "Replace" over a term
 * with nothing attached reads as though a file went missing.
 */
function ReplaceAgreementDialog({
  facilityOwnerId,
  contract,
  onClose,
}: ReplaceAgreementDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const replace = useReplaceAgreement(facilityOwnerId);
  const [document, setDocument] = useState<UploadedFile | null>(null);
  const [reason, setReason] = useState("");
  const swapping = contract?.document != null;

  async function handleSave() {
    if (!contract || !document) {
      return;
    }

    try {
      await replace.mutateAsync({
        contractId: contract.id,
        document,
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar(
        swapping ? "The signed agreement is replaced." : "The signed agreement is attached.",
        { variant: "success" },
      );
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title={swapping ? "Replace the signed agreement" : "Attach the signed agreement"}
      description="The term itself does not change, only the document attached to it."
      open={contract !== null}
      isSaving={replace.isPending}
      error={replace.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={document !== null}
      confirmLabel={swapping ? "Replace the agreement" : "Attach the agreement"}
      busyLabel={swapping ? "Replacing…" : "Attaching…"}
    >
      {contract && (
        <>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-[#071955]">
              {format(new Date(contract.startDate), "d MMM yyyy")} &ndash;{" "}
              {format(new Date(contract.endDate), "d MMM yyyy")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {contract.document
                ? `Currently attached: ${contract.document.fileName}`
                : "Nothing attached yet."}
            </p>
          </div>

          <AgreementUploader
            id="replace-agreement"
            value={document}
            onChange={setDocument}
          />
        </>
      )}
    </EditDialog>
  );
}

export default ReplaceAgreementDialog;
