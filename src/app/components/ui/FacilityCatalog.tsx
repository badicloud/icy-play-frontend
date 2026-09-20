"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  activityIcon,
  directionsUrl,
  formatAddress,
  getCatalogFacilities,
  type CatalogFacility,
} from "@auth/catalogApi";

/** A letter in a circle, for a venue with no photograph of its own yet. */
function NoPhoto({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-4xl font-bold text-[#2563EB]"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
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
 * One venue: what it looks like, what it has, where it is, and one way in.
 *
 * The photograph leads because a venue is somewhere you go — the decision is
 * partly "would I want to spend two hours there", and no list of sports
 * answers that.
 */
function FacilityCard({ facility }: { facility: CatalogFacility }) {
  const address = formatAddress(facility);

  return (
    <article className="flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="h-44 w-full overflow-hidden bg-slate-100">
        {facility.coverPhotoUrl !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={facility.coverPhotoUrl}
            alt={facility.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <NoPhoto name={facility.name} />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-slate-950">{facility.name}</h3>

        {/* "Bookable courts", not "courts". One floor marked out for three
            sports is three things somebody can book and still one floor, so a
            venue with a single hall would otherwise read as having nine. */}
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {facility.courtCount} bookable {facility.courtCount === 1 ? "court" : "courts"}
        </p>

        {/* The sports as chips with their own artwork: a reader scanning for
            "do they have pickleball" finds it by shape before they read it. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {facility.sports.map((sport) => {
            const icon = activityIcon(sport.key);

            return (
              <li
                key={sport.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                {icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" className="h-3.5 w-3.5 object-contain" aria-hidden />
                )}
                {sport.name}
                <span className="font-bold text-slate-400">{sport.courtCount}</span>
              </li>
            );
          })}
        </ul>

        {/* Opens Google's own directions URL, which needs no API key and no
            script — the reason it is a link rather than an embedded map. */}
        <a
          href={directionsUrl(facility, facility.name)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-start gap-1.5 text-sm text-slate-500 underline-offset-2 hover:text-[#2563EB] hover:underline"
        >
          <PinIcon />
          <span>{address}</span>
        </a>

        <Link
          href={`/facilities/${facility.slug}`}
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Book courts
        </Link>
      </div>
    </article>
  );
}

/**
 * The venues on offer, read from the API rather than written into the page.
 *
 * A venue is the unit somebody chooses first: they decide where they are going
 * before they decide what they are playing. Which sport comes next, on the
 * venue's own page.
 */
function FacilityCatalog() {
  const facilities = useQuery({
    queryKey: ["catalog", "facilities"],
    queryFn: getCatalogFacilities,
    staleTime: 5 * 60 * 1000,
  });

  if (facilities.isPending) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-96 animate-pulse rounded-[24px] border border-slate-200 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (facilities.isError) {
    return (
      <p className="rounded-[24px] border border-slate-200 bg-white p-6 text-slate-600">
        We couldn&apos;t load the venues just now. Please refresh the page.
      </p>
    );
  }

  const rows = facilities.data ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-slate-950">No venues are listed yet</p>
        <p className="mt-1 text-slate-600">
          Venues appear here once they have a court set up and ready to book.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((facility) => (
        <FacilityCard key={facility.id} facility={facility} />
      ))}
    </div>
  );
}

export default FacilityCatalog;
