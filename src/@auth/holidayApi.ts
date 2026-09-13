import { apiClient, API_ENDPOINTS } from "@/services/api";

/**
 * A day a court may charge its holiday rate on. A managed list rather than a
 * fixed one, because half the Philippine calendar moves: Maundy Thursday,
 * Eid'l Fitr and the proclaimed special days land on a different date each
 * year.
 */
export type Holiday = {
  id: string;
  name: string;
  /** ISO date. For a repeating holiday only the month and day are read. */
  date: string;
  kind: string;
  repeatsAnnually: boolean;
  isActive: boolean;
  /**
   * When it next falls, counting today. Null for a moving holiday whose date
   * has gone, which is the signal that it needs adding again for next year.
   */
  nextOccurrence: string | null;
};

export const holidayKinds = ["Regular", "Special non-working"] as const;

export const holidayKindHints: Record<string, string> = {
  Regular: "Paid even when nobody works. Fixed in law.",
  "Special non-working": "Proclaimed, and can change from year to year.",
};

export function getHolidays(includeRetired = false) {
  return apiClient.get<Holiday[]>(API_ENDPOINTS.ADMIN.HOLIDAYS, {
    query: { includeRetired },
  });
}

export type HolidayPayload = {
  name: string;
  date: string;
  kind: string;
  repeatsAnnually: boolean;
};

export function createHoliday(payload: HolidayPayload) {
  return apiClient.post<string, HolidayPayload>(API_ENDPOINTS.ADMIN.HOLIDAYS, payload);
}

export function updateHoliday(id: string, payload: HolidayPayload) {
  return apiClient.put<void, HolidayPayload>(API_ENDPOINTS.ADMIN.HOLIDAY(id), payload);
}

export function setHolidayActive(id: string, isActive: boolean) {
  return apiClient.post<void, Record<string, never>>(
    isActive ? API_ENDPOINTS.ADMIN.HOLIDAY_REINSTATE(id) : API_ENDPOINTS.ADMIN.HOLIDAY_RETIRE(id),
    {},
  );
}
