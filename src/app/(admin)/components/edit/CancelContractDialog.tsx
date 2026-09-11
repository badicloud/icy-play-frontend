"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import type { ContractDetail } from "@auth/adminApi";
import { useCancelContract } from "@auth/hooks/useFacilityOwnerEdits";
import EditDialog from "./EditDialog";

type CancelContractDialogProps = {
  facilityOwnerId: string;
  contract: ContractDetail | null;
  /** True when this is the only live term, so cancelling it ends bookability. */
  isLastLiveTerm: boolean;
  onClose: () => void;
};

function CancelContractDialog({
  facilityOwnerId,
  contract,
  isLastLiveTerm,
  onClose,
}: CancelContractDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const cancel = useCancelContract(facilityOwnerId);
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    if (!contract) {
      return;
    }

    try {
      await cancel.mutateAsync({ contractId: contract.id, reason: reason.trim() });
      enqueueSnackbar("The term is cancelled.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Cancel this term"
      description="Cancelling ends the contract. It cannot be undone, but a new term can be commenced."
      open={contract !== null}
      isSaving={cancel.isPending}
      error={cancel.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleConfirm()}
      confirmLabel="Cancel the term"
      busyLabel="Cancelling…"
      destructive
      reasonRequired
      reasonLabel="Why is this term being cancelled?"
      reasonHint="Required. Ending a contract is the change most worth being able to explain later."
    >
      {contract && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-[#071955]">
              {format(new Date(contract.startDate), "d MMM yyyy")} &ndash;{" "}
              {format(new Date(contract.endDate), "d MMM yyyy")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Commenced by {contract.commencedByName ?? "an account that no longer exists"} on{" "}
              {format(new Date(contract.createdAt), "d MMM yyyy")}
            </p>
            {contract.notes && (
              <p className="mt-1.5 text-sm text-slate-600">{contract.notes}</p>
            )}
          </div>

          <p
            className={`mt-4 flex gap-2.5 rounded-2xl p-4 text-sm font-semibold ${
              contract.isLiveToday && isLastLiveTerm
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-[#164eaa]"
            }`}
          >
            <WarningAmberOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
            <span>
              {contract.isLiveToday && isLastLiveTerm
                ? "This is the term the owner is live on. Cancelling it takes their facility off the booking portal immediately."
                : "This term is not what makes the owner bookable today, so cancelling it does not change what customers can see."}
            </span>
          </p>
        </>
      )}
    </EditDialog>
  );
}

export default CancelContractDialog;
