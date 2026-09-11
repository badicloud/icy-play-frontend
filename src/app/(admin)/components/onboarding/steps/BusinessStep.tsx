"use client";

import type { OnboardingDraft, UploadedDocument } from "../draft";
import type { FieldErrors } from "../validation";
import { RequiredMark, StepHeading, TextField } from "../FormControls";
import DocumentUploader from "../DocumentUploader";

type BusinessStepProps = {
  value: OnboardingDraft["business"];
  documents: UploadedDocument[];
  errors: FieldErrors;
  onChange: (business: OnboardingDraft["business"]) => void;
  onDocumentsChange: (documents: UploadedDocument[]) => void;
};

function BusinessStep({
  value,
  documents,
  errors,
  onChange,
  onDocumentsChange,
}: BusinessStepProps) {
  const set = (field: keyof OnboardingDraft["business"], next: string) =>
    onChange({ ...value, [field]: next });

  return (
    <div>
      <StepHeading
        title="Business and documents"
        description="The registered business, and proof that it is real."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="business-name"
          required
          label="Business name"
          value={value.businessName}
          onChange={(next) => set("businessName", next)}
          error={errors.businessName}
        />
        <TextField
          id="business-registration"
          label="Registration number"
          value={value.businessRegistrationNumber}
          onChange={(next) => set("businessRegistrationNumber", next)}
          hint="DTI, SEC, or the mayor's permit number."
        />
        <TextField
          id="billing-email"
          required
          label="Billing email"
          type="email"
          value={value.billingEmail}
          onChange={(next) => set("billingEmail", next)}
          error={errors.billingEmail}
          hint="Where platform fee invoices go."
        />
        <TextField
          id="billing-phone"
          label="Billing phone"
          type="tel"
          value={value.billingPhone}
          onChange={(next) => set("billingPhone", next)}
        />
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-[#071955]">
          Verification documents
          <RequiredMark />
        </h3>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          At least one is required. Customers pay this owner directly, so nobody goes live
          unverified.
        </p>
        <DocumentUploader
          documents={documents}
          onChange={onDocumentsChange}
          error={errors.documents}
        />
      </div>
    </div>
  );
}

export default BusinessStep;
