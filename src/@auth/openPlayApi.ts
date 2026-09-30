import { apiClient, API_ENDPOINTS } from "@/services/api";

/**
 * One date of an open play. Registration times are on the venue's clock and
 * worked out on the server; this page only shows them.
 */
export type CatalogOpenPlaySession = {
  /** yyyy-MM-dd */
  date: string;
  spotsLeft: number;
  /** Venue wall-clock time, yyyy-MM-ddTHH:mm:ss. */
  registrationClosesAt: string;
  isOpenForRegistration: boolean;
  /** What a player registering right now would pay, early bird included. */
  priceNow: number;
  earlyBirdNow: boolean;
};

export type CatalogEarlyBird = {
  /** "Fixed" or "Percentage". */
  discountKind: string;
  discountValue: number;
  leadMinutes: number;
};

/** One open play as the public site shows it, with its next few dates. */
export type CatalogOpenPlay = {
  openPlayId: string;
  title: string;
  facilityId: string;
  facilityName: string;
  city: string;
  courtName: string;
  sportKey: string;
  sportName: string;
  level: string;
  /** "Monday", "Saturday", … */
  days: string[];
  /** HH:mm:ss, venue wall clock. */
  startsAt: string;
  endsAt: string;
  startDate: string;
  endDate: string | null;
  maxPlayers: number;
  /** The venue's fee. */
  registrationFee: number;
  /** The platform's top-up, once per registration. */
  platformFee: number;
  /** Fee plus top-up, before any early bird. */
  price: number;
  registrationCutoffMinutes: number;
  earlyBird: CatalogEarlyBird | null;
  upcomingSessions: CatalogOpenPlaySession[];
  /** Its own cover, else the court's or the venue's photo. Null when none has one. */
  coverPhotoUrl: string | null;
};

export function getOpenPlays(filter?: { sport?: string | null; facility?: string | null }) {
  return apiClient.get<CatalogOpenPlay[]>(API_ENDPOINTS.OPEN_PLAYS.ROOT, {
    query: {
      sport: filter?.sport ?? undefined,
      facility: filter?.facility ?? undefined,
    },
  });
}

export const openPlayLevelLabels: Record<string, string> = {
  AllLevels: "All levels",
  Beginner: "Beginner",
  Intermediate: "Intermediate",
  Advanced: "Advanced",
};

export const openPlayLevel = (level: string) => openPlayLevelLabels[level] ?? level;

/** "18:00:00" to "6:00 PM". Read as a wall-clock time, never through the browser's zone. */
export function formatClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;

  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** "2026-09-19" to "Sat, Sep 19". Built from the parts, so no time zone can shift the day. */
export function formatSessionDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));

  return utc.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Monday, Wednesday" to "Mon, Wed"; all seven to "Every day". */
export function formatDays(days: string[]) {
  if (days.length === 7) {
    return "Every day";
  }

  return days.map((day) => day.slice(0, 3)).join(", ");
}

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** "3 days before", "2 hours before", "30 minutes before". */
export function formatLead(minutes: number) {
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} ${days === 1 ? "day" : "days"} before`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"} before`;
  }

  return `${minutes} minutes before`;
}

export function formatEarlyBird(earlyBird: CatalogEarlyBird) {
  const off =
    earlyBird.discountKind === "Percentage"
      ? `${earlyBird.discountValue}% off`
      : `${formatPeso(earlyBird.discountValue)} off`;

  // "each session": the deadline is counted back from every date the open
  // play runs on, not from the first one.
  return `${off} if you register at least ${formatLead(earlyBird.leadMinutes)} the session`;
}

/** Where a card anywhere on the site leads: the open play page, opened on this one. */
export const openPlayHref = (openPlayId: string) => `/open-play?id=${openPlayId}`;
