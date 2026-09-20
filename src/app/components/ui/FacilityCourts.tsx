"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  activityIcon,
  directionsUrl,
  formatAddress,
  getCatalogActivities,
  getCatalogFacilities,
  type CatalogActivity,
  type CatalogFacility,
} from "@auth/catalogApi";
import CourtResults from "./CourtResults";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

const filters = [
  { id: "all", label: "All" },
  { id: "Sport", label: "Sports" },
  { id: "Event", label: "Events" },
] as const;

type FilterId = (typeof filters)[number]["id"];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

/**
 * One venue's page: what it is, and everything bookable on it.
 *
 * The venue is found by slug because that is what the address bar carries, but
 * everything asked of the API afterwards goes by its id — a name or a slug can
 * be edited, and neither should change what a filter matches.
 */
function FacilityCourts({ slug }: { slug: string }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const facilities = useQuery({
    queryKey: ["catalog", "facilities"],
    queryFn: getCatalogFacilities,
    staleTime: 5 * 60 * 1000,
  });

  const activities = useQuery({
    queryKey: ["catalog", "activities"],
    queryFn: getCatalogActivities,
    staleTime: 5 * 60 * 1000,
  });

  const facility = facilities.data?.find((venue) => venue.slug === slug) ?? null;

  // Only the sports this venue actually has. The full catalogue would offer
  // tabs that lead to an empty list, which reads as a fault rather than as a
  // venue that does not do badminton.
  const here: CatalogActivity[] = useMemo(() => {
    if (facility === null || activities.data === undefined) {
      return [];
    }

    const mine = new Map(facility.sports.map((sport) => [sport.key, sport]));

    return activities.data
      .filter((activity) => mine.has(activity.key))
      .map((activity) => ({
        ...activity,
        // The counts that matter on this page are this venue's, not the
        // platform's: "18 courts" under a venue with two would be a lie.
        courtCount: mine.get(activity.key)!.courtCount,
        facilityCount: 1,
      }));
  }, [facility, activities.data]);

  const shown = useMemo(
    () => (filter === "all" ? here : here.filter((activity) => activity.kind === filter)),
    [here, filter],
  );

  // Only what is on screen can stay selected: filtering to Events while a sport
  // is picked would leave the list showing something the tabs deny.
  useEffect(() => {
    setSelectedKey((current) =>
      current !== null && shown.some((activity) => activity.key === current) ? current : null,
    );
  }, [shown]);

  const selected = shown.find((activity) => activity.key === selectedKey) ?? null;

  if (facilities.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading the venue…</p>
      </Shell>
    );
  }

  if (facility === null) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          We could not find that venue
        </h1>
        <p className="mt-2 text-slate-600">
          It may have been renamed, or it may not be taking bookings at the moment.
        </p>
        <Link
          href="/#venues"
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
        >
          See every venue
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header facility={facility} />

      <section id="courts" className="pt-10">
        <p className="text-sm font-semibold tracking-[0.16em] text-[#2563EB] uppercase">
          What you can book here
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-normal text-slate-950">
          Choose what you are booking
        </h2>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by kind">
          {filters.map((entry) => {
            const isCurrent = filter === entry.id;
            const count =
              entry.id === "all"
                ? here.length
                : here.filter((activity) => activity.kind === entry.id).length;

            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => setFilter(entry.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  isCurrent
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                }`}
              >
                {entry.label}
                <span className={isCurrent ? "text-blue-100" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>

        {shown.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {shown.map((activity) => {
              const icon = activityIcon(activity.key);
              const picked = selectedKey === activity.key;

              return (
                <button
                  key={activity.key}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => setSelectedKey(picked ? null : activity.key)}
                  className={`flex min-h-[116px] flex-col items-start justify-between rounded-[24px] border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 ${
                    picked
                      ? "border-[#2563EB] bg-blue-50 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" className="h-10 w-10 object-contain" aria-hidden />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-[#2563EB]"
                    >
                      {activity.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="mt-3 text-base font-semibold text-slate-950">
                    {activity.name}
                  </span>
                  <span className="text-sm text-slate-500">
                    {activity.courtCount} bookable{" "}
                    {activity.courtCount === 1 ? "court" : "courts"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <CourtResults activity={selected} facilityId={facility.id} />
      </section>
    </Shell>
  );
}

/** The venue itself: the photograph, where it is, and how much of it there is. */
function Header({ facility }: { facility: CatalogFacility }) {
  return (
    <>
      <nav className="text-sm font-semibold text-slate-500">
        <Link href="/" className="hover:text-[#2563EB]">
          Home
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-700">{facility.name}</span>
      </nav>

      <div className="mt-5 grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {facility.name}
          </h1>

          <p className="mt-2 font-semibold text-slate-500">
            {facility.courtCount} bookable {facility.courtCount === 1 ? "court" : "courts"} ·{" "}
            {facility.sports.map((sport) => sport.name).join(", ")}
          </p>

          <a
            href={directionsUrl(facility, facility.name)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-start gap-1.5 text-slate-600 underline-offset-2 hover:text-[#2563EB] hover:underline"
          >
            <PinIcon />
            <span>{formatAddress(facility)}</span>
          </a>
        </div>

        {facility.coverPhotoUrl !== null && (
          <div className="h-56 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={facility.coverPhotoUrl}
              alt={facility.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </>
  );
}

export default FacilityCourts;
