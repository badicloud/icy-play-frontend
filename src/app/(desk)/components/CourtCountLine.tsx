"use client";

import { useMemo, useState } from "react";
import type { HoursOverTime } from "@auth/deskApi";
import { periodLabel } from "./reportBits";
import type { RankLevel } from "./rankings";

/*
 * Plot geometry for the not-sold line, in the SVG's own units.
 */
const W = 1000;
const LEFT = 48;
const RIGHT = 16;
const TOP = 16;
const FLOOR = 232;
const TICK_Y = 258;
const H = 270;

const OPEN_INK = "#94a3b8";

export type CountMeasure = "sold" | "unsold";

/**
 * What each report counts, and how it says it. Blue for sold and orange for
 * not, the same as everywhere else on the desk, so the two reports read as
 * the two halves they are.
 */
const MEASURES = {
  sold: { ink: "#2563EB", strong: "text-[#1d4ed8]", phrase: "had a booking", legend: "Had a booking", other: "with no booking" },
  unsold: { ink: "#eb6834", strong: "text-[#c2410c]", phrase: "had no booking", legend: "No booking", other: "that sold" },
} as const;

type Point = { open: number; counted: number } | null;

/**
 * For each period: how many courts — or parts — were open for business, and
 * how many of those had a booking at all, or had none.
 *
 * Null when nothing was open, which is a gap in both lines rather than a zero:
 * a Sunday the venue never opens has no unsold courts because it has no courts
 * for sale, and drawing it at zero would read as the best day of the week.
 */
function pointsOf(data: HoursOverTime, level: RankLevel, measure: CountMeasure): Point[] {
  const byStart = new Map<string, HoursOverTime["rows"]>();
  data.rows.forEach((row) => byStart.set(row.starts, [...(byStart.get(row.starts) ?? []), row]));

  return data.periods.map((period) => {
    const trading = (byStart.get(period.starts) ?? []).filter((row) => row.openMinutes > 0);

    if (trading.length === 0) return null;

    const open =
      level === "court" ? trading.length : trading.reduce((sum, row) => sum + row.parts, 0);
    const sold =
      level === "court"
        ? trading.filter((row) => row.soldMinutes > 0).length
        : trading.reduce((sum, row) => sum + row.partsSold, 0);

    // One count, taken from the other: a court is sold or not in a period,
    // so the two reports cannot disagree about the same day.
    return { open, counted: measure === "sold" ? sold : open - sold };
  });
}

/**
 * How many courts had a booking — or had none — period by period, against how
 * many were open.
 *
 * One chart for both ends of the list, so Sold Courts and Not Sold Courts are
 * drawn the same way and add up to the same open line. Two lines on one axis,
 * and honest here because they are the same unit — courts, counted — and the
 * gap between them is the other report.
 */
export function CourtCountLine({
  data,
  level,
  measure,
}: {
  data: HoursOverTime;
  level: RankLevel;
  measure: CountMeasure;
}) {
  const look = MEASURES[measure];
  const [hover, setHover] = useState<number | null>(null);
  const points = useMemo(() => pointsOf(data, level, measure), [data, level, measure]);
  const n = points.length;
  const noun = level === "court" ? "courts" : "bookable courts";

  const peak = Math.max(1, ...points.map((point) => point?.open ?? 0));
  const top = peak <= 5 ? peak : Math.ceil(peak / 5) * 5;
  const step = (W - LEFT - RIGHT) / Math.max(1, n);
  const x = (index: number) => LEFT + step * (index + 0.5);
  const y = (value: number) => FLOOR - (value / top) * (FLOOR - TOP);

  const every = Math.max(1, Math.ceil(n / 8));
  const ticks = points.map((_, index) => index).filter((index) => index % every === 0);
  const gridlines = [...new Set([0, Math.round(top / 2), top])];

  function runs(pick: (point: NonNullable<Point>) => number) {
    const out: string[][] = [];
    let run: string[] = [];
    points.forEach((point, index) => {
      if (point === null) {
        if (run.length) out.push(run);
        run = [];
      } else {
        run.push(`${x(index)},${y(pick(point))}`);
      }
    });
    if (run.length) out.push(run);
    return out;
  }

  const lineOf = (pick: (point: NonNullable<Point>) => number, ink: string, width: number, dash?: string) =>
    runs(pick).map((run, index) =>
      run.length === 1 ? (
        <circle key={index} cx={run[0].split(",")[0]} cy={run[0].split(",")[1]} r="3.5" fill={ink} />
      ) : (
        <polyline
          key={index}
          points={run.join(" ")}
          fill="none"
          stroke={ink}
          strokeWidth={width}
          strokeDasharray={dash}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ),
    );

  const shown = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`How many ${noun} ${look.phrase} each ${data.grain.toLowerCase()}, against how many were open. The list view has the courts themselves.`}
        onMouseLeave={() => setHover(null)}
      >
        {gridlines.map((value) => (
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

        {lineOf((point) => point.open, OPEN_INK, 2, "5 4")}
        {lineOf((point) => point.counted, look.ink, 2.75)}

        {hover !== null && shown && (
          <>
            <circle cx={x(hover)} cy={y(shown.open)} r="4.5" fill={OPEN_INK} stroke="#fff" strokeWidth="1.5" />
            <circle cx={x(hover)} cy={y(shown.counted)} r="5" fill={look.ink} stroke="#fff" strokeWidth="1.5" />
          </>
        )}

        {ticks.map((index) => (
          <text key={index} x={x(index)} y={TICK_Y} textAnchor="middle" fontSize="12" fill="#475569">
            {periodLabel(data.periods[index], data.grain)}
          </text>
        ))}

        {points.map((_, index) => (
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
          <p className="font-bold text-[#071955]">{periodLabel(data.periods[hover], data.grain)}</p>
          {shown ? (
            <p className="mt-1 text-slate-700">
              <b className={look.strong}>{shown.counted}</b> of {shown.open} {noun} {look.phrase}.
            </p>
          ) : (
            <p className="mt-1 text-slate-600">Closed — nothing was on sale.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        <span className="flex items-center gap-2">
          <i className="h-0.5 w-4 rounded" style={{ background: look.ink }} />
          {look.legend}
        </span>
        <span className="flex items-center gap-2">
          <i className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: OPEN_INK }} />
          Open for business
        </span>
        <span>Gaps are periods you were closed.</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The space between the two lines is the {noun} {look.other}.
        {level === "part" &&
          " A part with no booking counts here even while another game had the floor, so on a divided court some of these could not have been sold."}
      </p>
    </div>
  );
}
