import type { FieldErrors } from "../onboarding/validation";
import type { CourtDraft } from "./courtDraft";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(errors: FieldErrors, key: string, value: string, label: string) {
  if (value.trim() === "") {
    errors[key] = `${label} is required.`;
  }
}

/** Step one: which facility the court goes in, or the one being added with it. */
function validFacility(draft: CourtDraft) {
  const errors: FieldErrors = {};

  // Reached from the inventory, nothing in the route says whose this is.
  if (draft.facilityOwnerId === "") {
    errors.facilityOwnerId = "Pick the owner this court belongs to.";
    return errors;
  }

  if (draft.facilityChoice === "existing") {
    if (draft.facilityId === "") {
      errors.facilityId = "Pick the facility this court belongs to.";
    }

    return errors;
  }

  const facility = draft.newFacility;
  required(errors, "name", facility.name, "The facility name");
  required(errors, "addressLine1", facility.addressLine1, "A street address");
  required(errors, "city", facility.city, "A city");
  required(errors, "province", facility.province, "A province");
  required(errors, "country", facility.country, "A country");

  if (facility.contactEmail.trim() !== "" && !emailPattern.test(facility.contactEmail.trim())) {
    errors.contactEmail = "Enter a valid email address.";
  }

  const latitude = facility.latitude.trim();
  const longitude = facility.longitude.trim();

  if (latitude !== "" && longitude === "") {
    errors.longitude = "A latitude needs a longitude.";
  }

  if (longitude !== "" && latitude === "") {
    errors.latitude = "A longitude needs a latitude.";
  }

  return errors;
}

function validCourt(draft: CourtDraft) {
  const errors: FieldErrors = {};
  const { court } = draft;

  required(errors, "name", court.name, "The court name");

  // A court that accommodates no sport cannot be booked.
  if (court.sportIds.length === 0) {
    errors.sportIds = "Pick at least one sport this court can take.";
  } else if (!court.sportIds.includes(court.primarySportId)) {
    errors.primarySportId = "The main sport has to be one of the sports selected.";
  }

  return errors;
}

function validSpace(draft: CourtDraft) {
  const errors: FieldErrors = {};
  const { court } = draft;

  const slot = Number(court.slotLengthMinutes);
  const minimum = Number(court.minimumDurationMinutes);
  const buffer = Number(court.bufferMinutes || "0");

  if (!Number.isInteger(slot) || slot <= 0) {
    errors.slotLengthMinutes = "A slot has to be longer than nothing.";
  }

  if (!Number.isInteger(minimum) || minimum <= 0) {
    errors.minimumDurationMinutes = "Enter a minimum booking length.";
  } else if (slot > 0 && minimum < slot) {
    errors.minimumDurationMinutes = "The minimum cannot be shorter than one slot.";
  } else if (slot > 0 && minimum % slot !== 0) {
    // A minimum that ends mid-slot is not something the calendar can offer.
    errors.minimumDurationMinutes = `The minimum has to be a whole number of ${slot}-minute slots.`;
  }

  if (!Number.isInteger(buffer) || buffer < 0) {
    errors.bufferMinutes = "A buffer cannot be negative.";
  }

  if (court.capacity.trim() !== "" && Number(court.capacity) <= 0) {
    errors.capacity = "Leave this blank rather than entering zero.";
  }

  if (!court.usesFacilityHours) {
    const broken = court.operatingHours.find(
      (day) => !day.closed && day.closesAt <= day.opensAt,
    );

    if (broken) {
      errors.operatingHours = "A court cannot close before it opens.";
    }
  }

  return errors;
}

// Photos are optional: a court with none is still worth recording, and one
// can be added later. The step that follows is Review.
const validators: ((draft: CourtDraft) => FieldErrors)[] = [
  validFacility,
  validCourt,
  validSpace,
  () => ({}),
  () => ({}),
];

export function validateCourtStep(step: number, draft: CourtDraft): FieldErrors {
  return validators[step]?.(draft) ?? {};
}

export function isCourtStepValid(step: number, draft: CourtDraft) {
  return Object.keys(validateCourtStep(step, draft)).length === 0;
}

/** The first step that would not pass, or null when the whole draft is valid. */
export function firstInvalidCourtStep(draft: CourtDraft) {
  const step = validators.findIndex((_, index) => !isCourtStepValid(index, draft));
  return step === -1 ? null : step;
}
