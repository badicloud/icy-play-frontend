"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import type { FacilityDetail } from "@auth/adminApi";
import { useAdminFacilityOwners } from "@auth/hooks/useAdminFacilityOwners";
import { useAmenities } from "@auth/hooks/useAmenities";
import type { FieldErrors } from "../onboarding/validation";
import { StepHeading, TextAreaField } from "../onboarding/FormControls";
import FacilityStep from "../onboarding/steps/FacilityStep";
import HoursStep from "../onboarding/steps/HoursStep";
import type { CourtDraft } from "./courtDraft";

const choiceClass =
  "flex min-h-20 flex-1 flex-col justify-center gap-0.5 rounded-2xl border px-5 text-left transition";

type CourtFacilityStepProps = {
  draft: CourtDraft;
  errors: FieldErrors;
  /** The owner's existing facilities, from the detail the page already loaded. */
  facilities: FacilityDetail[];
  ownerName: string;
  /** True when the route named the owner, so it is shown rather than picked. */
  ownerIsFixed: boolean;
  onChange: (draft: CourtDraft) => void;
};

function CourtFacilityStep({
  draft,
  errors,
  facilities,
  ownerName,
  ownerIsFixed,
  onChange,
}: CourtFacilityStepProps) {
  const amenities = useAmenities();
  // Only fetched when there is a choice to make.
  const owners = useAdminFacilityOwners({ pageSize: 100 });
  const addingFacility = draft.facilityChoice === "new";

  const grouped = (amenities.data ?? []).reduce<Record<string, typeof amenities.data>>(
    (groups, amenity) => {
      (groups[amenity.category] ??= []).push(amenity);
      return groups;
    },
    {},
  );

  return (
    <div>
      <StepHeading
        title="The facility"
        description={
          ownerIsFixed
            ? `Where this court sits. Everything here belongs to ${ownerName}.`
            : "Who owns it, and where the court sits."
        }
      />

      {!ownerIsFixed && (
        <div className="mb-6">
          <label htmlFor="court-owner" className="block text-sm font-bold text-[#071955]">
            Facility owner
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </label>
          <select
            id="court-owner"
            value={draft.facilityOwnerId}
            onChange={(event) =>
              // Changing owner invalidates the facility already picked: it
              // belongs to somebody else now.
              onChange({
                ...draft,
                facilityOwnerId: event.target.value,
                facilityId: "",
              })
            }
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Choose an owner…</option>
            {(owners.data?.data ?? []).map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.businessName} — {owner.status}
              </option>
            ))}
          </select>
          {errors.facilityOwnerId && (
            <p className="mt-1.5 text-sm font-semibold text-red-700">{errors.facilityOwnerId}</p>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onChange({ ...draft, facilityChoice: "existing" })}
          aria-pressed={!addingFacility}
          disabled={facilities.length === 0}
          className={`${choiceClass} ${
            !addingFacility
              ? "border-[#2563EB] bg-blue-50 text-[#1257d5] shadow-sm"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className="font-bold">Use an existing facility</span>
          <span className="text-sm">
            {facilities.length === 0
              ? "This owner has none yet."
              : `${facilities.length} to choose from.`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...draft, facilityChoice: "new" })}
          aria-pressed={addingFacility}
          className={`${choiceClass} ${
            addingFacility
              ? "border-[#2563EB] bg-blue-50 text-[#1257d5] shadow-sm"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          }`}
        >
          <span className="font-bold">Add a new facility</span>
          <span className="text-sm">Saved together with the court.</span>
        </button>
      </div>

      {addingFacility ? (
        <>
          <FacilityStep
            hideHeading
            value={draft.newFacility}
            errors={errors}
            onChange={(facility) => onChange({ ...draft, newFacility: facility })}
          />

          <div className="mt-8">
            <h3 className="text-sm font-bold text-[#071955]">Amenities</h3>
            {amenities.isPending ? (
              <p className="mt-1 text-sm text-slate-500">Loading amenities…</p>
            ) : (
              <div className="mt-2 space-y-4">
                {Object.entries(grouped).map(([category, items]) => (
                  <fieldset key={category}>
                    <legend className="text-sm font-semibold text-slate-500">{category}</legend>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(items ?? []).map((amenity) => {
                        const selected = draft.newFacilityAmenityIds.includes(amenity.id);
                        return (
                          <button
                            key={amenity.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              onChange({
                                ...draft,
                                newFacilityAmenityIds: selected
                                  ? draft.newFacilityAmenityIds.filter((id) => id !== amenity.id)
                                  : [...draft.newFacilityAmenityIds, amenity.id],
                              })
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                              selected
                                ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {selected && <CheckOutlined sx={{ fontSize: 14 }} aria-hidden />}
                            {amenity.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-5">
            <TextAreaField
              id="new-facility-safety"
              label="Safety measures"
              rows={3}
              value={draft.newFacilitySafetyMeasures}
              onChange={(value) => onChange({ ...draft, newFacilitySafetyMeasures: value })}
            />
            <TextAreaField
              id="new-facility-rules"
              label="House rules"
              rows={3}
              value={draft.newFacilityHouseRules}
              onChange={(value) => onChange({ ...draft, newFacilityHouseRules: value })}
            />
          </div>

          <div className="mt-8">
            <h3 className="mb-2 text-sm font-bold text-[#071955]">Opening hours</h3>
            <HoursStep
              hideHeading
              value={draft.newFacilityHours}
              errors={errors}
              onChange={(hours) => onChange({ ...draft, newFacilityHours: hours })}
            />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="facility-choice" className="block text-sm font-bold text-[#071955]">
            Facility
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </label>
          <select
            id="facility-choice"
            value={draft.facilityId}
            onChange={(event) => onChange({ ...draft, facilityId: event.target.value })}
            disabled={facilities.length === 0}
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
          >
            <option value="">Choose a facility…</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name} — {facility.city}
              </option>
            ))}
          </select>
          {errors.facilityId && (
            <p className="mt-1.5 text-sm font-semibold text-red-700">{errors.facilityId}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CourtFacilityStep;
