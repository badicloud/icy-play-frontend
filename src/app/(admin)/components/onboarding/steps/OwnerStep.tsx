"use client";

import InfoOutlined from "@mui/icons-material/InfoOutlined";
import type { OnboardingDraft } from "../draft";
import { philippineMobileHint, type FieldErrors } from "../validation";
import { StepHeading, TextField } from "../FormControls";

type OwnerStepProps = {
  value: OnboardingDraft["owner"];
  errors: FieldErrors;
  onChange: (owner: OnboardingDraft["owner"]) => void;
};

function OwnerStep({ value, errors, onChange }: OwnerStepProps) {
  const set = (field: keyof OnboardingDraft["owner"], next: string) =>
    onChange({ ...value, [field]: next });

  return (
    <div>
      <StepHeading
        title="The owner"
        description="Who signs in and runs the account. This is a person, not the business."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="owner-name"
          required
          label="Full name"
          value={value.fullName}
          onChange={(next) => set("fullName", next)}
          error={errors.fullName}
        />
        <TextField
          id="owner-email"
          required
          label="Email address"
          type="email"
          value={value.email}
          onChange={(next) => set("email", next)}
          error={errors.email}
          hint="Where the sign-in link goes."
        />
        <TextField
          id="owner-phone"
          required
          label="Mobile number"
          type="tel"
          placeholder="0995 3979930"
          value={value.phoneNumber}
          onChange={(next) => set("phoneNumber", next)}
          error={errors.phoneNumber}
          hint={philippineMobileHint}
        />
      </div>

      <p className="mt-6 flex gap-2.5 rounded-2xl bg-blue-50 p-4 text-sm text-[#164eaa]">
        <InfoOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
        <span>
          You will not set a password. The account is created with a random one nobody knows,
          and the owner sets their own through a link we email them.
        </span>
      </p>
    </div>
  );
}

export default OwnerStep;
