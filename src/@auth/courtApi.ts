import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { FacilityOperatingHourDetail, PhotoItem, PhotoPayload } from "./adminApi";

export type { PhotoItem, PhotoPayload };

export type Sport = {
  id: string;
  key: string;
  name: string;
  category: string;
  displayOrder: number;
  isActive: boolean;
  /** How many courts list it, so retiring one is a decision with a number on it. */
  courtCount: number;
};

export const sportCategories = [
  "Court sports",
  "Racket sports",
  "Combat",
  "Other",
] as const;

export function getSports(includeRetired = false) {
  return apiClient.get<Sport[]>(API_ENDPOINTS.ADMIN.SPORTS, {
    query: { includeRetired },
  });
}

export type SportPayload = { name: string; category: string; displayOrder: number };

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

export type CourtSportItem = {
  sportId: string;
  key: string;
  name: string;
  category: string;
  isPrimary: boolean;
};

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
  sports: CourtSportItem[];
  photos: PhotoItem[];
  /** Already resolved: the facility's hours when the court follows them. */
  operatingHours: FacilityOperatingHourDetail[];
  maintenance: MaintenanceStatus | null;
  createdAt: string;
};

export function getCourts(facilityId: string) {
  return apiClient.get<Court[]>(API_ENDPOINTS.ADMIN.FACILITY_COURTS(facilityId));
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
    sportIds: string[];
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
