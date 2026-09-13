"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { platformRateDefaults, type ContractDetail } from "@auth/adminApi";
import { useUpdateContractRates } from "@auth/hooks/useFacilityOwnerEdits";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function numberOrNaN(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

type ContractRatesDialogProps = {
  facilityOwnerId: string;
  contract: ContractDetail;
  open: boolean;
  onClose: () => void;
};

/**
 * What IcyPlay charges under one term. The worked example is the point of the
 * dialog: an hourly rate and a percentage of the resulting bill are easy to set
 * and hard to picture, and the arithmetic is what the owner will argue about
 * later.
 */
function ContractRatesDialog({
  facilityOwnerId,
  contract,
  open,
  onClose,
}: ContractRatesDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateContractRates(facilityOwnerId);

  const [hourlyRate, setHourlyRate] = useState(String(contract.platformHourlyRate));
  const [commission, setCommission] = useState(String(contract.commissionPercentage));
  const [reason, setReason] = useState("");

  const rate = numberOrNaN(hourlyRate);
  const percentage = numberOrNaN(commission);

  const rateError = Number.isNaN(rate)
    ? "Enter an amount."
    : rate < 0
      ? "The platform rate cannot be negative."
      : undefined;

  const commissionError = Number.isNaN(percentage)
    ? "Enter a percentage."
    : percentage < 0 || percentage > 100
      ? "Commission has to be between 0 and 100 per cent."
      : undefined;

  // Fifty hours in a period: round enough that the reader can check the sums in
  // their head.
  const hours = 50;
  const platformBill = Number.isNaN(rate) ? 0 : Math.round(rate * hours * 100) / 100;
  const commissionAmount = Number.isNaN(percentage)
    ? 0
    : Math.round(((platformBill * percentage) / 100) * 100) / 100;
  const netAfterCommission = platformBill - commissionAmount;

  async function handleSave() {
    try {
      await update.mutateAsync({
        contractId: contract.id,
        platformHourlyRate: rate,
        commissionPercentage: percentage,
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The rates are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Platform rates"
      description="What IcyPlay charges under this contract term."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!rateError && !commissionError}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="contract-platform-rate"
          label="Platform rate per hour"
          required
          value={hourlyRate}
          onChange={setHourlyRate}
          error={rateError}
          hint={`Billed to the owner for every hour booked. Standard is ${peso(platformRateDefaults.hourlyRate)}.`}
        />
        <TextField
          id="contract-commission"
          label="Commission"
          required
          value={commission}
          onChange={setCommission}
          error={commissionError}
          hint={`Maintenance and commission, as a per cent of that bill. Standard is ${platformRateDefaults.commissionPercentage}%.`}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-[#071955]">
          On a period with {hours} hours booked
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">
              {hours} hours &times; {Number.isNaN(rate) ? "—" : peso(rate)}
            </dt>
            <dd className="font-semibold text-[#071955]">{peso(platformBill)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
            <dt className="font-bold text-[#071955]">Billed to the owner</dt>
            <dd className="font-bold text-[#071955]">{peso(platformBill)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">
              Maintenance and commission, {Number.isNaN(percentage) ? "—" : percentage}% of that
            </dt>
            <dd className="font-semibold text-[#071955]">{peso(commissionAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
            <dt className="text-slate-500">The rest of the bill</dt>
            <dd className="font-semibold text-[#071955]">{peso(netAfterCommission)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        These apply to this term only. Renewing the contract starts the next one on
        the platform standard unless it is changed again.
      </p>
    </EditDialog>
  );
}

export default ContractRatesDialog;
