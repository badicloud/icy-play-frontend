"use client";

import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { OwnerVenueFilter } from "@/app/(desk)/components/reportBits";
import { useReportScope } from "@/app/(desk)/components/reportScope";
import SnapshotTiles from "@/app/(desk)/components/SnapshotTiles";
import type { OwnerSnapshot } from "@auth/platformReportApi";
import { usePlatformSnapshot, useReportOwners } from "@auth/hooks/usePlatformReports";

/**
 * One owner's five numbers in a line, and the way into their reports.
 *
 * Small on purpose: the platform's total is the big row above, and a page of
 * owners each drawn as large as that would be a scroll through the same five
 * boxes. The colours are the big row's, so a glance down the list finds the
 * owner with courts shut.
 */
function OwnerRow({ owner, onOpen }: { owner: OwnerSnapshot; onOpen: () => void }) {
  const now = owner.snapshot;
  const cell = "flex items-baseline gap-1.5";
  const label = "text-sm text-slate-500";
  const value = "text-lg font-bold tabular-nums";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-base font-bold text-[#071955]">
          {owner.businessName}
          <span className="ml-2 text-sm font-normal text-slate-500">
            {owner.venues === 0 ? "No venue yet" : `${owner.venues} ${owner.venues === 1 ? "venue" : "venues"}`}
          </span>
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-bold text-[#1264f7] underline-offset-4 hover:underline"
        >
          Open reports ›
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
        <span className={cell}>
          <span className={label}>Courts</span>
          <span className={`${value} text-[#071955]`}>{now.courts}</span>
        </span>
        <span className={cell}>
          <span className={label}>Bookable</span>
          <span className={`${value} text-[#071955]`}>{now.bookableCourts}</span>
        </span>
        <span className={cell}>
          <span className={label}>Available</span>
          <span className={`${value} text-emerald-700`}>{now.availableNow}</span>
        </span>
        <span className={cell}>
          <span className={label}>Booked</span>
          <span className={`${value} text-[#1264f7]`}>{now.bookedNow}</span>
        </span>
        <span className={cell}>
          <span className={label}>Maintenance</span>
          <span className={`${value} ${now.underMaintenanceNow > 0 ? "text-amber-700" : "text-[#071955]"}`}>
            {now.underMaintenanceNow}
          </span>
        </span>
      </div>
    </li>
  );
}

/**
 * Where the platform stands this minute, for the admin.
 *
 * The same five numbers a venue's desk opens on, added up across every venue
 * — and then owner by owner, because the platform total says how busy the
 * platform is and only the rows say where. Picking an owner narrows everything
 * to them, and the choice sits in the address so the reports built on this
 * page can carry it.
 */
function AdminReportsView() {
  const reportScope = useReportScope();
  const ownerId = reportScope.kind === "admin" ? reportScope.ownerId : "";
  const facilityId = reportScope.kind === "admin" ? reportScope.facilityId : "";

  const owners = useReportOwners();
  const snapshot = usePlatformSnapshot({
    facilityOwnerId: ownerId || undefined,
    facilityId: facilityId || undefined,
  });

  const owner = owners.data?.find((one) => one.id === ownerId) ?? null;

  function scope(nextOwner: string, nextVenue: string) {
    if (reportScope.kind === "admin") reportScope.setScope(nextOwner, nextVenue);
  }

  const data = snapshot.data;

  const whose = facilityId
    ? (owner?.venues.find((venue) => venue.id === facilityId)?.name ?? "this venue")
    : owner
      ? owner.businessName
      : "the whole platform";

  return (
    <>
      <Breadcrumbs trail={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]} />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Reports</h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Where every venue on the platform stands this minute — or one facility owner&apos;s.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <OwnerVenueFilter />

        {ownerId && (
          <button
            type="button"
            onClick={() => scope("", "")}
            className="self-end pb-2.5 text-sm font-bold text-[#1264f7] underline-offset-4 hover:underline"
          >
            Show every owner
          </button>
        )}
      </div>

      {snapshot.isPending && <p className="mt-6 text-base text-slate-600">Counting the courts…</p>}

      {snapshot.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {snapshot.error instanceof Error ? snapshot.error.message : "That could not be read just now."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-[#071955]">Right now · {whose}</h2>
            {!ownerId && (
              <p className="text-sm text-slate-600">
                {data.owners} {data.owners === 1 ? "owner" : "owners"} · {data.venues}{" "}
                {data.venues === 1 ? "venue" : "venues"}
              </p>
            )}
          </div>
          <div className="mt-3">
            <SnapshotTiles now={data.total} whose={ownerId ? "their" : "the platform's"} />
          </div>

          {!ownerId && data.perOwner.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-bold text-[#071955]">Per facility owner</h2>
              <ul className="mt-3 space-y-2.5">
                {data.perOwner.map((one) => (
                  <OwnerRow
                    key={one.facilityOwnerId}
                    owner={one}
                    onOpen={() => {
                      scope(one.facilityOwnerId, "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

export default AdminReportsView;
