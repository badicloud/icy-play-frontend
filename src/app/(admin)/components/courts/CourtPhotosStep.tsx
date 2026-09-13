"use client";

import { StepHeading } from "../onboarding/FormControls";
import PhotoUploader, { type DraftPhoto } from "./PhotoUploader";
import type { CourtDraft } from "./courtDraft";

type CourtPhotosStepProps = {
  draft: CourtDraft;
  onCourtPhotosChange: (photos: DraftPhoto[]) => void;
  onFacilityPhotosChange: (photos: DraftPhoto[]) => void;
};

function CourtPhotosStep({
  draft,
  onCourtPhotosChange,
  onFacilityPhotosChange,
}: CourtPhotosStepProps) {
  const addingFacility = draft.facilityChoice === "new";

  return (
    <div>
      <StepHeading
        title="Photos"
        description="What customers see before they book. Optional, and addable later."
      />

      {addingFacility && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-[#071955]">The facility</h3>
          <p className="mt-1 mb-3 text-sm text-slate-500">
            The venue as a whole: the entrance, the building, the parking.
          </p>
          <PhotoUploader
            id="facility-photos"
            purpose="facility-photo"
            photos={draft.newFacilityPhotos}
            onChange={onFacilityPhotosChange}
          />
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-[#071955]">
          {draft.court.name.trim() === "" ? "This court" : draft.court.name}
        </h3>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          The playing surface itself. The cover is what the booking list shows.
        </p>
        <PhotoUploader
          id="court-photos"
          purpose="court-photo"
          photos={draft.court.photos}
          onChange={onCourtPhotosChange}
        />
      </div>

      {draft.court.photos.length === 0 && (
        <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-[#164eaa]">
          A court with no photo is still worth recording, and pictures can be added later. It
          will simply show no image in the booking list until one is.
        </p>
      )}
    </div>
  );
}

export default CourtPhotosStep;
