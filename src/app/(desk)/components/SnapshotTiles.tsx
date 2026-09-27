import type { VenueSnapshot } from "@auth/deskApi";

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
 * The five numbers a venue's desk and the platform admin both open on: how
 * many courts, how many parts they are sold in, and which of those are free,
 * booked, or closed for work this minute.
 *
 * One component for both, so the admin's view of an owner and the owner's own
 * view of themselves are the same five boxes with the same words.
 */
function SnapshotTiles({ now, whose = "your" }: { now: VenueSnapshot; whose?: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Courts" value={now.courts} hint="Floors registered." />
        <Stat label="Bookable courts" value={now.bookableCourts} hint="The parts those floors are sold in." />
        <Stat label="Available" value={now.availableNow} hint="No booking on them right now." tone="free" />
        <Stat label="Booked" value={now.bookedNow} hint="Somebody is on them right now." tone="busy" />
        <Stat
          label="Under maintenance"
          value={now.underMaintenanceNow}
          hint="Closed for work right now."
          tone="shut"
        />
      </div>

      <p className="mt-4 text-base leading-relaxed text-slate-700">
        The last three add up to {whose} {now.bookableCourts} bookable courts.{" "}
        <b>Available is not the same as sellable</b> — a part with no booking of its own can still
        be unsellable while a clashing game has the floor, because one hall booked for basketball
        takes its pickleball courts with it. The booking page is what answers whether an hour can
        actually be sold.
      </p>
    </>
  );
}

export default SnapshotTiles;
