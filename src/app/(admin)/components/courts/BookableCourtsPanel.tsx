import type { BookableCourtItem, Court } from "@auth/courtApi";

/**
 * What the court actually sells, read from the server rather than counted out
 * from the division numbers above it.
 *
 * The panel above says what a save will do; this says what is true now. Folding
 * them together would make an unsaved dropdown look like a court somebody can
 * book.
 */
function BookableCourtsPanel({ court }: { court: Court }) {
  const units = court.bookableCourts;

  if (units.length === 0) {
    return null;
  }

  const sports = new Set(units.map((unit) => unit.sportId)).size;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
          Bookable courts
        </h2>
        <p className="text-sm font-bold text-[#071955]">
          {units.length} {units.length === 1 ? "court" : "courts"}
        </p>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        One floor, sold {sports === 1 ? "one way" : `${sports} ways`}. This is what a
        booking is taken against.
      </p>

      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {units.map((unit) => (
          <Row key={unit.id} unit={unit} />
        ))}
      </ul>

      <p className="mt-4 text-sm text-slate-400">
        One sport is played on this floor at a time. Booking a divided court
        leaves its other parts free and takes every other sport here with it.
      </p>
    </section>
  );
}

function Row({ unit }: { unit: BookableCourtItem }) {
  const divided = unit.kind === "Divided";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="font-semibold text-[#071955]">{unit.name}</span>

      <span className="flex items-center gap-2">
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
            divided ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {divided ? "Divided" : "Whole"}
        </span>
        <span className="text-sm text-slate-500">{unit.sportName}</span>
      </span>
    </li>
  );
}

export default BookableCourtsPanel;
