import type { OnboardFacilityOwnerPayload, UploadedFile } from "@auth/adminApi";

export type UploadedDocument = {
  documentType: string;
  publicId: string;
  secureUrl: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
};

export type DayHours = {
  /** 0 is Sunday, matching System.DayOfWeek on the server. */
  dayOfWeek: number;
  closed: boolean;
  opensAt: string;
  closesAt: string;
};

/**
 * Everything the wizard collects. Strings throughout, including the two
 * coordinates: a half-typed "7." is not a number yet, and turning it into one
 * too early is how a field fights the person filling it in.
 */
export type OnboardingDraft = {
  owner: { fullName: string; email: string; phoneNumber: string };
  business: {
    businessName: string;
    billingEmail: string;
    billingPhone: string;
    businessRegistrationNumber: string;
  };
  documents: UploadedDocument[];
  facility: {
    name: string;
    description: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: string;
    longitude: string;
    timeZone: string;
    contactPhone: string;
    contactEmail: string;
  };
  amenityIds: string[];
  safetyMeasures: string;
  houseRules: string;
  operatingHours: DayHours[];
  contract: {
    startDate: string;
    endDate: string;
    notes: string;
    /** The signed agreement. Required before a term can be commenced. */
    document: UploadedFile | null;
  };
};

export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFromToday() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    owner: { fullName: "", email: "", phoneNumber: "" },
    business: {
      businessName: "",
      billingEmail: "",
      billingPhone: "",
      businessRegistrationNumber: "",
    },
    documents: [],
    facility: {
      name: "",
      description: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Philippines",
      latitude: "",
      longitude: "",
      timeZone: "Asia/Manila",
      contactPhone: "",
      contactEmail: "",
    },
    amenityIds: [],
    safetyMeasures: "",
    houseRules: "",
    operatingHours: dayNames.map((_, dayOfWeek) => ({
      dayOfWeek,
      closed: dayOfWeek === 0,
      opensAt: "06:00",
      closesAt: "22:00",
    })),
    contract: {
      startDate: today(),
      endDate: oneYearFromToday(),
      notes: "",
      document: null,
    },
  };
}

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Pulls a latitude and longitude out of whatever the admin pasted: a bare pair
 * copied from Google Maps, or one of the three shapes a Maps URL can carry.
 *
 * Order matters. A /maps/place URL holds two different pairs, and they are not
 * the same point: "!3d...!4d..." is where the place actually is, while
 * "@lat,lng,15z" is only where the viewport happened to be centred when the
 * link was copied. On a zoomed-out map those sit kilometres apart, so the place
 * pair is read first and the camera pair is the fallback.
 */
export function parseCoordinates(value: string): { latitude: string; longitude: string } | null {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // the place itself
    /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // ...?q=7.073056,125.612222
    /^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/, // a bare pasted pair
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // the map centre, only if nothing better is there
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return { latitude: match[1], longitude: match[2] };
    }
  }

  return null;
}

export function directionsUrl(latitude: string, longitude: string) {
  // No API key and no account: this is a plain link into Google Maps.
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/** Converts "06:00" to the "06:00:00" the API expects. */
function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export function toPayload(draft: OnboardingDraft): OnboardFacilityOwnerPayload {
  const latitude = draft.facility.latitude.trim();
  const longitude = draft.facility.longitude.trim();
  // Sent as a pair or not at all: half a coordinate points nowhere, and the
  // API rejects it anyway.
  const hasPin = latitude !== "" && longitude !== "";

  return {
    owner: {
      fullName: draft.owner.fullName.trim(),
      email: draft.owner.email.trim(),
      phoneNumber: trimmedOrNull(draft.owner.phoneNumber),
    },
    business: {
      businessName: draft.business.businessName.trim(),
      billingEmail: draft.business.billingEmail.trim(),
      billingPhone: trimmedOrNull(draft.business.billingPhone),
      businessRegistrationNumber: trimmedOrNull(draft.business.businessRegistrationNumber),
    },
    documents: draft.documents,
    facility: {
      name: draft.facility.name.trim(),
      description: trimmedOrNull(draft.facility.description),
      addressLine1: draft.facility.addressLine1.trim(),
      addressLine2: trimmedOrNull(draft.facility.addressLine2),
      city: draft.facility.city.trim(),
      province: draft.facility.province.trim(),
      postalCode: trimmedOrNull(draft.facility.postalCode),
      country: draft.facility.country.trim(),
      latitude: hasPin ? Number(latitude) : null,
      longitude: hasPin ? Number(longitude) : null,
      timeZone: draft.facility.timeZone.trim(),
      contactPhone: trimmedOrNull(draft.facility.contactPhone),
      contactEmail: trimmedOrNull(draft.facility.contactEmail),
      safetyMeasures: trimmedOrNull(draft.safetyMeasures),
      houseRules: trimmedOrNull(draft.houseRules),
      amenityIds: draft.amenityIds,
    },
    operatingHours: draft.operatingHours.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      opensAt: day.closed ? null : toApiTime(day.opensAt),
      closesAt: day.closed ? null : toApiTime(day.closesAt),
    })),
    contract: {
      startDate: draft.contract.startDate,
      endDate: draft.contract.endDate,
      notes: trimmedOrNull(draft.contract.notes),
      document: draft.contract.document!,
    },
  };
}
