"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PhotoLibraryOutlined from "@mui/icons-material/PhotoLibraryOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import ViewWeekOutlined from "@mui/icons-material/ViewWeekOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { clock } from "@auth/bookingApi";
import type { CourtChange, CourtChangeKind, CourtChangesReport } from "@auth/deskApi";
import { useCourtChanges, useDeskCourts } from "@auth/hooks/useDesk";
import { ReportFilters, thisMonth, Tile } from "../reportBits";

/**
 * How each kind of change is named on a chip, and drawn beside an entry. The
 * colour says what kind of news it is: green for something added, amber for a
 * closure, blue for money, grey for housekeeping.
 */
const KINDS: Record<CourtChangeKind, { label: string; icon: ReactNode; tone: string }> = {
  Added: {
    label: "Added",
    icon: <AddCircleOutline sx={{ fontSize: 18 }} />,
    tone: "bg-green-50 text-green-700",
  },
  SportsAndDivisions: {
    label: "Sports and divisions",
    icon: <ViewWeekOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-emerald-50 text-emerald-700",
  },
  Prices: {
    label: "Prices",
    icon: <PaymentsOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-blue-50 text-blue-700",
  },
  Hours: {
    label: "Hours",
    icon: <ScheduleOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-indigo-50 text-indigo-700",
  },
  Maintenance: {
    label: "Maintenance",
    icon: <BuildOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-amber-50 text-amber-700",
  },
  RenamedOrRetired: {
    label: "Renamed or retired",
    icon: <EditOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-slate-100 text-slate-600",
  },
  Photos: {
    label: "Photos",
    icon: <PhotoLibraryOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-slate-100 text-slate-600",
  },
  Details: {
    label: "Other details",
    icon: <TuneOutlined sx={{ fontSize: 18 }} />,
    tone: "bg-slate-100 text-slate-600",
  },
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "+2 · 1 retired", or nothing when the range changed nothing. */
function movement(added: number, retired: number) {
  const parts = [added > 0 ? `+${added} added` : null, retired > 0 ? `${retired} retired` : null];
  return parts.filter(Boolean).join(" · ") || "No change in this range";
}

/** One change: what it was, what it became, and who said so. */
function Entry({ change }: { change: CourtChange }) {
  const kind = KINDS[change.kind];

  return (
    <li className="flex gap-3 border-t border-slate-100 py-3.5 first:border-t-0">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${kind.tone}`}
        aria-hidden
      >
        {kind.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-base font-bold text-[#071955]">{change.title}</p>
          <p className="text-sm text-slate-500">
            {clock(change.time)} · {change.actorName ? `${change.actorName} (${change.actorRole.toLowerCase()})` : change.actorRole}
          </p>
        </div>

        {change.details.length > 0 && (
          <dl className="mt-1.5 space-y-0.5 text-[13.5px]">
            {change.details.map((detail) => (
              <div key={`${detail.label}-${detail.before}-${detail.after}`} className="flex flex-wrap gap-x-2">
                <dt className="text-slate-500">{detail.label}</dt>
                <dd className="text-slate-700">
                  {detail.before !== null && detail.after !== null ? (
                    <>
                      <span className="text-slate-400 line-through">{detail.before}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-semibold text-[#071955]">{detail.after}</span>
                    </>
                  ) : detail.after !== null ? (
                    <span className="font-semibold text-[#071955]">{detail.after}</span>
                  ) : (
                    <span className="font-semibold text-red-700">Removed</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {change.reason && <p className="mt-1.5 text-sm text-slate-600 italic">“{change.reason}”</p>}
      </div>
    </li>
  );
}

/** Every listed change, one line each, the way it reads on screen. */
function exportCsv(data: CourtChangesReport) {
  const quote = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

  const lines = [
    ["Date", "Time", "Kind", "Change", "What changed", "Reason", "By"].join(","),
    ...data.changes.map((change) =>
      [
        change.on,
        change.time.slice(0, 5),
        quote(KINDS[change.kind].label),
        quote(change.title),
        quote(
          change.details
            .map((detail) =>
              detail.before !== null && detail.after !== null
                ? `${detail.label}: ${detail.before} → ${detail.after}`
                : `${detail.label}: ${detail.after ?? "removed"}`,
            )
            .join("; "),
        ),
        quote(change.reason),
        quote(change.actorName ? `${change.actorName} (${change.actorRole})` : change.actorRole),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `court-changes_${data.from}_${data.to}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Every change made to the venue's courts, newest first.
 *
 * A list rather than a chart: these are things that happened, not a figure
 * that moves every day. What a venue reads when a price looks wrong or a
 * court seems to have gone — and who changed it, and why.
 */
function DeskCourtChangesView() {
  const [range, setRange] = useState(thisMonth);
  const [facilityId, setFacilityId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [kind, setKind] = useState<CourtChangeKind | null>(null);

  const courts = useDeskCourts();
  const report = useCourtChanges({
    from: range.from,
    to: range.to,
    facilityId: facilityId || undefined,
    courtId: courtId || undefined,
  });

  const data = report.data;
  const shown = useMemo(
    () => (data ? data.changes.filter((change) => kind === null || change.kind === kind) : []),
    [data, kind],
  );

  // Newest day first, and within it the order the server gave: newest first.
  const days = useMemo(() => {
    const grouped = new Map<string, CourtChange[]>();
    shown.forEach((change) => grouped.set(change.on, [...(grouped.get(change.on) ?? []), change]));
    return [...grouped.entries()];
  }, [shown]);

  const offered = (courts.data ?? []).filter((court) => !facilityId || court.facilityId === facilityId);
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
      active
        ? "bg-[#071955] text-white"
        : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400"
    }`;

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Venue desk", href: "/desk" },
          { label: "Reports", href: "/desk/reports" },
          { label: "Court Changes" },
        ]}
      />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">Court Changes</h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        Every change to your courts, newest first: what it was, what it became, who changed it and
        why.
      </p>

      <ReportFilters
        range={range}
        onRange={setRange}
        facilityId={facilityId}
        onFacility={(next) => {
          setFacilityId(next);
          setCourtId("");
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
          Court
          <select
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-base font-medium text-[#071955]"
          >
            <option value="">All courts</option>
            {offered.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
      </ReportFilters>

      {report.isPending && <p className="mt-6 text-base text-slate-600">Reading the history…</p>}

      {report.isError && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
          {report.error instanceof Error ? report.error.message : "That report could not be read."}
        </p>
      )}

      {data && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setKind(null)} className={chip(kind === null)}>
              All · {data.total}
            </button>
            {data.kinds.map((one) => (
              <button
                key={one.kind}
                type="button"
                onClick={() => setKind(kind === one.kind ? null : one.kind)}
                className={chip(kind === one.kind)}
              >
                {KINDS[one.kind].label} · {one.count}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Courts"
              value={`${data.summary.courts}`}
              hint={movement(data.summary.courtsAdded, data.summary.courtsRetired)}
            />
            <Tile
              label="Bookable courts"
              value={`${data.summary.bookableCourts}`}
              hint={movement(data.summary.bookableCourtsAdded, data.summary.bookableCourtsRetired)}
            />
            <Tile
              label="Price changes"
              value={`${data.summary.priceChanges}`}
              hint={
                data.summary.priceChanges > 0
                  ? `on ${plural(data.summary.courtsRepriced, "court", "courts")}`
                  : "None in this range"
              }
            />
            <Tile
              label="Maintenance"
              value={`${data.summary.closures}`}
              hint={
                data.summary.closedNow > 0
                  ? `${plural(data.summary.closedNow, "closure", "closures")} on right now`
                  : "Nothing closed right now"
              }
            />
          </div>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {data.total > data.changes.length
                  ? `The latest ${data.changes.length} of ${data.total}. Narrow the dates to see the rest.`
                  : "Newest first. Times are the venue's."}
              </p>
              {data.changes.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportCsv(data)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-base font-semibold text-[#071955] transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <FileDownloadOutlined sx={{ fontSize: 18 }} />
                  Export CSV
                </button>
              )}
            </div>

            {days.length === 0 ? (
              <p className="py-10 text-center text-base text-slate-600">
                {data.total === 0 ? "Nothing changed on your courts in this range." : "No changes of this kind."}
              </p>
            ) : (
              days.map(([on, changes]) => (
                <div key={on} className="mt-5">
                  <h2 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
                    {format(parseISO(on), "EEE d MMM yyyy")}
                  </h2>
                  <ul className="mt-1">
                    {changes.map((change) => (
                      <Entry key={change.id} change={change} />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  );
}

export default DeskCourtChangesView;
