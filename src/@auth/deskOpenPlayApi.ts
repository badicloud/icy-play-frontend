import { apiClient, API_ENDPOINTS, ApiError } from "@/services/api";
import { uploadToCloudinary, type UploadedAsset, type UploadSignature } from "./cloudinaryUpload";
import { getDeskCourts, getDeskVenues, type DeskCourt, type DeskVenue } from "./deskApi";

/** "Draft", "Published" or "Ended". */
export type OpenPlayStatus = "Draft" | "Published" | "Ended";

export type OpenPlayEarlyBirdInput = {
  /** "Fixed" or "Percentage". */
  discountKind: string;
  discountValue: number;
  /** How long before the start a player must register to get it. */
  leadMinutes: number;
};

/** What the desk fills in to create or change a draft. */
export type OpenPlayInput = {
  bookableCourtId: string;
  title: string;
  level: string;
  maxPlayers: number;
  registrationFee: number;
  /** HH:mm:ss, venue wall clock. */
  startsAt: string;
  endsAt: string;
  /** 0 = Sunday … 6 = Saturday, as the server's DayOfWeek. */
  days: number[];
  /** yyyy-MM-dd */
  startDate: string;
  endDate: string | null;
  registrationCutoffMinutes: number;
  earlyBird: OpenPlayEarlyBirdInput | null;
};

/** One open play as the desk sees it, drafts included. */
export type DeskOpenPlay = {
  openPlayId: string;
  facilityId: string;
  facilityName: string;
  bookableCourtId: string;
  courtId: string;
  courtName: string;
  unitLabel: string;
  sportKey: string;
  sportName: string;
  title: string;
  level: string;
  maxPlayers: number;
  registrationFee: number;
  /** The platform's top-up, once per registration. */
  platformFee: number;
  /** What a player pays without the early bird. */
  price: number;
  startsAt: string;
  endsAt: string;
  days: number[];
  startDate: string;
  endDate: string | null;
  registrationCutoffMinutes: number;
  earlyBird: OpenPlayEarlyBirdInput | null;
  status: OpenPlayStatus;
  isSeeded: boolean;
  createdAt: string;
  publishedAt: string | null;
  endedAt: string | null;
  /** Registered players: the ones the venue has confirmed. */
  registrations: number;
  /** The open play's own cover photo; null when it has none. */
  coverPhotoUrl: string | null;
  /** Receipts sent and waiting on the desk: not registered yet. */
  waiting: number;
};

/** Something already holding hours the open play wants. */
export type OpenPlayClash = {
  /** "Booking" or "OpenPlay". */
  kind: string;
  date: string;
  startsAt: string;
  endsAt: string;
  /** The customer's name, or the other open play's title. */
  description: string;
};

/** A saved draft, with anything it would clash with if published now. */
export type OpenPlaySaved = {
  openPlay: DeskOpenPlay;
  clashes: OpenPlayClash[];
};

/** Photos a browser may send: what Cloudinary and every browser show. */
export const coverPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

/** Five megabytes: a phone photo, not a camera's raw file. */
export const coverPhotoMaxBytes = 5 * 1024 * 1024;

/** What the form picks from: the venues, each with its own today, and their courts. */
export type OpenPlayPlaces = {
  venues: DeskVenue[];
  courts: DeskCourt[];
};

/**
 * Which door the open play pages go through: the venue desk, or the platform
 * admin for one facility owner. The two servers' addresses have the same shape
 * under a different base, and answer under the same rules, so one list and
 * one form serve both and only this differs.
 */
export type OpenPlaySource = {
  /** Query key prefix: what the pages cache under and invalidate. */
  key: readonly unknown[];
  /** Other caches a change makes stale, such as the owner's activity. */
  alsoInvalidates: (readonly unknown[])[];
  listHref: string;
  /** Where waiting payments are checked, or null where this door has no queue to go to. */
  requestsHref: string | null;
  /** The form: a new open play with no id, an existing one with it. */
  editHref: (openPlayId?: string) => string;
  /** The first crumbs of the form page's trail, before its own. */
  trail: { label: string; href?: string }[];
  list: () => Promise<DeskOpenPlay[]>;
  get: (openPlayId: string) => Promise<DeskOpenPlay>;
  places: () => Promise<OpenPlayPlaces>;
  create: (input: OpenPlayInput) => Promise<OpenPlaySaved>;
  update: (openPlayId: string, input: OpenPlayInput) => Promise<OpenPlaySaved>;
  publish: (openPlayId: string) => Promise<DeskOpenPlay>;
  unpublish: (openPlayId: string) => Promise<DeskOpenPlay>;
  end: (openPlayId: string) => Promise<DeskOpenPlay>;
  remove: (openPlayId: string) => Promise<void>;
  /**
   * Puts a cover photo straight into Cloudinary with a signature this door
   * asked for; the file never passes through our server.
   */
  uploadPhoto: (file: File) => Promise<UploadedAsset>;
  setPhoto: (openPlayId: string, photo: { publicId: string; secureUrl: string }) => Promise<DeskOpenPlay>;
  removePhoto: (openPlayId: string) => Promise<DeskOpenPlay>;
};

/** The calls every door shares, under its own base address. */
function calls(base: string) {
  const one = (openPlayId: string) => `${base}/${openPlayId}`;

  return {
    list: () => apiClient.get<DeskOpenPlay[]>(base),
    get: (openPlayId: string) => apiClient.get<DeskOpenPlay>(one(openPlayId)),
    create: (input: OpenPlayInput) => apiClient.post<OpenPlaySaved, OpenPlayInput>(base, input),
    update: (openPlayId: string, input: OpenPlayInput) =>
      apiClient.put<OpenPlaySaved, OpenPlayInput>(one(openPlayId), input),
    publish: (openPlayId: string) => apiClient.post<DeskOpenPlay>(`${one(openPlayId)}/publish`),
    unpublish: (openPlayId: string) => apiClient.post<DeskOpenPlay>(`${one(openPlayId)}/unpublish`),
    end: (openPlayId: string) => apiClient.post<DeskOpenPlay>(`${one(openPlayId)}/end`),
    remove: (openPlayId: string) => apiClient.delete<void>(one(openPlayId)),
    uploadPhoto: async (file: File) =>
      uploadToCloudinary(file, await apiClient.post<UploadSignature>(`${base}/photo-signature`)),
    setPhoto: (openPlayId: string, photo: { publicId: string; secureUrl: string }) =>
      apiClient.put<DeskOpenPlay, { publicId: string; secureUrl: string }>(`${one(openPlayId)}/photo`, {
        publicId: photo.publicId,
        secureUrl: photo.secureUrl,
      }),
    removePhoto: (openPlayId: string) => apiClient.delete<DeskOpenPlay>(`${one(openPlayId)}/photo`),
  };
}

/** The venue desk: the venues the signed-in owner or attendant works. */
export const deskOpenPlaySource: OpenPlaySource = {
  key: ["desk", "open-plays"],
  alsoInvalidates: [["desk"]],
  listHref: "/desk/open-play",
  requestsHref: "/desk/open-play-requests",
  editHref: (openPlayId) => (openPlayId ? `/desk/open-play/edit?id=${openPlayId}` : "/desk/open-play/edit"),
  trail: [
    { label: "Venue desk", href: "/desk" },
    { label: "Open play", href: "/desk/open-play" },
  ],
  places: async () => {
    const [venues, courts] = await Promise.all([getDeskVenues(), getDeskCourts()]);
    return { venues, courts };
  },
  ...calls(API_ENDPOINTS.DESK.OPEN_PLAYS),
};

/** The platform admin, for one facility owner's venues. */
export function adminOpenPlaySource(facilityOwnerId: string, businessName?: string): OpenPlaySource {
  const base = API_ENDPOINTS.ADMIN.OWNER_OPEN_PLAYS(facilityOwnerId);
  const ownerHref = `/admin/facility-owners/${facilityOwnerId}`;

  return {
    key: ["admin", "owner-open-plays", facilityOwnerId],
    // The owner's page shows the changes in its Activity tab.
    alsoInvalidates: [["admin", "facility-owners"]],
    listHref: `${ownerHref}?tab=open-play`,
    // Checking payments is the venue's; the platform does not work its queue.
    requestsHref: null,
    editHref: (openPlayId) =>
      openPlayId
        ? `${ownerHref}/open-plays/edit?id=${openPlayId}`
        : `${ownerHref}/open-plays/edit`,
    trail: [
      { label: "Platform admin", href: "/admin" },
      { label: "Facility owners", href: "/admin/facility-owners" },
      { label: businessName ?? "Facility owner", href: `${ownerHref}?tab=open-play` },
    ],
    places: () => apiClient.get<OpenPlayPlaces>(`${base}/places`),
    ...calls(base),
  };
}

/**
 * The clashes a refused publish came back with. The server puts them in the
 * error's details; anything else there is not a clash list.
 */
export function clashesOf(error: unknown): OpenPlayClash[] {
  if (!(error instanceof ApiError)) {
    return [];
  }

  const details = (error.payload as { error?: { details?: unknown } } | undefined)?.error?.details;

  return Array.isArray(details) ? (details as OpenPlayClash[]) : [];
}

export const weekdays = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
] as const;

/** [1, 3, 5] to "Mon, Wed, Fri"; all seven to "Every day". Monday first, as a week is read here. */
export function describeDays(days: number[]) {
  if (days.length === 7) {
    return "Every day";
  }

  return weekdays
    .filter((day) => days.includes(day.value))
    .map((day) => day.short)
    .join(", ");
}

export const openPlayStatusTone: Record<OpenPlayStatus, string> = {
  Draft: "bg-amber-50 text-amber-800",
  Published: "bg-green-50 text-green-800",
  Ended: "bg-slate-100 text-slate-600",
};
