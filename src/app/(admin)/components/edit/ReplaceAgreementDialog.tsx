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
 * Swapping the paperwork on a term that already exists. Allowed because an
 * unreadable or wrong scan is a real mistake, and the swap is recorded with
 * both file names so it can be followed afterwards.
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
      enqueueSnackbar("The signed agreement is replaced.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Replace the signed agreement"
      description="The term itself does not change, only the document attached to it."
      open={contract !== null}
      isSaving={replace.isPending}
      error={replace.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={document !== null}
      confirmLabel="Replace the agreement"
      busyLabel="Replacing…"
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
