"use client";

import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { OWN_DESK } from "@/services/api";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";
import { useDeskVenues } from "@auth/hooks/useDesk";
import AttendantsPanel from "@/app/(admin)/components/views/AttendantsPanel";

/**
 * Who works the owner's desk, managed by the owner: add an attendant and they
 * are emailed a link to set their password, resend it, take them off, and tick
 * who may see the money.
 *
 * The admin console's own panel, once per venue — the same list, the same
 * invitation, the same words — pointed at the owner's own desk. "Money" is the
 * venue's figures: Takings, Missed Income, the rental on Court utilisation, and
 * what a declined customer sent. Everybody can always see the amount on a
 * receipt they are checking.
 */
function DeskAttendantsView() {
  const { user } = useIcyPlayAuth();
  const isOwner = Boolean(user?.roles.includes("FacilityOwner"));
  const venues = useDeskVenues(isOwner);

  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-8 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Attendants" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Attendants</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          The people who check receipts and confirm bookings at your venues. Add one and we email them
          a link to set their password. Tick <b>Can see money</b> to let them read your Takings,
          Missed Income, the rental on Court utilisation, and what a declined customer sent.
        </p>

        {!isOwner ? (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-6 text-slate-600">
            Only the venue&apos;s owner manages its attendants.
          </p>
        ) : venues.isPending ? (
          <div className="mt-8 h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        ) : venues.isError ? (
          <p className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-red-800">
            {venues.error instanceof Error ? venues.error.message : "Your venues could not be read."}
          </p>
        ) : (
          venues.data.map((venue) => (
            <section key={venue.id} className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-[#071955]">{venue.name}</h2>
              <AttendantsPanel
                facilityOwnerId={OWN_DESK}
                facilityId={venue.id}
                facilityName={venue.name}
                onDesk
              />
            </section>
          ))
        )}
      </div>
    </main>
  );
}

export default DeskAttendantsView;
