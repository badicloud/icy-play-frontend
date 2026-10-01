import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { Pagination } from "./adminApi";
import type { RejectAnswer } from "./deskApi";

/** "PendingPayment", "PendingVerification", "Confirmed", "Rejected", "Cancelled". */
export type RegistrationStatus =
  | "PendingPayment"
  | "PendingVerification"
  | "Confirmed"
  | "Rejected"
  | "Cancelled";

/** One registration as its player sees it: everything the checkout and "My open plays" show. */
export type OpenPlayRegistration = {
  registrationId: string;
  status: RegistrationStatus;
  openPlayId: string;
  title: string;
  level: string;
  sportKey: string;
  sportName: string;
  facilityId: string;
  facilityName: string;
  facilitySlug: string;
  city: string;
  courtName: string;
  unitLabel: string;
  /** yyyy-MM-dd, the venue's calendar. */
  date: string;
  startsAt: string;
  endsAt: string;
  registrationFee: number;
  discount: number;
  platformFee: number;
  total: number;
  /** When the spot stops being held if no receipt arrives. From the server. */
  holdsUntil: string;
  /** The hold ran out with no receipt: the spot is gone. */
  hasLapsed: boolean;
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  /** On a refusal: the reason the desk picked and its note. */
  cancellationReason: string | null;
  agreedToPolicyAt: string;
  createdAt: string;
  gcashNumber: string | null;
  gcashAccountName: string | null;
  gcashQrCodeUrl: string | null;
  /** How to reach the venue: its published phone and email, or the owner's. */
  venueContact: string;
  coverPhotoUrl: string | null;
  /** The session is over on the venue's clock, decided by the server. */
  sessionHasEnded: boolean;
};

/**
 * Registers for one date and holds the spot. Only after the player has agreed
 * to the open play policy; the server refuses without it. Pressing it again
 * while holding a spot answers with the same registration.
 */
export function registerForOpenPlay(openPlayId: string, date: string) {
  return apiClient.post<OpenPlayRegistration, { date: string; agreedToPolicy: boolean }>(
    API_ENDPOINTS.OPEN_PLAY_REGISTRATIONS.REGISTER(openPlayId),
    { date, agreedToPolicy: true },
  );
}

export function getOpenPlayRegistration(registrationId: string) {
  return apiClient.get<OpenPlayRegistration>(API_ENDPOINTS.OPEN_PLAY_REGISTRATIONS.ONE(registrationId));
}

export function getMyOpenPlayRegistrations() {
  return apiClient.get<OpenPlayRegistration[]>(API_ENDPOINTS.OPEN_PLAY_REGISTRATIONS.MINE);
}

/** Records the receipt the browser has just put in Cloudinary, which hands it to the venue. */
export function sendOpenPlayReceipt(registrationId: string, receiptUrl: string) {
  return apiClient.post<OpenPlayRegistration, { receiptUrl: string }>(
    API_ENDPOINTS.OPEN_PLAY_REGISTRATIONS.RECEIPT(registrationId),
    { receiptUrl },
  );
}

/** Which step of the checkout a registration is on. Read from the registration, never the address. */
export function registrationStep(registration: OpenPlayRegistration): 2 | 3 {
  return registration.status === "PendingPayment" ? 2 : 3;
}

export const registrationStates: Record<RegistrationStatus, { label: string; tone: string }> = {
  PendingPayment: { label: "Waiting for payment", tone: "bg-slate-100 text-slate-700" },
  PendingVerification: { label: "Waiting for the venue", tone: "bg-amber-50 text-amber-800" },
  Confirmed: { label: "Registered", tone: "bg-green-50 text-green-800" },
  Rejected: { label: "Not accepted", tone: "bg-red-50 text-red-800" },
  Cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-600" },
};

/** How a player's registration is found for a session tile: one open play, one date. */
export function registrationKey(openPlayId: string, date: string) {
  return `${openPlayId}|${date}`;
}

/**
 * The player's registrations that still stand — being paid for inside the
 * hold, with the venue, or registered — by open play and date. A lapsed hold,
 * a refusal and a cancellation are left out: none of them stops the player
 * joining that session again.
 */
export function standingRegistrations(registrations: OpenPlayRegistration[]) {
  const standing = new Map<string, OpenPlayRegistration>();

  for (const registration of registrations) {
    const stands =
      !registration.hasLapsed &&
      (registration.status === "PendingPayment" ||
        registration.status === "PendingVerification" ||
        registration.status === "Confirmed");

    if (stands) {
      standing.set(registrationKey(registration.openPlayId, registration.date), registration);
    }
  }

  return standing;
}

/** How a registration reads in a list, lapsed holds included. */
export function registrationState(registration: OpenPlayRegistration) {
  return registration.hasLapsed
    ? { label: "Hold ran out", tone: "bg-slate-100 text-slate-600" }
    : registrationStates[registration.status];
}

// ------------------------------------------------------------------ the desk

/** One registration in the desk's queue. */
export type DeskOpenPlayRequest = {
  registrationId: string;
  status: RegistrationStatus;
  openPlayId: string;
  title: string;
  facilityId: string;
  facilityName: string;
  courtName: string;
  unitLabel: string;
  date: string;
  startsAt: string;
  endsAt: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string | null;
  registrationFee: number;
  discount: number;
  platformFee: number;
  total: number;
  receiptUrl: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  /** Registered players on that session now. */
  registered: number;
  maxPlayers: number;
};

export type DeskOpenPlayRequestTab = "Waiting" | "Confirmed";

export type DeskOpenPlayRequestPage = {
  data: DeskOpenPlayRequest[];
  pagination: Pagination;
};

export function getDeskOpenPlayRequests(query: {
  tab: DeskOpenPlayRequestTab;
  facilityId?: string | null;
  page: number;
  pageSize: number;
}) {
  return apiClient.get<DeskOpenPlayRequestPage>(API_ENDPOINTS.DESK.OPEN_PLAY_REQUESTS, {
    query: {
      tab: query.tab,
      facilityId: query.facilityId ?? undefined,
      page: query.page,
      pageSize: query.pageSize,
    },
    unwrapData: false,
  });
}

export function confirmDeskOpenPlayRequest(registrationId: string) {
  return apiClient.post<DeskOpenPlayRequest>(API_ENDPOINTS.DESK.OPEN_PLAY_REQUEST_CONFIRM(registrationId));
}

/** The same reasons, and the same note, the booking queue offers. */
export function rejectDeskOpenPlayRequest(registrationId: string, why: RejectAnswer) {
  return apiClient.post<DeskOpenPlayRequest, { reason: string; note: string | null }>(
    API_ENDPOINTS.DESK.OPEN_PLAY_REQUEST_REJECT(registrationId),
    { reason: why.reason, note: why.note },
  );
}
