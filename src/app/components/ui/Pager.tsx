"use client";

/**
 * How many page numbers are shown before the row starts eliding.
 *
 * Seven fits on a phone and is enough that most lists never elide at all. Past
 * that a reader is not counting pages, they are jumping to one end or stepping
 * one at a time, and both still work.
 */
const WidestRun = 7;

export const perPageOptions = [10, 25, 50] as const;

type PagerProps = {
  /** One-based, the way it reads on screen and the way the API counts. */
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  /** What is being counted, for the summary line. */
  noun?: { one: string; many: string };
  onPageChange: (page: number) => void;
  /** Omit to hide the per-page menu, for a list whose size is not the reader's to set. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Named for screen readers, which announce several pagers on one page alike. */
  label?: string;
};

/**
 * One pager for the whole site.
 *
 * There were three: numbered pages with a per-page menu on My bookings,
 * previous-and-next with a page count in the admin lists, and a third mixture
 * at the venue desk. They paginate the same way underneath — a page, a size and
 * a total — so the reader was being taught three habits for one idea.
 *
 * Works for both a list paged in the browser and one paged by the server: it is
 * told where it is rather than working it out, so the caller stays the one that
 * knows how its own data is fetched.
 */
function Pager({
  page,
  pageSize,
  totalItems,
  totalPages,
  noun,
  onPageChange,
  onPageSizeChange,
  label = "Pages",
}: PagerProps) {
  if (totalItems === 0) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  const counted = noun ? ` ${totalItems === 1 ? noun.one : noun.many}` : "";

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing {first}&ndash;{last} of {totalItems}
          {counted}
        </p>

        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Per page
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#071955] outline-none focus:border-[#2563EB]"
            >
              {perPageOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label={label}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Step label="Previous" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />

          {numbersAround(page, totalPages).map((entry, index) =>
            entry === null ? (
              <span key={`gap-${index}`} className="px-1 text-sm font-bold text-slate-300">
                &hellip;
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                aria-current={entry === page ? "page" : undefined}
                onClick={() => onPageChange(entry)}
                className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold transition ${
                  entry === page
                    ? "bg-[#2563EB] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {entry}
              </button>
            ),
          )}

          <Step
            label="Next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </nav>
      )}
    </div>
  );
}

/**
 * The page numbers to show, with null standing for a gap.
 *
 * Always the first and the last, always a run around where the reader is: the
 * two ends are where somebody jumps to, and the middle is where they step.
 */
function numbersAround(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= WidestRun) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const shown = new Set<number>([1, totalPages, page]);

  for (let step = 1; shown.size < WidestRun - 2; step += 1) {
    if (page - step > 1) {
      shown.add(page - step);
    }

    if (page + step < totalPages) {
      shown.add(page + step);
    }

    // Nothing left to add on either side.
    if (page - step <= 1 && page + step >= totalPages) {
      break;
    }
  }

  const ordered = [...shown].sort((a, b) => a - b);

  return ordered.flatMap((number, index) =>
    index > 0 && number - ordered[index - 1] > 1 ? [null, number] : [number],
  );
}

function Step({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-10 rounded-xl px-4 text-sm font-bold transition ${
        disabled
          ? "cursor-not-allowed border border-slate-100 bg-white text-slate-300"
          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

export default Pager;
