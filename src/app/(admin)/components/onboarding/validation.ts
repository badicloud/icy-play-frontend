import { dayNames, type OnboardingDraft } from "./draft";

export type FieldErrors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors Facility.ToSlug on the server, only far enough to catch a name that would produce nothing. */
function wouldProduceASlug(name: string) {
  return (
    name
      .normalize("NFD")
      // Drops the combining marks NFD just split off, so "Parañaque" becomes
      // "paranaque" rather than losing the letter. The range is U+0300-U+036F.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") !== ""
  );
}


export const philippineMobileHint =
  "Philippine mobile, for example 0995 3979930 or +63 995 3979930.";

/**
 * A Philippine mobile number, not a phone number in general. Every mobile
 * prefix here begins 09, so the two accepted shapes are 09 followed by nine
 * digits, or the same number written internationally as +639. Spaces, dashes
 * and brackets are ignored, because people paste numbers the way they are
 * printed rather than the way a regex wants them.
 */
export function isPhilippineMobile(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return /^09\d{9}$/.test(digits) || /^\+639\d{9}$/.test(digits);
}

function required(errors: FieldErrors, key: string, value: string, label: string) {
  if (value.trim() === "") {
    errors[key] = `${label} is required.`;
  }
}

function validOwner(draft: OnboardingDraft) {
  const errors: FieldErrors = {};
  required(errors, "fullName", draft.owner.fullName, "The owner's name");
  required(errors, "email", draft.owner.email, "An email address");
  required(errors, "phoneNumber", draft.owner.phoneNumber, "A mobile number");

  if (draft.owner.phoneNumber.trim() !== "" && !isPhilippineMobile(draft.owner.phoneNumber)) {
    errors.phoneNumber = "Enter a Philippine mobile number, like 0995 3979930.";
  }

  if (draft.owner.email.trim() !== "" && !emailPattern.test(draft.owner.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function validBusiness(draft: OnboardingDraft) {
  const errors: FieldErrors = {};
  required(errors, "businessName", draft.business.businessName, "The business name");
  required(errors, "billingEmail", draft.business.billingEmail, "A billing email");

  if (
    draft.business.billingEmail.trim() !== "" &&
    !emailPattern.test(draft.business.billingEmail.trim())
  ) {
    errors.billingEmail = "Enter a valid email address.";
  }

  return errors;
}

function validFacility(draft: OnboardingDraft) {
  const errors: FieldErrors = {};
  const { facility } = draft;

  required(errors, "name", facility.name, "The facility name");
  required(errors, "addressLine1", facility.addressLine1, "A street address");
  required(errors, "city", facility.city, "A city");
  required(errors, "province", facility.province, "A province");
  required(errors, "country", facility.country, "A country");
  required(errors, "timeZone", facility.timeZone, "A time zone");

  if (facility.name.trim() !== "" && !wouldProduceASlug(facility.name)) {
    errors.name = "The name needs at least one letter or number.";
  }

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

  if (latitude !== "" && (Number.isNaN(Number(latitude)) || Math.abs(Number(latitude)) > 90)) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (longitude !== "" && (Number.isNaN(Number(longitude)) || Math.abs(Number(longitude)) > 180)) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  return errors;
}

function validHours(draft: OnboardingDraft) {
  const errors: FieldErrors = {};

  draft.operatingHours.forEach((day) => {
    if (day.closed) {
      return;
    }

    if (day.opensAt === "" || day.closesAt === "") {
      // Closed is the absence of both times, not one of them.
      errors[`day-${day.dayOfWeek}`] = `${dayNames[day.dayOfWeek]} needs both an opening and a closing time, or mark it closed.`;
      return;
    }

    if (day.closesAt <= day.opensAt) {
      errors[`day-${day.dayOfWeek}`] = `${dayNames[day.dayOfWeek]} cannot close before it opens.`;
    }
  });

  return errors;
}

function validContract(draft: OnboardingDraft) {
  const errors: FieldErrors = {};

  // A term without the signed agreement is a claim, not a record.
  if (draft.contract.document === null) {
    errors.document = "Attach the signed agreement.";
  }

  required(errors, "startDate", draft.contract.startDate, "A start date");
  required(errors, "endDate", draft.contract.endDate, "An end date");

  if (
    draft.contract.startDate !== "" &&
    draft.contract.endDate !== "" &&
    draft.contract.endDate < draft.contract.startDate
  ) {
    errors.endDate = "A contract cannot end before it starts.";
  }

  return errors;
}

/** One validator per step, in step order. Amenities and rules are all optional. */
const validators: ((draft: OnboardingDraft) => FieldErrors)[] = [
  validOwner,
  validBusiness,
  validFacility,
  () => ({}),
  validHours,
  validContract,
];

export function validateStep(step: number, draft: OnboardingDraft): FieldErrors {
  return validators[step]?.(draft) ?? {};
}

export function isStepValid(step: number, draft: OnboardingDraft) {
  return Object.keys(validateStep(step, draft)).length === 0;
}

/**
 * The first step that would not pass, or null when the whole draft is valid.
 *
 * Submit checks this rather than only the step on screen. A restored draft can
 * open on Review with an earlier step left invalid — by a rule that has since
 * been tightened, say — and validating only the visible step would let that
 * reach the server.
 */
export function firstInvalidStep(draft: OnboardingDraft) {
  const step = validators.findIndex((_, index) => !isStepValid(index, draft));
  return step === -1 ? null : step;
}
