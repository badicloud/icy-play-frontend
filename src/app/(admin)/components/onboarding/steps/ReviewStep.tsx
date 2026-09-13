"use client";

import { format } from "date-fns";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { dayNames, type OnboardingDraft } from "../draft";
import type { FieldErrors } from "../validation";
import { StepHeading, TextAreaField, TextField } from "../FormControls";
import AgreementUploader from "../AgreementUploader";
import { documentTypes } from "../DocumentUploader";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#071955]">{value || "—"}</span>
    </div>
  );
}

function Panel({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-[#2563EB] transition hover:bg-blue-50"
        >
          <EditOutlined sx={{ fontSize: 14 }} />
          Edit
          <span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      {children}
    </section>
  );
}

type ReviewStepProps = {
  draft: OnboardingDraft;
  errors: FieldErrors;
  amenityNames: string[];
  onContractChange: (contract: OnboardingDraft["contract"]) => void;
  /** Jumps back to a step so a panel can be corrected in place. */
  onEditStep: (step: number) => void;
};

function ReviewStep({
  draft,
  errors,
  amenityNames,
  onContractChange,
  onEditStep,
}: ReviewStepProps) {
  const { facility, contract } = draft;
  const openDays = draft.operatingHours.filter((day) => !day.closed);

  // The same rule the server derives status from, so the admin is told what
  // will happen rather than finding out on the list page afterwards.
  const today = new Date().toISOString().slice(0, 10);
  const commencesToday = contract.startDate <= today && today <= contract.endDate;

  return (
    <div>
      <StepHeading
        title="Contract and review"
        description="The dates decide when this owner goes live. Check everything, then commence them."
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="contract-start"
            required
            label="Start date"
            type="date"
            value={contract.startDate}
            onChange={(next) => onContractChange({ ...contract, startDate: next })}
            error={errors.startDate}
          />
          <TextField
            id="contract-end"
            required
            label="End date"
            type="date"
            value={contract.endDate}
            onChange={(next) => onContractChange({ ...contract, endDate: next })}
            error={errors.endDate}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              id="contract-notes"
              label="Notes"
              rows={2}
              value={contract.notes}
              onChange={(next) => onContractChange({ ...contract, notes: next })}
              placeholder="Agreement reference, or anything the next admin should know."
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-bold text-[#071955]">
              Signed agreement
              <span className="ml-1 font-bold text-red-600" aria-hidden>
                *
              </span>
            </p>
            <AgreementUploader
              value={contract.document}
              onChange={(document) => onContractChange({ ...contract, document })}
              error={errors.document}
            />
          </div>
        </div>

        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            commencesToday ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {commencesToday
            ? "This contract covers today, so the owner goes live immediately."
            : "This contract does not cover today, so the owner will sit as Pending until it starts."}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Owner" onEdit={() => onEditStep(0)}>
          <Row label="Name" value={draft.owner.fullName} />
          <Row label="Email" value={draft.owner.email} />
          <Row label="Phone" value={draft.owner.phoneNumber} />
        </Panel>

        <Panel title="Business" onEdit={() => onEditStep(1)}>
          <Row label="Business" value={draft.business.businessName} />
          <Row label="Registration" value={draft.business.businessRegistrationNumber} />
          <Row label="Billing email" value={draft.business.billingEmail} />
          <Row label="Billing phone" value={draft.business.billingPhone} />
        </Panel>

        <Panel title="Documents" onEdit={() => onEditStep(1)}>
          {draft.documents.length === 0 ? (
            <p className="text-sm text-red-700">None attached.</p>
          ) : (
            draft.documents.map((document) => (
              <Row
                key={document.publicId}
                label={
                  documentTypes.find((type) => type.value === document.documentType)?.label ??
                  document.documentType
                }
                value={document.fileName}
              />
            ))
          )}
        </Panel>

        <Panel title="Facility" onEdit={() => onEditStep(2)}>
          <Row label="Name" value={facility.name} />
          <Row
            label="Address"
            value={[facility.addressLine1, facility.city, facility.province, facility.country]
              .filter(Boolean)
              .join(", ")}
          />
          <Row label="Time zone" value={facility.timeZone} />
          <Row
            label="Photos"
            value={
              draft.facilityPhotos.length === 0
                ? "None"
                : `${draft.facilityPhotos.length} uploaded`
            }
          />
          <Row
            label="Map pin"
            value={
              facility.latitude && facility.longitude
                ? `${facility.latitude}, ${facility.longitude}`
                : "Not set yet"
            }
          />
        </Panel>

        <Panel title="Amenities" onEdit={() => onEditStep(3)}>
          {amenityNames.length === 0 ? (
            <p className="text-sm text-slate-500">None selected.</p>
          ) : (
            <p className="font-semibold text-[#071955]">{amenityNames.join(", ")}</p>
          )}
        </Panel>

        <Panel title="Opening hours" onEdit={() => onEditStep(4)}>
          {openDays.length === 0 ? (
            <p className="text-sm text-red-700">Closed every day.</p>
          ) : (
            draft.operatingHours.map((day) => (
              <Row
                key={day.dayOfWeek}
                label={dayNames[day.dayOfWeek]}
                value={day.closed ? "Closed" : `${day.opensAt} – ${day.closesAt}`}
              />
            ))
          )}
        </Panel>
      </div>

      {contract.startDate && contract.endDate && (
        <p className="mt-4 text-sm text-slate-500">
          Term: {format(new Date(contract.startDate), "d MMM yyyy")} to{" "}
          {format(new Date(contract.endDate), "d MMM yyyy")}.
        </p>
      )}
    </div>
  );
}

export default ReviewStep;
