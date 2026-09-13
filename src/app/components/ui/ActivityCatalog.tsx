"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityIcon, getCatalogActivities, type CatalogActivity } from "@auth/catalogApi";
import CourtResults from "./CourtResults";

const filters = [
  { id: "all", label: "All" },
  { id: "Sport", label: "Sports" },
  { id: "Event", label: "Events" },
] as const;

type FilterId = (typeof filters)[number]["id"];

/** A letter in a circle, for an entry an admin added with no artwork of its own. */
function FallbackIcon({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-[#2563EB]"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ActivityCard({
  activity,
  selected,
  onSelect,
}: {
  activity: CatalogActivity;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon = activityIcon(activity.key);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex min-h-[116px] flex-col items-start justify-between rounded-[24px] border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 ${
        selected
          ? "border-[#2563EB] bg-blue-50 ring-2 ring-blue-200"
          : "border-slate-200 bg-white hover:border-blue-200"
      }`}
    >
      {icon ? (
        <img src={icon} alt="" className="h-10 w-10 object-contain" aria-hidden />
      ) : (
        <FallbackIcon name={activity.name} />
      )}
      <span className="mt-3 text-base font-semibold text-slate-950">{activity.name}</span>
      <span className="text-sm text-slate-500">
        {activity.courtCount} {activity.courtCount === 1 ? "court" : "courts"} ·{" "}
        {activity.facilityCount} {activity.facilityCount === 1 ? "venue" : "venues"}
      </span>
    </button>
  );
}

/**
 * What can actually be booked, read from the API rather than written into the
 * page. A hard-coded list promises sports nobody has a court for, which is a
 * promise the search is then obliged to break.
 */
function ActivityCatalog() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activities = useQuery({
    queryKey: ["catalog", "activities"],
    queryFn: getCatalogActivities,
    // The listing changes when an admin sets a court up, not between one
    // visitor and the next. The server clears its own copy on that edit.
    staleTime: 5 * 60 * 1000,
  });

  const all = useMemo(() => activities.data ?? [], [activities.data]);
  const shown = filter === "all" ? all : all.filter((activity) => activity.kind === filter);

  // Only what is on screen can stay selected: filtering to Events while a sport
  // is picked would leave a court list under cards that no longer include it.
  const selected = shown.find((activity) => activity.key === selectedKey) ?? null;

  const counts = useMemo(
    () => ({
      all: all.length,
      Sport: all.filter((activity) => activity.kind === "Sport").length,
      Event: all.filter((activity) => activity.kind === "Event").length,
    }),
    [all],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by kind">
        {filters.map((entry) => {
          const isCurrent = filter === entry.id;

          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setFilter(entry.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isCurrent
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {entry.label}
              {counts[entry.id] > 0 && (
                <span className={isCurrent ? "ml-1.5 opacity-80" : "ml-1.5 text-slate-400"}>
                  {counts[entry.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activities.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
          aria-busy
          aria-label="Loading what you can book"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="min-h-[116px] animate-pulse rounded-[24px] border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : activities.isError ? (
        <p className="rounded-[24px] border border-slate-200 bg-white p-6 text-slate-600">
          We couldn&apos;t load what&apos;s available just now. Please refresh the page.
        </p>
      ) : shown.length === 0 ? (
        // Saying which of the two is empty beats a bare "nothing found": one
        // means the platform is new, the other that events have not been set up.
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-950">
            {filter === "Event"
              ? "No venues are taking event bookings yet"
              : filter === "Sport"
                ? "No courts are listed yet"
                : "Nothing is listed yet"}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            {filter === "Event"
              ? "Parties, tournaments and corporate days will appear here as soon as a venue sets one up."
              : "Courts appear here as soon as a venue is set up. Check back shortly."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {shown.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              selected={activity.key === selected?.key}
              onSelect={() =>
                setSelectedKey((current) => (current === activity.key ? null : activity.key))
              }
            />
          ))}
        </div>
      )}

      <CourtResults activity={selected} />
    </div>
  );
}

export default ActivityCatalog;
