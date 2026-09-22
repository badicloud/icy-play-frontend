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
  /**
   * What a booking will be taken against: this court, for this sport, this part
   * of the floor. Stable across a rename and across the floor being marked out
   * differently.
   */
  bookableCourtId: string;
  courtId: string;
  /** Which sport this offering is for. One court set up for three appears three times. */
  sportKey: string;
  sportName: string;
  /** "Sport" or "Event". An occasion is quoted rather than priced by the hour. */
  kind: string;
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

/** One thing a venue is set up for, and how much of it there is. */
export type CatalogFacilitySport = {
  key: string;
  name: string;
  /** "Sport" or "Event". */
  kind: string;
  courtCount: number;
};

/**
 * One venue, as the landing page lists it.
 *
 * A venue rather than a court, because that is the unit somebody chooses
 * first: they pick where they are going, and only then what they are playing.
 */
export type CatalogFacility = {
  id: string;
  /** The stable public URL for this venue, and how its page is found. */
  slug: string;
  name: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string | null;
  /** Null until the venue has pinned itself. A map link needs both. */
  latitude: number | null;
  longitude: number | null;
  coverPhotoUrl: string | null;
  /** Counting each division separately: a floor marked out three ways is three. */
  courtCount: number;
  /** What this venue is set up for, busiest first. */
  sports: CatalogFacilitySport[];
};

export function getCatalogFacilities() {
  return apiClient.get<CatalogFacility[]>(API_ENDPOINTS.CATALOG.FACILITIES);
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
 * How a venue's page was narrowed when somebody was looking at it: which tab,
 * and which sport card.
 *
 * In the address bar rather than in state alone, so the page can be shared,
 * refreshed and returned to showing what the reader had chosen rather than
 * starting over at "All".
 */
export type FacilityFilter = {
  kind: "all" | "Sport" | "Event";
  activity: string | null;
};

export function facilityHref(slug: string, filter: FacilityFilter) {
  const query = new URLSearchParams();

  // "All" and "nothing picked" are the defaults, and a query string that spells
  // out its own defaults is noise in a bar somebody might copy.
  if (filter.kind !== "all") {
    query.set("kind", filter.kind);
  }

  if (filter.activity !== null) {
    query.set("activity", filter.activity);
  }

  const tail = query.toString();

  return tail === "" ? `/facilities/${slug}` : `/facilities/${slug}?${tail}`;
}

/** Reads back what facilityHref wrote, and refuses anything it did not. */
export function readFacilityFilter(params: URLSearchParams): FacilityFilter {
  const kind = params.get("kind");

  return {
    kind: kind === "Sport" || kind === "Event" ? kind : "all",
    activity: params.get("activity"),
  };
}

/**
 * Where a court was opened from, if it is somewhere worth sending a reader
 * back to.
 *
 * A venue page only, and only as a path on this site. Anything that reaches a
 * page through the address bar is written by whoever sends the link, and a back
 * button that follows whatever it is handed is how a page here becomes a door
 * to somewhere else — so "//elsewhere.example" and "https://…" are refused
 * along with everything that is not a venue.
 */
const venuePath = "/facilities/";

export function readBackHref(params: URLSearchParams) {
  const value = params.get("back");

  // A backslash is a slash to a browser and not to this check, which is the
  // whole trick behind "/facilities/\\elsewhere.example".
  if (value === null || !value.startsWith(venuePath) || value.includes("\\")) {
    return null;
  }

  // One segment, and a real one. Everything after "?" is the venue page's own
  // filter and is left alone; anything that climbs out of the segment — a
  // second slash, or an encoded one — is somebody trying their luck.
  const slug = value.slice(venuePath.length).split("?")[0].toLowerCase();

  return slug !== "" && !slug.includes("/") && !slug.includes("%2f") ? value : null;
}

/** Hangs a back link off a href that may already carry a query of its own. */
export function withBack(href: string, back: string | null) {
  return back === null
    ? href
    : `${href}${href.includes("?") ? "&" : "?"}back=${encodeURIComponent(back)}`;
}

/**
 * Where one bookable court lives. The sport and division are in the URL because
 * a court set up for three sports is three separate offerings at three prices.
 */
export function courtDetailHref(court: CatalogCourt) {
  return `/courts/${court.courtId}?sport=${encodeURIComponent(court.sportKey)}&division=${court.divisionNumber}`;
}

/** Omit the key for everything on offer. */
/**
 * Bookable courts, narrowed by sport, by venue, or by neither.
 *
 * The venue goes by id rather than by name: a name can be edited and two
 * venues can share one, and neither should change or widen what a filter
 * matches.
 */
export function getCatalogCourts(sportKey?: string, facilityId?: string) {
  return apiClient.get<CatalogCourt[]>(API_ENDPOINTS.CATALOG.COURTS, {
    query: {
      ...(sportKey ? { sport: sportKey } : {}),
      ...(facilityId ? { facility: facilityId } : {}),
    },
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
/**
 * Whether this offering is sold at one flat rate.
 *
 * An occasion is hired, not played: a party at eight on a Saturday is the
 * booking, so a peak or weekend surcharge is not a distinction anybody hiring
 * the hall is making. Events therefore show the standard rate and nothing else
 * — the same panel a sport gets, with one line in it.
 */
export function hasOneRateOnly(court: CatalogCourt) {
  return court.kind === "Event";
}

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
type Located = {
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function formatAddress(place: Located) {
  return [place.addressLine1, place.city, place.province, place.postalCode]
    .filter((part) => part !== null && part !== "")
    .join(", ");
}

/**
 * Directions to the venue. Google's own directions URL needs no API key and no
 * script, which is the whole reason it is used rather than an embedded map.
 */
export function directionsUrl(place: Located, name: string) {
  if (place.latitude === null || place.longitude === null) {
    // No pin, so the best that can be done is search for the address.
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${name}, ${formatAddress(place)}`,
    )}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
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
  // What the floor is hired for, drawn rather than photographed: an occasion
  // has no equipment to photograph the way a sport does.
  "birthday-party",
  "concert-or-show",
  "corporate-event",
  "tournament",
  "training-clinic",
]);

export function activityIcon(key: string) {
  return iconKeys.has(key) ? `/assets/icons/${key}.svg` : null;
}
