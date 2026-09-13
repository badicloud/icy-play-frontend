"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  activityIcon,
  courtDetailHref,
  directionsUrl,
  maintenanceMessage,
  formatAddress,
  formatTime,
  getCatalogCourts,
  peakDays,
  type CatalogActivity,
  type CatalogCourt,
} from "@auth/catalogApi";

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The rates that differ from the standard one. A blank means "same as
 * standard", so listing a weekend rate equal to the weekday one would invent a
 * distinction the venue did not make.
 */
function extraRates(court: CatalogCourt) {
  const standard = court.standardHourlyRate;

  if (standard === null) {
    return [];
  }

  return [
    { label: "Peak", value: court.peakHourlyRate },
    { label: "Weekend", value: court.weekendRate },
    { label: "Holiday", value: court.holidayRate },
  ].filter((rate): rate is { label: string; value: number } =>
    rate.value !== null && rate.value !== standard,
  );
}

function CourtCard({ court }: { court: CatalogCourt }) {
  const address = formatAddress(court);
  const icon = activityIcon(court.sportKey);
  const extras = extraRates(court);
  const hasPeakWindow = court.peakStartsAt !== null && court.peakEndsAt !== null;
  const closure = maintenanceMessage(court);

  return (
    <article className="flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:shadow-xl hover:shadow-slate-200/70">
      <div className="relative">
        {court.coverPhotoUrl ? (
          <img src={court.coverPhotoUrl} alt={court.name} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
            No photo yet
          </div>
        )}

        {court.standardHourlyRate !== null && (
          <span className="absolute right-3 top-3 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
            {peso(court.standardHourlyRate)}/hr
          </span>
        )}

        {/* The sport is on the card because one court set up for three appears
            three times, at three prices. Without it they read as duplicates.
            The icon is what the eye catches first when scanning a grid. */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-bold text-[#071955] shadow-lg">
          {icon && <img src={icon} alt="" className="h-4 w-4 object-contain" aria-hidden />}
          {court.sportName}
        </span>

        {closure && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
            Under maintenance
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-slate-950">{court.name}</h3>
        <p className="mt-0.5 text-sm font-semibold text-slate-600">{court.facilityName}</p>

        <p className="mt-3 text-sm text-slate-500">{address}</p>
        <a
          href={directionsUrl(court)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#2563EB] transition hover:text-[#071955]"
        >
          View on Google Maps
        </a>

        <p className="mt-3 text-sm text-slate-500">
          {court.venueType}
          {court.surface && ` · ${court.surface}`}
          {court.hasLighting && " · Lit"}
          {" · "}
          {court.slotLengthMinutes}-minute slots
        </p>

        {closure && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {closure.short}
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Rates</p>

          {court.standardHourlyRate === null ? (
            <p className="mt-2 text-sm text-slate-500">
              This venue has not published a rate for {court.sportName.toLowerCase()} yet.
            </p>
          ) : (
            <dl className="mt-2 space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-slate-600">Standard</dt>
                <dd className="text-xl font-bold text-slate-950">
                  {peso(court.standardHourlyRate)}
                  <span className="text-sm font-semibold text-slate-500">/hr</span>
                </dd>
              </div>

              {extras.map((rate) => (
                <div
                  key={rate.label}
                  className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-1.5"
                >
                  <dt className="text-sm text-slate-600">
                    {rate.label}
                    {rate.label === "Peak" && hasPeakWindow && (
                      <span className="mt-0.5 block text-sm font-semibold text-amber-700">
                        {formatTime(court.peakStartsAt)} &ndash; {formatTime(court.peakEndsAt)},{" "}
                        {peakDays(court)}
                      </span>
                    )}
                  </dt>
                  <dd className="text-base font-bold text-[#071955]">
                    {peso(rate.value)}
                    <span className="text-sm font-semibold text-slate-500">/hr</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={courtDetailHref(court)}
            className="flex-1 rounded-full bg-[#2563EB] py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            More details
          </Link>

          {/* Enabled the day bookings open. A button that looks live and does
              nothing is a worse promise than one that says it is not ready. */}
          <button
            type="button"
            disabled
            title={closure ? closure.short : "Bookings open soon"}
            className={`flex-1 rounded-full py-3 text-sm font-semibold ${
              closure ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-500"
            }`}
          >
            {closure ? "Under maintenance" : "Book now"}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Every court on offer. The sport cards narrow this list rather than unlock it:
 * a visitor should see what is available before being asked to choose.
 */
function CourtResults({ activity }: { activity: CatalogActivity | null }) {
  const courts = useQuery({
    queryKey: ["catalog", "courts", activity?.key ?? "*"],
    queryFn: () => getCatalogCourts(activity?.key),
    staleTime: 5 * 60 * 1000,
  });

  const rows = courts.data ?? [];
  const venues = new Set(rows.map((court) => court.facilityId)).size;

  return (
    <div className="mt-10">
      <h3 className="text-xl font-bold tracking-normal text-slate-950">
        {activity ? `${activity.name} courts` : "Courts you can book"}
      </h3>
      <p className="mt-1 text-slate-500">
        {courts.isPending
          ? "Finding what's available…"
          : `${rows.length} ${rows.length === 1 ? "court" : "courts"} across ${venues} ${
              venues === 1 ? "venue" : "venues"
            }.`}
        {activity && " Pick it again to see everything."}
      </p>

      {courts.isPending ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-[24px] border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : courts.isError ? (
        <p className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6 text-slate-600">
          We couldn&apos;t load these courts just now. Please refresh the page.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-950">
            {activity
              ? `No courts are listed for ${activity.name} yet`
              : "No courts are listed yet"}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            They will appear here as soon as a venue sets one up.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((court) => (
            <CourtCard
              key={`${court.courtId}-${court.sportKey}-${court.divisionNumber}`}
              court={court}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CourtResults;
