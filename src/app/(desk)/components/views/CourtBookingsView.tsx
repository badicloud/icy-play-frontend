"use client";

import { useState } from "react";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { type DeskCourt } from "@auth/deskApi";
import { useDeskCourts } from "@auth/hooks/useDesk";
import CourtBookingsPanel from "../CourtBookingsPanel";

function CourtPanel({ court }: { court: DeskCourt }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold text-[#071955]">
            {court.name}
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {court.units.map((unit) => unit.label).join(" · ")}
          </span>
        </span>

        <ExpandMoreOutlined
          sx={{ fontSize: 22 }}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-[#fbfdff] px-5 py-5">
          <CourtBookingsPanel court={court} />
        </div>
      )}
    </article>
  );
}

/**
 * Every court a venue has registered, and what is booked on each.
 *
 * Organised by the court rather than by the part of it: the court is what
 * somebody walks onto and unlocks, and a floor marked out three ways for
 * pickleball is still one floor to the person standing at it.
 */
function CourtBookingsView() {
  const courts = useDeskCourts();
  const [facilityId, setFacilityId] = useState("");

  const venues = [
    ...new Map(
      (courts.data ?? []).map((court) => [court.facilityId, court.facilityName]),
    ).entries(),
  ];

  const shown = (courts.data ?? []).filter(
    (court) => facilityId === "" || court.facilityId === facilityId,
  );

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Venue desk", href: "/desk" }, { label: "Court bookings" }]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Court bookings
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Everything booked on each of your courts. Open a court to read its diary or its list.
        </p>

        {venues.length > 1 && (
          <select
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value)}
            className="mt-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            aria-label="Venue"
          >
            <option value="">All venues</option>
            {venues.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}

        {courts.isPending && <p className="mt-8 text-slate-500">Loading your courts…</p>}

        {courts.isError && (
          <p className="mt-8 text-red-600">Could not load your courts. Please try again.</p>
        )}

        {courts.data && shown.length === 0 && (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-slate-500">
            No courts have been set up at your venues yet.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {shown.map((court) => (
            <CourtPanel key={court.id} court={court} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default CourtBookingsView;
