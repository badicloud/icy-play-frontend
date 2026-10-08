"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import {
  platformRateDefaults,
  type ContractDetail,
  type PaymentMode,
} from "@auth/adminApi";
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

const paymentModeOptions: { value: PaymentMode; title: string; description: string }[] = [
  {
    value: "Manual",
    title: "Manual (GCash receipt)",
    description:
      "The customer pays the venue's GCash and uploads proof. The desk checks it and confirms. The platform fee is billed to the owner.",
  },
  {
    value: "Direct",
    title: "Direct (online payment)",
    description:
      "The customer pays by QR Ph, GCash, Maya or card through the payment gateway, which confirms the booking by itself. The gateway's fee is added for the customer.",
  },
];

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
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(contract.paymentMode);
  const [holdMinutes, setHoldMinutes] = useState(String(contract.onlineHoldMinutes));
  const [reason, setReason] = useState("");

  const rate = numberOrNaN(hourlyRate);
  const percentage = numberOrNaN(commission);
  const hold = numberOrNaN(holdMinutes);

  // Only asked when it applies: a manual term's hold is the owner's own.
  const holdError =
    paymentMode !== "Direct"
      ? undefined
      : Number.isNaN(hold) || !Number.isInteger(hold)
        ? "Enter whole minutes."
        : hold < 5 || hold > 240
          ? "The online hold has to be between 5 and 240 minutes."
          : undefined;

  const switchingMode = paymentMode !== contract.paymentMode;

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
        paymentMode,
        onlineHoldMinutes: paymentMode === "Direct" ? hold : contract.onlineHoldMinutes,
      });
      enqueueSnackbar("The rates and payment terms are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Rates and payment"
      description="What IcyPlay charges under this contract term, and how customers pay."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!rateError && !commissionError && !holdError}
    >
      {/* An admin who means "switch this venue to online payment" and opens
          next year's term gets nothing today, and nothing on screen says why. */}
      {!contract.isLiveToday && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This is the term from {contract.startDate} to {contract.endDate}, which is not the one in
          force today. Changes here apply only to bookings made during it. To change how customers
          pay now, edit the term marked live today.
        </p>
      )}
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

      <fieldset className="mt-6">
        <legend className="text-sm font-bold text-[#071955]">How customers pay</legend>
        <p className="mt-1 text-sm text-slate-500">
          One or the other, never both. Changing it is a change to the signed agreement.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {paymentModeOptions.map((option) => {
            const selected = paymentMode === option.value;

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                  selected
                    ? "border-[#1767f5] bg-[#eef4ff]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="contract-payment-mode"
                  value={option.value}
                  checked={selected}
                  onChange={() => setPaymentMode(option.value)}
                  className="mt-1 h-4 w-4 accent-[#1767f5]"
                />
                <span>
                  <span className="block text-sm font-bold text-[#071955]">{option.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {paymentMode === "Direct" && (
        <div className="mt-5 sm:w-1/2">
          <TextField
            id="contract-online-hold"
            label="Online payment hold (minutes)"
            required
            value={holdMinutes}
            onChange={setHoldMinutes}
            error={holdError}
            hint={`How long a court is held while the customer pays online. Longer than a receipt hold, because they leave the site to pay. Standard is ${platformRateDefaults.onlineHoldMinutes}.`}
          />
        </div>
      )}

      {switchingMode && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {paymentMode === "Direct"
            ? "New bookings will be paid online. Bookings already waiting on a GCash receipt still finish that way."
            : "New bookings will be paid by GCash receipt. Bookings already being paid online still finish online."}
        </p>
      )}

      <p className="mt-4 text-sm text-slate-500">
        These apply to this term only. Renewing the contract starts the next one on
        the platform standard unless it is changed again.
      </p>
    </EditDialog>
  );
}

export default ContractRatesDialog;
