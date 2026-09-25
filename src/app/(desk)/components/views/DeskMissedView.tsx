"use client";

import { Fragment, useMemo, useState } from "react";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { peso } from "@auth/bookingApi";
import { duration, type CourtMissed, type HoursGrain, type MissedReport } from "@auth/deskApi";
import { useMissedReport, useTakingsReport } from "@auth/hooks/useDesk";
import CountChart, { type CountSeries } from "../CountChart";
import { periodLabel, ReportFilters, Segmented, thisMonth, Tile } from "../reportBits";

type Scope = "venue" | "court";
type View = "chart" | "table";

/** Categorical ink for one line per court, in a fixed order that is never cycled. */
const INK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const MOST_LINES = INK.length;

const MISSED_INK = "#BA7517";
const TAKINGS_INK = "#94a3b8";

/** "₱2.5k" on the axis, where a full figure has no room. */
function compact(amount: number) {
  if (amount >= 1_000_000) return `₱${Math.round(amount / 100_000) / 10}M`;
  if (amount >= 1000) return `₱${Math.round(amount / 100) / 10}k`;
  return `₱${Math.round(amount)}`;
}

function share(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

/** A court's name, with its venue when there is more than one. */
function nameOf(court: { facilityId: string; facilityName: string }, name: string, venues: number) {
  return venues > 1 ? `${court.facilityName} · ${name}` : name;
}

/**
 * The lines the chart draws.
 *
 * The whole venue is what it missed against a dashed line of what it took —
 * the same money on one axis, so the two can be read against each other. Per
 * court is one line of missed income each.
 */
function seriesOf(data: MissedReport, scope: Scope, takings: number[] | null): CountSeries[] {
  if (scope === "venue") {
    return [
      {
        key: "missed",
        name: "Missed income",
        ink: MISSED_INK,
        values: data.periods.map((period) => period.missed),
      },
      ...(takings
        ? [{ key: "takings", name: "Your takings", ink: TAKINGS_INK, dash: "6 4", values: takings }]
        : []),
    ];
  }

  const venues = new Set(data.courts.map((court) => court.facilityId)).size;

  return data.courts.map((court, index) => {
    const mine = new Map(
      data.rows.filter((row) => row.courtId === court.courtId).map((row) => [row.starts, row] as const),
    );

    return {
      key: court.courtId,
      name: nameOf(court, court.name, venues),
      ink: INK[index % INK.length],
      values: data.periods.map((period) => mine.get(period.starts)?.missed ?? 0),
    };
  });
}

/** The chart's figures: one row per period, or per court per period. */
function Table({ data, scope }: { data: MissedReport; scope: Scope }) {
  const venues = new Set(data.courts.map((court) => court.facilityId)).size;
  const names = new Map(data.courts.map((court) => [court.courtId, nameOf(court, court.name, venues)]));
  const cell = "py-2.5 text-right text-base tabular-nums";
  const head = "pb-2.5 text-right font-semibold";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="pb-2.5 text-left font-semibold">Period</th>
            {scope === "court" && <th className="pb-2.5 text-left font-semibold">Court</th>}
            <th className={head}>Open</th>
            <th className={head}>Not sold</th>
            <th className={head}>Missed income</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period) => {
            const name = periodLabel(period, data.grain);

            if (period.openMinutes === 0) {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-slate-500">
                  <td className="py-2.5 text-base">{name}</td>
                  <td colSpan={scope === "court" ? 4 : 3} className="py-2.5 text-right text-base italic">
                    Nothing open yet
                  </td>
                </tr>
              );
            }

            const total = (
              <>
                <td className={cell}>{duration(period.openMinutes)}</td>
                <td className={cell}>{duration(period.notSoldMinutes)}</td>
                <td className={`${cell} font-semibold`}>{peso(period.missed)}</td>
              </>
            );

            if (scope === "venue") {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
                  <td className="py-2.5 text-base font-semibold">{name}</td>
                  {total}
                </tr>
              );
            }

            return [
              ...data.rows
                .filter((row) => row.starts === period.starts)
                .map((row) => (
                  <tr key={`${period.starts}-${row.courtId}`} className="border-t border-slate-100 text-slate-700">
                    <td className="py-2.5 text-base text-slate-500">{name}</td>
                    <td className="py-2.5 text-base">{names.get(row.courtId)}</td>
                    <td className={cell}>{duration(row.openMinutes)}</td>
                    <td className={cell}>{duration(row.notSoldMinutes)}</td>
                    <td className={cell}>{peso(row.missed)}</td>
                  </tr>
                )),
              <tr key={`${period.starts}-all`} className="border-t-2 border-slate-200 font-bold text-[#071955]">
                <td className="py-2.5 text-base">{name}</td>
                <td className="py-2.5 text-base">All courts</td>
                {total}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Each court for the whole range, most missed first, opening to the sport
 * courts it is divided into.
 *
 * The court row is the floor: the hours nobody had it at all, priced at its
 * main sport. The sport court rows are each part on its own, at its own rate,
 * counting only hours it could still have been booked. They share one floor,
 * so they overlap — the same reason Sold Hours gives for its parts.
 */
function Courts({ data }: { data: MissedReport }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const venues = new Set(data.courts.map((court) => court.facilityId)).size;
  const courts = [...data.courts].sort((one, other) => other.missed - one.missed);
  const cell = "py-2.5 text-right text-base tabular-nums";
  const head = "pb-2.5 text-right font-semibold";

  const toggle = (court: CourtMissed) =>
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(court.courtId)) next.delete(court.courtId);
      else next.add(court.courtId);
      return next;
    });

  if (courts.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">Per court, most missed first</h2>
      <p className="mt-1 text-sm text-slate-600">Open a court to see each sport court it is divided into.</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-2.5 text-left font-semibold">Court</th>
              <th className={head}>Open</th>
              <th className={head}>Not sold</th>
              <th className={head}>Not sold at peak</th>
              <th className={head}>Missed income</th>
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => {
              const expanded = open.has(court.courtId);
              const divided = court.units.length > 1;

              return (
                <Fragment key={court.courtId}>
                  <tr className="border-t border-slate-100 bg-slate-50 text-[#071955]">
                    <td className="py-2.5 text-base font-semibold">
                      {divided ? (
                        <button
                          type="button"
                          onClick={() => toggle(court)}
                          aria-expanded={expanded}
                          className="inline-flex items-center gap-1 text-left"
                        >
                          <ExpandMoreOutlined
                            sx={{ fontSize: 20 }}
                            className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
                          />
                          {nameOf(court, court.name, venues)}
                        </button>
                      ) : (
                        <span className="pl-6">{nameOf(court, court.name, venues)}</span>
                      )}
                      <span className="block pl-6 text-sm font-normal text-slate-500">
                        Priced as {court.mainSportName}
                      </span>
                    </td>
                    <td className={cell}>{duration(court.openMinutes)}</td>
                    <td className={`${cell} font-semibold`}>{duration(court.notSoldMinutes)}</td>
                    <td className={cell}>{court.peakNotSoldMinutes > 0 ? duration(court.peakNotSoldMinutes) : "—"}</td>
                    <td className={`${cell} font-semibold`}>{peso(court.missed)}</td>
                  </tr>

                  {expanded && (
                    <>
                      {court.units.map((unit) => (
                        <tr key={unit.bookableCourtId} className="text-slate-700">
                          <td className="py-2 pl-12 text-base text-slate-600">
                            {unit.label}
                            {unit.isMainSport && (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                Main sport
                              </span>
                            )}
                          </td>
                          <td className={`${cell} text-slate-400`}>—</td>
                          <td className={cell}>{duration(unit.notSoldMinutes)}</td>
                          <td className={cell}>{unit.peakNotSoldMinutes > 0 ? duration(unit.peakNotSoldMinutes) : "—"}</td>
                          <td className={cell}>{peso(unit.missed)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={5} className="pb-3 pl-12 text-sm text-slate-600">
                          These sport courts share one floor, so their figures overlap and do not add up to{" "}
                          {court.name}. A sport court counts an hour as not sold only when it could still
                          have been booked.
                        </td>
                      </tr>
                    </>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Every court, every period, whatever the page is showing. */
function exportCsv(data: MissedReport) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const hours = (minutes: number) => (minutes / 60).toFixed(2);

  const lines = [
    ["Period starts", "Period ends", "Venue", "Court", "Open h", "Not sold h", "Missed income"].join(","),
    ...data.rows.map((row) =>
      [
        row.starts,
        row.ends,
        quote(row.facilityName),
        quote(row.courtName),
        hours(row.openMinutes),
        hours(row.notSoldMinutes),
        row.missed.toFixed(2),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `missed-income_${data.from}_${data.to}_${data.grain.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * What the venue's open, unsold hours would have earned, at its own rates.
 *
 * Only hours that have begun — one still ahead can still be sold — and none
 * that were under maintenance or on a day the venue was shut, because those
 * were never on sale. Set against takings, because "₱140,000 missed" means
 * one thing beside ₱20,000 taken and another beside ₱400,000.
 */
function DeskMissedView() {
  const [range, setRange] = useState(thisMonth);
  const [grain, setGrain] = useState<HoursGrain>("Week");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState<Scope>("venue");
  const [view, setView] = useState<View>("chart");

  const query = { from: range.from, to: range.to, grain, facilityId: facilityId || undefined };
  const report = useMissedReport(query);
  const takingsReport = useTakingsReport(query);

  const data = report.data;
  const takingsByPeriod = useMemo(
    () =>
      takingsReport.data?.periods.map((period) => period.rental + period.upgrades) ?? null,
    [takingsReport.data],
  );
  const takingsTotal = takingsByPeriod?.reduce((sum, value) => sum + value, 0) ?? null;
  const series = useMemo(
    () => (data ? seriesOf(data, scope, takingsByPeriod) : []),
    [data, scope, takingsByPeriod],
  );

  const totals = useMemo(
    () =>
      data?.periods.reduce(
        (sum, period) => ({
          open: sum.open + period.openMinutes,
          notSold: sum.notSold + period.notSoldMinutes,
          peakNotSold: sum.peakNotSold + period.peakNotSoldMinutes,
          missed: sum.missed + period.missed,
          peakMissed: sum.peakMissed + period.peakMissed,
        }),
        { open: 0, notSold: 0, peakNotSold: 0, missed: 0, peakMissed: 0 },
      ) ?? null,
    [data],
  );

  const tooMany = scope === "court" && (data?.courts.length ?? 0) > MOST_LINES;

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Missed Income" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Missed Income</h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        What your open, unsold hours would have earned at your own rates. Only hours that have
        already started count; hours under maintenance or when you were closed do not.
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
            { value: "Quarter", label: "Quarter" },
            { value: "Half", label: "Half" },
            { value: "Year", label: "Year" },
          ]}
        />
      </ReportFilters>

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

      {report.isPending && <p className="mt-6 text-base text-slate-600">Pricing the empty hours…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && totals && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Missed income" value={peso(totals.missed)} hint="At your own rates." />
            <Tile
              label="Not sold"
              value={duration(totals.notSold)}
              hint={`of ${duration(totals.open)} open · ${share(totals.notSold, totals.open)}`}
            />
            <Tile
              label="Of that, at peak"
              value={peso(totals.peakMissed)}
              hint={`${duration(totals.peakNotSold)} of peak hours not sold`}
            />
            <Tile
              label="Compared with takings"
              value={
                takingsTotal && takingsTotal > 0
                  ? `${(Math.round((totals.missed / takingsTotal) * 10) / 10).toFixed(1)}×`
                  : "—"
              }
              hint={takingsTotal === null ? "Reading takings…" : `${peso(takingsTotal)} taken`}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            {totals.open === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                No court was open in this period yet.
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
                <Table data={data} scope={scope} />
              </>
            ) : tooMany ? (
              <div className="py-10 text-center">
                <p className="text-base text-slate-700">
                  {data.courts.length} courts is more lines than anybody can tell apart on one chart.
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
              <CountChart
                periods={data.periods}
                grain={data.grain}
                series={series}
                format={peso}
                axisFormat={compact}
                label={`Missed income per ${data.grain.toLowerCase()}${scope === "court" ? ", per court" : ", against your takings"}. The table view has the same figures.`}
              />
            )}
          </div>

          <Courts data={data} />
        </>
      )}
    </>
  );
}

export default DeskMissedView;
