import { apiClient, API_ENDPOINTS } from "@/services/api";

/**
 * One thing customers can actually book somewhere. Only activities with a court
 * configured come back: a filter that returns nothing is worse than a filter
 * that was never offered.
 */
export type CatalogActivity = {
  id: string;
  key: string;
  name: string;
  category: string;
  /** "Sport" or "Event". */
  kind: string;
  /** Counting each division separately — a floor marked out in three is three. */
  courtCount: number;
  facilityCount: number;
};

/**
 * One bookable court, or one marked-out part of one. A floor divided three ways
 * appears three times, because three games can run on it at once.
 */
export type CatalogCourt = {
  courtId: string;
  /** Which sport this offering is for. One court set up for three appears three times. */
  sportKey: string;
  sportName: string;
  divisionNumber: number;
  name: string;
  facilityId: string;
  facilityName: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string | null;
  /** Null until the venue has pinned itself. The map link needs both. */
  latitude: number | null;
  longitude: number | null;
  coverPhotoUrl: string | null;
  venueType: string;
  surface: string | null;
  hasLighting: boolean;
  slotLengthMinutes: number;
  minimumDurationMinutes: number;
  /** Null when the venue has not priced this sport yet. */
  standardHourlyRate: number | null;
  peakHourlyRate: number | null;
  weekendRate: number | null;
  holidayRate: number | null;
  /** When the peak rate applies. "700 at peak" means nothing without it. */
  peakStartsAt: string | null;
  peakEndsAt: string | null;
  peakOnWeekdays: boolean;
  peakOnWeekends: boolean;
  isUnderMaintenance: boolean;
  /** When the closure ends. Null means the venue has not said. */
  maintenanceEndsAt: string | null;
  /** True when the whole venue is shut, not just this court. */
  wholeVenueClosed: boolean;
};

export function getCatalogActivities() {
  return apiClient.get<CatalogActivity[]>(API_ENDPOINTS.CATALOG.ACTIVITIES);
}

/** A picture already stored, as the catalogue reads it back. */
export type CatalogPhoto = {
  id: string;
  publicId: string;
  secureUrl: string;
  caption: string | null;
  displayOrder: number;
  isCover: boolean;
};

/** The venue around the court: what a customer walks into. */
export type CatalogVenue = {
  description: string | null;
  safetyMeasures: string | null;
  houseRules: string | null;
  timeZone: string;
  contactPhone: string | null;
  contactEmail: string | null;
  amenities: string[];
  /** Already resolved: the facility's hours, or the court's own. */
  operatingHours: { dayOfWeek: number; opensAt: string | null; closesAt: string | null }[];
  photos: CatalogPhoto[];
};

/**
 * Everything needed to decide on one bookable court. One read, because a page
 * assembled from five calls shows five different moments.
 */
export type CatalogCourtDetail = {
  court: CatalogCourt;
  courtDescription: string | null;
  sizeLabel: string | null;
  capacity: number | null;
  equipment: string | null;
  bufferMinutes: number;
  courtPhotos: CatalogPhoto[];
  venue: CatalogVenue;
};

export function getCatalogCourt(courtId: string, sportKey: string, division: number) {
  return apiClient.get<CatalogCourtDetail>(API_ENDPOINTS.CATALOG.COURT(courtId), {
    query: { sport: sportKey, division },
  });
}

/**
 * Where one bookable court lives. The sport and division are in the URL because
 * a court set up for three sports is three separate offerings at three prices.
 */
export function courtDetailHref(court: CatalogCourt) {
  return `/courts/${court.courtId}?sport=${encodeURIComponent(court.sportKey)}&division=${court.divisionNumber}`;
}

/** Omit the key for everything on offer. */
export function getCatalogCourts(sportKey?: string) {
  return apiClient.get<CatalogCourt[]>(API_ENDPOINTS.CATALOG.COURTS, {
    query: sportKey ? { sport: sportKey } : {},
  });
}

/** "18:00:00" from the API, "6:00 PM" on a card. */
export function formatTime(value: string | null) {
  if (value === null) {
    return "";
  }

  const hours = Number(value.slice(0, 2));
  const minutes = value.slice(3, 5);
  const meridiem = hours < 12 ? "AM" : "PM";

  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${meridiem}`;
}

/** Which days the peak window runs on, said the way a person would. */
export function peakDays(court: CatalogCourt) {
  if (court.peakOnWeekdays && court.peakOnWeekends) {
    return "every day";
  }

  return court.peakOnWeekends ? "at weekends" : "on weekdays";
}

/**
 * What to tell a customer about a closure. The venue's own reason is not
 * carried: it is written for the audit trail, and "owner has not paid" is a
 * real thing to write there and the wrong thing to show a customer.
 */
export function maintenanceMessage(court: CatalogCourt) {
  if (!court.isUnderMaintenance) {
    return null;
  }

  const what = court.wholeVenueClosed
    ? `${court.facilityName} is closed for maintenance`
    : "This court is closed for maintenance";

  if (court.maintenanceEndsAt === null) {
    return {
      title: what,
      detail: "The venue hasn't said when it reopens. Try another court in the meantime.",
      short: "Under maintenance — no reopening date given yet",
    };
  }

  const back = new Date(court.maintenanceEndsAt).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
  });

  return {
    title: what,
    detail: `It should be back on ${back}.`,
    short: `Under maintenance until ${back}`,
  };
}

/** The venue's address on one line, for a card. */
export function formatAddress(court: CatalogCourt) {
  return [court.addressLine1, court.city, court.province, court.postalCode]
    .filter((part) => part !== null && part !== "")
    .join(", ");
}

/**
 * Directions to the venue. Google's own directions URL needs no API key and no
 * script, which is the whole reason it is used rather than an embedded map.
 */
export function directionsUrl(court: CatalogCourt) {
  if (court.latitude === null || court.longitude === null) {
    // No pin, so the best that can be done is search for the address.
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${court.facilityName}, ${formatAddress(court)}`,
    )}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${court.latitude},${court.longitude}`;
}

/**
 * The icon for an activity, by its stable key. An entry an admin adds later has
 * no artwork of its own, so it falls back rather than showing a broken image.
 */
const iconKeys = new Set([
  "badminton",
  "basketball",
  "pickleball",
  "tennis",
  "volleyball",
  "taekwondo",
]);

export function activityIcon(key: string) {
  return iconKeys.has(key) ? `/assets/icons/${key}.svg` : null;
}
