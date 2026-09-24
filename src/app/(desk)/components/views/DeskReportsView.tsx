"use client";

import { useState } from "react";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { useDeskVenues, useVenueSnapshot } from "@auth/hooks/useDesk";

/**
 * One number, and what it counts.
 *
 * `tone` is the only thing separating them: the ones that mean something to do
 * — courts free to sell, courts shut — carry a colour, and the totals stay in
 * the page's own ink. Colouring all five would say everything is urgent, which
 * says nothing.
 */
function Stat({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "plain" | "free" | "busy" | "shut";
}) {
  const ink = {
    plain: "text-[#071955]",
    free: "text-emerald-700",
    busy: "text-[#1264f7]",
    shut: "text-amber-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-base font-semibold text-slate-600">{label}</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${ink}`}>{value}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{hint}</p>
    </div>
  );
}

/**
 * The venue as it stands this minute.
 *
 * The three states under the two totals add up to the bookable courts, and the
 * page says so: counters that do not reconcile are counters nobody trusts
 * twice.
 */
function RightNow({ facilityId }: { facilityId: string }) {
  const snapshot = useVenueSnapshot(facilityId || undefined);

  if (snapshot.isPending) {
    return <p className="text-base text-slate-600">Counting the courts…</p>;
  }

  if (snapshot.isError || !snapshot.data) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
        {snapshot.error instanceof Error
          ? snapshot.error.message
          : "That could not be read just now."}
      </p>
    );
  }

  const now = snapshot.data;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Courts" value={now.courts} hint="Floors you have registered." />
        <Stat
          label="Bookable courts"
          value={now.bookableCourts}
          hint="The parts those floors are sold in."
        />
        <Stat
          label="Available"
          value={now.availableNow}
          hint="No booking on them right now."
          tone="free"
        />
        <Stat
          label="Booked"
          value={now.bookedNow}
          hint="Somebody is on them right now."
          tone="busy"
        />
        <Stat
          label="Under maintenance"
          value={now.underMaintenanceNow}
          hint="Closed for work right now."
          tone="shut"
        />
      </div>

      <p className="mt-4 text-base leading-relaxed text-slate-700">
        The last three add up to your {now.bookableCourts} bookable courts.{" "}
        <b>Available is not the same as sellable</b> — a part with no booking of its own can still
        be unsellable while a clashing game has the floor, because one hall booked for basketball
        takes its pickleball courts with it. The booking page is what answers whether an hour can
        actually be sold.
      </p>
    </>
  );
}

/**
 * What the venue looks like right now.
 *
 * Listing the reports is the side menu's job and it is on screen already, so
 * this page does not repeat them as cards — a second copy of the same links
 * beside the first is furniture rather than help. What it does instead is
 * answer the question somebody standing at the desk actually has when they open
 * it: how much of the place is busy.
 */
function DeskReportsView() {
  const [facilityId, setFacilityId] = useState("");
  const venues = useDeskVenues();

  return (
    <>
      <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Reports" }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Reports</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
            Where your courts stand at this minute, and what they have been doing.
          </p>
        </div>

        {(venues.data?.length ?? 0) > 1 && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
            Venue
            <select
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]"
            >
              <option value="">All my venues</option>
              {venues.data?.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <h2 className="mt-8 text-lg font-bold text-[#071955]">Right now</h2>
      <div className="mt-3">
        <RightNow facilityId={facilityId} />
      </div>
    </>
  );
}

export default DeskReportsView;
