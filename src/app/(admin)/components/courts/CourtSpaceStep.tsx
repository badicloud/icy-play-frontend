"use client";

import { surfaces, venueTypeHints, venueTypes } from "@auth/courtApi";
import type { FieldErrors } from "../onboarding/validation";
import { StepHeading, TextField } from "../onboarding/FormControls";
import HoursStep from "../onboarding/steps/HoursStep";
import type { CourtDraft } from "./courtDraft";

const selectClass =
  "min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200";

type CourtSpaceStepProps = {
  draft: CourtDraft;
  errors: FieldErrors;
  onChange: (court: CourtDraft["court"]) => void;
};

function CourtSpaceStep({ draft, errors, onChange }: CourtSpaceStepProps) {
  const { court } = draft;
  const slot = Number(court.slotLengthMinutes);
  const minimum = Number(court.minimumDurationMinutes);
  const slots = slot > 0 && minimum > 0 && minimum % slot === 0 ? minimum / slot : null;

  return (
    <div>
      <StepHeading
        title="The space, and how it is booked"
        description="What the court is like, and the rules the calendar will follow."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-bold text-[#071955]">
            Venue type
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {venueTypes.map((type) => {
              const selected = court.venueType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...court, venueType: type })}
                  className={`flex min-h-18 flex-col justify-center gap-0.5 rounded-2xl border px-4 text-left transition ${
                    selected
                      ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold">{type}</span>
                  <span className="text-sm">{venueTypeHints[type]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="court-surface" className="block text-sm font-bold text-[#071955]">
            Surface
          </label>
          <select
            id="court-surface"
            value={court.surface}
            onChange={(event) => onChange({ ...court, surface: event.target.value })}
            className={`mt-1.5 ${selectClass}`}
          >
            <option value="">Not recorded</option>
            {surfaces.map((surface) => (
              <option key={surface} value={surface}>
                {surface}
              </option>
            ))}
          </select>
        </div>

        <TextField
          id="court-size"
          label="Size"
          value={court.sizeLabel}
          onChange={(value) => onChange({ ...court, sizeLabel: value })}
          placeholder="Full court, half court, doubles"
        />

        <TextField
          id="court-capacity"
          label="Capacity"
          value={court.capacity}
          onChange={(value) => onChange({ ...court, capacity: value })}
          error={errors.capacity}
          hint="How many people the court takes. Leave blank if it varies."
        />

        <TextField
          id="court-equipment"
          label="Equipment at the court"
          value={court.equipment}
          onChange={(value) => onChange({ ...court, equipment: value })}
          placeholder="Net provided, scoreboard"
          hint="Parking and showers belong to the facility, not here."
        />

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
            <input
              type="checkbox"
              checked={court.hasLighting}
              onChange={(event) => onChange({ ...court, hasLighting: event.target.checked })}
              className="size-4 rounded border-slate-300 text-[#2563EB]"
            />
            <span>
              <span className="font-bold text-[#071955]">This court has lighting</span>
              <span className="block text-sm text-slate-500">
                Decides whether it can be booked after dark.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-[#071955]">Booking rules</h3>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          A badminton court and a basketball court in the same building rarely share these.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            id="court-slot"
            label="Slot length"
            required
            value={court.slotLengthMinutes}
            onChange={(value) => onChange({ ...court, slotLengthMinutes: value })}
            error={errors.slotLengthMinutes}
            hint="Minutes."
          />
          <TextField
            id="court-minimum"
            label="Minimum booking"
            required
            value={court.minimumDurationMinutes}
            onChange={(value) => onChange({ ...court, minimumDurationMinutes: value })}
            error={errors.minimumDurationMinutes}
            hint={slots === null ? "Minutes." : `${slots} ${slots === 1 ? "slot" : "slots"}.`}
          />
          <TextField
            id="court-buffer"
            label="Buffer between bookings"
            value={court.bufferMinutes}
            onChange={(value) => onChange({ ...court, bufferMinutes: value })}
            error={errors.bufferMinutes}
            hint="Minutes. Zero if none."
          />
        </div>
      </div>

      <div className="mt-8">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
          <input
            type="checkbox"
            checked={court.usesFacilityHours}
            onChange={(event) =>
              onChange({ ...court, usesFacilityHours: event.target.checked })
            }
            className="size-4 rounded border-slate-300 text-[#2563EB]"
          />
          <span>
            <span className="font-bold text-[#071955]">Open when the facility is open</span>
            <span className="block text-sm text-slate-500">
              Leave this on unless the court closes at a different time from the building.
            </span>
          </span>
        </label>

        {!court.usesFacilityHours && (
          <div className="mt-4">
            <HoursStep
              hideHeading
              value={court.operatingHours}
              errors={errors}
              onChange={(hours) => onChange({ ...court, operatingHours: hours })}
            />
            {errors.operatingHours && (
              <p className="mt-2 text-sm font-semibold text-red-700">{errors.operatingHours}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourtSpaceStep;
