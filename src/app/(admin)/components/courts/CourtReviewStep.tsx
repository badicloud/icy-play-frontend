"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import type { FacilityDetail } from "@auth/adminApi";
import { useSports } from "@auth/hooks/useSports";
import { dayNames } from "../onboarding/draft";
import { StepHeading } from "../onboarding/FormControls";
import type { CourtDraft } from "./courtDraft";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#071955]">{value}</span>
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

type CourtReviewStepProps = {
  draft: CourtDraft;
  facilities: FacilityDetail[];
  onEditStep: (step: number) => void;
};

function CourtReviewStep({ draft, facilities, onEditStep }: CourtReviewStepProps) {
  const sports = useSports();
  const { court } = draft;
  const addingFacility = draft.facilityChoice === "new";

  const facilityName = addingFacility
    ? draft.newFacility.name
    : (facilities.find((facility) => facility.id === draft.facilityId)?.name ?? "Not chosen");

  const sportNames = court.sportIds.map(
    (id) => sports.data?.find((sport) => sport.id === id)?.name ?? "Unknown",
  );
  const primaryName =
    sports.data?.find((sport) => sport.id === court.primarySportId)?.name ?? "Not chosen";

  const hours = court.usesFacilityHours ? draft.newFacilityHours : court.operatingHours;
  const slot = Number(court.slotLengthMinutes);
  const minimum = Number(court.minimumDurationMinutes);

  return (
    <div>
      <StepHeading
        title="Review"
        description="Check it over, then add the court."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Facility" onEdit={() => onEditStep(0)}>
          <Row label="Facility" value={facilityName} />
          <Row
            label="Status"
            value={addingFacility ? "Will be created with this court" : "Already exists"}
          />
          {addingFacility && (
            <Row
              label="Address"
              value={[draft.newFacility.addressLine1, draft.newFacility.city]
                .filter(Boolean)
                .join(", ")}
            />
          )}
        </Panel>

        <Panel title="Court" onEdit={() => onEditStep(1)}>
          <Row label="Name" value={court.name || "—"} />
          <Row label="Display order" value={court.displayOrder} />
          <Row label="Main sport" value={primaryName} />
          <Row
            label="Sports"
            value={sportNames.length === 0 ? "None picked" : sportNames.join(", ")}
          />
          <Row
            label="Divided into"
            value={
              court.sportIds.every((id) => (court.divisions?.[id] ?? 1) <= 1)
                ? "Played whole"
                : court.sportIds
                    .filter((id) => (court.divisions?.[id] ?? 1) > 1)
                    .map((id) => {
                      const name = sports.data?.find((sport) => sport.id === id)?.name ?? "Unknown";
                      return `${name}: ${court.divisions[id]} courts`;
                    })
                    .join(", ")
            }
          />
        </Panel>

        <Panel title="The space" onEdit={() => onEditStep(2)}>
          <Row label="Venue type" value={court.venueType} />
          <Row label="Surface" value={court.surface || "Not recorded"} />
          <Row label="Lighting" value={court.hasLighting ? "Yes" : "No"} />
          <Row label="Size" value={court.sizeLabel || "Not recorded"} />
          <Row label="Capacity" value={court.capacity || "Not recorded"} />
          <Row label="Equipment" value={court.equipment || "Not recorded"} />
        </Panel>

        <Panel title="Photos" onEdit={() => onEditStep(3)}>
          <Row
            label="Court photos"
            value={
              draft.court.photos.length === 0
                ? "None"
                : `${draft.court.photos.length} (${
                    draft.court.photos.find((photo) => photo.isCover) ? "cover set" : "no cover"
                  })`
            }
          />
          {addingFacility && (
            <Row
              label="Facility photos"
              value={
                draft.newFacilityPhotos.length === 0 ? "None" : draft.newFacilityPhotos.length
              }
            />
          )}
        </Panel>

        <Panel title="Booking rules" onEdit={() => onEditStep(2)}>
          <Row label="Slot length" value={`${court.slotLengthMinutes} minutes`} />
          <Row
            label="Minimum booking"
            value={
              slot > 0 && minimum % slot === 0
                ? `${minimum} minutes (${minimum / slot} ${minimum / slot === 1 ? "slot" : "slots"})`
                : `${court.minimumDurationMinutes} minutes`
            }
          />
          <Row
            label="Buffer"
            value={
              Number(court.bufferMinutes) === 0 ? "None" : `${court.bufferMinutes} minutes`
            }
          />
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Opening hours" onEdit={() => onEditStep(2)}>
            <p className="mb-1 text-sm text-slate-500">
              {court.usesFacilityHours
                ? addingFacility
                  ? "Follows the facility being added with it."
                  : "Follows the facility it is going into."
                : "This court keeps its own hours."}
            </p>
            {(court.usesFacilityHours && !addingFacility ? [] : hours).map((day) => (
              <Row
                key={day.dayOfWeek}
                label={dayNames[day.dayOfWeek]}
                value={day.closed ? "Closed" : `${day.opensAt} – ${day.closesAt}`}
              />
            ))}
          </Panel>
        </div>
      </div>

      {court.sportIds.length > 0 && (
        <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-[#164eaa]">
          Pricing comes later. When it does, each of the {court.sportIds.length}{" "}
          {court.sportIds.length === 1 ? "sport" : "sports"} above gets its own price on this
          court.
        </p>
      )}
    </div>
  );
}

export default CourtReviewStep;
