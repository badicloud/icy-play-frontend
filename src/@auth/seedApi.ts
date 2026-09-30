import { apiClient, API_ENDPOINTS } from "@/services/api";

/** What a seeding run produced, so the console can say more than "done". */
export type SeedResult = {
  facilityOwnerId: string;
  facilityId: string;
  facilityName: string;
  /** The seeded owner's address. Built without a usable password. */
  signInEmail: string;
  courts: string[];
};

/**
 * What this account may do here.
 *
 * Two answers rather than one, because removing is narrower than building:
 * building adds rows nobody was relying on, removing takes away whatever has
 * been done with them since.
 */
export type SeedAllowance = {
  mayBuild: boolean;
  mayRemove: boolean;
};

/** One seeded venue, and what it is holding. */
export type SeededVenue = {
  facilityOwnerId: string;
  businessName: string;
  signInEmail: string;
  seededAt: string;
  facilities: number;
  courts: number;
  bookings: number;
};

/** What a removal actually took away. */
export type SeedRemoval = {
  venues: number;
  facilities: number;
  courts: number;
  bookings: number;
};

/**
 * What this account is allowed to do.
 *
 * The server decides — it is the one that will refuse — and this only asks so
 * that a button is not offered to somebody it would then turn away.
 */
export function seedAllowance() {
  return apiClient.get<SeedAllowance>(API_ENDPOINTS.ADMIN.SEED_ALLOWED);
}

/**
 * @param ownerEmail Where the seeded owner's post goes. The only way into that
 * account is a password reset, so it has to be an address somebody can read.
 * Blank falls back to a throwaway public inbox.
 */
export function buildDemoVenue(ownerEmail?: string) {
  return apiClient.post<SeedResult, { ownerEmail: string | null }>(
    API_ENDPOINTS.ADMIN.SEED_VENUE,
    { ownerEmail: ownerEmail?.trim() || null },
  );
}

/** Every venue the seeder has standing, with what each one is holding. */
export function seededVenues() {
  return apiClient.get<SeededVenue[]>(API_ENDPOINTS.ADMIN.SEED_VENUES);
}

/** Removes every seeded venue and everything under it. There is no undo. */
export function removeSeededVenues() {
  return apiClient.delete<SeedRemoval>(API_ENDPOINTS.ADMIN.SEED_VENUES);
}

/** One sample open play standing now. */
export type SeededOpenPlay = {
  openPlayId: string;
  title: string;
  facilityName: string;
  courtName: string;
  sportName: string;
  level: string;
  /** "Monday, Wednesday", as the server names the flags. */
  days: string;
  startsAt: string;
  endsAt: string;
  registrationFee: number;
  maxPlayers: number;
  /** Made by somebody trying the product. They go with the open play. */
  registrations: number;
};

/** What a seeding run put where, and which samples it skipped and why. */
export type OpenPlaySeedResult = {
  venues: number;
  openPlays: SeededOpenPlay[];
  skipped: string[];
};

export type OpenPlaySeedRemoval = {
  openPlays: number;
  sessions: number;
  registrations: number;
};

/**
 * Puts sample open plays on every demo venue. Demo venues only: an open play
 * blocks its court hours, so a sample one on a real venue would turn real
 * customers away.
 */
export function buildSampleOpenPlays() {
  return apiClient.post<OpenPlaySeedResult, Record<string, never>>(
    API_ENDPOINTS.ADMIN.SEED_OPEN_PLAYS,
    {},
  );
}

export function seededOpenPlays() {
  return apiClient.get<SeededOpenPlay[]>(API_ENDPOINTS.ADMIN.SEED_OPEN_PLAYS);
}

/** Removes every sample open play with its sessions and registrations. The venues stay. */
export function removeSampleOpenPlays() {
  return apiClient.delete<OpenPlaySeedRemoval>(API_ENDPOINTS.ADMIN.SEED_OPEN_PLAYS);
}
