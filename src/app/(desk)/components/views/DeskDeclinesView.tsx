"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { clock, peso } from "@auth/bookingApi";
import {
  REJECT_REASONS,
  rejectReasonLabel,
  type DeclinedBooking,
  type DeclinesReport,
  type HoursGrain,
} from "@auth/deskApi";
import { useDeclinesData } from "../reportData";
import { reportTrail, useReportScope } from "../reportScope";
import CountChart, { type CountSeries } from "../CountChart";
import { periodLabel, ReportFilters, Segmented, thisMonth, Tile } from "../reportBits";

type Scope = "all" | "reason";
type View = "chart" | "table";

const DECLINED_INK = "#e34948";
const CHECKED_INK = "#94a3b8";

/**
 * One colour per reason, in the list's own order and never cycled, so a reason
 * is the same colour on every visit. Not categorised is grey: it is a refusal
 * from before the desk picked from a list, not one of the answers.
 */
const REASON_INK: Record<string, string> = {
  PaymentNotReceived: "#e34948",
  WrongAmount: "#eda100",
  ReceiptUnclear: "#6250d6",
  CourtNotAvailable: "#2a78d6",
  Other: "#eb6834",
};
const UNCATEGORISED_INK = "#94a3b8";

const inkOf = (reason: string | null) =>
  reason === null ? UNCATEGORISED_INK : (REASON_INK[reason] ?? UNCATEGORISED_INK);

/** A share of what was checked, or a dash where nothing was. */
function share(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

/**
 * The lines the chart draws, and the columns the table prints: the same list,
 * so the two views cannot disagree about what is being counted.
 *
 * All declines is the refusals against a dashed line of every payment the desk
 * answered — the same unit on one axis, so the gap between them is what it
 * confirmed. By reason is one line per reason, and Not categorised only when
 * the range has a refusal from before the list.
 */
function seriesOf(data: DeclinesReport, scope: Scope): CountSeries[] {
  if (scope === "all") {
    return [
      {
        key: "declined",
        name: "Declined",
        ink: DECLINED_INK,
        values: data.periods.map((period) => period.declined),
      },
      {
        key: "checked",
        name: "Payments checked",
        ink: CHECKED_INK,
        dash: "6 4",
        values: data.periods.map((period) => period.checked),
      },
    ];
  }

  const uncategorised = data.reasons.some((count) => count.reason === null);
  const reasons: (string | null)[] = [
    ...REJECT_REASONS.map((option) => option.value),
    ...(uncategorised ? [null] : []),
  ];

  return reasons.map((reason) => ({
    key: reason ?? "uncategorised",
    name: rejectReasonLabel(reason),
    ink: inkOf(reason),
    values: data.periods.map(
      (period) => period.reasons.find((count) => count.reason === reason)?.count ?? 0,
    ),
  }));
}

/** The chart's figures, one row per period, with the range's total at the foot. */
function Table({ data, series, scope }: { data: DeclinesReport; series: CountSeries[]; scope: Scope }) {
  const cell = "py-2.5 text-right text-base tabular-nums";
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  if (scope === "all") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-2.5 text-left font-semibold">Period</th>
              <th className="pb-2.5 text-right font-semibold">Declined</th>
              <th className="pb-2.5 text-right font-semibold">Payments checked</th>
              <th className="pb-2.5 text-right font-semibold">Declined share</th>
            </tr>
          </thead>
          <tbody>
            {data.periods.map((period) => (
              <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
                <td className="py-2.5 text-base font-semibold">{periodLabel(period, data.grain)}</td>
                <td className={`${cell} font-semibold`}>{period.declined || "—"}</td>
                <td className={cell}>{period.checked || "—"}</td>
                <td className={cell}>{share(period.declined, period.checked)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 font-bold text-[#071955]">
              <td className="py-2.5 text-base">All periods</td>
              <td className={cell}>{data.total}</td>
              <td className={cell}>{data.checked}</td>
              <td className={cell}>{share(data.total, data.checked)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const totals = data.periods.map((period) => period.declined);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="text-sm tracking-wider text-slate-600 uppercase">
            <th className="pb-2.5 text-left font-semibold">Period</th>
            {series.map((column) => (
              <th key={column.key} className="pb-2.5 text-right font-semibold">
                {column.name}
              </th>
            ))}
            <th className="pb-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period, index) => (
            <tr key={period.starts} className="border-t border-slate-100 text-[#071955]">
              <td className="py-2.5 text-base font-semibold">{periodLabel(period, data.grain)}</td>
              {series.map((column) => (
                <td key={column.key} className={cell}>
                  {column.values[index] || "—"}
                </td>
              ))}
              <td className={`${cell} font-semibold`}>{totals[index] || "—"}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 font-bold text-[#071955]">
            <td className="py-2.5 text-base">All periods</td>
            {series.map((column) => (
              <td key={column.key} className={cell}>
                {sum(column.values)}
              </td>
            ))}
            <td className={cell}>{data.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * When the booking was for, as a person would say it: one day and its hours,
 * a whole day, or a run of days.
 */
function whenFor(decline: DeclinedBooking) {
  const first = format(parseISO(decline.startDate), "EEE d MMM");

  if (decline.kind === "MultiDay") {
    return `${first} – ${format(parseISO(decline.endDate), "EEE d MMM")}`;
  }

  if (decline.kind === "WholeDay") {
    return `${first}, whole day`;
  }

  if (decline.startsAt === null || decline.endsAt === null) {
    return first;
  }

  return `${first}, ${clock(decline.startsAt)}–${clock(decline.endsAt)}`;
}

/**
 * The refusals themselves, newest first: who, what for, how much, why, and who
 * at the desk said no.
 *
 * The day only, not the time. The day is the venue's and comes from the
 * server; a time worked out here would be the browser's clock.
 */
function DeclineList({ data }: { data: DeclinesReport }) {
  if (data.declines.length === 0) {
    return null;
  }

  const venues = new Set(data.declines.map((decline) => decline.facilityName));

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[#071955]">The declines</h2>
      <p className="mt-1 text-sm text-slate-600">
        {data.total > data.declines.length
          ? `The latest ${data.declines.length} of ${data.total}. Narrow the dates to see the rest.`
          : "Newest first."}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="text-sm tracking-wider text-slate-600 uppercase">
              <th className="pb-2.5 text-left font-semibold">Day</th>
              <th className="pb-2.5 text-left font-semibold">Customer</th>
              <th className="pb-2.5 text-left font-semibold">Booking</th>
              <th className="pb-2.5 text-right font-semibold">Amount</th>
              <th className="pb-2.5 pl-4 text-left font-semibold">Reason</th>
              <th className="pb-2.5 text-left font-semibold">Declined by</th>
            </tr>
          </thead>
          <tbody>
            {data.declines.map((decline) => (
              <tr key={decline.bookingId} className="border-t border-slate-100 align-top text-slate-700">
                <td className="py-2.5 pr-3 text-base whitespace-nowrap">
                  {format(parseISO(decline.declinedOn), "d MMM")}
                </td>
                <td className="py-2.5 pr-3 text-base">
                  {decline.customerName}
                  {venues.size > 1 && (
                    <span className="block text-sm text-slate-500">{decline.facilityName}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-base">
                  {decline.courtName}
                  <span className="block text-sm text-slate-500">{whenFor(decline)}</span>
                </td>
                <td className="py-2.5 text-right text-base tabular-nums">{peso(decline.amount)}</td>
                <td className="py-2.5 pr-3 pl-4 text-base">
                  <span className="flex items-center gap-1.5 font-semibold text-[#071955]">
                    <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: inkOf(decline.reason) }} />
                    {rejectReasonLabel(decline.reason)}
                  </span>
                  {decline.note && (
                    <span className="mt-0.5 block text-sm text-slate-600">“{decline.note}”</span>
                  )}
                </td>
                <td className="py-2.5 text-base">
                  {decline.declinedByName === null ? (
                    <span className="text-slate-500">Not recorded</span>
                  ) : (
                    <>
                      {decline.declinedByName}
                      <span className="block text-sm text-slate-500">
                        {decline.declinedByOwner ? "Owner" : "Attendant"}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The period counts as they came, whatever the page is showing. */
function exportCsv(data: DeclinesReport) {
  const count = (period: DeclinesReport["periods"][number], reason: string | null) =>
    period.reasons.find((one) => one.reason === reason)?.count ?? 0;

  const lines = [
    [
      "Period starts",
      "Period ends",
      "Declined",
      "Payments checked",
      ...REJECT_REASONS.map((option) => option.label),
      "Not categorised",
    ].join(","),
    ...data.periods.map((period) =>
      [
        period.starts,
        period.ends,
        period.declined,
        period.checked,
        ...REJECT_REASONS.map((option) => count(period, option.value)),
        count(period, null),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `declined-bookings_${data.from}_${data.to}_${data.grain.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * How many payments the desk turned down, against how many it checked, and why.
 *
 * The share is the point: seven refusals in a month is nothing at a busy venue
 * and a problem at a quiet one. The reasons say what kind of problem — money
 * that never arrived is a different conversation with customers from receipts
 * nobody can read.
 */
function DeskDeclinesView() {
  const [range, setRange] = useState(thisMonth);
  const [grain, setGrain] = useState<HoursGrain>("Day");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [view, setView] = useState<View>("chart");

  const reportScope = useReportScope();
  const report = useDeclinesData({ from: range.from, to: range.to, grain }, facilityId);

  const data = report.data;
  const series = useMemo(() => (data ? seriesOf(data, scope) : []), [data, scope]);
  const topReason = data?.reasons.find((count) => count.reason !== null) ?? null;

  return (
    <>
      <Breadcrumbs trail={reportTrail(reportScope, "Declined Bookings")} />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Declined Bookings
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Payments you checked and turned down, and the reason you gave. A declined booking goes back
        on sale, and the customer sees the reason on their booking.
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
            { value: "all", label: "All declines" },
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

      {report.isPending && <p className="mt-6 text-base text-slate-600">Counting the declines…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Tile
              label="Declined"
              value={`${data.total}`}
              hint={data.total === 1 ? "payment turned down" : "payments turned down"}
            />
            <Tile
              label="Of payments checked"
              value={share(data.total, data.checked)}
              hint={`${data.total} of ${data.checked} · ${data.checked - data.total} confirmed`}
            />
            <Tile
              label="Top reason"
              value={topReason ? rejectReasonLabel(topReason.reason) : "—"}
              hint={
                topReason
                  ? `${topReason.count} of ${data.total} ${data.total === 1 ? "decline" : "declines"}.`
                  : "No reasons picked yet."
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            {data.checked === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                No payment was checked in this period.
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
              <CountChart
                periods={data.periods}
                grain={data.grain}
                series={series}
                label={`Declined payments per ${data.grain.toLowerCase()}, against payments checked. The table view has the same figures.`}
              />
            )}
          </div>

          <DeclineList data={data} />
        </>
      )}
    </>
  );
}

export default DeskDeclinesView;
