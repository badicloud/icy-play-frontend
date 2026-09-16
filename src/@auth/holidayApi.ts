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

/** What became of one row of an imported sheet. */
export type HolidayImportRow = {
  /** The row as Excel numbers it, so it can be found in the file. */
  row: number;
  name: string | null;
  date: string | null;
  outcome: "Added" | "Skipped" | "Rejected";
  /** Why it was skipped or rejected. Null when it was added. */
  reason: string | null;
};

export type HolidayImportResult = {
  added: number;
  skipped: number;
  rejected: number;
  rows: HolidayImportRow[];
};

/**
 * The empty sheet to fill in. Fetched rather than linked because the endpoint
 * wants the bearer token, and a link cannot carry one.
 */
export async function downloadHolidayTemplate() {
  const file = await apiClient.download(API_ENDPOINTS.ADMIN.HOLIDAY_TEMPLATE);
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = "icyplay-holidays-template.xlsx";
  document.body.append(link);
  link.click();
  link.remove();

  // The blob would be held for the life of the page otherwise.
  URL.revokeObjectURL(url);
}

export function importHolidays(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiClient.post<HolidayImportResult, FormData>(
    API_ENDPOINTS.ADMIN.HOLIDAY_IMPORT,
    form,
  );
}

export function setHolidayActive(id: string, isActive: boolean) {
  return apiClient.post<void, Record<string, never>>(
    isActive ? API_ENDPOINTS.ADMIN.HOLIDAY_REINSTATE(id) : API_ENDPOINTS.ADMIN.HOLIDAY_RETIRE(id),
    {},
  );
}
