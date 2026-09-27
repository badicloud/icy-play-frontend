"use client";

import { useState } from "react";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import type { CourtMixReport, CourtMixRow, VenueType } from "@auth/deskApi";
import { useCourtMixData } from "../reportData";
import { reportTrail, useReportScope } from "../reportScope";
import { ReportFilters, thisMonth, Tile } from "../reportBits";

/** One colour per venue type, darkest for the most sheltered. */
const VENUE_INK: Record<VenueType, string> = {
  Indoor: "#185FA5",
  Covered: "#85B7EB",
  Outdoor: "#EF9F27",
};

/** What each venue type means for play, said once under its count. */
const VENUE_NOTE: Record<VenueType, string> = {
  Indoor: "walls and a roof",
  Covered: "a roof, open sides",
  Outdoor: "no roof — rain stops play",
};

function share(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function of(part: number, whole: number) {
  return `${part} of ${whole}`;
}

/** "Basketball (main), Volleyball, Pickleball × 3" — sports first, then events. */
function setUpFor(row: CourtMixRow) {
  const sports = row.activities.filter((activity) => activity.kind === "Sport");
  const events = row.activities.filter((activity) => activity.kind === "Event");

  return (
    <>
      {sports
        .map(
          (activity) =>
            `${activity.name}${activity.divisions > 1 ? ` × ${activity.divisions}` : ""}${activity.isMain ? " (main)" : ""}`,
        )
        .join(", ")}
      {events.length > 0 && (
        <>
          {sports.length > 0 && " · "}
          <span className="text-[#2563EB]">{events.map((activity) => activity.name).join(", ")}</span>
        </>
      )}
    </>
  );
}

/**
 * The venue by roof: a bar split by how many courts are indoor, covered and
 * outdoor, and under each, the courts and how much of their open hours sold —
 * the utilization report's own figures, cut by venue type.
 */
function VenueTypes({ data }: { data: CourtMixReport }) {
  const total = data.venueTypes.reduce((sum, type) => sum + type.courts, 0);

  if (total === 0) {
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">By venue type</h2>

      <div className="mt-3 flex h-3.5 overflow-hidden rounded-full" role="img" aria-label="Courts by venue type">
        {data.venueTypes.map((type) => (
          <div
            key={type.venueType}
            style={{ width: `${(type.courts / total) * 100}%`, background: VENUE_INK[type.venueType] }}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {data.venueTypes.map((type) => (
          <div key={type.venueType}>
            <p className="flex items-center gap-2 text-base font-bold text-[#071955]">
              <i className="h-3 w-3 rounded-sm" style={{ background: VENUE_INK[type.venueType] }} />
              {type.venueType} · {type.courts}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{VENUE_NOTE[type.venueType]}</p>
            <p className="mt-1 text-sm text-slate-700">{type.courtNames.join(", ")}</p>
            <p className="mt-1.5 text-sm text-slate-700">
              <b className="text-[#071955]">{share(type.inUseMinutes, type.openMinutes)}</b> of open hours sold
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Each sport and event, and how many courts are set up for it. */
function Activities({ data }: { data: CourtMixReport }) {
  if (data.activities.length === 0) {
    return null;
  }

  const cell = "py-2.5 text-right text-base tabular-nums";
  const group = (kind: "Sport" | "Event", label: string) => {
    const rows = data.activities.filter((activity) => activity.kind === kind);

    if (rows.length === 0) {
      return null;
    }

    return [
      <tr key={`${kind}-head`}>
        <td colSpan={4} className="pt-4 pb-1 text-sm font-bold tracking-wider text-slate-500 uppercase">
          {label}
        </td>
      </tr>,
      ...rows.map((activity) => (
        <tr key={activity.sportId} className="border-t border-slate-100 text-[#071955]">
          <td className="py-2.5 text-base font-semibold">{activity.name}</td>
          <td className={cell}>{activity.courts}</td>
          <td className={cell}>{activity.bookableCourts}</td>
          <td className={`${cell} text-slate-600`}>
            {activity.mainOn > 0 ? `${activity.mainOn} ${activity.mainOn === 1 ? "court" : "courts"}` : "—"}
          </td>
        </tr>
      )),
    ];
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">What your courts are set up for</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-1 text-left font-semibold" />
              <th className="pb-1 text-right font-semibold">Courts</th>
              <th className="pb-1 text-right font-semibold">Bookable courts</th>
              <th className="pb-1 text-right font-semibold">Main sport on</th>
            </tr>
          </thead>
          <tbody>
            {group("Sport", "Sports")}
            {group("Event", "Events")}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Every court as it is set up now, retired ones too when asked for. */
function Courts({ data }: { data: CourtMixReport }) {
  if (data.courts.length === 0) {
    return null;
  }

  const venues = new Set(data.courts.map((court) => court.facilityId)).size;
  const cell = "py-2.5 pr-3 text-base";

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">Per court</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-2.5 text-left font-semibold">Court</th>
              <th className="pb-2.5 text-left font-semibold">Venue type</th>
              <th className="pb-2.5 text-left font-semibold">Surface</th>
              <th className="pb-2.5 text-left font-semibold">Lighting</th>
              <th className="pb-2.5 text-left font-semibold">Set up for</th>
              <th className="pb-2.5 text-right font-semibold">Bookable</th>
              <th className="pb-2.5 text-right font-semibold">Sold</th>
            </tr>
          </thead>
          <tbody>
            {data.courts.map((court) => (
              <tr
                key={court.courtId}
                className={`border-t border-slate-100 align-top ${court.isRetired ? "text-slate-400" : "text-slate-700"}`}
              >
                <td className={`${cell} font-semibold ${court.isRetired ? "" : "text-[#071955]"}`}>
                  {court.name}
                  {court.isRetired && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Retired
                    </span>
                  )}
                  {venues > 1 && (
                    <span className="block text-sm font-normal text-slate-500">{court.facilityName}</span>
                  )}
                </td>
                <td className={cell}>{court.venueType}</td>
                <td className={cell}>{court.surface ?? "—"}</td>
                <td className={`${cell} ${!court.hasLighting && !court.isRetired ? "text-amber-700" : ""}`}>
                  {court.hasLighting ? "Yes" : "No"}
                </td>
                <td className={cell}>{setUpFor(court)}</td>
                <td className={`${cell} text-right tabular-nums`}>{court.bookableCourts}</td>
                <td className="py-2.5 text-right text-base tabular-nums">
                  {court.isRetired ? "—" : share(court.inUseMinutes, court.openMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * What the venue has right now: courts by venue type, and the sports and
 * events each is set up for.
 *
 * The date range is only for how much each venue type sold — what the venue
 * has is always as it stands today. A venue with its outdoor courts selling a
 * third of what its covered ones do has learned something about its roof.
 */
function DeskCourtMixView() {
  const [range, setRange] = useState(thisMonth);
  const [facilityId, setFacilityId] = useState("");
  const [includeRetired, setIncludeRetired] = useState(false);

  const reportScope = useReportScope();
  const report = useCourtMixData({ from: range.from, to: range.to, includeRetired }, facilityId);

  const data = report.data;

  return (
    <>
      <Breadcrumbs trail={reportTrail(reportScope, "Court Mix")} />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Court Mix</h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        What you have right now: your courts by venue type, and what each is set up for — sports and
        events. The dates only change how much of the open hours each court sold.
      </p>

      <ReportFilters range={range} onRange={setRange} facilityId={facilityId} onFacility={setFacilityId}>
        <label className="flex items-center gap-2 self-center pt-5 text-base font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(event) => setIncludeRetired(event.target.checked)}
            className="h-4 w-4 accent-[#2563EB]"
          />
          Show retired courts
          {data && data.summary.retired > 0 && (
            <span className="text-sm font-normal text-slate-500">({data.summary.retired})</span>
          )}
        </label>
      </ReportFilters>

      {report.isPending && <p className="mt-6 text-base text-slate-600">Counting your courts…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Courts"
              value={`${data.summary.courts}`}
              hint={`${data.summary.bookableCourts} bookable courts`}
            />
            <Tile
              label="Under a roof"
              value={of(data.summary.underRoof, data.summary.courts)}
              hint="Indoor and covered"
            />
            <Tile
              label="With lighting"
              value={of(data.summary.withLighting, data.summary.courts)}
              hint="Can be played at night"
            />
            <Tile
              label="Take events"
              value={`${data.summary.takeEvents}`}
              hint={
                data.summary.takeEvents > 0
                  ? `${data.summary.takeEvents === 1 ? "court" : "courts"} · ${data.summary.eventKinds} ${data.summary.eventKinds === 1 ? "kind" : "kinds"} of event`
                  : "No court is set up for events"
              }
            />
          </div>

          {data.summary.courts === 0 && data.courts.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-base text-slate-600">
              No courts are on sale here.
            </p>
          ) : (
            <>
              <VenueTypes data={data} />
              <Activities data={data} />
              <Courts data={data} />
            </>
          )}
        </>
      )}
    </>
  );
}

export default DeskCourtMixView;
