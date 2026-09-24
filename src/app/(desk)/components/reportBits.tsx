"use client";

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import type { HoursGrain, ReportPeriod } from "@auth/deskApi";
import { useDeskVenues } from "@auth/hooks/useDesk";

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

export type DateRange = { from: string; to: string };

/**
 * The bar every report is filtered from: which venue, and from when to when.
 *
 * One component for all of them because a venue picker that appears on one
 * report and not the next, or a date field a few pixels off from its
 * neighbour's, is how a set of reports starts reading as a pile of pages.
 * Anything a report asks for beyond these — by day or by week, say — goes in
 * as children and sits in the same row.
 */
export function ReportFilters({
  range,
  onRange,
  facilityId,
  onFacility,
  children,
}: {
  range: DateRange;
  onRange: (range: DateRange) => void;
  facilityId: string;
  onFacility: (facilityId: string) => void;
  children?: ReactNode;
}) {
  const venues = useDeskVenues();
  const field = "rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]";
  const label = "flex flex-col gap-1 text-sm font-semibold text-slate-600";

  return (
    <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      {/* One venue needs no picker; five do. */}
      {(venues.data?.length ?? 0) > 1 && (
        <label className={label}>
          Venue
          <select value={facilityId} onChange={(event) => onFacility(event.target.value)} className={field}>
            <option value="">All my venues</option>
            {venues.data?.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={label}>
        From
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(event) => onRange({ ...range, from: event.target.value })}
          className={field}
        />
      </label>

      <label className={label}>
        To
        <input
          type="date"
          value={range.to}
          min={range.from}
          onChange={(event) => onRange({ ...range, to: event.target.value })}
          className={field}
        />
      </label>

      {children}
    </div>
  );
}

/** A small set of choices, one of them on. The same control on every report. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <div role="group" aria-label={label} className="inline-flex rounded-full bg-slate-100 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-base font-semibold transition ${
              option.value === value
                ? "bg-white text-[#071955] shadow-sm"
                : "text-slate-600 hover:text-[#071955]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * What one period of an over-time report is called on screen: "12 Sep",
 * "8–14 Sep", "Sep 2026".
 *
 * Shared by every line chart and table that walks periods, so the same week is
 * never "8–14 Sep" on one report and "8 Sep" on the next.
 */
export function periodLabel(period: ReportPeriod, grain: HoursGrain) {
  const starts = parseISO(period.starts);
  const ends = parseISO(period.ends);

  if (grain === "Month") {
    return format(starts, "MMM yyyy");
  }

  if (grain === "Week") {
    return starts.getMonth() === ends.getMonth()
      ? `${format(starts, "d")}–${format(ends, "d MMM")}`
      : `${format(starts, "d MMM")}–${format(ends, "d MMM")}`;
  }

  return format(starts, "d MMM");
}
