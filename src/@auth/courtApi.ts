import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { FacilityOperatingHourDetail, PhotoItem, PhotoPayload } from "./adminApi";

export type { PhotoItem, PhotoPayload };

export type Sport = {
  id: string;
  key: string;
  name: string;
  category: string;
  /** "Sport" for something played, "Event" for something the floor is hired for. */
  kind: string;
  displayOrder: number;
  isActive: boolean;
  /** How many courts list it, so retiring one is a decision with a number on it. */
  courtCount: number;
};

export const sportCategories = [
  "Court sports",
  "Racket sports",
  "Combat",
  "Events",
  "Other",
] as const;

export function getSports(includeRetired = false) {
  return apiClient.get<Sport[]>(API_ENDPOINTS.ADMIN.SPORTS, {
    query: { includeRetired },
  });
}

export type SportPayload = {
  name: string;
  category: string;
  displayOrder: number;
  kind: string;
};

export const activityKinds = ["Sport", "Event"] as const;

export const activityKindHints: Record<string, string> = {
  Sport: "Something played on the court.",
  Event: "Something the floor is hired for — a party, a tournament, a show.",
};

export function createSport(payload: SportPayload) {
  return apiClient.post<string, SportPayload>(API_ENDPOINTS.ADMIN.SPORTS, payload);
}

export function updateSport(id: string, payload: SportPayload) {
  return apiClient.put<void, SportPayload>(API_ENDPOINTS.ADMIN.SPORT(id), payload);
}

export function setSportActive(id: string, isActive: boolean) {
  return apiClient.post<void, Record<string, never>>(
    isActive ? API_ENDPOINTS.ADMIN.SPORT_REINSTATE(id) : API_ENDPOINTS.ADMIN.SPORT_RETIRE(id),
    {},
  );
}

export type FacilityInventoryItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string;
  facilityOwnerId: string;
  businessName: string;
  ownerStatus: string;
  isActive: boolean;
  courtCount: number;
  activeCourtCount: number;
  maintenance: MaintenanceStatus | null;
  /** What the booking list would show. Null when nobody has set one. */
  coverPhotoUrl: string | null;
  /** The column the list exists for: what a customer can book right now. */
  isBookable: boolean;
  createdAt: string;
};

type FacilityInventoryResponse = {
  data: FacilityInventoryItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function getFacilityInventory(query: { search?: string; page?: number; pageSize?: number }) {
  return apiClient.get<FacilityInventoryResponse>(API_ENDPOINTS.ADMIN.FACILITIES, {
    query: {
      search: query.search || undefined,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

/**
  * The four rates a court can charge for one sport. Only the standard one is
  * stored when a venue charges the same all week: the rest fall back to it, so
  * a blank means "same as standard" rather than "free".
  */
export type SportRates = {
  standardHourlyRate: number | null;
  peakHourlyRate: number | null;
  weekendRate: number | null;
  holidayRate: number | null;
};

export type CourtSportItem = SportRates & {
  sportId: string;
  key: string;
  name: string;
  category: string;
  kind: string;
  isPrimary: boolean;
  /** How many playable courts this one makes for this sport. One means whole. */
  divisions: number;
};

/**
 * One thing a customer can book: a court set up for a sport, or one marked-out
 * part of it. A floor that takes basketball, volleyball and pickleball three
 * across is five of these, and a booking points at one.
 *
 * Retired parts are not sent: this is what is on sale.
 */
export type BookableCourtItem = {
  /** What a booking is taken against. Survives a rename and a re-marking. */
  id: string;
  sportId: string;
  sportName: string;
  /** Which part this is. One when the court is played whole. */
  divisionNumber: number;
  /** Derived on the server, the same way the public listing derives it. */
  name: string;
  kind: "Whole" | "Divided";
};

/**
 * One sport on a court, and how many playable courts it makes when set up for
 * it. A full basketball court is three pickleball courts across, and each of
 * those is booked and paid for on its own.
 */
export type CourtSportPayload = { sportId: string; divisions: number };

export const maximumDivisions = 12;

/**
 * What one division is called. Derived rather than stored, so renaming the
 * court renames its divisions with it instead of leaving a name that lies.
 */
export function divisionName(
  courtName: string,
  sportName: string,
  number: number,
  divisions: number,
) {
  return divisions <= 1 ? courtName : `${courtName} · ${sportName} ${number}`;
}

export type SportPricingPayload = SportRates & { sportId: string };

/**
 * When the peak rate applies. On the court rather than on each sport, because a
 * venue is busy at the same hours whatever is being played on it.
 */
export type PeakWindowPayload = {
  startsAt: string | null;
  endsAt: string | null;
  onWeekdays: boolean;
  onWeekends: boolean;
};

export type UpdateCourtPricingPayload = {
  sports: SportPricingPayload[];
  peakWindow: PeakWindowPayload | null;
  reason: string | null;
};

export type UpdateCourtDivisionsPayload = {
  sports: CourtSportPayload[];
  reason: string | null;
};

export function updateCourtDivisions(courtId: string, payload: UpdateCourtDivisionsPayload) {
  return apiClient.put<void, UpdateCourtDivisionsPayload>(
    API_ENDPOINTS.ADMIN.COURT_DIVISIONS(courtId),
    payload,
  );
}

export function updateCourtPricing(courtId: string, payload: UpdateCourtPricingPayload) {
  return apiClient.put<void, UpdateCourtPricingPayload>(
    API_ENDPOINTS.ADMIN.COURT_PRICING(courtId),
    payload,
  );
}

/**
 * Why a court is out of service, and at which level. A closure set on the
 * facility cannot be lifted from the court, so the level is never hidden.
 */
export type MaintenanceStatus = {
  periodId: string;
  appliesToWholeFacility: boolean;
  reason: string;
  startsAt: string;
  endsAt: string | null;
};

export type Court = {
  id: string;
  facilityId: string;
  facilityName: string;
  /** Carried so a court page can find its way back to the owner. */
  facilityOwnerId: string;
  name: string;
  displayOrder: number;
  description: string | null;
  venueType: string;
  surface: string | null;
  hasLighting: boolean;
  sizeLabel: string | null;
  capacity: number | null;
  equipment: string | null;
  slotLengthMinutes: number;
  minimumDurationMinutes: number;
  bufferMinutes: number;
  usesFacilityHours: boolean;
  isActive: boolean;
  /** When the peak rate applies. Null until a peak rate is set. */
  peakStartsAt: string | null;
  peakEndsAt: string | null;
  peakOnWeekdays: boolean;
  peakOnWeekends: boolean;
  sports: CourtSportItem[];
  /** What this court sells, one row per playable part. */
  bookableCourts: BookableCourtItem[];
  photos: PhotoItem[];
  /** Already resolved: the facility's hours when the court follows them. */
  operatingHours: FacilityOperatingHourDetail[];
  maintenance: MaintenanceStatus | null;
  createdAt: string;
};

export function getCourts(facilityId: string) {
  return apiClient.get<Court[]>(API_ENDPOINTS.ADMIN.FACILITY_COURTS(facilityId));
}

/**
 * One court, read across the whole platform rather than through its facility.
 * An admin correcting a court should not have to remember which venue it is in.
 */
export type CourtInventoryItem = {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  facilityId: string;
  facilityName: string;
  facilityOwnerId: string;
  businessName: string;
  city: string;
  province: string;
  venueType: string;
  coverPhotoUrl: string | null;
  sports: CourtSportItem[];
  /** Every division of every sport: what a customer could actually book here. */
  bookableUnits: number;
  maintenance: MaintenanceStatus | null;
};

export type CourtInventoryQuery = {
  search?: string;
  facilityOwnerId?: string;
  facilityId?: string;
  page?: number;
  pageSize?: number;
};

type CourtInventoryResponse = {
  data: CourtInventoryItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function getCourtInventory(query: CourtInventoryQuery) {
  return apiClient.get<CourtInventoryResponse>(API_ENDPOINTS.ADMIN.COURTS, {
    query: {
      search: query.search || undefined,
      facilityOwnerId: query.facilityOwnerId || undefined,
      facilityId: query.facilityId || undefined,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

export function getCourt(courtId: string) {
  return apiClient.get<Court>(API_ENDPOINTS.ADMIN.COURT(courtId));
}

/**
 * The court answered whole, the same shape the wizard created it with, so one
 * screen can add a court and another can correct it without the two drifting.
 */
export type UpdateCourtPayload = {
  court: {
    name: string;
    displayOrder: number;
    description: string | null;
    sports: CourtSportPayload[];
    primarySportId: string;
    venueType: string;
    surface: string | null;
    hasLighting: boolean;
    sizeLabel: string | null;
    capacity: number | null;
    equipment: string | null;
    slotLengthMinutes: number;
    minimumDurationMinutes: number;
    bufferMinutes: number;
    usesFacilityHours: boolean;
    operatingHours: { dayOfWeek: number; opensAt: string | null; closesAt: string | null }[];
    photos: PhotoPayload[];
  };
  isActive: boolean;
  reason: string | null;
};

export function updateCourt(courtId: string, payload: UpdateCourtPayload) {
  return apiClient.put<void, UpdateCourtPayload>(API_ENDPOINTS.ADMIN.COURT(courtId), payload);
}

export const venueTypes = ["Indoor", "Covered", "Outdoor"] as const;

export const venueTypeHints: Record<string, string> = {
  Indoor: "Enclosed, often air conditioned.",
  Covered: "Roofed with open sides. The commonest kind here.",
  Outdoor: "No roof.",
};

export const surfaces = [
  "Wood",
  "Concrete",
  "Synthetic",
  "Acrylic",
  "Sand",
  "Grass",
] as const;

export type OperatingHourPayload = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
};

export type CreateCourtPayload = {
  facilityOwnerId: string;
  facilityId: string | null;
  newFacility: {
    details: {
      name: string;
      description: string | null;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      province: string;
      postalCode: string | null;
      country: string;
      latitude: number | null;
      longitude: number | null;
      timeZone: string;
      contactPhone: string | null;
      contactEmail: string | null;
      safetyMeasures: string | null;
      houseRules: string | null;
      amenityIds: string[];
    };
    operatingHours: OperatingHourPayload[];
    photos: PhotoPayload[];
  } | null;
  court: {
    name: string;
    displayOrder: number;
    description: string | null;
    sports: CourtSportPayload[];
    primarySportId: string;
    venueType: string;
    surface: string | null;
    hasLighting: boolean;
    sizeLabel: string | null;
    capacity: number | null;
    equipment: string | null;
    slotLengthMinutes: number;
    minimumDurationMinutes: number;
    bufferMinutes: number;
    usesFacilityHours: boolean;
    operatingHours: OperatingHourPayload[];
    photos: PhotoPayload[];
  };
};

export type CreatedCourt = {
  courtId: string;
  facilityId: string;
  facilityName: string;
};

export function createCourt(payload: CreateCourtPayload) {
  return apiClient.post<CreatedCourt, CreateCourtPayload>(API_ENDPOINTS.ADMIN.COURTS, payload);
}

export type SetMaintenancePayload = {
  startsAt: string;
  /** Null means until further notice. */
  endsAt: string | null;
  reason: string;
};

export function setFacilityMaintenance(facilityId: string, payload: SetMaintenancePayload) {
  return apiClient.post<string, SetMaintenancePayload>(
    API_ENDPOINTS.ADMIN.FACILITY_MAINTENANCE(facilityId),
    payload,
  );
}

export function setCourtMaintenance(courtId: string, payload: SetMaintenancePayload) {
  return apiClient.post<string, SetMaintenancePayload>(
    API_ENDPOINTS.ADMIN.COURT_MAINTENANCE(courtId),
    payload,
  );
}

export function liftMaintenance(periodId: string) {
  return apiClient.post<void, Record<string, never>>(
    API_ENDPOINTS.ADMIN.LIFT_MAINTENANCE(periodId),
    {},
  );
}
