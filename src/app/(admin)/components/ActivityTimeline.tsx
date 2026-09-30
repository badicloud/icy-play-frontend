"use client";

import { format } from "date-fns";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import { activityActionLabels, type ActivityEntry } from "@auth/adminApi";
import { useFacilityOwnerActivity } from "@auth/hooks/useFacilityOwnerEdits";

/** Field names come back as they are stored; these read as English. */
const fieldLabels: Record<string, string> = {
  businessName: "Business name",
  billingEmail: "Billing email",
  billingPhone: "Billing phone",
  businessRegistrationNumber: "Registration number",
  name: "Name",
  description: "Description",
  addressLine1: "Street address",
  addressLine2: "Address line 2",
  city: "City",
  province: "Province",
  postalCode: "Postal code",
  country: "Country",
  latitude: "Latitude",
  longitude: "Longitude",
  timeZone: "Time zone",
  contactPhone: "Contact phone",
  contactEmail: "Contact email",
  safetyMeasures: "Safety measures",
  houseRules: "House rules",
  amenityIds: "Amenities",
  platformHourlyRate: "Platform rate per hour",
  commissionPercentage: "Commission",
  photos: "Photo count",
  cover: "Cover photo",
  facilityName: "Facility",
  facilitySlug: "Web address",
  documents: "Documents",
  agreement: "Signed agreement",
  email: "Email",
  startDate: "Start date",
  endDate: "End date",
  notes: "Notes",
  facilityOwnerId: "Facility owner",
  gcashNumber: "GCash number",
  gcashAccountName: "GCash account name",
  gcashQrCode: "GCash QR code",
  partialBookingExpiryMinutes: "Hold a court for (minutes)",
  bookingWindowDays: "Customers can book up to (days ahead)",
  moveLimit: "Moves per booking",
  moveNoticeDays: "Moves close (days before it starts)",
  // An open play's fields.
  title: "Title",
  bookableCourtId: "Court",
  level: "Level",
  maxPlayers: "Most players",
  registrationFee: "Fee per player",
  hours: "Hours",
  days: "Days",
  dates: "Dates",
  cutoffMinutes: "Registration closes (minutes before)",
  earlyBird: "Early bird",
  status: "Status",
  coverPhoto: "Cover photo",
  lastDate: "Last date",
  sessionsCancelled: "Sessions cancelled",
  attendant: "Attendant",
};

function parse(json: string | null): Record<string, string | null> {
  if (!json) {
    return {};
  }

  try {
    return JSON.parse(json) as Record<string, string | null>;
  } catch {
    // A row written by an older shape is worth showing as an event rather than
    // failing the whole timeline.
    return {};
  }
}

function label(field: string) {
  return fieldLabels[field] ?? field;
}

function shorten(value: string | null) {
  if (value === null || value === "") {
    return "—";
  }

  return value.length > 60 ? `${value.slice(0, 60)}…` : value;
}

function EntryBody({ entry }: { entry: ActivityEntry }) {
  const before = parse(entry.oldValuesJson);
  const after = parse(entry.newValuesJson);
  const fields = Object.keys(after);

  if (fields.length === 0) {
    return null;
  }

  // An event carries only an "after", so it reads as a list rather than a diff.
  const isDiff = entry.oldValuesJson !== null;

  return (
    <ul className="mt-2 space-y-1">
      {fields.map((field) => (
        <li key={field} className="text-sm">
          <span className="text-slate-500">{label(field)}: </span>
          {isDiff ? (
            <>
              <span className="text-slate-400 line-through">{shorten(before[field])}</span>
              <span className="mx-1.5 text-slate-400">&rarr;</span>
              <span className="font-semibold text-[#071955]">{shorten(after[field])}</span>
            </>
          ) : (
            <span className="font-semibold text-[#071955]">{shorten(after[field])}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActivityTimeline({ facilityOwnerId }: { facilityOwnerId: string }) {
  const activity = useFacilityOwnerActivity(facilityOwnerId);
  const pages = activity.data?.pages ?? [];
  const total = pages[0]?.pagination.totalItems ?? 0;

  // Pages are counted from the newest entry, so an edit made while somebody
  // is reading pushes one entry onto the next page as well. Shown once.
  const seen = new Set<string>();
  const entries = pages
    .flatMap((page) => page.data)
    .filter((entry) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)));

  if (activity.isError) {
    return (
      <p className="font-semibold text-red-700">
        We couldn&apos;t load the history. Please refresh the page.
      </p>
    );
  }

  if (activity.isPending) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">Nothing recorded yet.</p>;
  }

  return (
    <>
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[1.9rem] top-0.5 flex size-6 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
            <HistoryOutlined sx={{ fontSize: 14 }} />
          </span>

          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-bold text-[#071955]">
              {activityActionLabels[entry.action] ?? entry.action}
            </p>
            <p className="text-sm text-slate-500">
              {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm")}
            </p>
          </div>

          <p className="text-sm text-slate-500">
            by {entry.actorName ?? "an account that no longer exists"}
          </p>

          <EntryBody entry={entry} />

          {entry.reason && (
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              &ldquo;{entry.reason}&rdquo;
            </p>
          )}
        </li>
      ))}
    </ol>

    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-500">
        Showing {entries.length} of {total}
      </p>

      {activity.hasNextPage && (
        <button
          type="button"
          disabled={activity.isFetchingNextPage}
          onClick={() => void activity.fetchNextPage()}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-[#164eaa] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {activity.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}

      {activity.isFetchNextPageError && (
        <p className="text-sm font-semibold text-red-700">
          The next page could not be loaded. Try again.
        </p>
      )}
    </div>
    </>
  );
}

export default ActivityTimeline;
