"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { duration, type HoursGrain } from "@auth/deskApi";
import { useHoursReport, useUtilizationReport } from "../reportData";
import { reportHref, reportTrail, useReportScope } from "../reportScope";
import { CourtCountLine } from "../CourtCountLine";
import { ReportFilters, Segmented, thisMonth } from "../reportBits";
import { courtsOf, daysSince, partsOf, sold, unsold, type RankLevel, type Ranked } from "../rankings";

type View = "chart" | "table";

function when(lastSoldOn: string | null, to: string) {
  if (lastSoldOn === null) return { date: "Never", ago: "Not once, as far back as the records go." };

  const days = daysSince(lastSoldOn, to)!;
  return {
    date: format(parseISO(lastSoldOn), "d MMM yyyy"),
    ago: days === 0 ? "On the last day of this period" : `${days} day${days === 1 ? "" : "s"} before the end of this period`,
  };
}

function Name({ row }: { row: Ranked }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold text-[#071955]">{row.name}</span>
      {row.where && <span className="block truncate text-sm text-slate-600">{row.where}</span>}
      {/* Paid for and waiting on the desk: not a sale yet, and not nothing
          either. Said here so a court is not written off while somebody's
          money is sitting on it. */}
      {row.awaitingMinutes ? (
        <span className="mt-0.5 block text-sm font-semibold text-amber-700">
          {duration(row.awaitingMinutes)} paid, waiting on your desk
        </span>
      ) : null}
    </span>
  );
}

function List({ rows, level, to }: { rows: Ranked[]; level: RankLevel; to: string }) {
  const cell = "py-3 text-right text-base tabular-nums";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="w-10 pb-2.5 text-left font-semibold">#</th>
            <th className="pb-2.5 text-left font-semibold">{level === "court" ? "Court" : "Bookable court"}</th>
            {level === "court" && <th className="w-32 pb-2.5 text-right font-semibold">Open</th>}
            {level === "court" && <th className="w-36 pb-2.5 text-right font-semibold">Maintenance</th>}
            <th className="w-56 pb-2.5 text-right font-semibold">Last sold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const last = when(row.lastSoldOn, to);

            return (
              <tr key={row.key} className="border-t border-slate-100 text-slate-700">
                <td className="py-3 align-top text-base text-slate-500 tabular-nums">{index + 1}</td>
                <td className="py-3 align-top text-base">
                  <Name row={row} />
                </td>
                {level === "court" && (
                  <td className={`${cell} align-top`}>
                    {row.openMinutes ? (
                      <>
                        <span className="block">{duration(row.openMinutes)}</span>
                        <span className="block text-sm text-slate-600">
                          {row.openDays} {row.openDays === 1 ? "day" : "days"}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">Not open</span>
                    )}
                  </td>
                )}
                {level === "court" && (
                  <td className={`${cell} align-top`}>
                    {row.maintenanceMinutes ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        <BuildOutlined sx={{ fontSize: 16 }} />
                        {duration(row.maintenanceMinutes)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}
                <td className={`${cell} align-top`}>
                  <span className={`block font-semibold ${row.lastSoldOn ? "text-[#071955]" : "text-red-700"}`}>
                    {last.date}
                  </span>
                  <span className="block text-sm text-slate-600">{last.ago}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The courts — or the parts of them — that sold nothing in the period, and how
 * long they have gone without.
 *
 * The other end of "Sold Courts". The last-sold date reaches back past the
 * period on purpose: it is what tells a quiet month from a court nobody wants.
 */
function DeskCourtsUnsoldView() {
  const [range, setRange] = useState(thisMonth);
  const [facilityId, setFacilityId] = useState("");
  const [level, setLevel] = useState<RankLevel>("court");
  const [view, setView] = useState<View>("chart");
  const [grain, setGrain] = useState<HoursGrain>("Day");

  const scope = useReportScope();
  const report = useUtilizationReport(range, facilityId);

  // Only drawn on the chart, but asked for either way: switching views should
  // not make somebody wait for a line the page could already have.
  const lines = useHoursReport(range, grain, facilityId);

  const data = report.data;

  const shaped = useMemo(() => {
    if (!data) return null;

    const all = level === "court" ? courtsOf(data) : partsOf(data);

    return { rows: unsold(all), selling: sold(all).length };
  }, [data, level]);

  return (
    <>
      <Breadcrumbs trail={reportTrail(scope, "Not Sold Courts")} />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Not Sold Courts
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Courts with no bookings in this period, and when each was last booked. Courts that have
        never been booked are at the top.
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
            lines.data ? (
              <CourtCountLine data={lines.data} level={level} measure="unsold" />
            ) : lines.isError ? (
              <p className="py-10 text-center text-base text-red-800">That chart could not be read.</p>
            ) : (
              <p className="py-10 text-center text-base text-slate-600">Drawing the chart…</p>
            )
          ) : shaped.rows.length === 0 ? (
            <p className="py-10 text-center text-base text-slate-600">
              Every {level === "court" ? "court" : "bookable court"} sold something in this period.
            </p>
          ) : (
            <List rows={shaped.rows} level={level} to={range.to} />
          )}

          {shaped.selling > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-base text-slate-700">
              <span>
                <b>
                  {shaped.selling} {level === "court" ? "court" : "bookable court"}
                  {shaped.selling === 1 ? "" : "s"}
                </b>{" "}
                did sell in this period.
              </span>
              <Link href={reportHref(scope, "sold")} className="font-semibold text-[#1264f7] hover:underline">
                Sold Courts →
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default DeskCourtsUnsoldView;
