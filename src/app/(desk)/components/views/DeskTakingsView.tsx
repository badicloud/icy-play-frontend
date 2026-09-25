"use client";

import { useMemo, useState } from "react";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { peso } from "@auth/bookingApi";
import type { CourtTakings, HoursGrain, TakingsFigures, TakingsReport } from "@auth/deskApi";
import { useTakingsReport } from "@auth/hooks/useDesk";
import CountChart, { type CountSeries } from "../CountChart";
import { periodLabel, ReportFilters, Segmented, thisMonth, Tile } from "../reportBits";

type Scope = "venue" | "court";
type View = "chart" | "table";

/** Categorical ink for one line per court, in a fixed order that is never cycled. */
const INK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const MOST_LINES = INK.length;

const TAKINGS_INK = "#1D9E75";
const PAID_INK = "#94a3b8";

/** The venue's money: court rental confirmed and upgrade balances approved. */
const takings = (figures: TakingsFigures) => figures.rental + figures.upgrades;

/** Everything the customer handed over, the platform fee included. */
const paid = (figures: TakingsFigures) => takings(figures) + figures.platformFee;

/** "₱2.5k" on the axis, where a full figure has no room. */
function compact(amount: number) {
  if (amount >= 1_000_000) return `₱${Math.round(amount / 100_000) / 10}M`;
  if (amount >= 1000) return `₱${Math.round(amount / 100) / 10}k`;
  return `₱${Math.round(amount)}`;
}

function sum(rows: TakingsFigures[]): TakingsFigures {
  return rows.reduce(
    (total, row) => ({
      bookings: total.bookings + row.bookings,
      hours: total.hours + row.hours,
      rental: total.rental + row.rental,
      upgrades: total.upgrades + row.upgrades,
      upgradeCount: total.upgradeCount + row.upgradeCount,
      platformFee: total.platformFee + row.platformFee,
    }),
    { bookings: 0, hours: 0, rental: 0, upgrades: 0, upgradeCount: 0, platformFee: 0 },
  );
}

/** The courts in the order the server listed them; named in full only across venues. */
function courtsOf(rows: CourtTakings[]) {
  const seen = new Map<string, CourtTakings>();
  rows.forEach((row) => {
    if (!seen.has(row.courtId)) seen.set(row.courtId, row);
  });

  const venues = new Set(rows.map((row) => row.facilityId));

  return [...seen.values()].map((row) => ({
    courtId: row.courtId,
    name: venues.size > 1 ? `${row.facilityName} · ${row.courtName}` : row.courtName,
  }));
}

/**
 * The lines the chart draws.
 *
 * The whole venue is its takings against a dashed line of everything the
 * customers paid — the gap between them is the platform fee, which is the
 * platform's and billed to the venue later. Per court is one line of takings
 * each; a court with no money in a period sits at zero, because money not
 * coming in is a real zero, not a gap.
 */
function seriesOf(data: TakingsReport, scope: Scope): CountSeries[] {
  if (scope === "venue") {
    return [
      { key: "takings", name: "Your takings", ink: TAKINGS_INK, values: data.periods.map(takings) },
      {
        key: "paid",
        name: "Customers paid (with platform fee)",
        ink: PAID_INK,
        dash: "6 4",
        values: data.periods.map(paid),
      },
    ];
  }

  return courtsOf(data.rows).map((court, index) => {
    const mine = new Map(
      data.rows.filter((row) => row.courtId === court.courtId).map((row) => [row.starts, row] as const),
    );

    return {
      key: court.courtId,
      name: court.name,
      ink: INK[index % INK.length],
      values: data.periods.map((period) => {
        const row = mine.get(period.starts);
        return row ? takings(row) : 0;
      }),
    };
  });
}

function Figures({ row, bold = false }: { row: TakingsFigures; bold?: boolean }) {
  const cell = `py-2.5 text-right text-base tabular-nums ${bold ? "font-bold" : ""}`;

  return (
    <>
      <td className={cell}>{row.bookings || "—"}</td>
      <td className={cell}>{row.hours || "—"}</td>
      <td className={cell}>{row.rental ? peso(row.rental) : "—"}</td>
      <td className={cell}>{row.upgrades ? peso(row.upgrades) : "—"}</td>
      <td className={cell}>{row.platformFee ? peso(row.platformFee) : "—"}</td>
      <td className={`${cell} font-semibold`}>{peso(takings(row))}</td>
    </>
  );
}

/**
 * The same money as the chart, one row per period — or per court per period,
 * with the period's total under each. What goes to the accountant.
 */
function Table({ data, scope }: { data: TakingsReport; scope: Scope }) {
  const courts = useMemo(
    () => new Map(courtsOf(data.rows).map((court) => [court.courtId, court.name])),
    [data.rows],
  );

  const head = "pb-2.5 text-right font-semibold";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="pb-2.5 text-left font-semibold">Period</th>
            {scope === "court" && <th className="pb-2.5 text-left font-semibold">Court</th>}
            <th className={head}>Bookings</th>
            <th className={head}>Hours</th>
            <th className={head}>Court rental</th>
            <th className={head}>Upgrades</th>
            <th className={head}>Platform fee</th>
            <th className={head}>Your takings</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period) => {
            const name = periodLabel(period, data.grain);

            if (scope === "venue") {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
                  <td className="py-2.5 text-base font-semibold">{name}</td>
                  <Figures row={period} />
                </tr>
              );
            }

            const rows = data.rows.filter((row) => row.starts === period.starts);

            if (rows.length === 0) {
              return (
                <tr key={period.starts} className="border-t border-slate-100 text-slate-500">
                  <td className="py-2.5 text-base">{name}</td>
                  <td colSpan={7} className="py-2.5 text-right text-base italic">
                    Nothing came in
                  </td>
                </tr>
              );
            }

            return [
              ...rows.map((row) => (
                <tr key={`${period.starts}-${row.courtId}`} className="border-t border-slate-100 text-slate-700">
                  <td className="py-2.5 text-base text-slate-500">{name}</td>
                  <td className="py-2.5 text-base">{courts.get(row.courtId)}</td>
                  <Figures row={row} />
                </tr>
              )),
              <tr key={`${period.starts}-all`} className="border-t-2 border-slate-200 font-bold text-[#071955]">
                <td className="py-2.5 text-base">{name}</td>
                <td className="py-2.5 text-base">All courts</td>
                <Figures row={period} bold />
              </tr>,
            ];
          })}
          <tr className="border-t-2 border-slate-300 font-bold text-[#071955]">
            <td className="py-2.5 text-base">All periods</td>
            {scope === "court" && <td />}
            <Figures row={sum(data.periods)} bold />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Every court, every period, whatever the page is showing — somebody exporting
 * wants the figures, not the view they happened to be on.
 */
function exportCsv(data: TakingsReport) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const money = (amount: number) => amount.toFixed(2);

  const lines = [
    [
      "Period starts",
      "Period ends",
      "Venue",
      "Court",
      "Bookings",
      "Hours",
      "Court rental",
      "Upgrades",
      "Platform fee",
      "Your takings",
      "Customers paid",
    ].join(","),
    ...data.rows.map((row) =>
      [
        row.starts,
        row.ends,
        quote(row.facilityName),
        quote(row.courtName),
        row.bookings,
        row.hours,
        money(row.rental),
        money(row.upgrades),
        money(row.platformFee),
        money(takings(row)),
        money(paid(row)),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `takings_${data.from}_${data.to}_${data.grain.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * What customers paid the venue, on the day the desk accepted it.
 *
 * The day the payment was confirmed rather than the day the court was played,
 * because that is when the money came in — it is what a venue matches against
 * its GCash history. The platform fee is inside every payment and is the
 * platform's, so it is shown apart rather than counted as takings.
 */
function DeskTakingsView() {
  const [range, setRange] = useState(thisMonth);
  const [grain, setGrain] = useState<HoursGrain>("Day");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState<Scope>("venue");
  const [view, setView] = useState<View>("chart");

  const report = useTakingsReport({
    from: range.from,
    to: range.to,
    grain,
    facilityId: facilityId || undefined,
  });

  const data = report.data;
  const series = useMemo(() => (data ? seriesOf(data, scope) : []), [data, scope]);
  const totals = useMemo(() => (data ? sum(data.periods) : null), [data]);
  const courtCount = useMemo(() => (data ? courtsOf(data.rows).length : 0), [data]);
  const tooMany = scope === "court" && courtCount > MOST_LINES;

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Takings" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Takings</h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        What your customers paid you, counted on the day you confirmed the payment — and an
        upgrade on the day you approved it. Customers pay you directly; the platform fee inside it
        is what IcyPlay bills you later.
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

      {report.isPending && <p className="mt-6 text-base text-slate-600">Adding up the takings…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && totals && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Customers paid"
              value={peso(paid(totals))}
              hint={`${totals.bookings} ${totals.bookings === 1 ? "booking" : "bookings"} · ${totals.hours} ${totals.hours === 1 ? "hour" : "hours"}`}
            />
            <Tile label="Platform fee" value={peso(totals.platformFee)} hint="Billed to you by IcyPlay." />
            <Tile label="Your takings" value={peso(takings(totals))} hint="Court rental and upgrades." />
            <Tile
              label="From upgrades"
              value={peso(totals.upgrades)}
              hint={`${totals.upgradeCount} paid ${totals.upgradeCount === 1 ? "upgrade" : "upgrades"}`}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            {data.rows.length === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                No payment was confirmed in this period.
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
              <CountChart
                periods={data.periods}
                grain={data.grain}
                series={series}
                format={peso}
                axisFormat={compact}
                label={`Takings per ${data.grain.toLowerCase()}${scope === "court" ? ", per court" : ", against what customers paid"}. The table view has the same figures.`}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

export default DeskTakingsView;
