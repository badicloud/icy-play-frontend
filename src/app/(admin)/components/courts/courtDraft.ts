import type { CreateCourtPayload, PhotoPayload } from "@auth/courtApi";
import type { DraftPhoto } from "./PhotoUploader";
import { createEmptyDraft, type OnboardingDraft } from "../onboarding/draft";

export type CourtDraft = {
  facilityOwnerId: string;
  /** "existing" picks one the owner already has; "new" builds one here. */
  facilityChoice: "existing" | "new";
  facilityId: string;
  /** Reuses the onboarding shape, so the facility form is the one already built. */
  newFacility: OnboardingDraft["facility"];
  newFacilityAmenityIds: string[];
  newFacilitySafetyMeasures: string;
  newFacilityHouseRules: string;
  newFacilityHours: OnboardingDraft["operatingHours"];
  newFacilityPhotos: DraftPhoto[];
  court: {
    name: string;
    displayOrder: string;
    description: string;
    sportIds: string[];
    /** How many courts each sport makes here, keyed by sport. Absent means one. */
    divisions: Record<string, number>;
    primarySportId: string;
    venueType: string;
    surface: string;
    hasLighting: boolean;
    sizeLabel: string;
    capacity: string;
    equipment: string;
    slotLengthMinutes: string;
    minimumDurationMinutes: string;
    bufferMinutes: string;
    usesFacilityHours: boolean;
    operatingHours: OnboardingDraft["operatingHours"];
    photos: DraftPhoto[];
  };
};

export function createEmptyCourtDraft(facilityOwnerId: string): CourtDraft {
  const blank = createEmptyDraft();

  return {
    facilityOwnerId,
    facilityChoice: "existing",
    facilityId: "",
    newFacility: blank.facility,
    newFacilityAmenityIds: [],
    newFacilitySafetyMeasures: "",
    newFacilityHouseRules: "",
    newFacilityHours: blank.operatingHours,
    newFacilityPhotos: [],
    court: {
      name: "",
      displayOrder: "1",
      description: "",
      sportIds: [],
      divisions: {},
      primarySportId: "",
      venueType: "Covered",
      surface: "",
      hasLighting: false,
      sizeLabel: "",
      capacity: "",
      equipment: "",
      slotLengthMinutes: "60",
      minimumDurationMinutes: "60",
      bufferMinutes: "0",
      usesFacilityHours: true,
      operatingHours: blank.operatingHours,
      photos: [],
    },
  };
}

/** Display order comes from the position in the gallery, not a typed number. */
function toPhotos(photos: DraftPhoto[]): PhotoPayload[] {
  return photos.map((photo, index) => ({
    publicId: photo.publicId,
    secureUrl: photo.secureUrl,
    caption: photo.caption.trim() === "" ? null : photo.caption.trim(),
    displayOrder: index,
    isCover: photo.isCover,
  }));
}

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toHours(days: OnboardingDraft["operatingHours"]) {
  return days.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    opensAt: day.closed ? null : toApiTime(day.opensAt),
    closesAt: day.closed ? null : toApiTime(day.closesAt),
  }));
}

export function toCourtPayload(draft: CourtDraft): CreateCourtPayload {
  const { court } = draft;
  const latitude = draft.newFacility.latitude.trim();
  const longitude = draft.newFacility.longitude.trim();
  const hasPin = latitude !== "" && longitude !== "";
  const addingFacility = draft.facilityChoice === "new";

  return {
    facilityOwnerId: draft.facilityOwnerId,
    facilityId: addingFacility ? null : draft.facilityId,
    newFacility: addingFacility
      ? {
          details: {
            name: draft.newFacility.name.trim(),
            description: trimmedOrNull(draft.newFacility.description),
            addressLine1: draft.newFacility.addressLine1.trim(),
            addressLine2: trimmedOrNull(draft.newFacility.addressLine2),
            city: draft.newFacility.city.trim(),
            province: draft.newFacility.province.trim(),
            postalCode: trimmedOrNull(draft.newFacility.postalCode),
            country: draft.newFacility.country.trim(),
            latitude: hasPin ? Number(latitude) : null,
            longitude: hasPin ? Number(longitude) : null,
            timeZone: draft.newFacility.timeZone,
            contactPhone: trimmedOrNull(draft.newFacility.contactPhone),
            contactEmail: trimmedOrNull(draft.newFacility.contactEmail),
            safetyMeasures: trimmedOrNull(draft.newFacilitySafetyMeasures),
            houseRules: trimmedOrNull(draft.newFacilityHouseRules),
            amenityIds: draft.newFacilityAmenityIds,
          },
          operatingHours: toHours(draft.newFacilityHours),
          photos: toPhotos(draft.newFacilityPhotos),
        }
      : null,
    court: {
      name: court.name.trim(),
      displayOrder: Number(court.displayOrder) || 0,
      description: trimmedOrNull(court.description),
      sports: court.sportIds.map((sportId) => ({
        sportId,
        // A draft saved before divisions existed has none, and a court played
        // whole is one court.
        divisions: court.divisions?.[sportId] ?? 1,
      })),
      primarySportId: court.primarySportId,
      venueType: court.venueType,
      surface: trimmedOrNull(court.surface),
      hasLighting: court.hasLighting,
      sizeLabel: trimmedOrNull(court.sizeLabel),
      capacity: court.capacity.trim() === "" ? null : Number(court.capacity),
      equipment: trimmedOrNull(court.equipment),
      slotLengthMinutes: Number(court.slotLengthMinutes),
      minimumDurationMinutes: Number(court.minimumDurationMinutes),
      bufferMinutes: Number(court.bufferMinutes) || 0,
      usesFacilityHours: court.usesFacilityHours,
      // Only sent when the court has opted out. An empty set then reads as
      // "follows the facility" rather than "nobody filled it in".
      operatingHours: court.usesFacilityHours ? [] : toHours(court.operatingHours),
      photos: toPhotos(court.photos),
    },
  };
}
