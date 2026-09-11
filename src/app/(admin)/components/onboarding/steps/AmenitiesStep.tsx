"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import { useAmenities } from "@auth/hooks/useAmenities";
import { StepHeading, TextAreaField } from "../FormControls";

type AmenitiesStepProps = {
  selectedIds: string[];
  safetyMeasures: string;
  houseRules: string;
  onSelectionChange: (amenityIds: string[]) => void;
  onTextChange: (field: "safetyMeasures" | "houseRules", value: string) => void;
};

function AmenitiesStep({
  selectedIds,
  safetyMeasures,
  houseRules,
  onSelectionChange,
  onTextChange,
}: AmenitiesStepProps) {
  const amenities = useAmenities();

  const grouped = (amenities.data ?? []).reduce<Record<string, typeof amenities.data>>(
    (groups, amenity) => {
      (groups[amenity.category] ??= []).push(amenity);
      return groups;
    },
    {},
  );

  function toggle(amenityId: string) {
    onSelectionChange(
      selectedIds.includes(amenityId)
        ? selectedIds.filter((id) => id !== amenityId)
        : [...selectedIds, amenityId],
    );
  }

  return (
    <div>
      <StepHeading
        title="Amenities, safety and rules"
        description="The checklist is what customers filter on. The free text carries what no checklist can."
      />

      {amenities.isError ? (
        <p className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
          We couldn&apos;t load the amenity list. You can still continue and add these later.
        </p>
      ) : amenities.isPending ? (
        <p className="text-slate-500">Loading amenities…</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <fieldset key={category}>
              <legend className="text-sm font-bold text-[#071955]">{category}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(items ?? []).map((amenity) => {
                  const selected = selectedIds.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggle(amenity.id)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
                        selected
                          ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {/* A tick, not colour alone: the blue border and blue
                          text are easy to miss across a wall of chips, and
                          invisible to anyone who cannot separate the two. */}
                      {selected && <CheckOutlined sx={{ fontSize: 15 }} aria-hidden />}
                      {amenity.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5">
        <TextAreaField
          id="safety-measures"
          label="Safety measures"
          rows={3}
          value={safetyMeasures}
          onChange={(next) => onTextChange("safetyMeasures", next)}
          placeholder="First aid kit at the front desk. Staff on site during all opening hours."
        />
        <TextAreaField
          id="house-rules"
          label="House rules"
          rows={3}
          value={houseRules}
          onChange={(next) => onTextChange("houseRules", next)}
          placeholder="Non-marking shoes only. No food or drink on the court."
        />
      </div>
    </div>
  );
}

export default AmenitiesStep;
