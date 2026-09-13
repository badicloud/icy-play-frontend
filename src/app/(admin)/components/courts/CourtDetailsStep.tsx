"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import { useSports } from "@auth/hooks/useSports";
import type { FieldErrors } from "../onboarding/validation";
import { StepHeading, TextAreaField, TextField } from "../onboarding/FormControls";
import type { CourtDraft } from "./courtDraft";
import SportDivisions from "./SportDivisions";

type CourtDetailsStepProps = {
  draft: CourtDraft;
  errors: FieldErrors;
  onChange: (court: CourtDraft["court"]) => void;
};

function CourtDetailsStep({ draft, errors, onChange }: CourtDetailsStepProps) {
  const sports = useSports();
  const { court } = draft;

  const grouped = (sports.data ?? []).reduce<Record<string, typeof sports.data>>(
    (groups, sport) => {
      (groups[sport.category] ??= []).push(sport);
      return groups;
    },
    {},
  );

  function toggleSport(sportId: string) {
    const selected = court.sportIds.includes(sportId);
    const sportIds = selected
      ? court.sportIds.filter((id) => id !== sportId)
      : [...court.sportIds, sportId];

    // The main sport has to stay one of the selected ones, so dropping it
    // moves the star rather than leaving it pointing at nothing.
    const primarySportId = sportIds.includes(court.primarySportId)
      ? court.primarySportId
      : (sportIds[0] ?? "");

    onChange({ ...court, sportIds, primarySportId });
  }

  return (
    <div>
      <StepHeading
        title="The court"
        description="What it is called, and what can be played on it."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="court-name"
          label="Court name"
          required
          value={court.name}
          onChange={(value) => onChange({ ...court, name: value })}
          error={errors.name}
          placeholder="Court 1"
        />
        <TextField
          id="court-order"
          label="Display order"
          required
          value={court.displayOrder}
          onChange={(value) => onChange({ ...court, displayOrder: value })}
          hint="1 is listed first, then 2, then 3. Sorting by name alone would put Court 10 before Court 2."
        />
        <div className="sm:col-span-2">
          <TextAreaField
            id="court-description"
            label="Description"
            rows={2}
            value={court.description}
            onChange={(value) => onChange({ ...court, description: value })}
            placeholder="The near court, beside the entrance."
          />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-[#071955]">
          What this court can be booked for
          <span className="ml-1 font-bold text-red-600" aria-hidden>
            *
          </span>
        </h3>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          Every sport played on it, and every kind of event the floor is hired for.
        </p>

        {sports.isError ? (
          <p className="font-semibold text-red-700">We couldn&apos;t load the sports.</p>
        ) : sports.isPending ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <fieldset key={category}>
                <legend className="text-sm font-semibold text-slate-500">{category}</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(items ?? []).map((sport) => {
                    const selected = court.sportIds.includes(sport.id);
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSport(sport.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
                          selected
                            ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {selected && <CheckOutlined sx={{ fontSize: 15 }} aria-hidden />}
                        {sport.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {errors.sportIds && (
          <p className="mt-2 text-sm font-semibold text-red-700">{errors.sportIds}</p>
        )}
      </div>

      {court.sportIds.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-[#071955]">Main sport</h3>
          <p className="mt-1 mb-2 text-sm text-slate-500">
            What the court is listed as when only one name fits.
          </p>
          <div className="flex flex-wrap gap-2">
            {court.sportIds.map((sportId) => {
              const sport = sports.data?.find((candidate) => candidate.id === sportId);
              const isPrimary = court.primarySportId === sportId;

              return (
                <button
                  key={sportId}
                  type="button"
                  aria-pressed={isPrimary}
                  onClick={() => onChange({ ...court, primarySportId: sportId })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
                    isPrimary
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {isPrimary && <StarOutlined sx={{ fontSize: 15 }} aria-hidden />}
                  {sport?.name ?? "Unknown sport"}
                </button>
              );
            })}
          </div>
          {errors.primarySportId && (
            <p className="mt-2 text-sm font-semibold text-red-700">{errors.primarySportId}</p>
          )}
        </div>
      )}

      {court.sportIds.length > 0 && (
        <div className="mt-8">
          <SportDivisions
            courtName={court.name}
            sportIds={court.sportIds}
            primarySportId={court.primarySportId}
            divisions={court.divisions ?? {}}
            sports={sports.data}
            onChange={(divisions) => onChange({ ...court, divisions })}
          />
        </div>
      )}

      {court.sportIds.length > 1 && (
        <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-[#164eaa]">
          Each of these {court.sportIds.length} sports will get its own price on this court when
          pricing is set up. A divided court is priced per court, not for the whole floor.
        </p>
      )}
    </div>
  );
}

export default CourtDetailsStep;
