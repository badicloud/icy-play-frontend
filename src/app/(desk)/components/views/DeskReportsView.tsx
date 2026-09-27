"use client";

import { useState } from "react";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { useDeskVenues, useVenueSnapshot } from "@auth/hooks/useDesk";
import SnapshotTiles from "../SnapshotTiles";

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

  return <SnapshotTiles now={snapshot.data} />;
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
