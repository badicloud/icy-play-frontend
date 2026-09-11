"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import type { FacilityOwnerDetail } from "@auth/adminApi";
import { useUpdateBusiness } from "@auth/hooks/useFacilityOwnerEdits";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

type BusinessEditDialogProps = {
  detail: FacilityOwnerDetail;
  open: boolean;
  onClose: () => void;
};

function BusinessEditDialog({ detail, open, onClose }: BusinessEditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateBusiness(detail.id);

  const [businessName, setBusinessName] = useState(detail.businessName);
  const [billingEmail, setBillingEmail] = useState(detail.billingEmail);
  const [billingPhone, setBillingPhone] = useState(detail.billingPhone ?? "");
  const [registration, setRegistration] = useState(detail.businessRegistrationNumber ?? "");
  const [reason, setReason] = useState("");

  const canSave = businessName.trim() !== "" && billingEmail.trim() !== "";

  async function handleSave() {
    try {
      await update.mutateAsync({
        businessName: businessName.trim(),
        billingEmail: billingEmail.trim(),
        billingPhone: trimmedOrNull(billingPhone),
        businessRegistrationNumber: trimmedOrNull(registration),
        reason: trimmedOrNull(reason),
      });
      enqueueSnackbar("The business details are saved.", { variant: "success" });
      onClose();
    } catch {
      // The dialog shows the error; this only stops an unhandled rejection.
    }
  }

  return (
    <EditDialog
      title="Business details"
      description="The registered business behind this facility owner."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="edit-business-name"
          label="Business name"
          required
          value={businessName}
          onChange={setBusinessName}
        />
        <TextField
          id="edit-registration"
          label="Registration number"
          value={registration}
          onChange={setRegistration}
          hint="DTI, SEC, or the mayor's permit number."
        />
        <TextField
          id="edit-billing-email"
          label="Billing email"
          type="email"
          required
          value={billingEmail}
          onChange={setBillingEmail}
        />
        <TextField
          id="edit-billing-phone"
          label="Billing phone"
          type="tel"
          value={billingPhone}
          onChange={setBillingPhone}
        />
      </div>

      <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-[#164eaa]">
        The owner&apos;s own name and email are not editable here. The email is what they sign in
        with, so changing it needs its own deliberate step rather than a field in a form.
      </p>
    </EditDialog>
  );
}

export default BusinessEditDialog;
