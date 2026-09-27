"use client";

import { useState } from "react";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { peso } from "../BookingDetails";
import { activityIcon } from "@auth/catalogApi";
import {
  duration,
  shares,
  utilization,
  type CourtUtilization,
  type UtilizationReport,
} from "@auth/deskApi";
import { useCourtUtilization } from "@auth/hooks/useDesk";
import { usePlatformUtilization } from "@auth/hooks/usePlatformReports";
import { ReportFilters, thisMonth, Tile } from "../reportBits";
import { reportTrail, useReportScope } from "../reportScope";

/** A filled bar, or a dash where there is no percentage to be had. */
function Meter({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <span className="text-base text-slate-400">—</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-[#2563EB]"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </span>
      <span className="w-14 shrink-0 text-right text-lg font-bold text-[#071955] tabular-nums">
        {percent}%
      </span>
    </span>
  );
}

/**
 * One court, shut until somebody opens it.
 *
 * The header is the floor: what it was open for, what was on it, and the one
 * percentage worth quoting. Open, it breaks that down by the parts the floor is
 * sold in — which do NOT add up to the header, and the page says so rather than
 * leaving somebody to find it out.
 */
function Court({ court }: { court: CourtUtilization }) {
  const [open, setOpen] = useState(false);
  const percent = utilization(court.inUseMinutes, court.openMinutes);
  const sideBySide = court.soldMinutes - court.inUseMinutes;

  // Worked out across the whole list rather than row by row, so the column
  // adds up to the hundred the total row claims.
  const split = shares(court.units.map((unit) => unit.soldMinutes));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <ExpandMoreOutlined
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fontSize="small"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-[#071955]">{court.name}</span>
          <span className="block truncate text-sm text-slate-600">
            {court.facilityName} · {court.units.length} bookable{" "}
            {court.units.length === 1 ? "court" : "courts"}
          </span>
        </span>

        <span className="hidden w-32 shrink-0 text-right text-base text-slate-600 sm:block">
          <span className="block text-lg font-semibold text-[#071955]">
            {duration(court.openMinutes)}
          </span>
          <span className="block text-sm">
            open · {court.openDays} {court.openDays === 1 ? "day" : "days"}
          </span>
        </span>

        <span className="hidden w-28 shrink-0 text-right text-base text-slate-600 md:block">
          <span className="block text-lg font-semibold text-[#071955]">
            {duration(court.inUseMinutes)}
          </span>
          <span className="block text-sm">used</span>
        </span>

        <span className="hidden w-32 shrink-0 text-right text-base md:block">
          {court.maintenanceMinutes > 0 ? (
            <>
              <span className="flex items-center justify-end gap-1 text-lg font-semibold text-amber-700">
                <BuildOutlined sx={{ fontSize: 17 }} />
                {duration(court.maintenanceMinutes)}
              </span>
              <span className="block text-sm text-slate-600">
                maintenance · {court.maintenanceDays}{" "}
                {court.maintenanceDays === 1 ? "day" : "days"}
              </span>
            </>
          ) : (
            <>
              <span className="block text-lg font-semibold text-slate-400">—</span>
              <span className="block text-sm text-slate-500">no maintenance</span>
            </>
          )}
        </span>

        <span className="w-40 shrink-0">
          <Meter percent={percent} />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-4">
          {/* The two figures a divided floor makes different, said before the
              table so nobody has to work out why the rows do not add up. */}
          {sideBySide > 0 && (
            <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              <p className="font-bold">Two totals, and both are right.</p>
              <p className="mt-1">
                Parts of this court can be booked at the same time. For{" "}
                {duration(sideBySide)} of this period, more than one part was booked in the same
                hour.
              </p>
              <ul className="mt-2 space-y-1">
                <li>
                  The floor itself was busy for <b>{duration(court.inUseMinutes)}</b> — that is the{" "}
                  {percent}% at the top.
                </li>
                <li>
                  The parts add up to <b>{duration(court.soldMinutes)}</b> — that is what the rows
                  below total.
                </li>
              </ul>
            </div>
          )}

          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="text-sm tracking-wider text-slate-600 uppercase">
                <th className="pb-2.5 text-left font-semibold">Bookable court</th>
                <th className="pb-2.5 text-right font-semibold">Sold</th>
                <th className="w-24 pb-2.5 text-right font-semibold">Peak</th>
                {/* Not "share": "of what" was the question everybody asked, and
                    three figures on this card could be the denominator. The
                    per cent sign says what the numbers are; the total row at
                    the foot says what they are a share of. */}
                <th className="w-24 pb-2.5 text-right font-semibold">% of sold</th>
                {court.rental !== null && (
                  <th className="w-32 pb-2.5 text-right font-semibold">Rental</th>
                )}
              </tr>
            </thead>
            <tbody>
              {court.units.map((unit, index) => {
                const icon = activityIcon(unit.sportKey);

                return (
                  <tr key={unit.bookableCourtId} className="border-t border-slate-100">
                    <td className="py-3 text-base text-[#071955]">
                      <span className="flex items-center gap-2.5">
                        {icon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={icon} alt="" className="h-5 w-5 object-contain" aria-hidden />
                        )}
                        <span className="truncate font-semibold">{unit.label}</span>
                        {unit.isRetired && (
                          <span
                            className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-500 uppercase"
                            title="The venue no longer marks the floor out this way. Listed because it sold these hours before it was retired."
                          >
                            Retired
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 text-right text-base tabular-nums">
                      {duration(unit.soldMinutes)}
                    </td>
                    <td className="py-3 text-right text-base text-slate-600 tabular-nums">
                      {unit.peakMinutes > 0 ? duration(unit.peakMinutes) : "—"}
                    </td>
                    <td className="py-3 text-right text-base text-slate-600 tabular-nums">
                      {split[index]}%
                    </td>
                    {unit.rental !== null && (
                      <td className="py-3 text-right text-base font-semibold tabular-nums">
                        {peso(unit.rental)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* The row that answers "of what". Without a total the reader has
                to guess which figure above the table the column divides by. */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 text-base font-bold text-[#071955]">
                <td className="pt-3 text-left">Sold on this floor</td>
                <td className="pt-3 text-right tabular-nums">{duration(court.soldMinutes)}</td>
                <td className="pt-3" />
                <td className="pt-3 text-right tabular-nums">
                  {court.soldMinutes > 0 ? "100%" : "—"}
                </td>
                {court.rental !== null && (
                  <td className="pt-3 text-right tabular-nums">{peso(court.rental)}</td>
                )}
              </tr>
            </tfoot>
          </table>

          {court.awaitingMinutes > 0 && (
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              {duration(court.awaitingMinutes)} has been paid for and is waiting for you to check.
              It is not included in any of the figures above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Summary({ report }: { report: UtilizationReport }) {
  const percent = utilization(report.inUseMinutes, report.openMinutes);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Open"
        value={duration(report.openMinutes)}
        hint={`${report.openDays} court-${report.openDays === 1 ? "day" : "days"}`}
      />
      <Tile label="Used" value={duration(report.inUseMinutes)} />
      <Tile
        label="Maintenance"
        value={report.maintenanceMinutes > 0 ? duration(report.maintenanceMinutes) : "—"}
        hint={report.maintenanceMinutes > 0 ? "not counted as open" : undefined}
      />
      <Tile
        label={report.rental === null ? "Utilisation" : "Rental"}
        value={report.rental === null ? (percent === null ? "—" : `${percent}%`) : peso(report.rental)}
        hint={report.rental === null ? "of the time you were open" : "court hire, before platform fees"}
      />
    </div>
  );
}

/**
 * How much of what this venue had open actually got used.
 *
 * Open to attendants as well as owners, and their copy arrives with no money in
 * it at all — the server leaves it out rather than the page hiding it. Which is
 * why every figure here is drawn from a null check rather than a role.
 */
function DeskUtilizationView() {
  const [range, setRange] = useState(thisMonth);
  const [facilityId, setFacilityId] = useState<string>("");
  const scope = useReportScope();
  const admin = scope.kind === "admin";

  // The same page for the desk and the admin console. Only one of the two is
  // ever asked: the other is switched off, not merely ignored.
  const desk = useCourtUtilization(
    { from: range.from, to: range.to, facilityId: facilityId || undefined },
    !admin,
  );
  const platform = usePlatformUtilization(
    {
      from: range.from,
      to: range.to,
      facilityOwnerId: admin ? scope.ownerId || undefined : undefined,
      facilityId: admin ? scope.facilityId || undefined : undefined,
    },
    admin,
  );
  const report = admin ? platform : desk;

  return (
    <>
      <Breadcrumbs trail={reportTrail(scope, "Utilisation")} />

      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071955] sm:text-3xl">
        Court utilisation
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
        How much of the time your courts were open actually got booked. Only confirmed bookings
        are counted here — anything still waiting for you to check is shown separately.
      </p>

      <ReportFilters
        range={range}
        onRange={setRange}
        facilityId={facilityId}
        onFacility={setFacilityId}
      />

        {report.isPending && (
          <p className="mt-6 text-base text-slate-600">Adding up the hours…</p>
        )}

        {report.isError && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
            {report.error instanceof Error
              ? report.error.message
              : "That report could not be read."}
          </p>
        )}

        {report.data && (
          <>
            <div className="mt-6">
              <Summary report={report.data} />
            </div>

            <div className="mt-4 space-y-2">
              {report.data.courts.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-base text-slate-600">
                  No courts are set up at this venue yet.
                </p>
              ) : (
                report.data.courts.map((court) => <Court key={court.courtId} court={court} />)
              )}
            </div>
          </>
        )}
    </>
  );
}

export default DeskUtilizationView;
