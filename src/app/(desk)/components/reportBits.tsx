/*
 * The small pieces every desk report is built from.
 *
 * Here rather than in the first report that needed them, because the second
 * one needed them too. A date range that opens on a slightly different day, or
 * a tile a pixel taller, is how two reports on one menu start looking like two
 * products.
 */

/** A date as the API takes it: YYYY-MM-DD, on the reader's own calendar. */
export function iso(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

/** The first of this month to today, which is what a desk report opens on. */
export function thisMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);

  return { from: iso(first), to: iso(now) };
}

/** One summary figure, with what it counts under it. */
export function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-base font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#071955]">{value}</p>
      {hint && <p className="mt-1.5 text-sm text-slate-600">{hint}</p>}
    </div>
  );
}
