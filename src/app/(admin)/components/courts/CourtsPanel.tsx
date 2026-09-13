"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSnackbar } from "notistack";
import AddOutlined from "@mui/icons-material/AddOutlined";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import { ApiError } from "@/services/api";
import type { Court } from "@auth/courtApi";
import { useCourts, useLiftMaintenance } from "@auth/hooks/useCourts";
import MaintenanceDialog, { type MaintenanceTarget } from "./MaintenanceDialog";

function MaintenanceBadge({ court }: { court: Court }) {
  const closure = court.maintenance!;

  return (
    <span
      title={
        closure.appliesToWholeFacility
          ? "The whole facility is closed, so this cannot be reopened on its own."
          : "This court alone is closed."
      }
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800"
    >
      <BuildOutlined sx={{ fontSize: 13 }} />
      {/* Which level, always. A facility closure has no button on the court. */}
      Under maintenance &middot; {closure.appliesToWholeFacility ? "facility" : "this court"}
    </span>
  );
}

function CourtCard({
  court,
  facilityId,
  onSetMaintenance,
}: {
  court: Court;
  facilityId: string;
  onSetMaintenance: (target: MaintenanceTarget) => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const lift = useLiftMaintenance(facilityId);
  const closure = court.maintenance;
  const cover = court.photos.find((photo) => photo.isCover) ?? court.photos[0];
  const openDays = court.operatingHours.filter((hour) => hour.opensAt !== null);

  async function handleLift() {
    if (!closure) {
      return;
    }

    try {
      await lift.mutateAsync(closure.periodId);
      enqueueSnackbar(`${court.name} is open again.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:shadow-md ${
        closure ? "border-amber-200" : "border-slate-200"
      }`}
    >
      {cover ? (
        <img
          src={cover.secureUrl}
          alt={cover.caption ?? court.name}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
          No photo
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/courts/${court.id}`}
            className="font-bold text-[#2563EB] transition hover:text-[#071955] hover:underline"
          >
            {court.name}
          </Link>
          {!court.isActive && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              Inactive
            </span>
          )}
        </div>

        {closure && (
          <div className="mt-1.5">
            <MaintenanceBadge court={court} />
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {court.sports.map((sport) => (
            <span
              key={sport.sportId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                sport.isPrimary ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-[#1257d5]"
              }`}
            >
              {sport.isPrimary && <StarOutlined sx={{ fontSize: 12 }} aria-hidden />}
              {sport.name}
            </span>
          ))}
        </div>

        <p className="mt-1.5 text-sm text-slate-500">
          {court.venueType}
          {court.surface && ` · ${court.surface}`}
          {court.hasLighting && (
            <span className="ml-1 inline-flex items-center gap-0.5">
              <LightbulbOutlined sx={{ fontSize: 13 }} />
              Lit
            </span>
          )}
          {" · "}
          {court.slotLengthMinutes}-minute slots, {court.minimumDurationMinutes} minute minimum
          {court.bufferMinutes > 0 && `, ${court.bufferMinutes} minute buffer`}
        </p>

        <p className="mt-0.5 text-sm text-slate-400">
          {court.usesFacilityHours ? "Facility hours" : "Own hours"} ·{" "}
          {openDays.length === 0
            ? "closed every day"
            : `open ${openDays.length} ${openDays.length === 1 ? "day" : "days"} a week`}
        </p>

        {closure && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            &ldquo;{closure.reason}&rdquo; — from {format(new Date(closure.startsAt), "d MMM yyyy")}
            {closure.endsAt
              ? ` until ${format(new Date(closure.endsAt), "d MMM yyyy")}`
              : ", until further notice"}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
          <Link
            href={`/admin/courts/${court.id}`}
            className="text-sm font-bold text-[#164eaa] transition hover:text-[#071955]"
          >
            View &amp; edit
          </Link>
          {closure ? (
            closure.appliesToWholeFacility ? (
              <span className="text-sm text-slate-400">
                Reopen the facility to reopen this court.
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleLift()}
                disabled={lift.isPending}
                className="text-sm font-bold text-green-700 transition hover:text-green-900 disabled:cursor-wait disabled:text-slate-400"
              >
                End maintenance
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() =>
                onSetMaintenance({
                  facilityId,
                  courtId: court.id,
                  name: court.name,
                  courtCount: 1,
                })
              }
              className="text-sm font-bold text-amber-700 transition hover:text-amber-900"
            >
              Set maintenance
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CourtsPanel({
  facilityId,
  facilityName,
  facilityOwnerId,
}: {
  facilityId: string;
  facilityName: string;
  facilityOwnerId: string;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const courts = useCourts(facilityId);
  const lift = useLiftMaintenance(facilityId);
  const [target, setTarget] = useState<MaintenanceTarget | null>(null);

  const rows = courts.data ?? [];
  const facilityClosure = rows.find((court) => court.maintenance?.appliesToWholeFacility)
    ?.maintenance;

  async function liftFacility() {
    if (!facilityClosure) {
      return;
    }

    try {
      await lift.mutateAsync(facilityClosure.periodId);
      enqueueSnackbar(`${facilityName} is open again.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#071955]">
          Courts{rows.length > 0 && ` (${rows.length})`}
        </h4>

        <div className="flex flex-wrap gap-2">
          {facilityClosure ? (
            <button
              type="button"
              onClick={() => void liftFacility()}
              disabled={lift.isPending}
              className="rounded-lg px-3 py-1.5 text-sm font-bold text-green-700 transition hover:bg-green-50 disabled:cursor-wait disabled:text-slate-400"
            >
              Reopen the facility
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setTarget({
                  facilityId,
                  courtId: null,
                  name: facilityName,
                  courtCount: rows.length,
                })
              }
              className="rounded-lg px-3 py-1.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
            >
              Close the facility
            </button>
          )}

          <Link
            href={`/admin/facility-owners/${facilityOwnerId}/courts/new`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#164eaa] transition hover:border-slate-300 hover:bg-slate-50"
          >
            <AddOutlined sx={{ fontSize: 15 }} />
            Add a court
          </Link>
        </div>
      </div>

      {courts.isError ? (
        <p className="mt-2 font-semibold text-red-700">We couldn&apos;t load the courts.</p>
      ) : courts.isPending ? (
        <p className="mt-2 text-sm text-slate-500">Loading courts…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">
          No courts yet, so nothing here can be booked.
        </p>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              facilityId={facilityId}
              onSetMaintenance={setTarget}
            />
          ))}
        </ul>
      )}

      <MaintenanceDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

export default CourtsPanel;
