"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { MOVE_REASONS, moveReasonLabel } from "@auth/bookingApi";
import type { HoursGrain, MovedBooking, MovesReport } from "@auth/deskApi";
import { useMovesReport } from "@auth/hooks/useDesk";
import { periodLabel, ReportFilters, Segmented, thisMonth, Tile } from "../reportBits";

type Scope = "all" | "reason";
type View = "chart" | "table";

const ALL_INK = "#2a78d6";
const UPGRADE_INK = "#eda100";

/**
 * One colour per reason, in the list's own order and never cycled, so a
 * reason is the same colour on every visit. Not asked is grey: it is the
 * absence of an answer, not one of them.
 */
const REASON_INK: Record<string, string> = {
  ScheduleChanged: "#2a78d6",
  Weather: "#1baf7a",
  CourtProblem: "#e34948",
  DifferentCourt: "#6250d6",
  Other: "#eb6834",
};
const NOT_ASKED_INK = "#94a3b8";

const inkOf = (reason: string | null) => (reason === null ? NOT_ASKED_INK : (REASON_INK[reason] ?? NOT_ASKED_INK));

type Series = { key: string; name: string; ink: string; dash?: string; values: number[] };

/**
 * The lines the chart draws, and the columns the table prints: the same list,
 * so the two views cannot disagree about what is being counted.
 *
 * All moves is every move, with the paid upgrades among them drawn dashed —
 * they are part of the total, not beside it. By reason is one line per reason,
 * and Not asked only when a move in the range was made before customers were
 * asked; a flat grey line at zero would only be something to explain.
 */
function seriesOf(data: MovesReport, scope: Scope): Series[] {
  if (scope === "all") {
    return [
      {
        key: "all",
        name: "All moves",
        ink: ALL_INK,
        values: data.periods.map((period) => period.free + period.upgrade),
      },
      {
        key: "upgrade",
        name: "Paid upgrades",
        ink: UPGRADE_INK,
        dash: "6 4",
        values: data.periods.map((period) => period.upgrade),
      },
    ];
  }

  const unasked = data.reasons.some((count) => count.reason === null);
  const reasons: (string | null)[] = [...MOVE_REASONS.map((option) => option.value), ...(unasked ? [null] : [])];

  return reasons.map((reason) => ({
    key: reason ?? "not-asked",
    name: moveReasonLabel(reason),
    ink: inkOf(reason),
    values: data.periods.map(
      (period) => period.reasons.find((count) => count.reason === reason)?.count ?? 0,
    ),
  }));
}

/** A round top for a count axis: 2, 4, 6, 10, 20… and never a ceiling of 7. */
function ceiling(peak: number) {
  if (peak <= 2) return 2;
  const step = peak <= 10 ? 2 : peak <= 40 ? 5 : peak <= 100 ? 10 : 50;
  return Math.ceil(peak / step) * step;
}

const W = 1000;
const LEFT = 48;
const RIGHT = 16;
const TOP = 16;
const FLOOR = 232;
const TICK_Y = 258;
const H = 270;

/**
 * Moves per period, as lines.
 *
 * No gaps here, unlike the hours: a customer can move a booking on a day the
 * venue is shut, so every period is a period in which a move could happen, and
 * zero is a real zero.
 */
function Chart({ data, series }: { data: MovesReport; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const periods = data.periods;
  const n = periods.length;

  const peak = Math.max(0, ...series.flatMap((one) => one.values));
  const top = ceiling(peak);
  const step = (W - LEFT - RIGHT) / Math.max(1, n);
  const x = (index: number) => LEFT + step * (index + 0.5);
  const y = (value: number) => FLOOR - (value / top) * (FLOOR - TOP);

  const every = Math.max(1, Math.ceil(n / 8));
  const ticks = periods.map((_, index) => index).filter((index) => index % every === 0);
  const dots = n <= 45;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Bookings moved per ${data.grain.toLowerCase()}. The table view has the same figures.`}
        onMouseLeave={() => setHover(null)}
      >
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
              {value}
            </text>
          </g>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={TOP} y2={FLOOR} stroke="#94a3b8" strokeDasharray="3 3" />
        )}

        {series.map((one) => (
          <g key={one.key}>
            {n === 1 ? null : (
              <polyline
                points={one.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
                fill="none"
                stroke={one.ink}
                strokeWidth={one.dash ? 2 : 2.5}
                strokeDasharray={one.dash}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {one.values.map((value, index) =>
              dots || hover === index || n === 1 ? (
                <circle
                  key={index}
                  cx={x(index)}
                  cy={y(value)}
                  r={hover === index ? 5 : 3.5}
                  fill={one.ink}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              ) : null,
            )}
          </g>
        ))}

        {ticks.map((index) => (
          <text key={index} x={x(index)} y={TICK_Y} textAnchor="middle" fontSize="12" fill="#475569">
            {periodLabel(periods[index], data.grain)}
          </text>
        ))}

        {periods.map((_, index) => (
          <rect
            key={`h-${index}`}
            x={x(index) - step / 2}
            y={TOP}
            width={step}
            height={FLOOR - TOP}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-60 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="font-bold text-[#071955]">{periodLabel(periods[hover], data.grain)}</p>
          {series.map((one) => (
            <p key={one.key} className="mt-1 flex items-center justify-between gap-3 text-slate-700">
              <span className="flex min-w-0 items-center gap-1.5">
                <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: one.ink }} />
                <span className="truncate">{one.name}</span>
              </span>
              <span className="font-semibold tabular-nums">{one.values[hover]}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        {series.map((one) => (
          <span key={one.key} className="flex items-center gap-2">
            {one.dash ? (
              <i className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: one.ink }} />
            ) : (
              <i className="h-0.5 w-4 rounded" style={{ background: one.ink }} />
            )}
            {one.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The chart's figures, one row per period, with the range's total at the foot. */
function Table({ data, series, scope }: { data: MovesReport; series: Series[]; scope: Scope }) {
  const cell = "py-2.5 text-right text-base tabular-nums";

  // By reason, the total is the sum of the columns. All moves already is one.
  const columns = scope === "all" ? series : [...series, { key: "total", name: "Total", ink: "", values: data.periods.map((period) => period.free + period.upgrade) }];
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="pb-2.5 text-left font-semibold">Period</th>
            {columns.map((column) => (
              <th key={column.key} className="pb-2.5 text-right font-semibold">
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period, index) => (
            <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
              <td className="py-2.5 text-base font-semibold">{periodLabel(period, data.grain)}</td>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`${cell} ${column.key === "total" || column.key === "all" ? "font-semibold" : ""}`}
                >
                  {column.values[index] || "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 font-bold text-[#071955]">
            <td className="py-2.5 text-base">All periods</td>
            {columns.map((column) => (
              <td key={column.key} className={cell}>
                {sum(column.values)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * The moves themselves, newest first: who, from where to where, and why.
 *
 * The day only, not the time. The day is the venue's and comes from the
 * server; a time worked out here would be the browser's clock, which is not
 * the venue's.
 */
function MoveList({ data }: { data: MovesReport }) {
  if (data.moves.length === 0) {
    return null;
  }

  const venues = new Set(data.moves.map((move) => move.facilityName));

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">The moves</h2>
      <p className="mt-1 text-sm text-slate-600">
        {data.total > data.moves.length
          ? `The latest ${data.moves.length} of ${data.total}. Narrow the dates to see the rest.`
          : "Newest first."}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-2.5 text-left font-semibold">Day</th>
              <th className="pb-2.5 text-left font-semibold">Customer</th>
              <th className="pb-2.5 text-left font-semibold">Moved</th>
              <th className="pb-2.5 text-left font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody>
            {data.moves.map((move) => (
              <tr key={`${move.bookingId}-${move.movedAt}`} className="border-t border-slate-100 align-top text-slate-700">
                <td className="py-2.5 pr-3 text-base whitespace-nowrap">
                  {format(parseISO(move.movedOn), "d MMM")}
                </td>
                <td className="py-2.5 pr-3 text-base">
                  {move.customerName}
                  {venues.size > 1 && <span className="block text-sm text-slate-500">{move.facilityName}</span>}
                </td>
                <td className="py-2.5 pr-3 text-base">
                  <Where move={move} />
                  {move.kind === "Upgrade" && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                      Paid upgrade
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-base">
                  <span className="flex items-center gap-1.5 font-semibold text-[#071955]">
                    <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: inkOf(move.reason) }} />
                    {moveReasonLabel(move.reason)}
                  </span>
                  {move.reasonNote && <span className="mt-0.5 block text-sm text-slate-600">“{move.reasonNote}”</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Where it went. The court names are as they were at the time of the move;
 * a move from before those were kept says so rather than showing nothing.
 */
function Where({ move }: { move: MovedBooking }) {
  if (move.fromCourtName === null || move.toCourtName === null) {
    return <span className="text-slate-500">Courts not recorded</span>;
  }

  return move.fromCourtName === move.toCourtName ? (
    <span>{move.toCourtName}, other hours</span>
  ) : (
    <span>
      {move.fromCourtName} → {move.toCourtName}
    </span>
  );
}

/** The period counts as they came, whatever the page is showing. */
function exportCsv(data: MovesReport) {
  const reasons = MOVE_REASONS.map((option) => option.value);
  const count = (period: MovesReport["periods"][number], reason: string | null) =>
    period.reasons.find((one) => one.reason === reason)?.count ?? 0;

  const lines = [
    [
      "Period starts",
      "Period ends",
      "Free moves",
      "Paid upgrades",
      ...MOVE_REASONS.map((option) => option.label),
      "Not asked",
    ].join(","),
    ...data.periods.map((period) =>
      [
        period.starts,
        period.ends,
        period.free,
        period.upgrade,
        ...reasons.map((reason) => count(period, reason)),
        count(period, null),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `bookings-moved_${data.from}_${data.to}_${data.grain.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * How many bookings customers moved, and why.
 *
 * Every move asks the customer for a reason from a short list, so the answers
 * can be counted: a venue whose customers keep saying "problem with the court"
 * has something to fix, and one whose customers say "weather" has a roof to
 * think about. A move counts on the day it went through — a paid upgrade on
 * the day the desk approved it.
 */
function DeskMovesView() {
  const [range, setRange] = useState(thisMonth);
  const [grain, setGrain] = useState<HoursGrain>("Day");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [view, setView] = useState<View>("chart");

  const report = useMovesReport({
    from: range.from,
    to: range.to,
    grain,
    facilityId: facilityId || undefined,
  });

  const data = report.data;
  const series = useMemo(() => (data ? seriesOf(data, scope) : []), [data, scope]);

  const upgrades = data?.periods.reduce((sum, period) => sum + period.upgrade, 0) ?? 0;
  const topReason = data?.reasons.find((count) => count.reason !== null) ?? null;

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Bookings moved" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Bookings moved
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        How many bookings your customers moved, and the reasons they gave. Customers pick a reason
        every time they move a booking. A paid upgrade counts on the day you approved it.
      </p>

      <ReportFilters range={range} onRange={setRange} facilityId={facilityId} onFacility={setFacilityId}>
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
      </ReportFilters>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <Segmented<Scope>
          label="Show"
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All moves" },
            { value: "reason", label: "By reason" },
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

      {report.isPending && <p className="mt-6 text-base text-slate-600">Counting the moves…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Tile label="Moved" value={`${data.total}`} hint={data.total === 1 ? "booking" : "bookings"} />
            <Tile
              label="Paid upgrades"
              value={`${upgrades}`}
              hint={`${data.total - upgrades} moved for free.`}
            />
            <Tile
              label="Top reason"
              value={topReason ? moveReasonLabel(topReason.reason) : "—"}
              hint={
                topReason
                  ? `${topReason.count} of ${data.total} ${data.total === 1 ? "move" : "moves"}.`
                  : "No reasons given yet."
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            {data.total === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                No booking was moved in this period.
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
                <Table data={data} series={series} scope={scope} />
              </>
            ) : (
              <Chart data={data} series={series} />
            )}
          </div>

          <MoveList data={data} />
        </>
      )}
    </>
  );
}

export default DeskMovesView;
