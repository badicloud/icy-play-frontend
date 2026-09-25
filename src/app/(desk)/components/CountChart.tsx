"use client";

import { useState } from "react";
import type { HoursGrain, ReportPeriod } from "@auth/deskApi";
import { periodLabel } from "./reportBits";

/** One line of counts: a value for every period, in order. */
export type CountSeries = { key: string; name: string; ink: string; dash?: string; values: number[] };

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
 * Counts per period, as lines — what Moved Bookings and Declined Bookings draw.
 *
 * No gaps, unlike the hours: a booking can be moved, or a payment answered, on
 * a day the venue is shut, so every period is one in which it could happen and
 * zero is a real zero. A dashed series is one the others sit inside or against.
 */
function CountChart({
  periods,
  grain,
  series,
  label,
}: {
  periods: ReportPeriod[];
  grain: HoursGrain;
  series: CountSeries[];
  /** What the chart shows, for a screen reader. */
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
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
        aria-label={label}
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
            {periodLabel(periods[index], grain)}
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
          <p className="font-bold text-[#071955]">{periodLabel(periods[hover], grain)}</p>
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

export default CountChart;
