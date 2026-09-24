"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import {
  duration,
  type CourtPeriod,
  type HoursGrain,
  type HoursOverTime,
  type ReportPeriod,
} from "@auth/deskApi";
import { useDeskVenues, useHoursOverTime } from "@auth/hooks/useDesk";
import { thisMonth, Tile } from "../reportBits";

type Scope = "venue" | "court";
type View = "chart" | "table";

/**
 * Categorical ink for one line per court, in a fixed order that is never
 * cycled. A court keeps its colour whichever others are on screen, so the
 * same court is the same colour tomorrow.
 *
 * Eight, and no more. A ninth line is not a colour anybody can tell apart from
 * the other eight, which is why the chart stops there and hands over to the
 * table rather than inventing one.
 */
const INK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const MOST_LINES = INK.length;

/** The venue's own line, when there is only one. */
const VENUE_INK = "#2a78d6";

/** Hours, from the minutes the server counts in. */
const hours = (minutes: number) => minutes / 60;

function label(period: ReportPeriod, grain: HoursGrain) {
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

/** A round top for the axis: 2h, 4h, 6h, 10h, 20h… never a ceiling of 7. */
function ceiling(peak: number) {
  if (peak <= 2) return 2;
  const step = peak <= 10 ? 2 : peak <= 40 ? 5 : peak <= 100 ? 10 : 50;
  return Math.ceil(peak / step) * step;
}

type Series = { key: string; name: string; ink: string; values: (number | null)[] };

/**
 * One period of the whole venue: every court's rows for it, added up.
 *
 * Null when no court could have traded in it — which is a gap on the chart and
 * a "closed" row in the table, and is not the same thing as a period where
 * everything was open and nothing sold.
 */
type VenuePeriod = {
  open: number;
  sold: number;
  maintenance: number;
} | null;

function venueBy(periods: ReportPeriod[], rows: CourtPeriod[]): VenuePeriod[] {
  const byStart = new Map<string, CourtPeriod[]>();
  rows.forEach((row) => byStart.set(row.starts, [...(byStart.get(row.starts) ?? []), row]));

  return periods.map((period) => {
    const found = byStart.get(period.starts);

    if (!found?.length) return null;

    return found.reduce(
      (sum, row) => ({
        open: sum.open + row.openMinutes,
        sold: sum.sold + row.soldMinutes,
        maintenance: sum.maintenance + row.maintenanceMinutes,
      }),
      { open: 0, sold: 0, maintenance: 0 },
    );
  });
}

/** The courts in the order the server listed them, which is the venue's own order. */
function courtsOf(rows: CourtPeriod[]) {
  const seen = new Map<string, CourtPeriod>();
  rows.forEach((row) => {
    if (!seen.has(row.courtId)) seen.set(row.courtId, row);
  });

  const venues = new Set(rows.map((row) => row.facilityId));

  return [...seen.values()].map((row) => ({
    courtId: row.courtId,
    // Two venues can both have a "Court 1". Named in full only when that can
    // happen, because it is noise when it cannot.
    name: venues.size > 1 ? `${row.facilityName} · ${row.courtName}` : row.courtName,
  }));
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label: name,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-slate-600">{name}</span>
      <div role="group" aria-label={name} className="inline-flex rounded-full bg-slate-100 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
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

/*
 * Plot geometry, in the SVG's own units. The SVG scales to its box, so these
 * only have to agree with each other.
 */
const W = 1000;
const LEFT = 56;
const RIGHT = 16;
const TOP = 16;
const FLOOR = 216;
const STRIP_TOP = 232;
const STRIP_HEIGHT = 14;
const TICK_Y = 268;
const H = 280;

/**
 * Hours sold, drawn per period, over a strip that says what each period was.
 *
 * The line has its own scale and nothing else shares it. The hours open are
 * ten to forty times the hours sold on most days, and on one axis the line
 * would lie flat on the floor — showing that the venue is quiet and hiding
 * the shape, which is the whole of what this report is for. Open is shown in
 * the strip underneath instead, and in the tooltip, and in the tiles.
 *
 * Not two axes. Two scales on one chart make two lines look related wherever
 * they happen to cross, which is the commonest lie a chart tells.
 */
function Chart({
  data,
  scope,
  venue,
}: {
  data: HoursOverTime;
  scope: Scope;
  venue: VenuePeriod[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const periods = data.periods;
  const n = periods.length;

  const series: Series[] = useMemo(() => {
    if (scope === "venue") {
      return [
        {
          key: "venue",
          name: "All courts",
          ink: VENUE_INK,
          values: venue.map((period) => (period ? hours(period.sold) : null)),
        },
      ];
    }

    return courtsOf(data.rows).map((court, index) => {
      const mine = new Map(
        data.rows
          .filter((row) => row.courtId === court.courtId)
          .map((row) => [row.starts, row] as const),
      );

      return {
        key: court.courtId,
        name: court.name,
        ink: INK[index],
        values: periods.map((period) => {
          const row = mine.get(period.starts);
          return row ? hours(row.soldMinutes) : null;
        }),
      };
    });
  }, [scope, venue, data.rows, periods]);

  const peak = Math.max(0, ...series.flatMap((one) => one.values.map((value) => value ?? 0)));
  const top = ceiling(peak);
  const step = (W - LEFT - RIGHT) / Math.max(1, n);
  const x = (index: number) => LEFT + step * (index + 0.5);
  const y = (value: number) => FLOOR - (value / top) * (FLOOR - TOP);

  // A handful of labels, evenly spread, whatever the period count.
  const every = Math.max(1, Math.ceil(n / 8));
  const ticks = periods.map((_, index) => index).filter((index) => index % every === 0);

  // Points are drawn where there are few enough to tell apart, and always
  // where a period stands alone between two gaps — a line of one point is
  // invisible otherwise.
  const dots = n <= 45;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Hours sold per ${data.grain.toLowerCase()}, ${series.length === 1 ? "for the whole venue" : `for ${series.length} courts`}. The table view has the same figures.`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="maint-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fef3c7" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.45" />
          </pattern>
        </defs>

        {/* Gridlines and the axis */}
        {[0, top / 2, top].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={W - RIGHT}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? "#94a3b8" : "#e2e8f0"}
              strokeWidth="1"
            />
            <text x={LEFT - 8} y={y(value) + 4} textAnchor="end" fontSize="12" fill="#475569">
              {Number.isInteger(value) ? value : value.toFixed(1)}h
            </text>
          </g>
        ))}

        {/* Maintenance behind the line, so a dip can be read for what it was */}
        {venue.map((period, index) =>
          period && period.maintenance > 0 ? (
            <rect
              key={`m-${index}`}
              x={x(index) - step / 2}
              y={TOP}
              width={step}
              height={FLOOR - TOP}
              fill="url(#maint-hatch)"
              opacity="0.7"
            />
          ) : null,
        )}

        {/* Hover guide */}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={TOP} y2={FLOOR} stroke="#94a3b8" strokeDasharray="3 3" />
        )}

        {/* The lines, broken wherever there was nothing to sell */}
        {series.map((one) => {
          const runs: string[][] = [];
          let run: string[] = [];

          one.values.forEach((value, index) => {
            if (value === null) {
              if (run.length) runs.push(run);
              run = [];
            } else {
              run.push(`${x(index)},${y(value)}`);
            }
          });
          if (run.length) runs.push(run);

          return (
            <g key={one.key}>
              {runs.map((points, index) => (
                <polyline
                  key={index}
                  points={points.join(" ")}
                  fill="none"
                  stroke={one.ink}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {one.values.map((value, index) => {
                if (value === null) return null;
                const alone = one.values[index - 1] == null && one.values[index + 1] == null;
                if (!dots && !alone && hover !== index) return null;

                return (
                  <circle
                    key={index}
                    cx={x(index)}
                    cy={y(value)}
                    r={hover === index ? 5 : 3.5}
                    fill={one.ink}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          );
        })}

        {/* What each period was: open, under maintenance, or closed */}
        {venue.map((period, index) => {
          const state = !period ? "closed" : period.maintenance > 0 ? "maintenance" : "open";

          return (
            <rect
              key={`s-${index}`}
              x={x(index) - step / 2 + 1}
              y={STRIP_TOP}
              width={Math.max(1, step - 2)}
              height={STRIP_HEIGHT}
              rx="3"
              fill={state === "open" ? "#dbe7f7" : state === "maintenance" ? "#f59e0b" : "#f8fafc"}
              stroke={state === "closed" ? "#cbd5e1" : "none"}
              strokeDasharray={state === "closed" ? "2 2" : undefined}
            />
          );
        })}

        {ticks.map((index) => (
          <text key={index} x={x(index)} y={TICK_Y} textAnchor="middle" fontSize="12" fill="#475569">
            {label(periods[index], data.grain)}
          </text>
        ))}

        {/* Hit areas, a full column each, so hovering needs no aim */}
        {periods.map((_, index) => (
          <rect
            key={`h-${index}`}
            x={x(index) - step / 2}
            y={TOP}
            width={step}
            height={STRIP_TOP + STRIP_HEIGHT - TOP}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="font-bold text-[#071955]">{label(periods[hover], data.grain)}</p>

          {venue[hover] === null ? (
            <p className="mt-1 text-slate-600">Closed — nothing was on sale.</p>
          ) : (
            <>
              {series.map((one) => (
                <p key={one.key} className="mt-1 flex items-center justify-between gap-3 text-slate-700">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: one.ink }} />
                    <span className="truncate">{one.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {one.values[hover] === null ? "—" : duration(Math.round((one.values[hover] ?? 0) * 60))}
                  </span>
                </p>
              ))}
              <p className="mt-2 border-t border-slate-100 pt-2 text-slate-600">
                of {duration(venue[hover]!.open)} open
                {venue[hover]!.maintenance > 0 && (
                  <>
                    <br />
                    <span className="text-amber-700">
                      {duration(venue[hover]!.maintenance)} under maintenance
                    </span>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        {series.map((one) => (
          <span key={one.key} className="flex items-center gap-2">
            <i className="h-0.5 w-4 rounded" style={{ background: one.ink }} />
            {one.name}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-sm bg-[#dbe7f7]" />
          Open
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-sm bg-amber-500" />
          Maintenance
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-sm border border-dashed border-slate-300 bg-slate-50" />
          Closed — the line breaks here
        </span>
      </div>
    </div>
  );
}

function percent(sold: number, open: number) {
  return open > 0 ? `${Math.round((sold / open) * 100)}%` : "—";
}

/**
 * The same figures as the chart, one row per period — or per court per
 * period, with a subtotal under each.
 *
 * What somebody checks when a line looks wrong, and what goes to the
 * spreadsheet. The subtotal row is the point on the venue's line for that
 * period, so the two views can be held against each other.
 */
function Table({
  data,
  scope,
  venue,
}: {
  data: HoursOverTime;
  scope: Scope;
  venue: VenuePeriod[];
}) {
  const byStart = useMemo(() => {
    const map = new Map<string, CourtPeriod[]>();
    data.rows.forEach((row) => map.set(row.starts, [...(map.get(row.starts) ?? []), row]));
    return map;
  }, [data.rows]);

  const courts = useMemo(() => new Map(courtsOf(data.rows).map((court) => [court.courtId, court.name])), [data.rows]);

  const cell = "py-2.5 text-right text-base tabular-nums";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="pb-2.5 text-left font-semibold">Period</th>
            {scope === "court" && <th className="pb-2.5 text-left font-semibold">Court</th>}
            <th className="pb-2.5 text-right font-semibold">Open</th>
            <th className="pb-2.5 text-right font-semibold">Sold</th>
            <th className="pb-2.5 text-right font-semibold">Maintenance</th>
            <th className="pb-2.5 text-right font-semibold">Used</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period, index) => {
            const total = venue[index];
            const name = label(period, data.grain);

            if (!total) {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-slate-500">
                  <td className="py-2.5 text-base">{name}</td>
                  {scope === "court" && <td />}
                  <td colSpan={5} className="py-2.5 text-right text-base italic">
                    Closed — nothing was on sale
                  </td>
                </tr>
              );
            }

            if (scope === "venue") {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
                  <td className="py-2.5 text-base font-semibold">{name}</td>
                  <td className={cell}>{duration(total.open)}</td>
                  <td className={cell}>{duration(total.sold)}</td>
                  <td className={cell}>{total.maintenance > 0 ? duration(total.maintenance) : "—"}</td>
                  <td className={`${cell} font-semibold`}>{percent(total.sold, total.open)}</td>
                </tr>
              );
            }

            return [
              ...(byStart.get(period.starts) ?? []).map((row) => (
                <tr key={`${period.starts}-${row.courtId}`} className="border-t border-slate-100 text-slate-700">
                  <td className="py-2.5 text-base text-slate-500">{name}</td>
                  <td className="py-2.5 text-base">{courts.get(row.courtId)}</td>
                  <td className={cell}>{duration(row.openMinutes)}</td>
                  <td className={cell}>{duration(row.soldMinutes)}</td>
                  <td className={cell}>{row.maintenanceMinutes > 0 ? duration(row.maintenanceMinutes) : "—"}</td>
                  <td className={cell}>{percent(row.soldMinutes, row.openMinutes)}</td>
                </tr>
              )),
              <tr key={`${period.starts}-all`} className="border-t-2 border-slate-200 font-bold text-[#071955]">
                <td className="py-2.5 text-base">{name}</td>
                <td className="py-2.5 text-base">All courts</td>
                <td className={cell}>{duration(total.open)}</td>
                <td className={cell}>{duration(total.sold)}</td>
                <td className={cell}>{total.maintenance > 0 ? duration(total.maintenance) : "—"}</td>
                <td className={cell}>{percent(total.sold, total.open)}</td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The rows as they came, one line each, in hours.
 *
 * Every court, every period, whatever the page is showing — somebody exporting
 * wants the figures, not the view they happened to be on.
 */
function exportCsv(data: HoursOverTime) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const h = (minutes: number) => (minutes / 60).toFixed(2);

  const lines = [
    ["Period starts", "Period ends", "Venue", "Court", "Open h", "Sold h", "Maintenance h"].join(","),
    ...data.rows.map((row) =>
      [
        row.starts,
        row.ends,
        quote(row.facilityName),
        quote(row.courtName),
        h(row.openMinutes),
        h(row.soldMinutes),
        h(row.maintenanceMinutes),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `hours-over-time_${data.from}_${data.to}_${data.grain.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * The utilization report's figures, spread over their days.
 *
 * Both reports say the same totals, because the server folds one walk of the
 * calendar into both. What this one adds is when: whether a month's hours came
 * steadily or on two busy evenings, and whether a dip was a quiet week or a
 * court closed for work.
 */
function DeskHoursView() {
  const [range, setRange] = useState(thisMonth);
  const [grain, setGrain] = useState<HoursGrain>("Day");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState<Scope>("venue");
  const [view, setView] = useState<View>("chart");

  const venues = useDeskVenues();
  const report = useHoursOverTime({
    from: range.from,
    to: range.to,
    grain,
    facilityId: facilityId || undefined,
  });

  const data = report.data;
  const venue = useMemo(() => (data ? venueBy(data.periods, data.rows) : []), [data]);
  const courtCount = useMemo(() => (data ? courtsOf(data.rows).length : 0), [data]);
  const tooMany = scope === "court" && courtCount > MOST_LINES;

  const totals = useMemo(
    () =>
      venue.reduce(
        (sum, period) =>
          period
            ? {
                open: sum.open + period.open,
                sold: sum.sold + period.sold,
                maintenance: sum.maintenance + period.maintenance,
              }
            : sum,
        { open: 0, sold: 0, maintenance: 0 },
      ),
    [venue],
  );

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Hours over time" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Hours over time
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Hours sold and hours under maintenance, spread across the period. The totals match the
        utilisation report — this shows when they happened.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        {(venues.data?.length ?? 0) > 1 && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
            Venue
            <select
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]"
            >
              <option value="">All my venues</option>
              {venues.data?.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
          From
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(event) => setRange((was) => ({ ...was, from: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
          To
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(event) => setRange((was) => ({ ...was, to: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]"
          />
        </label>

        <Segmented<HoursGrain>
          label="By"
          value={grain}
          onChange={setGrain}
          options={[
            { value: "Day", label: "Day" },
            { value: "Week", label: "Week" },
            { value: "Month", label: "Month" },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <Segmented<Scope>
          label="Show"
          value={scope}
          onChange={setScope}
          options={[
            { value: "venue", label: "Whole venue" },
            { value: "court", label: "Per court" },
          ]}
        />
        <Segmented<View>
          label="As"
          value={view}
          onChange={setView}
          options={[
            { value: "chart", label: "Chart" },
            { value: "table", label: "Table" },
          ]}
        />
      </div>

      {report.isPending && <p className="mt-6 text-base text-slate-600">Adding up the hours…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Tile label="Open" value={duration(totals.open)} hint="Hours you could have sold." />
            <Tile
              label="Sold"
              value={duration(totals.sold)}
              hint={`${percent(totals.sold, totals.open)} of what was open.`}
            />
            <Tile
              label="Maintenance"
              value={totals.maintenance > 0 ? duration(totals.maintenance) : "—"}
              hint="Not counted as open."
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            {data.rows.length === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                No court was open for business in this period.
              </p>
            ) : view === "table" ? (
              <>
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => exportCsv(data)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-base font-semibold text-[#071955] transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <FileDownloadOutlined sx={{ fontSize: 18 }} />
                    Export CSV
                  </button>
                </div>
                <Table data={data} scope={scope} venue={venue} />
              </>
            ) : tooMany ? (
              <div className="py-10 text-center">
                <p className="text-base text-slate-700">
                  {courtCount} courts is more lines than anybody can tell apart on one chart.
                </p>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className="mt-3 rounded-full bg-[#1264f7] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-blue-700"
                >
                  Show every court in the table
                </button>
              </div>
            ) : (
              <Chart data={data} scope={scope} venue={venue} />
            )}
          </div>
        </>
      )}
    </>
  );
}

export default DeskHoursView;
