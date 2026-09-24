"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { peso } from "../BookingDetails";
import { duration, shares, type HoursGrain } from "@auth/deskApi";
import { useCourtUtilization, useHoursOverTime } from "@auth/hooks/useDesk";
import { CourtCountLine } from "../CourtCountLine";
import { ReportFilters, Segmented, thisMonth } from "../reportBits";
import {
  courtsOf,
  partsOf,
  sold,
  trends,
  type RankLevel,
  type Ranked,
} from "../rankings";

type View = "chart" | "table";

/**
 * One court's line across the period, small enough to sit in a table row.
 *
 * Every row shares one vertical scale. Scaled each to its own peak, a court
 * that sold one hour would draw the same mountain as one that sold twenty, and
 * a column of those is a column of the same picture.
 */
function Sparkline({ values, top }: { values: (number | null)[]; top: number }) {
  const w = 104;
  const h = 26;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (value: number) => h - 3 - (value / Math.max(1, top)) * (h - 6);

  const runs: string[][] = [];
  let run: string[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(`${(index * step).toFixed(1)},${y(value).toFixed(1)}`);
    }
  });
  if (run.length) runs.push(run);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ml-auto block" aria-hidden>
      <line x1="0" x2={w} y1={h - 3} y2={h - 3} stroke="#e2e8f0" />
      {runs.map((points, index) =>
        points.length === 1 ? (
          <circle key={index} cx={points[0].split(",")[0]} cy={points[0].split(",")[1]} r="1.8" fill="#2563EB" />
        ) : (
          <polyline
            key={index}
            points={points.join(" ")}
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}

function Name({ row }: { row: Ranked }) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-2">
        <span className="truncate font-semibold text-[#071955]">{row.name}</span>
        {row.isRetired && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Retired
          </span>
        )}
      </span>
      {row.where && <span className="block truncate text-sm text-slate-600">{row.where}</span>}
    </span>
  );
}

/**
 * Why the parts total more than the courts do, said before anybody has to ask.
 *
 * A divided floor sells two parts for one hour of floor. Both totals are right,
 * and a page that shows one after the other without a word is a page that gets
 * reported as a bug.
 */
function WhyTheTotalsDiffer({ courts, parts }: { courts: number; parts: number }) {
  return (
    <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
      <p className="font-bold">
        Why {duration(parts)} here, and {duration(courts)} on the courts view?
      </p>
      <ul className="mt-2 space-y-1">
        <li>
          On <b>courts</b>, one hour is one hour of floor — <b>{duration(courts)}</b>.
        </li>
        <li>
          On <b>bookable courts</b>, every part is counted — <b>{duration(parts)}</b>.
        </li>
        <li>
          The <b>{duration(parts - courts)}</b> between them is parts of the same court booked for
          the same hour.
        </li>
      </ul>
    </div>
  );
}

function List({
  rows,
  level,
  split,
  total,
  rental,
  lines,
  top,
}: {
  rows: Ranked[];
  level: RankLevel;
  split: number[];
  total: number;
  rental: number | null;
  lines: Map<string, (number | null)[]> | null;
  top: number;
}) {
  const money = rental !== null;
  const cell = "py-3 text-right text-base tabular-nums";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="w-10 pb-2.5 text-left font-semibold">#</th>
            <th className="pb-2.5 text-left font-semibold">{level === "court" ? "Court" : "Bookable court"}</th>
            <th className="w-24 pb-2.5 text-right font-semibold">Sold</th>
            {level === "court" && <th className="w-24 pb-2.5 text-right font-semibold">Of open</th>}
            <th className="w-40 pb-2.5 text-right font-semibold">% of sold</th>
            {level === "court" && <th className="w-32 pb-2.5 text-right font-semibold">Trend</th>}
            {money && <th className="w-32 pb-2.5 text-right font-semibold">Rental</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className="border-t border-slate-100 text-slate-700">
              <td className="py-3 text-base text-slate-500 tabular-nums">{index + 1}</td>
              <td className="py-3 text-base">
                <Name row={row} />
              </td>
              <td className={`${cell} font-semibold text-[#071955]`}>{duration(row.soldMinutes)}</td>
              {level === "court" && (
                <td className={cell}>
                  {row.openMinutes ? `${Math.round((row.soldMinutes / row.openMinutes) * 100)}%` : "—"}
                </td>
              )}
              <td className={cell}>
                <span className="inline-flex items-center justify-end gap-2">
                  {split[index]}%
                  <i
                    className="block h-1.5 rounded-full bg-[#2563EB]"
                    style={{ width: `${Math.max(3, split[index] * 0.7)}px` }}
                  />
                </span>
              </td>
              {level === "court" && (
                <td className="py-3">
                  {lines?.get(row.key) ? (
                    <Sparkline values={lines.get(row.key)!} top={top} />
                  ) : (
                    <span className="block text-right text-slate-400">—</span>
                  )}
                </td>
              )}
              {money && <td className={cell}>{row.rental === null ? "—" : peso(row.rental)}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 text-base font-bold text-[#071955]">
            <td />
            <td className="pt-3">Total</td>
            <td className="pt-3 text-right tabular-nums">{duration(total)}</td>
            {level === "court" && <td />}
            <td className="pt-3 text-right tabular-nums">100%</td>
            {level === "court" && <td />}
            {money && <td className="pt-3 text-right tabular-nums">{peso(rental)}</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * The courts — or the parts of them — that sold, busiest first.
 *
 * The other end of the same list is "Not Sold Courts": a court is on
 * exactly one of the two, so the footer here says how many are over there.
 */
function DeskCourtsSoldView() {
  const [range, setRange] = useState(thisMonth);
  const [facilityId, setFacilityId] = useState("");
  const [level, setLevel] = useState<RankLevel>("court");
  const [view, setView] = useState<View>("chart");
  const [grain, setGrain] = useState<HoursGrain>("Day");

  const report = useCourtUtilization({
    from: range.from,
    to: range.to,
    facilityId: facilityId || undefined,
  });
  const trend = useHoursOverTime({
    from: range.from,
    to: range.to,
    grain,
    facilityId: facilityId || undefined,
  });

  const data = report.data;

  const shaped = useMemo(() => {
    if (!data) return null;

    const courts = courtsOf(data);
    const parts = partsOf(data);
    const all = level === "court" ? courts : parts;
    const rows = sold(all);

    return {
      rows,
      split: shares(rows.map((row) => row.soldMinutes)),
      total: rows.reduce((sum, row) => sum + row.soldMinutes, 0),
      rental: data.rental === null ? null : rows.reduce((sum, row) => sum + (row.rental ?? 0), 0),
      nothing: all.length - rows.length,
      courtsTotal: sold(courts).reduce((sum, row) => sum + row.soldMinutes, 0),
      partsTotal: sold(parts).reduce((sum, row) => sum + row.soldMinutes, 0),
    };
  }, [data, level]);

  const lines = useMemo(() => (trend.data ? trends(trend.data) : null), [trend.data]);
  const top = useMemo(
    () => (lines ? Math.max(1, ...[...lines.values()].flat().map((value) => value ?? 0)) : 1),
    [lines],
  );

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Sold Courts" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Sold Courts
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Courts that had bookings in this period, busiest first. Courts with no bookings are listed
        in Not Sold Courts.
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
        <Segmented<RankLevel>
          label="Show"
          value={level}
          onChange={setLevel}
          options={[
            { value: "court", label: "Courts" },
            { value: "part", label: "Bookable courts" },
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

      {shaped && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
          {view === "chart" ? (
            trend.data ? (
              <CourtCountLine data={trend.data} level={level} measure="sold" />
            ) : trend.isError ? (
              <p className="py-10 text-center text-base text-red-800">That chart could not be read.</p>
            ) : (
              <p className="py-10 text-center text-base text-slate-600">Drawing the chart…</p>
            )
          ) : shaped.rows.length === 0 ? (
            <p className="py-10 text-center text-base text-slate-600">
              Nothing was sold in this period.
            </p>
          ) : (
            <>
              {level === "part" && shaped.partsTotal !== shaped.courtsTotal && (
                <WhyTheTotalsDiffer courts={shaped.courtsTotal} parts={shaped.partsTotal} />
              )}
              <List
                rows={shaped.rows}
                level={level}
                split={shaped.split}
                total={shaped.total}
                rental={shaped.rental}
                lines={lines}
                top={top}
              />
            </>
          )}

          {shaped.nothing > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-base text-slate-700">
              <span>
                <b>
                  {shaped.nothing} {level === "court" ? "court" : "bookable court"}
                  {shaped.nothing === 1 ? "" : "s"}
                </b>{" "}
                sold nothing in this period.
              </span>
              <Link href="/desk/reports/unsold" className="font-semibold text-[#1264f7] hover:underline">
                Not Sold Courts →
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default DeskCourtsSoldView;
