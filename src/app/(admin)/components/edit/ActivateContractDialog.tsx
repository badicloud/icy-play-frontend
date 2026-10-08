"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import type { ContractDetail } from "@auth/adminApi";
import { useActivateContract } from "@auth/hooks/useFacilityOwnerEdits";
import EditDialog from "./EditDialog";

type ActivateContractDialogProps = {
  facilityOwnerId: string;
  contract: ContractDetail | null;
  onClose: () => void;
};

/**
 * Starts a signed term early. For an owner whose current term has ended or
 * been cancelled and whose next one is already on file: otherwise their courts
 * are off sale until the date on it arrives.
 */
function ActivateContractDialog({ facilityOwnerId, contract, onClose }: ActivateContractDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const activate = useActivateContract(facilityOwnerId);
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    if (!contract) {
      return;
    }

    try {
      await activate.mutateAsync({ contractId: contract.id, reason: reason.trim() });
      enqueueSnackbar("The term starts today.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Start this term today"
      description="Brings the term forward so it is in force from today. Its end date, rates and payment terms stay as they are."
      open={contract !== null}
      isSaving={activate.isPending}
      error={activate.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleConfirm()}
      confirmLabel="Start it today"
      busyLabel="Starting…"
      reasonRequired
      reasonLabel="Why is this term starting early?"
      reasonHint="Required. A term starting before the date that was signed is worth being able to explain later."
    >
      {contract && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-[#071955]">
              {format(new Date(contract.startDate), "d MMM yyyy")} &ndash;{" "}
              {format(new Date(contract.endDate), "d MMM yyyy")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Becomes today &ndash; {format(new Date(contract.endDate), "d MMM yyyy")}
            </p>
            <p className="mt-1.5 text-sm text-slate-600">
              ₱{contract.platformHourlyRate.toFixed(2)} an hour · {contract.commissionPercentage}%
              commission · paid {contract.paymentMode === "Direct" ? "online" : "by GCash receipt"}
            </p>
          </div>

          <p className="mt-4 flex gap-2.5 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-[#164eaa]">
            <InfoOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
            <span>
              If another term is still live today, this is refused &mdash; cancel that one first. Once
              started, the owner&rsquo;s courts are bookable under this term straight away.
            </span>
          </p>
        </>
      )}
    </EditDialog>
  );
}

export default ActivateContractDialog;
